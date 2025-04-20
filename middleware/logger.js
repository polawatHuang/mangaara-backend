// middleware/logger.js (append this function)

async function logError(err, req, res, next) {
  console.error("[API Error]", err.message);

  // Update log if it exists
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
    // Log directly if not recorded yet
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

module.exports = { logRequest, logError };