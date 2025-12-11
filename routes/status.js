const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || '/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images';

// In-memory metrics storage
const metrics = {
  responseTimes: [],
  errors: [],
  requests: 0,
  startTime: Date.now(),
  cache: null,
  cacheTimestamp: 0
};

// Track response time
function trackResponseTime(duration) {
  metrics.responseTimes.push({
    duration,
    timestamp: Date.now()
  });
  // Keep only last 1000 entries
  if (metrics.responseTimes.length > 1000) {
    metrics.responseTimes.shift();
  }
}

// Track errors
function trackError(error) {
  metrics.errors.push({
    message: error.message || error,
    timestamp: Date.now()
  });
  // Keep only last 500 errors
  if (metrics.errors.length > 500) {
    metrics.errors.shift();
  }
}

// Calculate percentile
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

// Get errors in time window
function getErrorsInWindow(windowMs) {
  const cutoff = Date.now() - windowMs;
  return metrics.errors.filter(e => e.timestamp > cutoff).length;
}

// Get average response time in window
function getAvgResponseTime(windowMs) {
  const cutoff = Date.now() - windowMs;
  const recent = metrics.responseTimes.filter(r => r.timestamp > cutoff);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((acc, r) => acc + r.duration, 0);
  return Math.round(sum / recent.length);
}

// Health check and status monitoring endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  metrics.requests++;
  
  // Check for detailed view (admin only)
  const isDetailed = req.query.detailed === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Use cache if available and not stale (30 seconds)
  const cacheAge = Date.now() - metrics.cacheTimestamp;
  if (metrics.cache && cacheAge < 30000 && !isDetailed) {
    trackResponseTime(Date.now() - startTime);
    return res.status(metrics.cache.httpStatusCode).json(metrics.cache.data);
  }
  
  const status = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: {
      status: 'unknown',
      responseTime: null,
      error: null
    },
    api: {
      status: 'operational',
      version: process.env.API_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    },
    storage: {
      status: 'unknown',
      accessible: false,
      error: null
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    },
    routes: {
      total: 0,
      endpoints: []
    }
  };
  
  // Add deployment info if detailed or dev
  if (isDetailed || !isProduction) {
    status.deployment = {
      version: process.env.API_VERSION || '1.0.0',
      deployedAt: process.env.DEPLOY_TIME || new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown'
    };
  }
  
  // Add performance metrics if detailed
  if (isDetailed) {
    const recentTimes = metrics.responseTimes.filter(r => r.timestamp > Date.now() - 3600000).map(r => r.duration);
    status.performance = {
      requests: {
        total: metrics.requests,
        perMinute: Math.round(metrics.requests / (process.uptime() / 60))
      },
      responseTime: {
        average: getAvgResponseTime(3600000),
        p95: calculatePercentile(recentTimes, 95),
        p99: calculatePercentile(recentTimes, 99),
        unit: 'ms'
      },
      errors: {
        last1h: getErrorsInWindow(3600000),
        last24h: getErrorsInWindow(86400000),
        total: metrics.errors.length,
        rate: metrics.requests > 0 ? ((metrics.errors.length / metrics.requests) * 100).toFixed(2) + '%' : '0%'
      }
    };
    // Expose storage path only in detailed view
    status.storage.path = UPLOAD_BASE_PATH;
  }

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await db.execute('SELECT 1 as health_check');
    status.database.status = 'connected';
    status.database.responseTime = Date.now() - dbStart;
  } catch (err) {
    trackError(err);
    status.database.status = 'disconnected';
    // Only expose error details in non-production or detailed view
    if (!isProduction || isDetailed) {
      status.database.error = err.message;
    }
    status.status = 'degraded';
  }

  // Check storage accessibility
  try {
    await fs.promises.access(UPLOAD_BASE_PATH, fs.constants.R_OK | fs.constants.W_OK);
    status.storage.status = 'accessible';
    status.storage.accessible = true;
  } catch (err) {
    trackError(err);
    status.storage.status = 'inaccessible';
    // Only expose error details in non-production or detailed view
    if (!isProduction || isDetailed) {
      status.storage.error = err.message;
    }
    status.status = 'degraded';
  }

  // List all registered routes
  try {
    const routes = [];
    const app = req.app;
    
    console.log('[Status] Enumerating routes...');
    
    if (app && app._router && app._router.stack) {
      console.log(`[Status] Found ${app._router.stack.length} middleware items`);
      
      app._router.stack.forEach((middleware, idx) => {
        if (middleware.route) {
          // Routes registered directly on the app
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({
            path: middleware.route.path,
            methods: methods
          });
          console.log(`[Status] Direct route: ${middleware.route.path} [${methods}]`);
        } else if (middleware.name === 'router' || middleware.name === 'bound dispatch') {
          // Router middleware - check for sub-routes
          if (middleware.handle && middleware.handle.stack) {
            console.log(`[Status] Router middleware #${idx} with ${middleware.handle.stack.length} handlers`);
            
            // Try to extract base path
            let basePath = '';
            if (middleware.regexp) {
              const regexpStr = middleware.regexp.toString();
              // Try multiple patterns to extract the base path
              let match = regexpStr.match(/^\/\^\\\/([^\\?]+)/);
              if (!match) {
                match = regexpStr.match(/^\\/\\^(.+?)\\\\\\//);
              }
              if (match) {
                basePath = '/' + match[1].replace(/\\\//g, '/').replace(/\\/g, '');
              }
            }
            
            console.log(`[Status] Base path extracted: ${basePath || '(none)'}`);
            
            middleware.handle.stack.forEach((handler, handlerIdx) => {
              if (handler.route) {
                const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                let routePath = handler.route.path;
                
                if (basePath) {
                  routePath = basePath + (routePath === '/' ? '' : routePath);
                }
                
                routes.push({
                  path: routePath,
                  methods: methods
                });
                console.log(`[Status]   Handler #${handlerIdx}: ${routePath} [${methods}]`);
              }
            });
          }
        }
      });
    } else {
      console.log('[Status] WARNING: app._router or app._router.stack not found');
    }

    console.log(`[Status] Total routes found: ${routes.length}`);
    status.routes.total = routes.length;
    status.routes.endpoints = routes.sort((a, b) => a.path.localeCompare(b.path));
    
    // If no routes found, use fallback
    if (routes.length === 0) {
      console.log('[Status] No routes found, using fallback');
      throw new Error('No routes enumerated');
    }
  } catch (err) {
    // If route enumeration fails, provide fallback
    console.error('[Status] Route enumeration failed:', err.message);
    status.routes.error = err.message;
    // Hardcoded fallback list of known routes
    status.routes.endpoints = [
      { path: '/api/auth/register', methods: 'POST' },
      { path: '/api/auth/login', methods: 'POST' },
      { path: '/api/auth/verify', methods: 'POST' },
      { path: '/api/auth/logout', methods: 'POST' },
      { path: '/api/manga', methods: 'GET, POST, PUT, DELETE' },
      { path: '/api/manga/:id', methods: 'GET, PUT, DELETE' },
      { path: '/api/tags', methods: 'GET, POST' },
      { path: '/api/tags/:id', methods: 'PUT, DELETE' },
      { path: '/api/episodes', methods: 'GET, POST' },
      { path: '/api/episode', methods: 'POST' },
      { path: '/api/comments', methods: 'GET, POST' },
      { path: '/api/recommend', methods: 'GET, POST' },
      { path: '/api/advertise', methods: 'GET, POST' },
      { path: '/api/menubar', methods: 'GET, POST' },
      { path: '/api/favorites', methods: 'GET, POST, DELETE' },
      { path: '/api/users', methods: 'GET, POST' },
      { path: '/api/upload', methods: 'POST' },
      { path: '/api/status', methods: 'GET' },
      { path: '/api/test-connection', methods: 'GET' }
    ];
    status.routes.total = status.routes.endpoints.length;
    status.routes.fallback = true;
  }

  // Set overall status
  if (status.database.status === 'disconnected') {
    status.status = 'critical';
  }

  // Set appropriate HTTP status code
  const httpStatusCode = status.status === 'operational' ? 200 : 
                         status.status === 'degraded' ? 503 : 500;

  // Track response time
  const responseTime = Date.now() - startTime;
  trackResponseTime(responseTime);
  
  // Add response time to status if detailed
  if (isDetailed) {
    status.responseTime = responseTime;
  }
  
  // Cache the response (only for non-detailed requests)
  if (!isDetailed) {
    metrics.cache = {
      data: status,
      httpStatusCode
    };
    metrics.cacheTimestamp = Date.now();
  }

  res.status(httpStatusCode).json(status);
});

// Detailed database status
router.get('/database', async (req, res) => {
  const dbStatus = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    connection: {
      status: 'unknown',
      responseTime: null
    },
    tables: {
      status: 'unknown',
      count: 0,
      list: []
    },
    error: null
  };

  try {
    // Test connection
    const start = Date.now();
    await db.execute('SELECT 1 as test');
    dbStatus.connection.status = 'connected';
    dbStatus.connection.responseTime = Date.now() - start;

    // Get table information
    const [tables] = await db.execute('SHOW TABLES');
    dbStatus.tables.count = tables.length;
    dbStatus.tables.list = tables.map(t => Object.values(t)[0]);
    dbStatus.tables.status = 'available';

    // Get table row counts
    const tableCounts = {};
    for (const table of dbStatus.tables.list) {
      try {
        const [result] = await db.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
        tableCounts[table] = result[0].count;
      } catch (err) {
        tableCounts[table] = 'error';
      }
    }
    dbStatus.tables.rowCounts = tableCounts;

    dbStatus.status = 'operational';
    res.json(dbStatus);
  } catch (err) {
    dbStatus.status = 'error';
    dbStatus.error = err.message;
    res.status(500).json(dbStatus);
  }
});

// Storage status
router.get('/storage', async (req, res) => {
  const storageStatus = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    basePath: UPLOAD_BASE_PATH,
    directories: [],
    error: null
  };

  try {
    const basePath = storageStatus.basePath;
    await fs.promises.access(basePath, fs.constants.R_OK | fs.constants.W_OK);
    
    // List subdirectories
    const entries = await fs.promises.readdir(basePath, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(dir => dir.name);
    
    storageStatus.directories = directories;
    storageStatus.status = 'accessible';
    res.json(storageStatus);
  } catch (err) {
    storageStatus.status = 'inaccessible';
    storageStatus.error = err.message;
    res.status(500).json(storageStatus);
  }
});

// API endpoints status
router.get('/routes', async (req, res) => {
  const routeStatus = {
    timestamp: new Date().toISOString(),
    total: 0,
    byMethod: {},
    endpoints: []
  };

  try {
    const app = req.app;
    const routes = [];

    if (app && app._router && app._router.stack) {
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({
            path: middleware.route.path,
            methods: methods.split(', ')
          });
        } else if (middleware.name === 'router' || middleware.name === 'bound dispatch') {
          if (middleware.handle && middleware.handle.stack) {
            middleware.handle.stack.forEach((handler) => {
              if (handler.route) {
                const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                
                // Extract base path from regexp
                let basePath = '';
                if (middleware.regexp) {
                  const regexpStr = middleware.regexp.toString();
                  const match = regexpStr.match(/^\/\^\\\/([^\\?]+)/);
                  if (match) {
                    basePath = '/' + match[1].replace(/\\\//g, '/');
                  }
                }
                
                let routePath = handler.route.path;
                if (basePath && routePath) {
                  routePath = basePath + routePath;
                }
                
                routes.push({
                  path: routePath || handler.route.path,
                  methods: methods.split(', ')
                });
              }
            });
          }
        }
      });
    }

    // Count by method
    const methodCount = {};
    routes.forEach(route => {
      route.methods.forEach(method => {
        methodCount[method] = (methodCount[method] || 0) + 1;
      });
    });

    routeStatus.total = routes.length;
    routeStatus.byMethod = methodCount;
    routeStatus.endpoints = routes.sort((a, b) => a.path.localeCompare(b.path));

    res.json(routeStatus);
  } catch (err) {
    // Hardcoded fallback list
    const fallbackRoutes = [
      { path: '/api/auth/register', methods: ['POST'] },
      { path: '/api/auth/login', methods: ['POST'] },
      { path: '/api/auth/verify', methods: ['POST'] },
      { path: '/api/auth/logout', methods: ['POST'] },
      { path: '/api/manga', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      { path: '/api/manga/:id', methods: ['GET', 'PUT', 'DELETE'] },
      { path: '/api/tags', methods: ['GET', 'POST'] },
      { path: '/api/tags/:id', methods: ['PUT', 'DELETE'] },
      { path: '/api/episodes', methods: ['GET', 'POST'] },
      { path: '/api/episode', methods: ['POST'] },
      { path: '/api/comments', methods: ['GET', 'POST'] },
      { path: '/api/recommend', methods: ['GET', 'POST'] },
      { path: '/api/advertise', methods: ['GET', 'POST'] },
      { path: '/api/menubar', methods: ['GET', 'POST'] },
      { path: '/api/favorites', methods: ['GET', 'POST', 'DELETE'] },
      { path: '/api/users', methods: ['GET', 'POST'] },
      { path: '/api/upload', methods: ['POST'] },
      { path: '/api/status', methods: ['GET'] },
      { path: '/api/test-connection', methods: ['GET'] }
    ];

    const methodCount = {};
    fallbackRoutes.forEach(route => {
      route.methods.forEach(method => {
        methodCount[method] = (methodCount[method] || 0) + 1;
      });
    });

    res.json({
      ...routeStatus,
      total: fallbackRoutes.length,
      byMethod: methodCount,
      endpoints: fallbackRoutes,
      fallback: true,
      error: err.message
    });
  }
});

// Reset metrics (useful for testing/debugging)
router.post('/reset-metrics', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Only allow in non-production
  if (isProduction) {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  metrics.responseTimes = [];
  metrics.errors = [];
  metrics.requests = 0;
  metrics.cache = null;
  metrics.cacheTimestamp = 0;
  metrics.startTime = Date.now();
  
  res.json({ message: 'Metrics reset successfully' });
});

// Expose metrics tracking for other middleware
router.trackError = trackError;
router.trackResponseTime = trackResponseTime;

module.exports = router;
