# PillPulse

A full-stack web application for medication adherence tracking, designed for chronic illness patients. Built with React 18, Node.js, Express, and SQLite to help users manage medication schedules and track adherence patterns.

## Features

### User Features
- **Medication Schedule Management**: Add, edit, and delete medication schedules
- **Adherence Tracking**: Log daily medication intake (taken/missed)
- **Analytics Dashboard**: View adherence statistics with interactive charts
- **Responsive Design**: Works on desktop and mobile devices
- **Secure Authentication**: JWT-based user authentication and authorization

### Admin Features
- **User Management**: View and manage user accounts
- **Schedule Oversight**: Monitor all medication schedules across users
- **System Statistics**: View platform-wide usage and adherence metrics
- **Settings Management**: Configure system-wide reminder settings

### Analytics & Reporting
- **Stacked Bar Charts**: Daily adherence by medication
- **Line Charts**: Adherence trends over time
- **Pie Charts**: Overall adherence distribution
- **Export Functionality**: Download charts as PNG images
- **Insights**: AI-generated recommendations for improving adherence

## Technology Stack

### Frontend
- **React 18**: Modern component-based UI framework
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first styling with custom PillPulse color palette
- **Chart.js**: Interactive data visualizations
- **Framer Motion**: Smooth animations and transitions
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication

### Backend
- **Node.js 18**: JavaScript runtime environment
- **Express**: Web framework for REST API
- **SQLite**: Local database for data persistence
- **bcrypt**: Password hashing for security
- **JWT**: Stateless authentication tokens
- **AES-256**: Encryption for sensitive data (API keys)
- **Express Validator**: Input validation and sanitization

### Security Features
- **Password Hashing**: bcrypt with 12 salt rounds
- **API Key Encryption**: AES-256-GCM encryption for OpenAI API keys
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against API abuse
- **CORS Configuration**: Secure cross-origin requests

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Docker and Docker Compose (optional)

### Option 1: Docker (Recommended)

1. **Clone and start**
   ```bash
   git clone <repository-url>
   cd PillPulse
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Option 2: Manual Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PillPulse
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies and all workspace packages
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit .env files with your configuration
   # At minimum, set a secure JWT_SECRET and ENCRYPTION_KEY
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend concurrently
   npm run dev
   
   # Or start individually:
   npm run dev:frontend  # React dev server on http://localhost:5173
   npm run dev:backend   # Express server on http://localhost:3000
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/api/health

### Default Admin Account
- **Email**: admin@pillpulse.local
- **Password**: admin123
- **⚠️ Change these credentials immediately after first login**

## Project Structure

```
PillPulse/
├── README.md
├── package.json                 # Root package.json with workspaces
├── architecture.markdown        # System architecture documentation
├── frontend/                    # React frontend application
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── main.jsx            # Application entry point
│   │   ├── App.jsx             # Main App component with routing
│   │   ├── index.css           # Global styles and Tailwind imports
│   │   ├── components/         # Reusable UI components
│   │   │   └── Navbar.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── context/            # React context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── ScheduleContext.jsx
│   │   ├── hooks/              # Custom React hooks
│   │   └── utils/              # Utility functions
└── backend/                     # Express backend API
    ├── package.json
    ├── server.js               # Main server file
    ├── .env.example            # Environment variables template
    ├── src/
    │   ├── models/
    │   │   └── database.js     # SQLite database setup and queries
    │   ├── routes/             # API route handlers
    │   │   ├── userRoutes.js
    │   │   ├── scheduleRoutes.js
    │   │   ├── adherenceRoutes.js
    │   │   ├── analyticsRoutes.js
    │   │   └── adminRoutes.js
    │   ├── middleware/         # Express middleware
    │   │   ├── auth.js
    │   │   ├── errorHandler.js
    │   │   └── requestLogger.js
    │   └── utils/              # Utility functions
    │       └── encryption.js
    └── pillpulse.db            # SQLite database file (created on first run)
```

## API Documentation

### Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### User Endpoints
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User authentication
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password
- `PUT /api/users/api-key` - Update OpenAI API key

### Schedule Endpoints
- `GET /api/schedules` - List user schedules
- `POST /api/schedules` - Create new schedule
- `GET /api/schedules/:id` - Get specific schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `GET /api/schedules/today` - Get today's schedules

### Adherence Endpoints
- `POST /api/adherence` - Log medication adherence
- `GET /api/adherence` - Get adherence history
- `GET /api/adherence/:id` - Get specific adherence record
- `PUT /api/adherence/:id` - Update adherence record
- `DELETE /api/adherence/:id` - Delete adherence record

### Analytics Endpoints
- `GET /api/analytics` - Get comprehensive analytics
- `GET /api/analytics/streak` - Get adherence streak data
- `GET /api/analytics/export/:chart_type` - Export chart as PNG

### Admin Endpoints (Admin Role Required)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user (admin)
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/schedules` - List all schedules
- `DELETE /api/admin/schedules/:id` - Delete schedule
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings
- `GET /api/admin/stats` - Get system statistics

## Development

### Running Tests
```bash
# Run backend tests
cd backend
npm test

# Run tests in watch mode
npm run test:watch
```

### Code Style
The project follows modern JavaScript/React conventions:
- ES6+ syntax with modules
- Functional components with hooks
- Async/await for promises
- Comprehensive error handling
- JSDoc comments for documentation

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secure-jwt-secret
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
RATE_LIMIT_MAX=100
```

### Database Schema

#### Users Table
- `id`: Primary key
- `email`: Unique user email
- `password`: bcrypt hashed password
- `api_key`: AES-256 encrypted OpenAI API key
- `role`: User role (user/admin)

#### Schedules Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `medication_name`: Name of medication
- `dosage`: Dosage information
- `time`: Time to take medication (HH:MM)
- `frequency`: daily/weekly/monthly

#### Adherence Records Table
- `id`: Primary key
- `schedule_id`: Foreign key to schedules
- `date`: Date of adherence record (YYYY-MM-DD)
- `taken`: Boolean (true/false)
- `notes`: Optional notes

#### Settings Table
- `id`: Primary key
- `admin_id`: Foreign key to admin user
- `reminder_frequency`: Frequency of reminders
- `reminder_format`: Format of reminders

## Security Considerations

### Data Protection
- **Password Security**: bcrypt hashing with 12 salt rounds
- **API Key Encryption**: AES-256-GCM encryption for OpenAI API keys
- **Local Processing**: OpenAI API calls processed locally, no external data storage
- **Input Validation**: Comprehensive validation using express-validator
- **SQL Injection Prevention**: Parameterized queries throughout

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with configurable expiration
- **Role-based Access**: Separate user and admin functionality
- **Resource Ownership**: Users can only access their own data
- **Admin Protection**: Admin users cannot delete themselves

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Configuration**: Restricted to frontend domain
- **Security Headers**: Helmet.js for security headers
- **Error Handling**: No sensitive information in error responses

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

### Quick Deployment Options

#### Docker Production
```bash
# Production deployment with Docker
docker-compose -f docker-compose.prod.yml up -d
```

#### Manual Production Build
```bash
# Build frontend for production
npm run build

# Start backend in production mode
cd backend
NODE_ENV=production npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong, unique values for `JWT_SECRET` and `ENCRYPTION_KEY`
3. Configure `FRONTEND_URL` to your actual domain
4. Set up HTTPS in production
5. Configure proper logging and monitoring

### Database Backup
```bash
# Backup SQLite database
cp backend/pillpulse.db backup/pillpulse-$(date +%Y%m%d).db

# Restore from backup
cp backup/pillpulse-20250124.db backend/pillpulse.db
```

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make changes with proper documentation
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Submit a pull request

### Code Standards
- **Documentation**: 80% comment coverage for functions and components
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Validation**: Input validation on both frontend and backend
- **Security**: Follow security best practices
- **Performance**: Optimize for speed and memory usage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions:
1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. For security issues, please report privately

## Architecture Notes

This application is designed as a portfolio project showcasing:
- **Full-stack Development**: React frontend with Express backend
- **Healthcare Technology**: HIPAA-compliant design patterns
- **API Design**: RESTful APIs with comprehensive documentation
- **Security**: Industry-standard security practices
- **Analytics**: Data visualization and insights generation
- **Database Design**: Normalized schema with proper relationships
- **Code Quality**: Well-documented, maintainable code

The application runs entirely locally with no cloud dependencies, making it suitable for privacy-sensitive healthcare data while demonstrating technical capabilities for potential employers.