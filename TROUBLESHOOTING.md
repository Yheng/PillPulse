# PillPulse Troubleshooting Guide

## Quick Fixes for Common Issues

### 1. Empty Dashboard After Login

**Problem**: Dashboard loads but shows no data, console errors present.

**Solution**:
```bash
# 1. Ensure backend is running
cd backend
npm install
npm run dev

# 2. Check if backend is accessible
curl http://localhost:3000/api/health

# 3. Restart frontend with cleared cache
cd frontend
npm run dev -- --force
```

### 2. "Cannot read properties of undefined" Errors

**Cause**: Authentication context not properly initialized.

**Fixed in latest code**: Added PrivateRoute component and improved context dependencies.

### 3. API Connection Issues

**Check**:
- Backend server running on port 3000
- Frontend proxy configuration working
- No firewall blocking localhost connections

**Verify**:
```bash
# Test API directly
curl http://localhost:3000/api/health

# Should return:
# {"success":true,"message":"PillPulse API is running","data":{...}}
```

### 4. Login Fails

**Default Admin Account**:
- Email: `admin@pillpulse.local`
- Password: `admin123`

**Database Issues**:
```bash
# Delete database to reset (CAUTION: loses all data)
rm backend/pillpulse.db

# Restart backend to recreate database
cd backend
npm run dev
```

### 5. Build/Start Errors

**Frontend Issues**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Backend Issues**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Environment Setup

### Backend (.env file)
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secure-jwt-secret-here
```

### Quick Start Commands
```bash
# From project root
npm run install:all  # Install all dependencies
npm run dev          # Start both frontend and backend
```

## Verification Steps

### 1. Backend Health Check
Visit: http://localhost:3000/api/health

Expected response:
```json
{
  "success": true,
  "message": "PillPulse API is running",
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-24T...",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

### 2. Frontend Loading
Visit: http://localhost:5173

Should redirect to login page if not authenticated.

### 3. Database Initialization
Check backend logs for:
```
🔄 Initializing database...
✅ Database initialized successfully
👑 Default admin user created
🚀 PillPulse API server running on port 3000
```

## Common Console Errors Fixed

1. **"TypeError: Cannot read properties of undefined (reading 'isAuthenticated')"**
   - ✅ Fixed: Added proper route protection with PrivateRoute component

2. **"Network Error" on API calls**
   - ✅ Fixed: Added axios baseURL configuration

3. **"401 Unauthorized" errors**
   - ✅ Fixed: Improved token validation and auth flow

4. **Empty schedules array**
   - ✅ Fixed: Corrected context dependency chain

## Getting Help

If issues persist:

1. Check browser DevTools Console for specific errors
2. Check browser DevTools Network tab for failed API calls
3. Check backend terminal logs for server errors
4. Verify both servers are running on correct ports:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## Reset Everything (Nuclear Option)

```bash
# Stop all processes
# Kill any running dev servers

# Clean and reinstall
rm -rf node_modules frontend/node_modules backend/node_modules
rm -rf frontend/dist backend/pillpulse.db
rm package-lock.json frontend/package-lock.json backend/package-lock.json

# Fresh install
npm run install:all

# Start fresh
npm run dev
```

The issues you encountered have been fixed in the latest code updates. The main problems were:
1. Missing route protection (added PrivateRoute component)
2. Authentication context timing issues (fixed dependencies)
3. API base URL configuration (added to AuthContext)