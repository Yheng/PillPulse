# PillPulse Deployment Guide

This guide covers deployment options for the PillPulse medication adherence tracking application.

## Prerequisites

- Node.js 18 or later
- Docker and Docker Compose (for containerized deployment)
- Git

## Environment Setup

### 1. Clone and Setup

```bash
git clone <repository-url>
cd PillPulse
```

### 2. Environment Configuration

#### Frontend Environment
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

#### Backend Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### 3. Security Configuration

For production deployment, ensure you:

1. **Generate secure secrets:**
   ```bash
   # JWT Secret (64+ characters)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Encryption Key (32 bytes)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update environment variables:**
   - Set `NODE_ENV=production`
   - Use strong, unique secrets
   - Configure proper CORS origins
   - Enable HTTPS in production

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Production
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Manual Deployment

#### Backend Setup
```bash
cd backend
npm install
npm run build  # If build step exists
npm start
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run preview  # Or serve dist/ with your web server
```

### Option 3: Cloud Deployment

#### Heroku
1. Create Heroku apps for frontend and backend
2. Set environment variables in Heroku dashboard
3. Deploy using Git or GitHub integration

#### AWS/GCP/Azure
1. Use container services (ECS, Cloud Run, Container Instances)
2. Configure environment variables
3. Set up load balancers and SSL certificates

## Database Management

### SQLite (Default)
- Database file: `backend/data/pillpulse.db`
- Ensure data directory is persistent in containers
- Regular backups recommended

### Migration to Production Database
For high-traffic deployments, consider migrating to PostgreSQL or MySQL:

1. Update database configuration in backend
2. Install appropriate database drivers
3. Update connection strings
4. Migrate existing data

## Security Considerations

### Production Checklist
- [ ] Use HTTPS only (`FORCE_HTTPS=true`)
- [ ] Strong JWT secrets (64+ characters)
- [ ] Proper CORS configuration
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor for suspicious activity

### Recommended Security Headers
```nginx
# Nginx configuration example
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Monitoring and Logging

### Application Logs
- Backend logs: `backend/logs/pillpulse.log`
- Configure log rotation
- Monitor error rates

### Health Checks
- Backend: `GET /health`
- Frontend: Check if app loads correctly
- Database: Verify connection

### Metrics to Monitor
- Response times
- Error rates
- Database performance
- User registration/login rates
- Medication adherence tracking accuracy

## Backup and Recovery

### Database Backups
```bash
# Manual backup
cp backend/data/pillpulse.db backups/pillpulse-$(date +%Y%m%d).db

# Automated backup (cron example)
0 2 * * * cp /path/to/pillpulse.db /backups/pillpulse-$(date +\%Y\%m\%d).db
```

### Environment Configuration Backup
- Store environment configurations securely
- Use secret management services in production
- Document all configuration changes

## Troubleshooting

### Common Issues

1. **Frontend can't connect to backend**
   - Check `VITE_API_URL` in frontend .env
   - Verify backend is running and accessible
   - Check CORS configuration

2. **Database connection issues**
   - Ensure data directory exists and is writable
   - Check file permissions
   - Verify SQLite is installed

3. **Authentication failures**
   - Verify `JWT_SECRET` matches between sessions
   - Check token expiration settings
   - Ensure HTTPS in production

4. **Performance issues**
   - Enable database query optimization
   - Implement caching strategies
   - Monitor resource usage

### Log Analysis
```bash
# View backend logs
tail -f backend/logs/pillpulse.log

# Docker container logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Scaling Considerations

### Horizontal Scaling
- Load balance multiple backend instances
- Use external database (PostgreSQL/MySQL)
- Implement session storage (Redis)
- CDN for frontend assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching layers

## Support and Maintenance

### Regular Maintenance Tasks
- [ ] Update dependencies monthly
- [ ] Review security logs weekly
- [ ] Test backup restoration quarterly
- [ ] Performance monitoring ongoing
- [ ] User feedback integration

### Version Updates
1. Test in staging environment
2. Backup database before updates
3. Follow semantic versioning
4. Document breaking changes
5. Communicate maintenance windows

For additional support, please refer to the project documentation or create an issue in the repository.