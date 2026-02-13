# Authentication Implementation

Epic 2 is now complete. This document describes the authentication system.

## Overview

JeffBoard uses Firebase Authentication with Google Sign-In. The PWA is read-only for authenticated users, with all writes happening via the CLI tool.

## Architecture

### Components

1. **LoginPage** (`src/components/auth/LoginPage.tsx`)
   - Mobile-first sign-in page with JeffBoard branding
   - Handles Google OAuth flow
   - Displays error messages if sign-in fails
   - Shows loading state during authentication

2. **AuthProvider** (`src/components/auth/AuthProvider.tsx`)
   - React context that wraps the entire app
   - Manages authentication state using Firebase `onAuthStateChanged`
   - Provides `useAuth()` hook for accessing auth state in any component
   - Handles auth persistence across page refreshes

3. **ProtectedRoute** (`src/components/auth/ProtectedRoute.tsx`)
   - Wraps routes that require authentication
   - Shows loading spinner while checking auth state
   - Redirects to `/login` if user is not authenticated

4. **Header** (`src/components/layout/Header.tsx`)
   - App header with JeffBoard logo and user info
   - Displays user avatar/initial
   - Sign-out button with loading state

### Auth Service

`src/services/auth.ts` provides:
- `signInWithGoogle()` - Handles sign-in with iOS detection
  - Uses `signInWithRedirect` on iOS for PWA compatibility
  - Uses `signInWithPopup` on desktop for better UX
- `signOut()` - Signs out current user
- `onAuthChange(callback)` - Listener for auth state changes

## User Flow

1. User opens PWA
2. `AuthProvider` initializes and checks auth state via `onAuthStateChanged`
3. If not authenticated, `ProtectedRoute` redirects to `/login`
4. User clicks "Continue with Google"
5. On iOS: redirected to Google, then back to app
6. On desktop: popup window opens, closes on success
7. Auth state updates, user is redirected to home page
8. Header displays user info and sign-out button

## Error Handling

- Sign-in errors are caught and displayed on the login page
- Auth state changes handle token refresh failures
- Sign-out errors are logged but don't block the UI

## Mobile Optimization

- 44pt minimum touch targets (Apple HIG compliance)
- Loading states prevent double-taps
- Smooth transitions and animations
- Safe area insets for iPhone notch/home indicator

## Security

Client-side auth check is a UX convenience. Real security is enforced by Firestore security rules that check:
1. User is authenticated (`request.auth != null`)
2. User's UID is in `config/allowedUsers` document

## Testing Checklist

- [ ] Sign in with Google on desktop (popup)
- [ ] Sign in with Google on iOS Safari (redirect)
- [ ] Sign in from installed PWA on iOS
- [ ] Sign out clears auth state
- [ ] Accessing protected route redirects to login
- [ ] Auth persists across page refresh
- [ ] Error messages display correctly
- [ ] Loading states show during async operations

## Next Steps

With authentication complete, Epic 3 can implement:
- Real-time story fetching from Firestore
- Kanban board UI with columns
- Story cards
- Project selector
