// Middleware to track API metrics automatically
const statusRouter = require('../routes/status');

// Track response time for all requests
function trackMetrics(req, res, next) {
  const startTime = Date.now();
  
  // Capture the original res.json and res.send
  const originalJson = res.json;
  const originalSend = res.send;
  const originalStatus = res.status;
  
  let statusCode = 200;
  
  // Override res.status to capture status code
  res.status = function(code) {
    statusCode = code;
    return originalStatus.call(this, code);
  };
  
  // Track when response is sent
  const trackResponse = () => {
    const duration = Date.now() - startTime;
    
    // Track response time
    if (statusRouter.trackResponseTime) {
      statusRouter.trackResponseTime(duration);
    }
    
    // Track errors (4xx and 5xx responses)
    if (statusCode >= 400 && statusRouter.trackError) {
      statusRouter.trackError({
        message: `HTTP ${statusCode} - ${req.method} ${req.path}`,
        statusCode,
        path: req.path,
        method: req.method
      });
    }
  };
  
  // Override res.json
  res.json = function(data) {
    trackResponse();
    return originalJson.call(this, data);
  };
  
  // Override res.send
  res.send = function(data) {
    trackResponse();
    return originalSend.call(this, data);
  };
  
  next();
}

module.exports = { trackMetrics };
