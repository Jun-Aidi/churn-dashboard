# Implementation Plan: Landing Page, Login & Admin

## Overview

This plan implements three features on the existing Churn Dashboard: a public landing page, JWT-based authentication with route protection and rate limiting, and an admin panel for user management and system statistics. The backend uses Flask + SQLAlchemy (Python) and the frontend uses React + TailwindCSS + React Router.

## Tasks

- [x] 1. Set up backend auth infrastructure
  - [x] 1.1 Create User model and update database schema
    - Create `backend/app/models/user.py` with the User SQLAlchemy model (id, name, email, password_hash, role, is_active, created_at, failed_login_attempts, locked_until)
    - Add nullable `user_id` foreign key column to existing Customer and Prediction models in `backend/app/database.py`
    - Update `init_db()` in `backend/app/database.py` to create the users table and seed default admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables
    - Add `bcrypt`, `PyJWT` to `backend/requirements.txt`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 1.2 Create JWT utility module
    - Create `backend/app/utils/jwt_utils.py` with `create_token(user)` and `decode_token(token)` functions
    - Token payload: user_id, email, role, exp (24h)
    - Use HS256 with a `JWT_SECRET` from environment/config
    - Add `JWT_SECRET` to `backend/config.py`
    - _Requirements: 2.1, 3.4_

  - [x] 1.3 Create rate limiter module
    - Create `backend/app/utils/rate_limiter.py` with `LoginRateLimiter` class
    - Implement in-memory dict with TTL: 5 attempts per email, 5-minute lockout
    - Methods: `is_locked(email)`, `record_failure(email)`, `reset(email)`
    - _Requirements: 2.9_

  - [x] 1.4 Create auth middleware decorators
    - Create `backend/app/middleware/auth.py` with `auth_required` and `admin_required` decorators
    - `auth_required`: validate JWT from Authorization header, inject `current_user` into Flask `g`
    - `admin_required`: extends `auth_required` with role check for 'admin'
    - Return 401 for invalid/missing tokens, 403 for non-admin access
    - _Requirements: 3.2, 3.6, 5.6, 8.4, 8.8_

- [x] 2. Implement auth endpoints
  - [x] 2.1 Create auth Blueprint with login, logout, and me endpoints
    - Create `backend/app/routes/auth_routes.py` with `auth_bp` Blueprint
    - `POST /api/auth/login`: validate credentials, check active status, check rate limiter, return JWT + user info
    - `POST /api/auth/logout`: placeholder (client-side invalidation)
    - `GET /api/auth/me`: return current user profile (requires auth)
    - Uniform error message "Email atau password salah" for invalid credentials
    - Error "Akun Anda telah dinonaktifkan" for inactive accounts
    - Error "Terlalu banyak percobaan. Coba lagi dalam 5 menit." for rate limited
    - _Requirements: 2.1, 2.2, 2.4, 2.8, 2.9, 8.1_

  - [x] 2.2 Create admin user management endpoints
    - Add to `backend/app/routes/auth_routes.py`:
    - `GET /api/auth/users`: list all users (admin only)
    - `POST /api/auth/users`: create user with validation (name 1-100, valid email, password ≥ 8, role in admin/user)
    - `PUT /api/auth/users/<id>`: update user fields
    - `POST /api/auth/users/<id>/deactivate`: deactivate user (prevent self-deactivation)
    - `POST /api/auth/users/<id>/activate`: activate user
    - Return 409 for duplicate email
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9_

  - [x] 2.3 Create admin system stats endpoint
    - Add `GET /api/auth/stats` to auth Blueprint (admin only)
    - Return: active_users, inactive_users, total_customers, total_predictions, total_chat_sessions
    - Query counts from users, customers, predictions, chat_history tables
    - Return 503 if database unavailable
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 2.4 Register auth Blueprint and protect existing endpoints
    - Register `auth_bp` in `backend/app/__init__.py` with url_prefix `/api/auth`
    - Add `auth_required` decorator to existing blueprint routes (customers, predict, trend, upload, chat)
    - Update existing routes to filter data by `current_user.id` (user_id column)
    - Handle upload to replace only current user's data
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 8.1, 8.3_

- [x] 3. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement frontend auth layer
  - [x] 4.1 Create AuthContext provider
    - Create `frontend/src/contexts/AuthContext.jsx`
    - Provide: user, token, login(), logout(), isAuthenticated, isAdmin
    - Persist token to localStorage, auto-check validity on mount via `GET /api/auth/me`
    - Clear token and redirect on 401
    - _Requirements: 2.4, 3.3, 3.5_

  - [x] 4.2 Update API layer with auth interceptor
    - Update `frontend/src/api/index.js` to attach `Authorization: Bearer <token>` header to all requests
    - Add 401 response handler: clear localStorage token, redirect to `/login`
    - Add auth API functions: `loginApi(email, password)`, `logoutApi()`, `getMeApi()`, `getUsersApi()`, `createUserApi(data)`, `updateUserApi(id, data)`, `deactivateUserApi(id)`, `activateUserApi(id)`, `getStatsApi()`
    - _Requirements: 3.6, 3.7, 8.3_

  - [x] 4.3 Create ProtectedRoute component
    - Create `frontend/src/components/auth/ProtectedRoute.jsx`
    - Redirect to `/login` with returnUrl query param if not authenticated
    - Render children if authenticated
    - _Requirements: 3.1_

- [x] 5. Implement frontend pages
  - [x] 5.1 Create Landing Page
    - Create `frontend/src/pages/LandingPage.jsx`
    - Hero section: product title, description (≤200 chars), CTA button linking to `/login`
    - Features grid: exactly 3 items (prediksi churn, analisis pelanggan, chatbot AI) with titles and descriptions
    - Navigation with login link
    - Redirect to dashboard if user already authenticated
    - Responsive: mobile (≥320px) to desktop with 768px breakpoint
    - Use TailwindCSS only
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 5.2 Create Login Page
    - Create `frontend/src/pages/Login.jsx`
    - Email + password form with client-side validation (email format, password ≥ 8 chars)
    - Display backend error messages
    - On success: redirect to dashboard or saved returnUrl
    - Redirect to dashboard if already authenticated
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7_

  - [x] 5.3 Create Admin Page
    - Create `frontend/src/pages/Admin.jsx`
    - User management section: user list table (name, email, role, status, created_at), create/edit/deactivate/activate actions
    - System stats section: cards showing active_users, inactive_users, total_customers, total_predictions, total_chat_sessions
    - Form validation for create/edit (same rules as backend)
    - Error display for duplicate email, self-deactivation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.4 Update App.jsx routing and Layout
    - Add routes: `/` → LandingPage (public), `/login` → Login (public), `/dashboard` → Dashboard (protected), `/admin` → Admin (protected, admin only)
    - Wrap existing protected routes with ProtectedRoute
    - Add AuthContext provider wrapping BrowserRouter
    - Update Sidebar/Layout to show Admin tab only for admin role
    - Add logout button to layout
    - Handle empty data state with message and navigation to upload
    - _Requirements: 1.7, 2.5, 3.1, 4.4, 8.2, 8.5, 8.6_

- [x] 6. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Backend property-based tests
  - [ ]* 7.1 Write property test for JWT token claims
    - **Property 1: JWT token contains correct claims**
    - **Validates: Requirements 2.1, 3.4**
    - Create `backend/tests/conftest.py` with test fixtures (test DB, test users)
    - Create `backend/tests/test_auth_properties.py`
    - Use Hypothesis to verify for any valid user, the JWT decodes to correct id, email, role, and exp = 24h

  - [ ]* 7.2 Write property test for invalid credentials uniform error
    - **Property 2: Invalid credentials produce uniform error**
    - **Validates: Requirements 2.2**
    - For any email/password where email unregistered OR password wrong, response is same error message

  - [ ]* 7.3 Write property test for inactive account rejection
    - **Property 3: Inactive account login rejection**
    - **Validates: Requirements 2.8**
    - For any user with is_active=False, login with correct credentials returns account-disabled error

  - [ ]* 7.4 Write property test for rate limiting
    - **Property 4: Rate limiting enforces lockout after threshold**
    - **Validates: Requirements 2.9**
    - After 5 consecutive failures for any email, subsequent attempts are blocked for 5 minutes

  - [ ]* 7.5 Write property test for invalid token rejection
    - **Property 5: Invalid tokens are rejected by protected endpoints**
    - **Validates: Requirements 3.2, 3.3, 8.4**
    - For any malformed, expired, or bad-signature token, endpoint returns 401

  - [ ]* 7.6 Write property test for data ownership on upload
    - **Property 6: Data ownership on upload**
    - **Validates: Requirements 4.1, 4.3, 4.7**
    - Uploaded data is tagged with user_id; re-upload replaces only that user's data

  - [ ]* 7.7 Write property test for data isolation on query
    - **Property 7: Data isolation on query**
    - **Validates: Requirements 4.2, 4.6**
    - Query responses only contain records matching the requesting user's user_id

  - [ ]* 7.8 Write property test for valid user creation
    - **Property 8: Valid user creation persists correctly**
    - **Validates: Requirements 5.2**
    - For any valid input, user is created with correct fields and bcrypt-hashed password

  - [ ]* 7.9 Write property test for account activation round-trip
    - **Property 9: Account activation round-trip**
    - **Validates: Requirements 5.4, 5.5**
    - Deactivate then reactivate restores login ability; while deactivated login is rejected

  - [ ]* 7.10 Write property test for non-admin access control
    - **Property 10: Non-admin users cannot access admin endpoints**
    - **Validates: Requirements 5.6**
    - For any user with role='user', admin endpoints return 403

  - [ ]* 7.11 Write property test for duplicate email rejection
    - **Property 11: Duplicate email rejection**
    - **Validates: Requirements 5.7**
    - Creating user with existing email fails without modifying existing record

  - [ ]* 7.12 Write property test for system statistics accuracy
    - **Property 12: System statistics accuracy**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - Stats endpoint returns counts matching actual database row counts

  - [ ]* 7.13 Write property test for password hashing round-trip
    - **Property 13: Password hashing round-trip**
    - **Validates: Requirements 7.6**
    - For any password, bcrypt.checkpw returns True for original and False for any other string

- [ ] 8. Frontend unit tests
  - [ ]* 8.1 Write unit tests for Landing Page
    - Create `frontend/src/__tests__/LandingPage.test.jsx`
    - Test: renders hero section, 3 feature items, CTA button, login navigation link
    - Test: authenticated user is redirected to dashboard
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [ ]* 8.2 Write unit tests for Login Page
    - Create `frontend/src/__tests__/Login.test.jsx`
    - Test: form validation (invalid email, short password)
    - Test: error messages displayed from backend
    - Test: redirect on successful login
    - Test: authenticated user redirected to dashboard
    - _Requirements: 2.2, 2.3, 2.6, 2.7_

  - [ ]* 8.3 Write unit tests for ProtectedRoute and AuthContext
    - Create `frontend/src/__tests__/ProtectedRoute.test.jsx` and `frontend/src/__tests__/AuthContext.test.jsx`
    - Test: unauthenticated user redirected to login with returnUrl
    - Test: logout clears localStorage and redirects
    - Test: 401 response triggers token cleanup
    - _Requirements: 3.1, 3.3, 3.5, 3.7_

  - [ ]* 8.4 Write unit tests for Admin Page
    - Create `frontend/src/__tests__/Admin.test.jsx`
    - Test: renders user list and stats cards
    - Test: admin cannot self-deactivate (error shown)
    - Test: duplicate email error shown
    - _Requirements: 5.1, 5.7, 5.8, 6.1_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses Python (Flask, SQLAlchemy, bcrypt, PyJWT, Hypothesis for PBT)
- Frontend uses JavaScript/React (React Router, TailwindCSS, Vitest/React Testing Library for tests)
- The existing API response format is preserved; only data filtering by user_id is added
- Indonesian language is used for all user-facing error messages as specified in the design

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.13"] },
    { "id": 8, "tasks": ["7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3", "8.4"] }
  ]
}
```
