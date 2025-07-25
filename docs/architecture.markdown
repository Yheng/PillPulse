# PillPulse Architecture

## System Overview
PillPulse is a full-stack web application designed to enhance medication adherence for chronic illness patients, built as a portfolio project for GitHub to showcase healthcare tech expertise, particularly in API design and analytics implementation. It features a React frontend (Vite, Tailwind CSS, Chart.js, Framer Motion) for intuitive user/admin interfaces and a Node.js/Express backend with SQLite for secure, local data storage. The app integrates a user-provided OpenAI API key for AI-driven reminders, processed locally to ensure privacy. Users manage medication schedules and view adherence analytics (stacked bar, line, pie charts), while admins oversee users, schedules, and reminder settings via a dashboard. The architecture prioritizes modularity, secure data handling (bcrypt, AES-256), and clean, documented code to appeal to both backend and frontend recruiters. It emphasizes robust API design for CRUD operations, analytics data retrieval, and export functionality (e.g., PNG chart exports), with comprehensive documentation (80% coverage per PRD) for GitHub. The app runs locally, with no cloud deployment, ensuring simplicity and portfolio readiness.

## Technology Stack
- **Frontend**:
  - React 18: Component-based UI (dashboard, analytics, settings).
  - Vite: Build tool for fast development and bundling.
  - Tailwind CSS: Responsive styling with color palette (Blue #2196F3, Light Green #81C784, White #FFFFFF, Gray #B0BEC5, Soft Teal #26A69A).
  - Chart.js: Visualizations (stacked bar, line, pie) for adherence analytics.
  - Framer Motion: Animations for modals, charts, buttons.
- **Backend**:
  - Node.js 18: Runtime for Express server.
  - Express: REST API for CRUD and analytics.
  - SQLite: Local database for users, schedules, and settings.
- **Integration**:
  - OpenAI API: Local processing of AI-driven reminders via user-provided API key.
- **Tools**:
  - Git: Version control for GitHub.
  - Jest: Unit testing for backend logic (70% coverage per PRD).

## System Architecture
- **Frontend (React/Vite)**:
  - Components: Homepage, UserDashboard, AnalyticsPage, SettingsPage, AdminDashboard.
  - State Management: React Context for user data, schedules, and analytics.
  - Routing: React Router for navigation (e.g., /login, /dashboard, /analytics).
  - Data Fetching: Axios for API calls to Express backend.
  - Visualizations: Chart.js for stacked bar (adherence by medication), line (trends), pie (missed doses), with Framer Motion animations.
- **Backend (Node.js/Express)**:
  - REST API: Handles CRUD for schedules, users, and settings.
  - Middleware: Authentication (JWT), input validation, error handling.
  - SQLite: Local database for persistent storage.
  - OpenAI Integration: Local Node.js module to process reminders using user API key.
- **Data Flow**:
  - User inputs schedule via React form → API POST to Express → SQLite storage.
  - AnalyticsPage fetches data via API GET → Chart.js renders visualizations.
  - Admin dashboard fetches user/schedule data via API → Displays tables.
  - OpenAI API calls triggered locally for reminders, cached in SQLite.
- **Diagram (Text-Based)**:
  ```
  [User] --> [React Frontend (Vite, Tailwind, Chart.js, Framer Motion)]
              | (Axios API Calls)
              v
  [Express Backend (Node.js)] --> [SQLite DB]
              | (Local Processing)
              v
  [OpenAI API (User Key)]
  ```

## Database Schema
- **Users Table**:
  - `id`: INTEGER, PRIMARY KEY, AUTO_INCREMENT
  - `email`: TEXT, UNIQUE, NOT NULL
  - `password`: TEXT, NOT NULL (bcrypt encrypted)
  - `api_key`: TEXT, NULL (AES-256 encrypted)
  - `role`: TEXT, NOT NULL (user/admin)
- **Schedules Table**:
  - `id`: INTEGER, PRIMARY KEY, AUTO_INCREMENT
  - `user_id`: INTEGER, FOREIGN KEY (Users.id)
  - `medication_name`: TEXT, NOT NULL
  - `dosage`: TEXT, NOT NULL
  - `time`: TEXT, NOT NULL (e.g., “08:00”)
  - `frequency`: TEXT, NOT NULL (e.g., “daily”)
- **Adherence Records Table**:
  - `id`: INTEGER, PRIMARY KEY, AUTO_INCREMENT
  - `schedule_id`: INTEGER, FOREIGN KEY (Schedules.id)
  - `date`: TEXT, NOT NULL (e.g., “2025-07-24”)
  - `taken`: BOOLEAN, NOT NULL (true/false)
- **Settings Table**:
  - `id`: INTEGER, PRIMARY KEY, AUTO_INCREMENT
  - `admin_id`: INTEGER, FOREIGN KEY (Users.id)
  - `reminder_frequency`: TEXT, NOT NULL (e.g., “hourly”)
  - `reminder_format`: TEXT, NOT NULL (e.g., “text”)

## API Endpoints
- **User Endpoints**:
  - `POST /api/users/register`: Create user (email, password), returns JWT.
  - `POST /api/users/login`: Authenticate user, returns JWT.
  - `PUT /api/users/settings`: Update email, password, API key (JWT auth).
  - `POST /api/schedules`: Create schedule (name, dosage, time, frequency).
  - `GET /api/schedules`: List user schedules, supports query parameters (`?start_date=2025-07-01&end_date=2025-07-31`).
  - `PUT /api/schedules/:id`: Update schedule.
  - `DELETE /api/schedules/:id`: Delete schedule.
  - `GET /api/analytics`: Fetch adherence data (rate, missed doses, trends), supports query parameters (`?start_date=2025-07-01&end_date=2025-07-31&medication_id=1`).
  - `POST /api/adherence`: Log adherence (taken/not taken).
  - `GET /api/analytics/export/:chart_type`: Export chart data as PNG (e.g., `stacked-bar`, `line`, `pie`), returns base64-encoded image.
- **Admin Endpoints** (JWT auth, admin role):
  - `GET /api/admin/users`: List all users.
  - `PUT /api/admin/users/:id`: Update user (email, role, API key).
  - `DELETE /api/admin/users/:id`: Delete user.
  - `GET /api/admin/schedules`: List all schedules, supports query parameters (`?start_date=2025-07-01&end_date=2025-07-31`).
  - `PUT /api/admin/schedules/:id`: Update schedule.
  - `DELETE /api/admin/schedules/:id`: Delete schedule.
  - `PUT /api/admin/settings`: Update reminder frequency/format.
- **Response Format**: JSON, e.g., `{ success: true, data: {...}, error: null }` (except for PNG export, which returns base64 string).
- **Error Handling**: HTTP status codes (400, 401, 500), descriptive messages.
- **Query Parameters**:
  - `start_date`, `end_date`: Filter schedules/analytics by date range (ISO format, e.g., “2025-07-24”).
  - `medication_id`: Filter analytics for specific medication.

## Security
- **Authentication**: JWT for user/admin access, validated by Express middleware.
- **Data Encryption**:
  - Passwords: bcrypt (PRD success criteria).
  - API Keys: AES-256 in SQLite (PRD success criteria).
- **Input Validation**: Sanitize inputs to prevent SQL injection and XSS.
- **Local Processing**: OpenAI API calls processed locally, no external storage.
- **HIPAA Considerations**:
  - Documented in PRD: Data privacy, secure storage.
  - Architecture supports encryption and local storage for future compliance.
- **Error Logging**: Log errors locally (no cloud), accessible to admins.

## Assumptions and Constraints
- **Constraints**:
  - No deployment; local development for GitHub portfolio.
  - Manual UI design with React/Tailwind, no v0/Lovable.
  - SQLite for local storage, no cloud database.
  - User-provided OpenAI API key for reminders.
- **Assumptions**:
  - Local environment supports Node.js 18+, React 18+, SQLite.
  - Valid OpenAI API key provided by user.
  - Analytics focus on basic metrics (adherence rate, missed doses).
  - Portfolio audience values code quality and healthcare relevance.

## Next Steps
- Finalize architecture based on stakeholder feedback (completed).
- Transition to Product Owner for story creation and development sharding.
- Begin implementation of React frontend, Express backend, and SQLite integration.