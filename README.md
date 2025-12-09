# Manga-Ara Backend

MySQL-based backend API for the Manga-Ara manga reading platform. Migrated from Firebase to MySQL for better performance and control.

## 🚀 Features

- **Complete CRUD Operations** for all manga-related data
- **User Authentication** with session-based tokens
- **Role-based Access Control** (Admin/User)
- **Image Upload** support for manga, episodes, advertisements, and recommendations
- **Advanced Queries** - Search, filter by tags, trending manga, latest episodes
- **Comment System** with moderation
- **Recommendation System** for users to suggest manga
- **Favorites System** for bookmarking manga
- **Advertisement Management**
- **Dynamic Menu Management**
- **Security Features** - Helmet, CORS, Rate Limiting
- **Request Logging** middleware

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL 8.0+
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd mangaara-backend-1
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up the database

#### Create the database
```bash
mysql -u root -p
CREATE DATABASE manga_ara;
CREATE USER 'mangaa_admin'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON manga_ara.* TO 'mangaa_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Import the schema
```bash
mysql -u mangaa_admin -p manga_ara < database-schema.sql
```

### 4. Configure database connection

Edit `db.js` with your database credentials:
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'mangaa_admin',
  password: 'your_password',
  database: 'manga_ara',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

### 5. (Optional) Create .env file
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=mangaa_admin
DB_PASSWORD=your_password
DB_NAME=manga_ara
ADMIN_API_KEY=your_secret_admin_key
PORT=443
```

### 6. Start the server
```bash
npm start
```

Server will run on `https://localhost:443`

## 📁 Project Structure

```
mangaara-backend-1/
├── routes/
│   ├── manga.js         # Manga CRUD operations
│   ├── episodes.js      # Episode management
│   ├── tags.js          # Tag/genre management
│   ├── comments.js      # Comment system
│   ├── recommend.js     # Recommendations
│   ├── advertise.js     # Advertisement management
│   ├── menubar.js       # Menu management
│   ├── users.js         # User authentication & management
│   ├── favorites.js     # Favorite manga
│   ├── logs.js          # Request logs
│   └── test.js          # DB connection test
├── middleware/
│   ├── auth.js          # Authentication middleware
│   └── logger.js        # Request logging
├── libs/
│   └── safeJsonArray.js # JSON utility functions
├── db.js                # Database connection pool
├── server.js            # Express server setup
├── database-schema.sql  # MySQL database schema
├── package.json
├── API_DOCUMENTATION.md # Complete API docs
└── README.md
```

## 📚 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete endpoint documentation.

### Quick API Overview

| Route | Description |
|-------|-------------|
| `/api/mangas` | Manga CRUD, search, trending |
| `/api/episodes` | Episode management & page uploads |
| `/api/tags` | Genre/category management |
| `/api/comments` | Comment system with moderation |
| `/api/recommend` | User recommendations |
| `/api/advertise` | Advertisement banners |
| `/api/menubar` | Navigation menu |
| `/api/users` | Authentication & user management |
| `/api/favorites` | User favorites |
| `/api/logs` | Request logs |

## 🔐 Authentication

### Register a user
```bash
POST /api/users/register
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "User Name"
}
```

### Login
```bash
POST /api/users/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

Returns a session token that expires in 7 days.

### Use token in requests
```bash
Authorization: Bearer YOUR_TOKEN
```
or
```bash
x-auth-token: YOUR_TOKEN
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Configured for specific domains
- **Rate Limiting** - 1000 requests per 50 minutes
- **bcrypt** - Password hashing
- **Session-based Authentication**
- **SQL Injection Protection** - Parameterized queries

## 📊 Database Schema

The database includes:
- **11 tables** for complete manga platform functionality
- **Foreign key constraints** for data integrity
- **Indexes** for optimized queries
- **JSON columns** for flexible tag arrays
- **Fulltext search** on manga names

See `database-schema.sql` for complete schema with sample data.

## 🖼️ Image Storage

Images are stored in:
```
/var/www/vhosts/mangaara.com/httpdocs/images/
├── manga/           # Manga cover images & episodes
├── recommend/       # Recommendation images
└── advertise/       # Advertisement banners
```

Configure the paths in respective route files if using different storage.

## 🧪 Testing the API

### Test database connection
```bash
GET /api/test
```

### Create a tag
```bash
POST /api/tags
{
  "tag_name": "แฟนตาซี"
}
```

### Create a manga
```bash
POST /api/mangas
Content-Type: multipart/form-data

manga_name: My Manga
manga_slug: my-manga-slug
manga_disc: Description here
tag_id: ["แฟนตาซี","แอคชั่น"]
manga_bg_img: [file upload]
```

## 🔄 Migration from Firebase

This backend replaces Firebase Firestore with MySQL. Key changes:

1. **Nested arrays** → Separate tables (`manga_episodes`)
2. **Real-time listeners** → REST API polling or WebSockets
3. **Firebase Auth** → Session-based JWT tokens
4. **Firestore queries** → SQL queries
5. **Firebase Storage** → Can continue using or migrate to local/S3

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_USER` | Database user | mangaa_admin |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | manga_ara |
| `ADMIN_API_KEY` | Admin access key | - |
| `PORT` | Server port | 443 |

## 🚦 Development

### Start in development mode
```bash
node server.js
```

### Enable detailed logging
Update `middleware/logger.js` to log more details.

### Test routes
Use Postman, Thunder Client, or curl to test endpoints.

## 🐛 Troubleshooting

### Database connection errors
- Check MySQL is running: `sudo systemctl status mysql`
- Verify credentials in `db.js`
- Check firewall allows port 3306

### Image upload errors
- Verify directory permissions
- Check multer configuration
- Ensure file size limits are appropriate

### CORS errors
- Add your frontend domain to `server.js` CORS config
- Check request headers

## 📦 Dependencies

- **express** - Web framework
- **mysql2** - MySQL client
- **multer** - File upload handling
- **bcryptjs** - Password hashing
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting
- **body-parser** - Request body parsing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

ISC

## 👥 Authors

Manga-Ara Development Team

## 🙏 Acknowledgments

- Migrated from Firebase to MySQL for better control and performance
- Built with Express.js and MySQL2
- Inspired by modern manga reading platforms
