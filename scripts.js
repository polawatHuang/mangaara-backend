/**
 * Utility Scripts for Manga-Ara Backend
 * 
 * Run these scripts to perform common administrative tasks
 * Usage: node scripts.js <command>
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'mangaa_admin',
  password: 'Betterlife-2025',
  database: 'manga_ara'
};

// ============================================
// SCRIPT FUNCTIONS
// ============================================

/**
 * Create an admin user
 */
async function createAdmin(email, password, displayName) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      console.log('❌ User already exists with this email');
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert admin user
    const [result] = await connection.execute(
      'INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [email, passwordHash, displayName, 'admin', true]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('User ID:', result.insertId);
    console.log('Email:', email);
    console.log('Role: admin');
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    await connection.end();
  }
}

/**
 * Reset user password
 */
async function resetPassword(email, newPassword) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [passwordHash, email]
    );
    
    if (result.affectedRows === 0) {
      console.log('❌ User not found');
      return;
    }
    
    // Delete all sessions for this user
    await connection.execute(
      'DELETE FROM sessions WHERE user_id = (SELECT user_id FROM users WHERE email = ?)',
      [email]
    );
    
    console.log('✅ Password reset successfully!');
    console.log('All sessions have been invalidated.');
  } catch (err) {
    console.error('❌ Error resetting password:', err.message);
  } finally {
    await connection.end();
  }
}

/**
 * List all users
 */
async function listUsers() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [rows] = await connection.execute(
      'SELECT user_id, email, display_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );
    
    console.log('\n📋 All Users:');
    console.log('─'.repeat(100));
    rows.forEach(user => {
      console.log(`ID: ${user.user_id} | ${user.email} | ${user.display_name || 'N/A'} | Role: ${user.role} | Active: ${user.is_active ? 'Yes' : 'No'}`);
    });
    console.log('─'.repeat(100));
    console.log(`Total users: ${rows.length}\n`);
  } catch (err) {
    console.error('❌ Error listing users:', err.message);
  } finally {
    await connection.end();
  }
}

/**
 * Clean up expired sessions
 */
async function cleanupSessions() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [result] = await connection.execute(
      'DELETE FROM sessions WHERE expires_at < NOW()'
    );
    
    console.log(`✅ Cleaned up ${result.affectedRows} expired sessions`);
  } catch (err) {
    console.error('❌ Error cleaning up sessions:', err.message);
  } finally {
    await connection.end();
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('\n📊 Database Statistics:');
    console.log('─'.repeat(50));
    
    // Count manga
    const [manga] = await connection.execute('SELECT COUNT(*) as count FROM manga');
    console.log(`📚 Manga: ${manga[0].count}`);
    
    // Count episodes
    const [episodes] = await connection.execute('SELECT COUNT(*) as count FROM manga_episodes');
    console.log(`📖 Episodes: ${episodes[0].count}`);
    
    // Count users
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${users[0].count}`);
    
    // Count comments
    const [comments] = await connection.execute('SELECT COUNT(*) as count FROM comment_on_episode');
    console.log(`💬 Comments: ${comments[0].count}`);
    
    // Count recommendations
    const [recommends] = await connection.execute('SELECT COUNT(*) as count FROM recommend');
    console.log(`⭐ Recommendations: ${recommends[0].count}`);
    
    // Count favorites
    const [favorites] = await connection.execute('SELECT COUNT(*) as count FROM favorite_manga');
    console.log(`❤️  Favorites: ${favorites[0].count}`);
    
    // Count active sessions
    const [sessions] = await connection.execute('SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()');
    console.log(`🔐 Active Sessions: ${sessions[0].count}`);
    
    console.log('─'.repeat(50) + '\n');
  } catch (err) {
    console.error('❌ Error getting statistics:', err.message);
  } finally {
    await connection.end();
  }
}

/**
 * Promote user to admin
 */
async function promoteToAdmin(email) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [result] = await connection.execute(
      'UPDATE users SET role = ? WHERE email = ?',
      ['admin', email]
    );
    
    if (result.affectedRows === 0) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User promoted to admin successfully!');
  } catch (err) {
    console.error('❌ Error promoting user:', err.message);
  } finally {
    await connection.end();
  }
}

/**
 * Moderate pending comments
 */
async function moderateComments() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [rows] = await connection.execute(
      `SELECT c.comment_id, c.manga_id, c.episode, c.commenter, c.comment, c.created_date,
              m.manga_name
       FROM comment_on_episode c
       LEFT JOIN manga m ON c.manga_id = m.manga_id
       WHERE c.status = 'pending'
       ORDER BY c.created_date DESC
       LIMIT 20`
    );
    
    if (rows.length === 0) {
      console.log('✅ No pending comments to moderate');
      return;
    }
    
    console.log('\n💬 Pending Comments:');
    console.log('─'.repeat(100));
    rows.forEach(comment => {
      console.log(`ID: ${comment.comment_id}`);
      console.log(`Manga: ${comment.manga_name || comment.manga_id} - ${comment.episode}`);
      console.log(`From: ${comment.commenter}`);
      console.log(`Comment: ${comment.comment.substring(0, 100)}${comment.comment.length > 100 ? '...' : ''}`);
      console.log(`Date: ${comment.created_date}`);
      console.log('─'.repeat(100));
    });
    console.log(`\nTotal pending comments: ${rows.length}\n`);
    console.log('To approve: UPDATE comment_on_episode SET status = "published" WHERE comment_id = <id>;');
    console.log('To reject: UPDATE comment_on_episode SET status = "rejected" WHERE comment_id = <id>;\n');
  } catch (err) {
    console.error('❌ Error fetching comments:', err.message);
  } finally {
    await connection.end();
  }
}

// ============================================
// COMMAND LINE INTERFACE
// ============================================

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  console.log('\n🚀 Manga-Ara Backend Utility Scripts\n');
  
  switch (command) {
    case 'create-admin':
      if (args.length < 3) {
        console.log('Usage: node scripts.js create-admin <email> <password> <displayName>');
        console.log('Example: node scripts.js create-admin admin@example.com admin123 "Admin User"');
        break;
      }
      await createAdmin(args[0], args[1], args[2]);
      break;
      
    case 'reset-password':
      if (args.length < 2) {
        console.log('Usage: node scripts.js reset-password <email> <newPassword>');
        console.log('Example: node scripts.js reset-password user@example.com newpass123');
        break;
      }
      await resetPassword(args[0], args[1]);
      break;
      
    case 'list-users':
      await listUsers();
      break;
      
    case 'cleanup-sessions':
      await cleanupSessions();
      break;
      
    case 'stats':
      await getDatabaseStats();
      break;
      
    case 'promote':
      if (args.length < 1) {
        console.log('Usage: node scripts.js promote <email>');
        console.log('Example: node scripts.js promote user@example.com');
        break;
      }
      await promoteToAdmin(args[0]);
      break;
      
    case 'moderate':
      await moderateComments();
      break;
      
    default:
      console.log('Available commands:');
      console.log('');
      console.log('  create-admin <email> <password> <displayName>  - Create a new admin user');
      console.log('  reset-password <email> <newPassword>           - Reset user password');
      console.log('  list-users                                     - List all users');
      console.log('  cleanup-sessions                               - Remove expired sessions');
      console.log('  stats                                          - Show database statistics');
      console.log('  promote <email>                                - Promote user to admin');
      console.log('  moderate                                       - View pending comments');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts.js create-admin admin@mangaara.com admin123 "Admin"');
      console.log('  node scripts.js list-users');
      console.log('  node scripts.js stats');
      console.log('');
  }
}

main().catch(console.error);
