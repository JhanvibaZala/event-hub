---
name: react-redux-patterns
description: Guidelines and architectural patterns for React, Redux Toolkit, React Router, React Hook Form, and Axios in the EventHub frontend application.
---

# React & Redux Toolkit Architecture Standards

This skill defines the frontend architecture and coding conventions for the EventHub single-page application.

---

## 1. Redux Toolkit Architecture

1. **Store Structure:**
   - Organize state into feature-based slices: `authSlice`, `eventsSlice`, `registrationsSlice`, `notificationsSlice`, `uiSlice`.
   - Single root store configured in `src/app/store.ts` using `configureStore`.
   - Typed hook exports: `useAppDispatch: () => AppDispatch` and `useAppSelector: TypedUseSelectorHook<RootState>`.

2. **Async Thunks Pattern:**
   - Use `createAsyncThunk` for asynchronous operations.
   - Handle loading, success, and error states explicitly in `extraReducers(builder => ...)`:
     - `builder.addCase(action.pending, ...)`
     - `builder.addCase(action.fulfilled, ...)`
     - `builder.addCase(action.rejected, ...)`

3. **Auth State & Access Token Management:**
   - Store `accessToken` and `user` profile in `authSlice`.
   - Persist token in `localStorage` for session retention.
   - On logout or 401 error, clear token and reset state.

---

## 2. Axios Service & Interceptors

Centralize API communication in `src/services/api.ts`:
- **Request Interceptor:** Automatically extracts `accessToken` from Redux state or `localStorage` and appends `Authorization: Bearer ${token}`.
- **Response Interceptor:**
  - Unboxes the common backend response envelope (`response.data.data` -> returns data directly).
  - Handles 401 errors globally: dispatches logout action and redirects to `/login`.
  - Triggers toast notifications on errors (400, 403, 404, 500).

---

## 3. Routing & Protection Guards

1. **Route Hierarchy (`src/routes/AppRoutes.tsx`):**
   - Public Routes: `/events`, `/events/:id`, `/login`, `/register`, `/verify-otp`, `/reset-password`.
   - Protected Routes (`<ProtectedRoute>`): `/my-registrations`, `/profile`, `/notifications`. Redirects to `/login` if unauthenticated.
   - Admin Routes (`<AdminRoute>`): `/admin/events`, `/admin/events/create`, `/admin/events/:id/edit`, `/admin/events/:id/registrations`. Redirects to `/events` if user role is not `ADMIN`.

---

## 4. Forms & React Hook Form

- Use `react-hook-form` for all user input forms (`LoginForm`, `RegisterForm`, `OtpForm`, `EventCreateForm`).
- Controlled validation rules with clear error messaging.
- Prevent duplicate submissions by disabling submit buttons when `isSubmitting` is true.

---

## 5. UI Feedback & Interaction Patterns

- **Loading States:** Display skeleton loaders or spinners during network requests.
- **Empty States:** Render informative empty state components with call-to-action buttons when lists contain 0 items.
- **Modals:** Modal components for confirmation actions (e.g. ticket cancellation, event deletion).
- **Debounced Live Search:** Connect search inputs to a `useDebounce` hook (300ms–400ms delay) before triggering API queries.
