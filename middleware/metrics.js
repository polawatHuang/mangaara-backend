// Middleware to track API metrics automatically
const statusRouter = require('../routes/status');

// Track response time for all requests
function trackMetrics(req, res, next) {
  const startTime = Date.now();
  const endpoint = req.path || req.url || 'unknown';
  
  let statusCode = 200;
  let tracked = false;
  
  // Capture the original res.status
  const originalStatus = res.status;
  
  // Override res.status to capture status code
  res.status = function(code) {
    statusCode = code;
    return originalStatus.call(this, code);
  };
  
  // Track when response is actually finished
  const trackResponse = () => {
    if (tracked) return; // Prevent double tracking
    tracked = true;
    
    const duration = Date.now() - startTime;
    
    // Track response time with endpoint and status code
    if (statusRouter.trackResponseTime) {
      statusRouter.trackResponseTime(duration, endpoint, statusCode);
    }
    
    // Track errors (4xx and 5xx responses)
    if (statusCode >= 400 && statusRouter.trackError) {
      statusRouter.trackError({
        message: `HTTP ${statusCode} - ${req.method} ${endpoint}`,
        statusCode,
        path: endpoint,
        method: req.method
      }, endpoint);
    }
  };
  
  // Listen to finish event (covers all response methods)
  res.on('finish', trackResponse);
  res.on('close', trackResponse);
  
  next();
}

module.exports = { trackMetrics };
