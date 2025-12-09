const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || '/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images';

// Health check and status monitoring endpoint
router.get('/', async (req, res) => {
  const status = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: 'unknown',
      responseTime: null,
      error: null
    },
    api: {
      status: 'operational',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    },
    storage: {
      status: 'unknown',
      path: UPLOAD_BASE_PATH,
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

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await db.execute('SELECT 1 as health_check');
    status.database.status = 'connected';
    status.database.responseTime = Date.now() - dbStart;
  } catch (err) {
    status.database.status = 'disconnected';
    status.database.error = err.message;
    status.status = 'degraded';
  }

  // Check storage accessibility
  try {
    const storagePath = status.storage.path;
    await fs.promises.access(storagePath, fs.constants.R_OK | fs.constants.W_OK);
    status.storage.status = 'accessible';
    status.storage.accessible = true;
  } catch (err) {
    status.storage.status = 'inaccessible';
    status.storage.error = err.message;
    status.status = 'degraded';
  }

  // List all registered routes
  try {
    const routes = [];
    const app = req.app;
    
    if (app && app._router && app._router.stack) {
      app._router.stack.forEach((middleware) => {
        if (middleware.route) {
          // Routes registered directly on the app
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({
            path: middleware.route.path,
            methods: methods
          });
        } else if (middleware.name === 'router' || middleware.name === 'bound dispatch') {
          // Router middleware
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
                  methods: methods
                });
              }
            });
          }
        }
      });
    }

    status.routes.total = routes.length;
    status.routes.endpoints = routes.sort((a, b) => a.path.localeCompare(b.path));
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

module.exports = router;
