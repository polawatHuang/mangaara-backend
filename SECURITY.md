# Security & Environment Configuration

## Overview
All sensitive data has been moved to environment variables for security.

## Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your actual values:**
   - Replace `your_database_user` with your actual database username
   - Replace `your_database_password` with your actual database password
   - Generate a strong admin API key
   - Update CORS origins with your actual domains

3. **Install dependencies including dotenv:**
   ```bash
   npm install
   ```

4. **Verify `.env` is in `.gitignore`** (already done)

## Environment Variables

### Database Configuration
- `DB_HOST` - Database host (default: localhost)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password (REQUIRED)
- `DB_NAME` - Database name
- `DB_CONNECTION_LIMIT` - Max connections (default: 10)

### Server Configuration
- `PORT` - Server port (default: 443)
- `NODE_ENV` - Environment (production/development)

### Security
- `ADMIN_API_KEY` - Admin authentication key
- `CORS_ORIGINS` - Comma-separated allowed origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

### File Storage
- `UPLOAD_BASE_PATH` - Base path for file uploads
- `SESSION_EXPIRY_DAYS` - Session expiration in days (default: 7)

## Sensitive Data Removed

✅ **Files cleaned:**
- `db.js` - Database credentials
- `server.js` - CORS origins, rate limits
- `middleware/auth.js` - Admin API key
- All route files - Upload paths

## Security Checklist

- [x] Database credentials in environment variables
- [x] Admin API key in environment variables
- [x] Upload paths configurable
- [x] CORS origins configurable
- [x] Rate limiting configurable
- [x] `.env` in `.gitignore`
- [x] `.env.example` provided for reference
- [x] Fallback values for non-sensitive settings

## Production Deployment

1. Set environment variables on your hosting platform
2. Never commit `.env` file
3. Use strong passwords and API keys
4. Regularly rotate API keys
5. Monitor access logs
6. Keep dependencies updated

## Testing

Test that environment variables are loaded:
```bash
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"
```
