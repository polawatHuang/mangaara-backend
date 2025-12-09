// db.js
require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'cipacmeet_manga',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cipacmeet_manga',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
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