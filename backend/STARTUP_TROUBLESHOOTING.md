# PillPulse Backend Startup Troubleshooting Guide

## Quick Start Commands

```bash
# Navigate to backend directory
cd backend

# Install dependencies (after fixing package.json)
npm install

# Start development server
npm run dev

# Start production server
npm start

# Test health endpoint
curl http://localhost:3000/api/health
```

## Issues Fixed

### 1. ✅ RESOLVED: Crypto Dependency Issue
**Problem:** Package.json included deprecated `crypto` dependency
**Fix:** Removed `crypto` from dependencies (it's a built-in Node.js module)

### 2. ✅ RESOLVED: Deprecated Encryption Methods
**Problem:** Using `crypto.createCipher()` and `crypto.createDecipher()` (removed in Node.js 17+)
**Fix:** Updated to use `crypto.createCipherGCM()` and `crypto.createDecipherGCM()`

### 3. ✅ RESOLVED: Auth Middleware Database Query
**Problem:** Missing `updated_at` field in user queries for token validation
**Fix:** Added `updated_at` to SELECT queries in auth middleware

## Common Startup Issues & Solutions

### Issue 1: Port Already in Use
**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. Kill process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:3000 | xargs kill -9
   ```

2. Use different port:
   ```bash
   PORT=3001 npm start
   ```

### Issue 2: Database Connection Issues
**Symptoms:**
```
❌ Error opening database: SQLITE_CANTOPEN
```

**Solutions:**
1. Check database file permissions
2. Ensure backend directory exists and is writable
3. Delete and recreate database:
   ```bash
   rm pillpulse.db*
   npm start  # Will recreate database
   ```

### Issue 3: Missing Environment Variables
**Symptoms:**
```
⚠️ Using derived encryption key. Set ENCRYPTION_KEY environment variable for production.
```

**Solutions:**
1. Create `.env` file in backend directory:
   ```env
   NODE_ENV=development
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
   ENCRYPTION_KEY=generate-32-byte-hex-key-for-production
   FRONTEND_URL=http://localhost:5173
   ```

2. Generate secure keys for production:
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Issue 4: CORS Issues
**Symptoms:**
- Frontend can't connect to backend
- CORS policy errors in browser console

**Solutions:**
1. Check FRONTEND_URL in .env matches your frontend URL
2. Ensure frontend is running on expected port (default: 5173)
3. Verify CORS configuration in server.js

### Issue 5: Import/Export Module Errors
**Symptoms:**
```
SyntaxError: Cannot use import statement outside a module
```

**Solutions:**
1. Verify `"type": "module"` exists in package.json ✅ (Already correct)
2. Check all import statements use `.js` extensions ✅ (Already correct)
3. Ensure all route files export default ✅ (Already correct)

### Issue 6: Database Schema Issues
**Symptoms:**
```
❌ Error executing schema statement: table already exists
```

**Solutions:**
1. Database schema is designed to handle existing tables with `IF NOT EXISTS`
2. If issues persist, delete database and restart:
   ```bash
   rm pillpulse.db*
   npm start
   ```

## Health Check Endpoints

After starting the server, verify these endpoints work:

```bash
# Basic health check
curl http://localhost:3000/api/health

# Expected response:
{
  "success": true,
  "message": "PillPulse API is running",
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:30:00.000Z",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

## Database Verification

Check if database was created successfully:

```bash
# List database files
ls -la pillpulse.db*

# Check database tables (requires sqlite3 CLI)
sqlite3 pillpulse.db ".tables"

# Expected tables:
# adherence_records  schedules         settings          users
```

## Default Admin Account

The system creates a default admin account on first startup:
- **Email:** admin@pillpulse.local
- **Password:** admin123
- **Role:** admin

**⚠️ SECURITY:** Change the default admin password immediately in production!

## Frontend Connection Test

Test if frontend can connect to backend:

```bash
# From frontend directory
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pillpulse.local",
    "password": "admin123"
  }'
```

Expected response should include a JWT token.

## Startup Logs Analysis

Successful startup should show:
```
🔄 Initializing database...
📄 Connected to SQLite database at: /path/to/pillpulse.db
📊 Schema progress: 1/9 statements completed
📊 Schema progress: 2/9 statements completed
...
✅ Database schema initialized successfully
👑 Default admin user created
✅ Default data initialization completed
✅ Database initialized successfully
🚀 PillPulse API server running on port 3000
📊 Health check: http://localhost:3000/api/health
🌐 Frontend URL: http://localhost:5173
📝 Environment: development
```

## Performance Monitoring

The server includes built-in request logging:
- 🔵 Request start
- ✅ Successful responses (2xx)
- ⚠️ Client errors (4xx)  
- ❌ Server errors (5xx)
- 🐌 Slow requests (>1000ms)

## Security Features

The backend includes these security features:
- JWT authentication with token validation
- Password hashing with bcrypt (12 salt rounds)
- API key encryption using AES-256-GCM
- Rate limiting (100 requests per 15 minutes per IP)
- Helmet security headers
- CORS protection
- Input validation with express-validator
- SQL injection protection via parameterized queries

## Next Steps

1. Start the backend server
2. Verify health endpoint responds
3. Start the frontend development server
4. Test login with default admin account
5. Create additional user accounts as needed

## Need Help?

If you encounter issues not covered here:
1. Check the console logs for specific error messages
2. Verify all dependencies are installed correctly
3. Ensure Node.js version is 16+ (required for ES modules)
4. Check file permissions for database directory
5. Verify network connectivity between frontend and backend