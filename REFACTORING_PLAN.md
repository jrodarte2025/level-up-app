# Level Up Cincinnati - Refactoring Project Plan

## Overview

This document provides a comprehensive plan for refactoring the Level Up Cincinnati React application. The goal is to improve code quality, performance, security, and maintainability without breaking existing functionality.

**Important Principles:**
- Make incremental changes - one component/feature at a time
- Run `npm run build` after each change to verify no build errors
- Test the affected functionality manually after each phase
- Commit after each successfully completed phase
- Never remove functionality - only refactor and improve

---

## Phase 1: Foundation & Safety (Priority: Critical)

### 1.1 Add Error Boundary

**Goal:** Prevent white-screen crashes when components fail

**Files to create:**
- `src/components/ErrorBoundary.jsx`

**Requirements:**
```jsx
// ErrorBoundary should:
// - Catch JavaScript errors in child component tree
// - Log errors to console (for now)
// - Display a friendly fallback UI with:
//   - Level Up logo
//   - "Something went wrong" message
//   - "Refresh Page" button
//   - Option to "Go to Dashboard"
// - Reset error state when navigating away
```

**Integration:**
- Wrap the main App content in `App.jsx` with ErrorBoundary
- Do NOT wrap the entire app (leave router outside)

**Verification:**
- Build passes
- Intentionally throw an error in a component to test fallback UI

---

### 1.2 Create Shared Utility Functions

**Goal:** Eliminate code duplication across the codebase

**Files to create:**
- `src/utils/clipboard.js`
- `src/utils/emoji.js`
- `src/utils/dateTime.js`

**Requirements for clipboard.js:**
```javascript
// Export: copyToClipboard(text)
// - Try navigator.clipboard.writeText first
// - Fallback to textarea method for older browsers
// - Return { success: boolean, error?: string }
// - Do NOT show any UI - let caller handle feedback
```

**Requirements for emoji.js:**
```javascript
// Export: EMOJI_MAP object with reaction mappings
// Export: getEmojiDisplay(key) function
// Consolidate from PostCard.jsx:24-36 and Comment.jsx:84-96
```

**Requirements for dateTime.js:**
```javascript
// Export: formatTimestamp(timestamp) - handles Firestore timestamps
// Export: formatRelativeTime(timestamp) - "2 hours ago" format
// Export: isValidTimestamp(timestamp) - validation helper
// Handle edge cases: null, undefined, invalid timestamps
```

**Files to update after creating utilities:**
- `src/pages/Directory.jsx` - use clipboard.js
- `src/components/ApprovalsPanel.jsx` - use clipboard.js
- `src/pages/EventLandingPage.jsx` - use clipboard.js
- `src/pages/AdminPanel.jsx` - use clipboard.js
- `src/components/PostCard.jsx` - use emoji.js
- `src/components/Comment.jsx` - use emoji.js

**Verification:**
- Build passes
- Test clipboard functionality in Directory and EventLandingPage
- Test emoji reactions on posts and comments

---

### 1.3 Create useAuth Custom Hook

**Goal:** Centralize authentication logic and eliminate duplication

**Files to create:**
- `src/hooks/useAuth.js`

**Requirements:**
```javascript
// Export: useAuth() hook
// Returns: { user, loading, error, signOut }
//
// user object should include:
// - uid, email (from Firebase Auth)
// - All Firestore user document fields (firstName, lastName, role, etc.)
// - isAdmin boolean (computed from role or isAdmin field)
//
// Should:
// - Subscribe to onAuthStateChanged
// - Fetch user document from Firestore when auth state changes
// - Clean up listener on unmount
// - Handle loading and error states
```

**Files to update:**
- `src/pages/App.jsx` - use useAuth instead of manual auth state
- `src/pages/EventLandingPage.jsx` - use useAuth
- `src/pages/PostPage.jsx` - use useAuth
- `src/pages/UserDashboard.jsx` - use useAuth

**Verification:**
- Build passes
- Login/logout still works
- User data displays correctly throughout app
- Admin panel still accessible for admins only

---

## Phase 2: Performance Optimizations (Priority: High)

### 2.1 Add Memoization to List Components

**Goal:** Prevent unnecessary re-renders of list items

**Files to update:**
- `src/components/PostCard.jsx`
- `src/components/Comment.jsx`
- `src/components/EventCard.jsx`

**Requirements:**
```javascript
// For each component:
// 1. Wrap export with React.memo()
// 2. Add useMemo for expensive computations:
//    - PostCard: reactions processing (lines 39-47)
//    - Comment: nested comment rendering
//    - EventCard: calendar link generation
// 3. Add useCallback for event handlers passed to children
```

**Verification:**
- Build passes
- React DevTools shows reduced re-renders
- No visual or functional changes to the app

---

### 2.2 Optimize Firebase Queries

**Goal:** Reduce query latency and prevent N+1 problems

**File: src/pages/AdminMatches.jsx**

**Current problem (lines 28-45):**
```javascript
// Sequential queries - slow
const pendingSnap = await getDocs(...);
const studentSnap = await getDocs(...);
const coachSnap = await getDocs(...);
const matchSnap = await getDocs(...);
```

**Required fix:**
```javascript
// Parallel queries - fast
const [pendingSnap, studentSnap, coachSnap, matchSnap] = await Promise.all([
  getDocs(...),
  getDocs(...),
  getDocs(...),
  getDocs(...)
]);
```

**File: src/pages/Updates.jsx**

**Current problem (lines 64-96):**
- Creates individual listener for each post's comments
- With 50 posts = 50+ active listeners

**Required fix:**
- Use a single query with `collectionGroup` for all comments, OR
- Fetch comments only when a post is expanded, OR
- Denormalize comment count on post document

**File: src/pages/Directory.jsx**

**Current problem (lines 30-59):**
- Multiple sequential queries for match finding

**Required fix:**
- Use Promise.all for parallel execution
- Consider caching match data

**Verification:**
- Build passes
- Network tab shows fewer/faster requests
- App feels more responsive

---

### 2.3 Add Pagination

**Goal:** Prevent loading all data at once as the app scales

**Files to update:**
- `src/pages/Updates.jsx`
- `src/pages/Directory.jsx`

**Requirements for Updates.jsx:**
```javascript
// - Initial load: 20 posts
// - "Load More" button at bottom
// - Use Firestore startAfter() for cursor-based pagination
// - Show loading state while fetching more
// - Track if more posts exist (hasMore state)
```

**Requirements for Directory.jsx:**
```javascript
// - Initial load: 50 users
// - "Load More" button or infinite scroll
// - Maintain search/filter functionality with pagination
```

**Verification:**
- Build passes
- Initial load is faster
- "Load More" fetches additional items
- Search/filter still works correctly

---

## Phase 3: Component Refactoring (Priority: High)

### 3.1 Split AdminPanel.jsx

**Goal:** Break 2,588 line file into manageable components

**Current AdminPanel.jsx contains:**
1. Events management (~800 lines)
2. Posts management (~400 lines)
3. Resources management (~400 lines)
4. User approvals (~300 lines)
5. Registration codes (~300 lines)
6. Shared state and utilities (~400 lines)

**Files to create:**
- `src/pages/admin/AdminEvents.jsx`
- `src/pages/admin/AdminPosts.jsx`
- `src/pages/admin/AdminResources.jsx`
- `src/pages/admin/AdminApprovals.jsx`
- `src/pages/admin/AdminRegistrationCodes.jsx`
- `src/pages/admin/index.jsx` (main AdminPanel with tab routing)

**Refactoring approach:**
```
1. Create admin/ directory
2. Extract AdminEvents first (largest, most complex)
   - Move all event-related state
   - Move all event-related handlers
   - Move event form JSX
   - Move event list JSX
   - Keep same functionality, just in new file
3. Update AdminPanel to import and render AdminEvents
4. Verify build and test events functionality
5. Repeat for each section
```

**Requirements for each extracted component:**
- Self-contained state management
- Own useEffect hooks for data fetching
- Receive only necessary props from parent (success/error handlers)
- Export as default

**Verification after each extraction:**
- Build passes
- Tab switching works
- All CRUD operations work for that section
- No console errors

---

### 3.2 Split Directory.jsx

**Goal:** Break 1,414 line file into manageable components

**Files to create:**
- `src/components/directory/UserList.jsx`
- `src/components/directory/UserCard.jsx`
- `src/components/directory/MatchPanel.jsx`
- `src/components/directory/DirectoryFilters.jsx`

**Requirements:**
- UserList: Renders list of UserCards with virtualization consideration
- UserCard: Single user display with contact actions
- MatchPanel: Match information display and actions
- DirectoryFilters: Search, role filter, sort options

**Verification:**
- Build passes
- Directory displays correctly
- Search and filters work
- Contact actions (email, phone, copy) work

---

### 3.3 Split EventLandingPage.jsx

**Goal:** Break 958 line file into manageable components

**Files to create:**
- `src/components/event/EventHero.jsx`
- `src/components/event/EventDetails.jsx`
- `src/components/event/EventRSVP.jsx`
- `src/components/event/EventAttendees.jsx`

**Requirements:**
- EventHero: Header image, title, required badge
- EventDetails: Date, time, location, description
- EventRSVP: RSVP button, guest modal, calendar links
- EventAttendees: Avatar list of attendees

**Verification:**
- Build passes
- Event page displays correctly
- RSVP functionality works
- Calendar links work
- Guest modal works

---

## Phase 4: Accessibility Improvements (Priority: Medium)

### 4.1 Add ARIA Labels

**Files to update (priority order):**
1. `src/components/BottomNavBar.jsx` - nav icons need labels
2. `src/pages/Signup.jsx` - form inputs need labels
3. `src/pages/Login.jsx` - form inputs need labels
4. `src/components/CommentInput.jsx` - textarea needs label
5. `src/components/EventCard.jsx` - image needs alt text
6. `src/components/PostCard.jsx` - interactive elements need labels

**Requirements:**
```jsx
// For icon-only buttons:
<button aria-label="Home navigation">
  <HomeIcon />
</button>

// For form inputs:
<input
  aria-label="Email address"
  aria-describedby="email-error"
/>
{error && <span id="email-error" role="alert">{error}</span>}

// For images:
<img src={url} alt="Event header image for {eventName}" />
```

**Verification:**
- Build passes
- Run accessibility audit in Chrome DevTools
- Test with screen reader (VoiceOver on Mac)

---

### 4.2 Add Keyboard Navigation

**Files to update:**
- `src/components/EmojiPicker.jsx`
- `src/components/ReactionBar.jsx`
- All modal components

**Requirements:**
```jsx
// Emoji picker should:
// - Be focusable with Tab
// - Navigate emojis with arrow keys
// - Select with Enter/Space
// - Close with Escape

// Modals should:
// - Trap focus inside when open
// - Return focus to trigger element on close
// - Close with Escape key
```

**Verification:**
- Can navigate entire app with keyboard only
- Focus visible indicator on all interactive elements
- Modals trap focus correctly

---

## Phase 5: Code Cleanup (Priority: Medium)

### 5.1 Remove Dead Code

**Files to clean:**

**App.jsx:**
- Remove lines 85-135 (commented session timeout logic)
- If session timeout is needed, implement properly or create issue

**Login.jsx:**
- Remove lines 65-113 (commented password reset)
- If password reset is needed, implement properly or create issue

**AdminPanel.jsx:**
- Remove lines 1-53 (commented role options code)

**Files to delete:**
- `src/utils/notificationTest.js` (test file in production)
- `src/components/NotificationTestButton.jsx` (if not used in production)

**Verification:**
- Build passes
- All existing functionality still works
- No console errors

---

### 5.2 Create Constants File

**File to create:**
- `src/constants/index.js`

**Requirements:**
```javascript
// Timing constants
export const TOAST_DURATION = 3000;
export const RETRY_DELAY = 5000;
export const SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days

// Pagination
export const POSTS_PER_PAGE = 20;
export const USERS_PER_PAGE = 50;

// Image constraints
export const MAX_IMAGE_SIZE = 800;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Role options
export const USER_ROLES = {
  STUDENT: 'student',
  COACH: 'coach',
  BOARD: 'board',
  ADMIN: 'admin'
};
```

**Files to update:**
- Replace magic numbers throughout codebase with constants
- Search for: `3000`, `5000`, `800`, `'student'`, `'coach'`, etc.

**Verification:**
- Build passes
- All timing and limits work the same as before

---

### 5.3 Standardize Error Handling

**File to create:**
- `src/utils/errorHandler.js`

**Requirements:**
```javascript
// Export: handleError(error, context)
// - Logs error with context to console (dev) or logging service (prod)
// - Returns user-friendly message based on error type
// - Handles Firebase-specific error codes
// - Example Firebase errors: auth/network-request-failed, permission-denied

// Export: ErrorMessages object with user-friendly messages
export const ErrorMessages = {
  NETWORK: "Please check your internet connection and try again.",
  PERMISSION: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested item could not be found.",
  DEFAULT: "Something went wrong. Please try again."
};
```

**Files to update:**
- Apply consistent error handling pattern across all Firebase operations
- Replace generic catch blocks with handleError calls

**Verification:**
- Build passes
- Errors display user-friendly messages
- Errors logged appropriately

---

## Phase 6: Architecture Improvements (Priority: Low)

### 6.1 Create Services Layer

**Files to create:**
- `src/services/firebase/auth.js`
- `src/services/firebase/events.js`
- `src/services/firebase/posts.js`
- `src/services/firebase/users.js`
- `src/services/firebase/rsvps.js`

**Requirements:**
```javascript
// Each service file should:
// - Export functions for CRUD operations
// - Handle Firestore queries and mutations
// - Return consistent response format: { data, error }
// - NOT handle UI state (that stays in components)

// Example: services/firebase/events.js
export async function getEvents() { ... }
export async function getEventBySlug(slug) { ... }
export async function createEvent(eventData) { ... }
export async function updateEvent(id, eventData) { ... }
export async function deleteEvent(id) { ... }
export function subscribeToEvents(callback) { ... }
```

**Verification:**
- Build passes
- All data operations work through services
- Components are simpler and more focused on UI

---

### 6.2 Create User Context

**File to create:**
- `src/contexts/UserContext.jsx`

**Requirements:**
```javascript
// Provides:
// - user: current user object with Firestore data
// - loading: boolean for initial load
// - isAdmin: computed boolean
// - updateUser: function to update user profile
// - refreshUser: function to re-fetch user data

// Should work with useAuth hook
// Eliminates prop drilling of user data through App.jsx
```

**Files to update:**
- Wrap App with UserProvider
- Replace user prop drilling with useUser() hook

**Verification:**
- Build passes
- User data accessible anywhere via context
- Profile updates reflect immediately

---

## Phase 7: Security Hardening (Priority: Low)

### 7.1 Environment Variables

**Files to create:**
- `.env.example` (template for required env vars)

**Requirements:**
```
# .env.example
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

**Files to update:**
- `src/firebase.js` - use import.meta.env instead of hardcoded values
- `src/utils/notifications.js` - use env var for VAPID key

**Important:**
- Add `.env` to `.gitignore` if not already
- Create `.env` locally with actual values
- Update deployment to inject env vars

**Verification:**
- Build passes
- Firebase connection works
- Push notifications work

---

### 7.2 Input Validation

**File to create:**
- `src/utils/validation.js`

**Requirements:**
```javascript
// Export validation functions:
export function validateEmail(email) { ... }
export function validatePhone(phone) { ... }
export function validateUrl(url) { ... }
export function validateDisplayName(name) { ... }
export function sanitizeHtml(html) { ... } // wrapper around DOMPurify
```

**Files to update:**
- `src/pages/Signup.jsx` - use validation functions
- `src/components/ProfileModal.jsx` - use validation functions
- `src/pages/AdminPanel.jsx` - validate all form inputs

**Verification:**
- Build passes
- Invalid inputs show appropriate errors
- XSS attempts are blocked

---

## Execution Guidelines

### Before Starting Each Phase:
1. Create a new git branch: `git checkout -b refactor/phase-X-description`
2. Read through all requirements for the phase
3. Identify all files that will be modified

### During Each Task:
1. Make small, incremental changes
2. Run `npm run build` frequently
3. Test affected functionality in browser
4. Commit working changes with descriptive messages

### After Completing Each Phase:
1. Run full build: `npm run build`
2. Test all affected functionality manually
3. Check browser console for errors
4. Create PR or merge to main
5. Deploy to staging if available
6. Get user confirmation before proceeding

### If Something Breaks:
1. Stop and assess the error
2. Check git diff to see recent changes
3. Revert problematic changes if needed: `git checkout -- <file>`
4. Ask for clarification before proceeding

---

## Commit Message Format

```
type(scope): description

Examples:
feat(error-boundary): add ErrorBoundary component for crash protection
refactor(admin): extract AdminEvents from AdminPanel
perf(queries): parallelize Firebase queries in AdminMatches
fix(a11y): add ARIA labels to BottomNavBar
chore(cleanup): remove commented code from App.jsx
```

---

## Definition of Done

Each phase is complete when:
- [ ] All listed files are created/updated
- [ ] `npm run build` passes with no errors
- [ ] No new console errors in browser
- [ ] All listed verification steps pass
- [ ] Changes are committed with proper message
- [ ] User has confirmed functionality works

---

## Notes for Claude

1. **Ask before deleting** - If you're unsure whether code is used, ask rather than delete
2. **Preserve functionality** - The app should work exactly the same after refactoring
3. **One thing at a time** - Complete one task fully before starting the next
4. **Test constantly** - Run build and check browser after every significant change
5. **Explain changes** - When making changes, briefly explain what you're doing and why
6. **Flag concerns** - If you see potential issues with the plan, raise them before proceeding
