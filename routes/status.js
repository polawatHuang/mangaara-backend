const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || '/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images';

// Circular buffer implementation
class CircularBuffer {
  constructor(size) {
    this.size = size;
    this.buffer = new Array(size);
    this.index = 0;
    this.count = 0;
  }
  
  push(item) {
    this.buffer[this.index] = item;
    this.index = (this.index + 1) % this.size;
    if (this.count < this.size) this.count++;
  }
  
  getAll() {
    if (this.count < this.size) {
      return this.buffer.slice(0, this.count);
    }
    return [...this.buffer.slice(this.index), ...this.buffer.slice(0, this.index)];
  }
  
  clear() {
    this.buffer = new Array(this.size);
    this.index = 0;
    this.count = 0;
  }
}

// In-memory metrics storage with circular buffers
const metrics = {
  responseTimes: new CircularBuffer(1000),
  errors: new CircularBuffer(500),
  slowQueries: new CircularBuffer(100),
  byEndpoint: new Map(),
  requests: 0,
  startTime: Date.now(),
  cache: null,
  cacheTimestamp: 0
};

// Track response time with endpoint info
function trackResponseTime(duration, endpoint = 'unknown', statusCode = 200) {
  metrics.responseTimes.push({
    duration,
    timestamp: Date.now(),
    endpoint,
    statusCode
  });
  
  // Track per-endpoint metrics
  if (!metrics.byEndpoint.has(endpoint)) {
    metrics.byEndpoint.set(endpoint, {
      count: 0,
      totalTime: 0,
      errors: 0,
      avgTime: 0,
      maxTime: 0
    });
  }
  
  const endpointMetrics = metrics.byEndpoint.get(endpoint);
  endpointMetrics.count++;
  endpointMetrics.totalTime += duration;
  endpointMetrics.avgTime = Math.round(endpointMetrics.totalTime / endpointMetrics.count);
  endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, duration);
  
  if (statusCode >= 400) {
    endpointMetrics.errors++;
  }
}

// Track errors
function trackError(error, endpoint = 'unknown') {
  metrics.errors.push({
    message: error.message || error,
    timestamp: Date.now(),
    endpoint,
    statusCode: error.statusCode || 500
  });
}

// Track slow database queries
function trackSlowQuery(query, duration) {
  if (duration > 1000) { // Queries slower than 1 second
    metrics.slowQueries.push({
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: Date.now()
    });
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
  return metrics.errors.getAll().filter(e => e && e.timestamp > cutoff).length;
}

// Get average response time in window
function getAvgResponseTime(windowMs) {
  const cutoff = Date.now() - windowMs;
  const recent = metrics.responseTimes.getAll().filter(r => r && r.timestamp > cutoff);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((acc, r) => acc + r.duration, 0);
  return Math.round(sum / recent.length);
}

// Get disk usage (cross-platform)
async function getDiskUsage(dirPath) {
  try {
    const stats = await fs.promises.stat(dirPath);
    if (process.platform === 'win32') {
      // Windows - use wmic or return basic info
      try {
        const output = execSync(`wmic logicaldisk where "DeviceID='${path.parse(dirPath).root.replace('\\', '')}' get Size,FreeSpace /format:csv`, { encoding: 'utf8' });
        const lines = output.split('\n').filter(l => l.trim() && !l.includes('Node'));
        if (lines.length > 0) {
          const parts = lines[0].split(',');
          const free = parseInt(parts[1]) || 0;
          const total = parseInt(parts[2]) || 0;
          return {
            total: Math.round(total / (1024 ** 3)),
            free: Math.round(free / (1024 ** 3)),
            used: Math.round((total - free) / (1024 ** 3)),
            usedPercent: total > 0 ? Math.round(((total - free) / total) * 100) : 0,
            unit: 'GB'
          };
        }
      } catch (e) {
        // Fallback for Windows
        return { status: 'unavailable', error: 'Windows disk monitoring not available' };
      }
    } else {
      // Linux/Unix - use df
      const output = execSync(`df -k "${dirPath}" | tail -1`, { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      const free = parseInt(parts[3]) * 1024;
      return {
        total: Math.round(total / (1024 ** 3)),
        free: Math.round(free / (1024 ** 3)),
        used: Math.round(used / (1024 ** 3)),
        usedPercent: parseInt(parts[4]),
        unit: 'GB'
      };
    }
  } catch (err) {
    return { status: 'error', error: err.message };
  }
  return { status: 'unavailable' };
}

// Get CPU usage
function getCPUUsage() {
  const cpus = os.cpus();
  const loadAvg = os.loadavg();
  
  return {
    cores: cpus.length,
    model: cpus[0].model,
    load1min: Math.round(loadAvg[0] * 100) / 100,
    load5min: Math.round(loadAvg[1] * 100) / 100,
    load15min: Math.round(loadAvg[2] * 100) / 100,
    usagePercent: Math.round((loadAvg[0] / cpus.length) * 100)
  };
}

// Improved route extraction for Express 5.x
function extractRoutes(app) {
  const routes = [];
  
  function processLayer(layer, basePath = '') {
    if (layer.route) {
      const path = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
      routes.push({ path, methods });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      let prefix = basePath;
      
      // Try to extract base path from regexp
      if (layer.regexp) {
        const regexpStr = layer.regexp.toString();
        // Match patterns like /^\/api\/manga\/?(?=\/|$)/i
        let match = regexpStr.match(/\/\^\\\/((?:[^\\\/]+(?:\\\/)?)+)/);
        if (match) {
          prefix = '/' + match[1].replace(/\\\\\//g, '/');
        }
      }
      
      layer.handle.stack.forEach(l => processLayer(l, prefix));
    }
  }
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => processLayer(layer));
  }
  
  return routes.filter(r => r.path && !r.path.includes('*')).sort((a, b) => a.path.localeCompare(b.path));
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
  
  // Add system metrics
  const cpuUsage = getCPUUsage();
  status.system = {
    cpu: {
      cores: cpuUsage.cores,
      usage: cpuUsage.usagePercent,
      load: cpuUsage.load1min
    },
    platform: os.platform(),
    uptime: Math.round(os.uptime() / 60) + ' min'
  };
  
  // Add disk usage (only in detailed view to avoid performance hit)
  if (isDetailed) {
    status.system.disk = await getDiskUsage(UPLOAD_BASE_PATH);
  }
  
  // Add performance metrics if detailed
  if (isDetailed) {
    const allResponseTimes = metrics.responseTimes.getAll().filter(r => r);
    const recentTimes = allResponseTimes.filter(r => r.timestamp > Date.now() - 3600000).map(r => r.duration);
    const totalErrors = metrics.errors.getAll().filter(e => e).length;
    
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
        total: totalErrors,
        rate: metrics.requests > 0 ? ((totalErrors / metrics.requests) * 100).toFixed(2) + '%' : '0%'
      },
      slowQueries: metrics.slowQueries.getAll().filter(q => q).length
    };
    
    // Add endpoint-specific metrics
    const endpointMetrics = {};
    let topEndpoints = Array.from(metrics.byEndpoint.entries())
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    topEndpoints.forEach(ep => {
      endpointMetrics[ep.path] = {
        requests: ep.count,
        avgTime: ep.avgTime,
        maxTime: ep.maxTime,
        errors: ep.errors,
        errorRate: ep.count > 0 ? ((ep.errors / ep.count) * 100).toFixed(2) + '%' : '0%'
      };
    });
    
    status.endpoints = endpointMetrics;
    
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

  // List all registered routes using improved extraction
  try {
    const routes = extractRoutes(req.app);
    
    status.routes.total = routes.length;
    status.routes.endpoints = routes;
    
    // If no routes found, use fallback
    if (routes.length === 0) {
      throw new Error('No routes enumerated');
    }
  } catch (err) {
    // If route enumeration fails, provide fallback
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
  
  metrics.responseTimes.clear();
  metrics.errors.clear();
  metrics.slowQueries.clear();
  metrics.byEndpoint.clear();
  metrics.requests = 0;
  metrics.cache = null;
  metrics.cacheTimestamp = 0;
  metrics.startTime = Date.now();
  
  res.json({ message: 'Metrics reset successfully' });
});

// Expose metrics tracking for other middleware
router.trackError = trackError;
router.trackResponseTime = trackResponseTime;
router.trackSlowQuery = trackSlowQuery;

module.exports = router;
