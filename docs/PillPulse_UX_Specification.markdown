# PillPulse UX Specification and Functional Requirements

## Overview
PillPulse is a healthcare app designed to improve medication adherence for chronic illness patients using AI-driven reminders, local schedule management, and admin controls. This specification outlines the user experience (UX), wireframes, and enhanced functionality to create a modular, user-centric application that goes beyond basic CRUD operations.

## Design Principles
- **Behavioral Nudge Theory**: Incorporate timely, personalized reminders to encourage adherence (20–30% improvement per Thaler & Sunstein, 2008).
- **Privacy**: Local storage of schedules via SQLite; optional OpenAI API for AI features.
- **Accessibility**: Clear layouts, high-contrast colors (Blue #2196F3, Light Green #81C784, Soft Teal #26A69A, White #FFFFFF, Gray #B0BEC5), and WCAG 2.1 compliance.
- **Modularity**: Independent components for schedules, reminders, analytics, and admin controls.
- **Intuitive UX**: Simple navigation, minimal clicks, and visual feedback.

## User Roles
1. **Users**: Patients or caregivers managing medication schedules and receiving reminders.
2. **Admins**: Manage users, API keys, and system settings (e.g., reminder frequency).

## Functional Requirements
Beyond basic CRUD (Create, Read, Update, Delete) for schedules, the app includes:
1. **AI-Driven Reminders**:
   - Analyze user adherence patterns (local SQLite) to suggest optimal reminder times.
   - Escalate reminders (e.g., gentle nudge → urgent alert) based on missed doses.
   - Support custom AI or OpenAI API for natural language reminders (e.g., “Time for your 2 PM dose of Metformin!”).
2. **Adherence Analytics**:
   - Visualize adherence trends using Chart.js (e.g., weekly/monthly compliance rates).
   - Exportable reports for users and caregivers.
3. **Caregiver Sync**:
   - Allow caregivers to monitor schedules and adherence via shared access (read-only or edit).
4. **Gamification**:
   - Streak tracking (e.g., “5 days in a row!”) with badges to motivate adherence.
   - Progress bars for daily/weekly goals.
5. **Multi-Platform Notifications**:
   - Push notifications (mobile), email, or SMS (configurable via settings).
6. **Medication Insights**:
   - Optional integration with public drug databases (via API) for side effect info or drug interactions.
7. **Emergency Alerts**:
   - Notify caregivers or emergency contacts if critical doses are missed (configurable).
8. **Onboarding Tutorial**:
   - Interactive guide for first-time users with Framer Motion animations.
9. **Admin Dashboard**:
   - Bulk user management, API key rotation, and reminder frequency settings.
   - Audit logs for system changes.

## Wireframes
Each screen is designed for clarity, with Tailwind CSS for styling and Framer Motion for animations. Below are high-level wireframe descriptions for key screens.

### 1. Login Screen
- **Purpose**: Secure user/admin authentication.
- **Components**:
  - Email and password fields (centered, rounded inputs, Blue #2196F3 borders).
  - “Sign Up” link for new users.
  - “Forgot Password” link.
  - Submit button (Light Green #81C784, hover: Soft Teal #26A69A).
- **Layout**:
  - Centered card layout on White #FFFFFF background.
  - Logo at top, animated fade-in (Framer Motion).
- **UX Notes**:
  - Error messages in red below inputs for failed logins.
  - Accessibility: High-contrast text, keyboard navigation.

### 2. User Dashboard
- **Purpose**: Overview of schedules, reminders, and adherence.
- **Components**:
  - **Header**: Profile icon, logout, settings (Gray #B0BEC5 icons).
  - **Today’s Schedule**: List of medications (time, name, dose) with checkmarks for completed doses.
  - **Adherence Chart**: Bar/line chart (Chart.js) showing weekly adherence (Blue #2196F3 bars).
  - **Streak Counter**: Animated badge (Framer Motion) for adherence streaks (Light Green #81C784).
  - **Quick Actions**: “Add Schedule,” “View Analytics,” “Caregiver Sync” buttons.
- **Layout**:
  - Grid layout: Schedule (left, 60%), Chart (right, 40%).
  - Responsive: Stacks vertically on mobile.
- **UX Notes**:
  - Swipeable schedule cards on mobile.
  - Tooltips for chart data points.

### 3. Schedule Management
- **Purpose**: Create/edit/delete medication schedules.
- **Components**:
  - Form: Medication name, dosage, frequency (daily, weekly), time, notes.
  - Calendar picker for start/end dates.
  - Save/Cancel buttons (Light Green #81C784, Gray #B0BEC5).
  - List view of existing schedules with edit/delete icons.
- **Layout**:
  - Modal for adding/editing (White #FFFFFF background, Soft Teal #26A69A accents).
  - List below form, scrollable on mobile.
- **UX Notes**:
  - Autocomplete for medication names (optional API integration).
  - Validation for required fields (red error text).

### 4. Settings Page
- **Purpose**: Manage user profile, API key, and notification preferences.
- **Components**:
  - Profile: Update email/password.
  - API Key: Input field for OpenAI/custom AI key (securely stored in SQLite).
  - Notifications: Toggle push, email, SMS; set reminder frequency.
  - Caregiver Sync: Add caregiver email for shared access.
- **Layout**:
  - Tabbed interface: Profile, API, Notifications, Caregiver.
  - Save button per tab (Light Green #81C784).
- **UX Notes**:
  - Confirmation modal for sensitive changes (e.g., password).
  - Animated transitions between tabs (Framer Motion).

### 5. Admin Dashboard
- **Purpose**: Manage users, schedules, and system settings.
- **Components**:
  - **User Management**: Table of users (ID, email, status) with ban/restore options.
  - **Schedule Overview**: View all schedules, filter by user.
  - **API Key Management**: Generate/revoke API keys.
  - **Settings**: Adjust global reminder frequency, notification types.
  - **Audit Log**: Table of system changes (timestamp, action, user).
- **Layout**:
  - Sidebar navigation (Blue #2196F3) for Users, Schedules, API, Settings, Logs.
  - Main content area with tables and forms (White #FFFFFF).
- **UX Notes**:
  - Search bar for user/schedule filtering.
  - Export logs as CSV.

### 6. Reminder Notification
- **Purpose**: Deliver AI-driven reminders.
- **Components**:
  - Medication name, dose, time.
  - “Taken” or “Snooze” buttons (Light Green #81C784, Gray #B0BEC5).
  - Optional AI message (e.g., “Don’t forget your Metformin!”).
- **Layout**:
  - Pop-up notification (mobile) or browser alert (web).
  - Soft Teal #26A69A background, White #FFFFFF text.
- **UX Notes**:
  - Escalation: Bold text for urgent reminders.
  - Snooze options: 10, 30, 60 minutes.

## Technical Implementation
- **Frontend**: React (via Vite), Tailwind CSS, Framer Motion for animations, Chart.js for analytics.
- **Backend**: Node.js, Express for API, SQLite for local storage.
- **AI**: Local pattern analysis (custom logic) or OpenAI API for natural language reminders.
- **Security**:
  - Encrypt API keys in SQLite.
  - JWT for user/admin authentication.
  - HTTPS for API endpoints.
- **Modularity**:
  - Components: ScheduleCard, ReminderPopup, AdherenceChart.
  - Services: ScheduleService, ReminderService, AnalyticsService.
  - APIs: `/schedules`, `/users`, `/admin`, `/analytics`.

## Additional Features
1. **Offline Mode**: Cache schedules/reminders in SQLite for offline access.
2. **Multi-Language Support**: English, Spanish, etc., for accessibility.
3. **Voice Input**: Allow users to log schedules via voice (Web Speech API).
4. **Dark Mode**: Toggleable theme (Gray #B0BEC5 background, White #FFFFFF text).

## Success Metrics
- **Adherence Rate**: Target 20–30% improvement (tracked via analytics).
- **User Retention**: Measure daily active users.
- **Caregiver Engagement**: Track shared access usage.
- **Admin Efficiency**: Monitor time to manage users/settings.

## Next Steps
1. Prototype wireframes in Figma for stakeholder feedback.
2. Develop modular React components and Express APIs.
3. Test AI reminder accuracy with sample data.
4. Conduct usability testing with patients and caregivers.