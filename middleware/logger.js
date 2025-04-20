// middleware/logger.js
const db = require("../db");
const filteredPayload = { ...req.body };

if ('password' in filteredPayload) filteredPayload.password = '[REDACTED]';

// ✅ Log normal request
async function logRequest(req, res, next) {
  const action = req.headers['x-action'] || 'UNSPECIFIED';
  const userId = req.headers['x-user-id'] || null;

  req._logEntry = {
    action,
    user_id: userId,
    method: req.method,
    endpoint: req.originalUrl,
    payload: JSON.stringify(req.body || {}),
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    error_message: null
  };

  try {
    const [result] = await db.execute(
      `INSERT INTO logs (action, user_id, method, endpoint, payload, ip_address, user_agent, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.values(req._logEntry)
    );
    req._logEntry.log_id = result.insertId;
  } catch (err) {
    console.error("[Log Error]", err.message);
  }

  next();
}

// ✅ Log error response
async function logError(err, req, res, next) {
  console.error("[API Error]", err.message);

  if (req._logEntry?.log_id) {
    try {
      await db.execute(
        `UPDATE logs SET error_message = ? WHERE log_id = ?`,
        [err.message, req._logEntry.log_id]
      );
    } catch (logErr) {
      console.error("[Error Logging Failed]", logErr.message);
    }
  } else {
    try {
      await db.execute(
        `INSERT INTO logs (action, method, endpoint, payload, ip_address, user_agent, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "ERROR_UNHANDLED",
          req.method,
          req.originalUrl,
          JSON.stringify(req.body || {}),
          req.ip,
          req.headers['user-agent'],
          err.message
        ]
      );
    } catch (logErr) {
      console.error("[Fallback Log Error]", logErr.message);
    }
  }

  res.status(500).json({ error: err.message });
}

// ✅ Export both functions
module.exports = {
  logRequest,
  logError
};