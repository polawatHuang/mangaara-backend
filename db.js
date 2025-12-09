// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'cipacmeet_manga',
  password: 'Betterlife-2025',
  database: 'cipacmeet_manga',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('[Database Error] Failed to connect to MariaDB:', err.message);
    console.error('[Database Error] Code:', err.code);
  } else {
    console.log('[Database] Successfully connected to MariaDB');
    connection.release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[Database Pool Error]', err.message);
});

module.exports = pool.promise();