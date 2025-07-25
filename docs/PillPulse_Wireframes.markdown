# PillPulse Wireframe Specifications

This document provides detailed wireframe specifications for the PillPulse app, designed for implementation in Figma or similar tools. Each wireframe includes layout, components, dimensions, Tailwind CSS classes (for styling reference), and interaction notes. The color palette is Blue (#2196F3), Light Green (#81C784), White (#FFFFFF), Gray (#B0BEC5), and Soft Teal (#26A69A).

## Design Notes
- **Units**: Pixels (px) for desktop; responsive scaling for mobile (vw/vh or rem).
- **Typography**: Roboto (sans-serif), 16px base, 24px headers, 14px secondary text.
- **Accessibility**: WCAG 2.1 compliant (high contrast, keyboard navigation).
- **Animations**: Framer Motion transitions (e.g., fade-in, slide-up) noted where applicable.

## 1. Login Screen
### Purpose
Secure authentication for users and admins.

### Layout
- **Canvas**: 1440x900px (desktop), 375x667px (mobile).
- **Background**: White (#FFFFFF, `bg-white`).
- **Card**: Centered, 400x500px (desktop), 90% width (mobile), `bg-white shadow-lg rounded-lg p-8`.
- **Components**:
  - **Logo**: Top, 150x50px, `text-blue-500`, centered, fade-in animation (0.5s).
  - **Email Field**: 300x40px, `border border-gray-300 rounded-md p-2`, placeholder: “Email”.
  - **Password Field**: 300x40px, `border border-gray-300 rounded-md p-2`, placeholder: “Password”.
  - **Submit Button**: 300x40px, `bg-green-400 hover:bg-teal-500 text-white rounded-md`, text: “Log In”.
  - **Sign Up Link**: Below, `text-blue-500 hover:underline`, text: “Sign Up”.
  - **Forgot Password Link**: Below, `text-blue-500 hover:underline`, text: “Forgot Password?”.
- **Spacing**:
  - 20px between logo and email field.
  - 15px between fields and button.
  - 10px between links.
- **Mobile**:
  - Card: 90% width, `p-4`.
  - Fields/Button: Full width, `w-full`.
- **Interactions**:
  - Error message (red, `text-red-500`) below fields on invalid input.
  - Submit button hover: `hover:bg-teal-500`.
  - Keyboard focus: `focus:ring-2 ring-blue-500`.

## 2. User Dashboard
### Purpose
Overview of schedules, reminders, and adherence analytics.

### Layout
- **Canvas**: 1440x900px (desktop), 375x667px (mobile).
- **Background**: White (#FFFFFF, `bg-white`).
- **Header**: 1440x60px, `bg-blue-500 text-white`, sticky top.
- **Main Content**: Grid (2-column desktop, 1-column mobile).
  - **Left (Schedules)**: 60% width, `p-4`.
  - **Right (Analytics)**: 40% width, `p-4`.
- **Components**:
  - **Header**:
    - Profile Icon: 40x40px, `text-gray-400 hover:text-teal-500`, right-aligned.
    - Logout: 40x40px, `text-gray-400 hover:text-teal-500`, right-aligned.
    - Settings: 40x40px, `text-gray-400 hover:text-teal-500`, right-aligned.
  - **Schedules**:
    - Card List: 300x100px per card, `bg-white shadow-md rounded-md p-4`, slide-up animation (0.3s).
    - Card Content: Medication name (16px, `text-blue-500`), time (14px, `text-gray-600`), checkmark (`text-green-400`) for completed.
  - **Analytics**:
    - Chart (Chart.js): 400x300px, `bg-white shadow-md rounded-md`, Blue #2196F3 bars.
    - Streak Badge: 150x50px, `bg-green-400 text-white rounded-full`, text: “5 Days Streak!”.
  - **Quick Actions**:
    - Buttons: 150x40px, `bg-blue-500 hover:bg-teal-500 text-white rounded-md`, text: “Add Schedule”, “View Analytics”, “Caregiver Sync”.
- **Spacing**:
  - 20px between header and content.
  - 15px between schedule cards.
  - 10px between quick action buttons.
- **Mobile**:
  - Stack vertically: Header, Schedules, Analytics, Quick Actions.
  - Chart: 90% width.
- **Interactions**:
  - Schedule card swipe (mobile): Mark as taken.
  - Chart hover: Tooltip with data (e.g., “90% adherence on July 20”).
  - Button hover: `hover:bg-teal-500`.

## 3. Schedule Management
### Purpose
Create, edit, or delete medication schedules.

### Layout
- **Canvas**: 1440x900px (desktop), 375x667px (mobile).
- **Background**: White (#FFFFFF, `bg-white`).
- **Modal (Add/Edit)**: 500x600px (desktop), 90% width (mobile), `bg-white shadow-lg rounded-lg p-6`, fade-in animation (0.3s).
- **List View**: Below modal, scrollable, `p-4`.
- **Components**:
  - **Modal Form**:
    - Fields: Medication Name, Dosage, Frequency (dropdown), Time (time picker), Notes (textarea), each 400x40px, `border border-gray-300 rounded-md p-2`.
    - Calendar Picker: 400x300px, `bg-white shadow-md`.
    - Save Button: 150x40px, `bg-green-400 hover:bg-teal-500 text-white rounded-md`.
    - Cancel Button: 150x40px, `bg-gray-400 hover:bg-gray-500 text-white rounded-md`.
  - **List**:
    - Schedule Cards: 300x80px, `bg-white shadow-md rounded-md p-4`, edit/delete icons (`text-blue-500`, `text-red-500`).
- **Spacing**:
  - 15px between form fields.
  - 10px between buttons.
  - 15px between list cards.
- **Mobile**:
  - Modal: Full-screen, `p-4`.
  - List: Full-width cards.
- **Interactions**:
  - Autocomplete for medication name (dropdown, `bg-white shadow-md`).
  - Error messages (red, `text-red-500`) for invalid fields.
  - Delete confirmation: Modal (`bg-white shadow-lg`).

## 4. Settings Page
### Purpose
Manage profile, API key, and notification preferences.

### Layout
- **Canvas**: 1440x900px (desktop), 375x667px (mobile).
- **Background**: White (#FFFFFF, `bg-white`).
- **Tabs**: 1440x50px, `bg-gray-100`, Blue #2196F3 active tab border.
- **Content Area**: `p-6`, `bg-white shadow-md rounded-md`.
- **Components**:
  - **Tabs**: Profile, API, Notifications, Caregiver, 150x40px each, `text-blue-500 hover:bg-teal-100`.
  - **Profile Tab**:
    - Email/Password Fields: 400x40px, `border border-gray-300 rounded-md p-2`.
    - Save Button: 150x40px, `bg-green-400 hover:bg-teal-500 text-white rounded-md`.
  - **API Tab**:
    - API Key Field: 400x40px, `border border-gray-300 rounded-md p-2`, masked input.
  - **Notifications Tab**:
    - Toggles: Push, Email, SMS, `bg-gray-400 checked:bg-blue-500`.
    - Frequency Slider: 400x40px, `bg-gray-200`.
  - **Caregiver Tab**:
    - Email Field: 400x40px, `border border-gray-300 rounded-md p-2`.
    - Add Button: 150x40px, `bg-green-400 hover:bg-teal-500 text-white rounded-md`.
- **Spacing**:
  - 10px between tabs.
  - 15px between fields/buttons.
- **Mobile**:
  - Tabs: Scrollable horizontally.
  - Content: Full-width, `p-4`.
- **Interactions**:
  - Tab switch: Slide animation (Framer Motion, 0.3s).
  - Save confirmation: Modal (`bg-white shadow-lg`).
  - Toggle hover: `hover:bg-teal-500`.

## 5. Admin Dashboard
### Purpose
Manage users, schedules, API keys, and settings.

### Layout
- **Canvas**: 1440x900px (desktop), 375x667px (mobile).
- **Background**: White (#FFFFFF, `bg-white`).
- **Sidebar**: 250x900px (desktop), hidden (mobile, toggleable), `bg-blue-500 text-white`.
- **Main Content**: `p-6`, `bg-white shadow-md rounded-md`.
- **Components**:
  - **Sidebar**: Links (Users, Schedules, API, Settings, Logs), 200x40px each, `hover:bg-teal-500`.
  - **Users Table**: Columns (ID, Email, Status), 1000x500px, `bg-white shadow-md`, edit/ban buttons (`text-blue-500`, `text-red-500`).
  - **Schedules Table**: Columns (User, Medication, Time), 1000x500px, `bg-white shadow-md`.
  - **API Key Management**: Generate/Revoke buttons, 150x40px, `bg-green-400 hover:bg-teal-500`.
  - **Settings**: Frequency sliders, notification toggles, `bg-gray-200`.
  - **Audit Log**: Table (Timestamp, Action, User), 1000x500px, `bg-white shadow-md`.
- **Spacing**:
  - 15px between sidebar links.
  - 10px between table rows.
- **Mobile**:
  - Sidebar: Hamburger menu, slide-in animation.
  - Tables: Scrollable horizontally.
- **Interactions**:
  - Search bar: 300x40px, `border border-gray-300 rounded-md p-2`.
  - Export CSV button: `bg-blue-500 hover:bg-teal-500`.
  - Row hover: `hover:bg-gray-100`.

## 6. Reminder Notification
### Purpose
Deliver AI-driven reminders.

### Layout
- **Canvas**: 300x150px (desktop pop-up), 90% width (mobile), `bg-teal-500 text-white rounded-lg`.
- **Components**:
  - **Text**: Medication name (16px, `text-white`), time (14px, `text-gray-200`), AI message (14px, `text-white`).
  - **Buttons**: Taken (150x40px, `bg-green-400 hover:bg-green-500`), Snooze (150x40px, `bg-gray-400 hover:bg-gray-500`).
- **Spacing**:
  - 10px between text and buttons.
  - 10px between buttons.
- **Mobile**:
  - Full-screen modal, `p-4`.
- **Interactions**:
  - Escalation: Bold text for urgent reminders (`font-bold`).
  - Snooze options: Dropdown (10, 30, 60 min), `bg-white text-gray-600`.

## Implementation Notes
- **Figma Setup**:
  - Create artboards for each screen (1440x900px desktop, 375x667px mobile).
  - Use Roboto font, import Tailwind CSS colors (#2196F3, #81C784, #FFFFFF, #B0BEC5, #26A69A).
  - Add auto-layout for responsive scaling.
  - Prototype interactions (e.g., button hovers, modal transitions).
- **Assets**:
  - Icons: Use Heroicons (e.g., checkmark, profile, logout).
  - Charts: Mock Chart.js bar/line charts.
- **Export**:
  - Export as PNG/SVG for developer handoff.
  - Share Figma link with interactive prototype.