# Admin Password Reset Feature Documentation

## Overview
This feature allows administrators to securely reset user passwords through either:
1. Setting a new password directly
2. Generating a password reset link for users

## Security Features

### Backend Security (Cloud Function)
- **Authentication Required**: Admin must be logged in with valid Firebase Auth token
- **Admin Verification**: Function checks if the requesting user has `isAdmin: true` in Firestore
- **Audit Logging**: All password reset actions are logged to `admin_actions` collection
- **CORS Protection**: Requests only accepted from authorized domains
- **Input Validation**: Password minimum length and email validation

### Frontend Security
- **Admin-Only Access**: Password tab only visible to users with `isAdmin: true`
- **Secure Token Transmission**: Uses Firebase Auth tokens in Authorization header
- **No Client-Side Password Storage**: Passwords are sent directly to secure Cloud Function

## Deployment Instructions

### 1. Deploy Cloud Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy to Firebase
firebase deploy --only functions:adminResetPassword

# Or deploy all functions
firebase deploy --only functions
```

### 2. Update Function URL

After deployment, Firebase will provide the function URL. Update it in `src/components/PasswordResetPanel.jsx`:

```javascript
const functionUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/level-up-app-c9f47/us-central1/adminResetPassword'
  : 'YOUR_DEPLOYED_FUNCTION_URL';
```

### 3. Build and Deploy Frontend

```bash
# Build the app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Usage Guide

### For Administrators

1. **Access the Feature**
   - Log in as an admin user
   - Navigate to the Admin Panel
   - Click on the "Passwords" tab

2. **Search for User**
   - Type user's name or email in the search field
   - Select the user from the dropdown

3. **Reset Password Options**

   **Option A: Set New Password Directly**
   - Select "Set New Password Directly"
   - Enter new password (minimum 6 characters)
   - Confirm the password
   - Click "Reset Password"

   **Option B: Generate Reset Link**
   - Select "Generate Password Reset Link"
   - Click "Generate Reset Link"
   - Copy the generated link
   - Send it to the user via secure channel

4. **View Audit History**
   - Recent password actions are displayed at the bottom
   - Shows admin email, target user, and timestamp

### For Users Receiving Reset Links

1. Click the reset link sent by admin
2. Enter new password on Firebase's password reset page
3. Sign in with new password

## Database Structure

### admin_actions Collection
Automatically created to log all admin password actions:

```javascript
{
  action: "password_reset" | "password_reset_link_generated",
  adminUid: "admin_user_id",
  adminEmail: "admin@example.com",
  targetUid: "target_user_id",  // Only for direct reset
  targetEmail: "user@example.com",
  timestamp: ServerTimestamp
}
```

## Testing

### Local Testing with Firebase Emulator

1. **Start the emulator**
```bash
cd functions
npm run serve
```

2. **Update frontend to use local function**
The component already checks for localhost and uses the emulator URL automatically.

3. **Test the feature**
- Ensure you have an admin user (with `isAdmin: true` in Firestore)
- Try both password reset methods
- Check the console for logs

### Production Testing

1. **Verify admin access**
   - Only users with `isAdmin: true` should see the Passwords tab

2. **Test password reset**
   - Try resetting a test user's password
   - Verify the user can login with new password

3. **Test reset link generation**
   - Generate a link for a test user
   - Verify the link works and allows password reset

4. **Check audit logs**
   - Verify actions appear in Firestore `admin_actions` collection
   - Check recent actions display in the UI

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Ensure user is logged in
   - Verify user has `isAdmin: true` in Firestore

2. **"User not found" Error**
   - Check the email address is correct
   - Ensure user exists in Firebase Auth

3. **CORS Error**
   - Verify the function is deployed with `cors: true` option
   - Check the function URL is correct

4. **Function Not Found**
   - Ensure Cloud Functions are deployed
   - Verify the function URL in PasswordResetPanel.jsx

### Checking Logs

```bash
# View Cloud Function logs
firebase functions:log

# View specific function logs
firebase functions:log --only adminResetPassword
```

## Security Best Practices

1. **Limit Admin Access**
   - Only grant `isAdmin: true` to trusted users
   - Regularly audit admin users

2. **Monitor Admin Actions**
   - Regularly review `admin_actions` collection
   - Set up alerts for unusual activity

3. **Secure Communication**
   - Send reset links only through secure channels
   - Never share passwords in plain text

4. **Regular Updates**
   - Keep Firebase SDK updated
   - Review and update security rules regularly

## Support

For issues or questions:
1. Check Cloud Function logs for backend errors
2. Check browser console for frontend errors
3. Verify user permissions in Firestore
4. Ensure all dependencies are properly installed