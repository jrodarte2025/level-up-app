# Deployment Notes

## Firebase Functions - Important

### External Functions (DO NOT DELETE)
The following Firebase Cloud Functions exist in the production environment but are NOT part of this app's codebase:
- `coaches(us-central1)`
- `students(us-central1)`

These functions serve external purposes outside of the Level Up App and must be preserved.

### Deployment Instructions

When deploying updates to the app:
1. **To deploy only the web app (most common):**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **To deploy app functions only (from /functions folder):**
   ```bash
   firebase deploy --only functions:sendNotification,functions:resetAdminPassword
   ```

3. **Never use** `firebase deploy` without flags as it will attempt to delete the external coaches/students functions.

### Current App Functions
Functions that ARE part of this app (defined in /functions/index.js):
- `sendNotification` - Handles in-app notifications
- `resetAdminPassword` - Admin password reset functionality
- `getPhoto` - Gets signed URLs for photos in Firebase Storage (for Salesforce integration)
- `listUserPhotos` - Lists available photos for a specific user

Last updated: 2025-01-09