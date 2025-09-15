/****
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

const admin = require("firebase-admin");

// Initialize admin SDK differently for emulator vs production
if (process.env.FUNCTIONS_EMULATOR === "true") {
  // For local emulator, use default credentials
  admin.initializeApp({
    projectId: "level-up-app-c9f47"
  });
} else {
  // For production, use default app initialization
  admin.initializeApp();
}

exports.sendTestPush = onRequest(
  { memory: "256MB", timeoutSeconds: 60 },
  async (req, res) => {
    try {
      const tokenSnapshot = await admin.firestore().collection("notification_tokens").get();
      const tokenDocs = tokenSnapshot.docs.filter(doc => {
        const token = doc.data()?.token;
        return typeof token === 'string' && token.length > 0;
      });

      if (tokenDocs.length === 0) {
        res.status(404).send("No notification tokens found.");
        return;
      }

      const tokens = tokenDocs.map(doc => doc.data().token);
      const message = {
        notification: {
          title: "🔔 Level Up Test",
          body: "This is a test push from Firebase Functions!"
        },
        tokens: tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info("Push sent:", response);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        const tokensToDelete = [];
        const batch = admin.firestore().batch();
        
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            const tokenDocId = tokenDocs[idx].id;
            
            logger.warn(`Failed to send to token ${tokens[idx].substring(0, 10)}...`, {
              errorCode,
              errorMessage: resp.error?.message
            });
            
            // Remove invalid/unregistered tokens
            if (errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/invalid-argument') {
              tokensToDelete.push(tokenDocId);
              batch.delete(admin.firestore().collection("notification_tokens").doc(tokenDocId));
              logger.info(`Queued deletion of invalid token: ${tokenDocId}`);
            }
          }
        });
        
        // Execute batch deletion if there are tokens to delete
        if (tokensToDelete.length > 0) {
          await batch.commit();
          logger.info(`Cleaned up ${tokensToDelete.length} invalid FCM tokens from Firestore`);
        }
      }
      
      res.status(200).send(`Push sent to ${response.successCount} devices. ${response.failureCount > 0 ? `Failed: ${response.failureCount}` : ''}`);
    } catch (error) {
      logger.error("Error sending push:", error);
      res.status(500).send("Error sending notification.");
    }
  }
);


exports.sendUpdateNotification = onDocumentCreated('posts/{postId}', async (event) => {
  const tokensSnapshot = await admin.firestore().collection("notification_tokens").get();
  const tokenDocs = tokensSnapshot.docs.filter(doc => {
    const token = doc.data()?.token;
    return typeof token === 'string' && token.length > 0;
  });

  if (tokenDocs.length === 0) {
    logger.info("No tokens available for update notification");
    return;
  }

  const tokens = tokenDocs.map(doc => doc.data().token);
  logger.info(`Collected ${tokens.length} tokens for update push`);

  const post = event.data?.data();
  const message = {
    notification: {
      title: `📢 New Update: ${post.title}`,
      body: "Open the app to read more"
    },
    tokens
  };

  logger.info("Sending update notification:", message);

  try {
    const messaging = admin.messaging();
    const response = await messaging.sendEachForMulticast(message);
    logger.info("Update push response:", {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const tokensToDelete = [];
      const batch = admin.firestore().batch();
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          const token = tokens[idx];
          const tokenDocId = tokenDocs[idx].id;
          
          logger.warn(`Failed to send to token ${token.substring(0, 10)}...`, {
            errorCode,
            errorMessage: resp.error?.message
          });
          
          // Remove invalid/unregistered tokens
          if (errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/invalid-argument') {
            tokensToDelete.push(tokenDocId);
            batch.delete(admin.firestore().collection("notification_tokens").doc(tokenDocId));
            logger.info(`Queued deletion of invalid token: ${tokenDocId}`);
          }
        }
      });
      
      // Execute batch deletion if there are tokens to delete
      if (tokensToDelete.length > 0) {
        await batch.commit();
        logger.info(`Cleaned up ${tokensToDelete.length} invalid FCM tokens from Firestore`);
      }
    }
    
    return response;
  } catch (error) {
    logger.error("Error sending update notification:", error);
    // Don't throw - let the function complete successfully even if notifications fail
  }
});

exports.sendEventNotification = onDocumentCreated('events/{eventId}', async (event) => {
  const tokensSnapshot = await admin.firestore().collection("notification_tokens").get();
  const tokenDocs = tokensSnapshot.docs.filter(doc => {
    const token = doc.data()?.token;
    return typeof token === 'string' && token.length > 0;
  });

  if (tokenDocs.length === 0) {
    logger.info("No tokens available for event notification");
    return;
  }

  const tokens = tokenDocs.map(doc => doc.data().token);
  logger.info(`Collected ${tokens.length} tokens for event push`);

  const eventData = event.data?.data();
  const message = {
    notification: {
      title: `📅 Event Added: ${eventData.name}`,
      body: "Tap to view the event details"
    },
    tokens
  };

  logger.info("Sending event notification:", message);

  try {
    const messaging = admin.messaging();
    const response = await messaging.sendEachForMulticast(message);
    logger.info("Event push response:", {
      successCount: response.successCount,
      failureCount: response.failureCount
    });
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const tokensToDelete = [];
      const batch = admin.firestore().batch();
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          const token = tokens[idx];
          const tokenDocId = tokenDocs[idx].id;
          
          logger.warn(`Failed to send to token ${token.substring(0, 10)}...`, {
            errorCode,
            errorMessage: resp.error?.message
          });
          
          // Remove invalid/unregistered tokens
          if (errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/invalid-argument') {
            tokensToDelete.push(tokenDocId);
            batch.delete(admin.firestore().collection("notification_tokens").doc(tokenDocId));
            logger.info(`Queued deletion of invalid token: ${tokenDocId}`);
          }
        }
      });
      
      // Execute batch deletion if there are tokens to delete
      if (tokensToDelete.length > 0) {
        await batch.commit();
        logger.info(`Cleaned up ${tokensToDelete.length} invalid FCM tokens from Firestore`);
      }
    }
    
    return response;
  } catch (error) {
    logger.error("Error sending event notification:", error);
    // Don't throw - let the function complete successfully even if notifications fail
  }
});

// Admin password reset function (using onRequest with manual auth for CORS compatibility)
exports.adminResetPassword = onRequest(
  { 
    memory: "256MB", 
    timeoutSeconds: 60,
    cors: true,
    invoker: "public"
  },
  async (req, res) => {
    // Handle CORS manually
    const allowedOrigins = [
      "http://localhost:5174",
      "http://localhost:5173", 
      "https://level-up-app-c9f47.firebaseapp.com",
      "https://level-up-app-c9f47.web.app",
      "https://app.levelupcincinnati.org"
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    logger.info('adminResetPassword function called', { 
      method: req.method,
      origin: origin,
      hasAuth: !!req.headers.authorization
    });
    
    // Verify Firebase Auth token manually
    let auth = null;
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No authorization header');
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      auth = {
        uid: decodedToken.uid,
        token: decodedToken
      };
    } catch (error) {
      logger.error('Authentication failed:', error);
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    
    // Check if the requesting user is an admin (priority: custom claims > Firestore role)
    const adminUid = auth.uid;
    let isAdmin = false;
    
    // Check for admin access in production
    
    // Production checks
    if (!isAdmin) {
      // First check custom claims
      if (auth.token.admin === true || auth.token.role === 'admin') {
        isAdmin = true;
        logger.info(`Admin access granted via custom claims for ${auth.token.email}`);
      } else {
        // Fallback to Firestore role check for backwards compatibility
        try {
          const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
          if (adminDoc.exists) {
            const userData = adminDoc.data();
            isAdmin = userData.isAdmin === true || userData.role === 'admin';
            if (isAdmin) {
              logger.info(`Admin access granted via Firestore role for ${auth.token.email}`);
            }
          }
        } catch (firestoreError) {
          logger.error('Error checking Firestore admin role:', firestoreError);
        }
      }
    }
    
    if (!isAdmin) {
      logger.warn(`Non-admin user ${adminUid} (${auth.token.email}) attempted password reset`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Get the target user email and new password from request body
    const { userEmail, newPassword, generateResetLink } = req.body;
    
    if (!userEmail) {
      res.status(400).json({ error: 'userEmail is required' });
      return;
    }

    // Generate password reset link
    if (generateResetLink) {
      try {
        
        const resetLink = await admin.auth().generatePasswordResetLink(userEmail);
        
        // Log the admin action
        await admin.firestore().collection('admin_actions').add({
          action: 'password_reset_link',
          adminUid: adminUid,
          adminEmail: auth.token.email,
          targetEmail: userEmail,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`Admin ${auth.token.email} generated reset link for ${userEmail}`);
        
        res.status(200).json({ 
          success: true, 
          resetLink: resetLink,
          message: 'Password reset link generated successfully' 
        });
        return;
      } catch (error) {
        logger.error('Error generating reset link:', error);
        if (error.code === 'auth/user-not-found') {
          res.status(404).json({ error: 'User not found' });
        } else {
          res.status(500).json({ error: 'Error generating reset link: ' + error.message });
        }
        return;
      }
    }

    // Direct password reset
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    try {
      
      // Get the user by email
      const userRecord = await admin.auth().getUserByEmail(userEmail);
      
      // Update the user's password
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });

      // Log the admin action
      await admin.firestore().collection('admin_actions').add({
        action: 'password_reset',
        adminUid: adminUid,
        adminEmail: auth.token.email,
        targetUid: userRecord.uid,
        targetEmail: userEmail,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info(`Admin ${auth.token.email} reset password for ${userEmail}`);
      
      res.status(200).json({ 
        success: true, 
        message: 'Password reset successfully' 
      });
    } catch (error) {
      logger.error('Error resetting password:', error);
      if (error.code === 'auth/user-not-found') {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(500).json({ error: 'Error resetting password: ' + error.message });
      }
    }
  }
);

// Enhanced getPhoto function for Salesforce integration
exports.getPhoto = functions.https.onRequest(async (req, res) => {
  // Enable CORS for Salesforce and other origins
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    // Get parameters from request
    const photoPath = req.query.path; // e.g., "users/UID/profile.jpg" or "headshots/coach_123.jpg"
    const userId = req.query.userId; // optional: for logging
    const userType = req.query.type; // optional: 'coach' or 'student' for fallback paths
    
    console.log('Photo request:', { path: photoPath, userId, userType });
    
    if (!photoPath) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing photo path parameter',
        example: 'Use: ?path=users/USER_ID/profile.jpg or ?path=headshots/coach_123.jpg'
      });
    }
    
    // Get Firebase Storage bucket
    const bucket = admin.storage().bucket();
    let file = bucket.file(photoPath);
    
    // Check if file exists
    let [exists] = await file.exists();
    
    // If file doesn't exist and we have userId/userType, try alternative paths
    if (!exists && userId && userType) {
      const alternativePaths = [
        `users/${userId}/profile.jpg`,
        `users/${userId}/profile.png`,
        `headshots/${userType.toLowerCase()}_${userId}.jpg`,
        `headshots/${userType.toLowerCase()}_${userId}.png`,
        `headshots/${userId}.jpg`,
        `headshots/${userId}.png`
      ];
      
      console.log('Primary path not found, trying alternatives:', alternativePaths);
      
      for (const altPath of alternativePaths) {
        file = bucket.file(altPath);
        [exists] = await file.exists();
        if (exists) {
          console.log('Found photo at alternative path:', altPath);
          break;
        }
      }
    }
    
    if (!exists) {
      console.log('Photo not found at any path:', photoPath);
      return res.status(404).json({ 
        success: false,
        error: 'Photo not found',
        path: photoPath,
        message: 'The requested photo does not exist in Firebase Storage',
        triedPaths: userId && userType ? [
          photoPath,
          `users/${userId}/profile.jpg`,
          `headshots/${userType.toLowerCase()}_${userId}.jpg`
        ] : [photoPath]
      });
    }
    
    // Use Firebase's public download URL
    const bucketName = bucket.name;
    const actualPath = file.name; // Use the actual found file path
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(actualPath)}?alt=media`;
    
    console.log('Generated public URL for:', actualPath);
    
    // Return the public URL with metadata
    res.json({ 
      success: true,
      url: publicUrl,
      type: 'public',
      path: actualPath,
      originalPath: photoPath,
      userId: userId || null,
      userType: userType || null
    });
    
  } catch (error) {
    console.error('Error getting photo:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
      details: 'Check function logs for more information'
    });
  }
});

// Optional: Function to list available photos for a user
exports.listUserPhotos = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  try {
    const userId = req.query.userId;
    const userType = req.query.type; // 'coach' or 'student'
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }
    
    const bucket = admin.storage().bucket();
    
    // List files with prefix - adjust this path to match your storage structure
    const prefix = `headshots/${userType || 'user'}_${userId}`;
    const [files] = await bucket.getFiles({ prefix: prefix });
    
    const photoList = files.map(file => ({
      name: file.name,
      path: file.name,
      updated: file.metadata.updated
    }));
    
    res.json({
      success: true,
      photos: photoList,
      userId: userId
    });
    
  } catch (error) {
    console.error('Error listing photos:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Coaches function - for external website integration
exports.coaches = onRequest(
  { 
    memory: "256MB", 
    timeoutSeconds: 60,
    cors: true 
  },
  async (req, res) => {
    try {
      // Get all users with role 'coach' or 'coach-board'
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('role', 'in', ['coach', 'coach-board'])
        .get();
      
      const coaches = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        let profileImageUrl = null;
        
        // Try to get profile image URL
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(`users/${doc.id}/profile.jpg`);
          const [exists] = await file.exists();
          
          if (exists) {
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            profileImageUrl = url;
          }
        } catch (error) {
          logger.warn(`Could not get profile image for coach ${doc.id}:`, error);
        }
        
        coaches.push({
          id: doc.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          company: userData.company || '',
          jobTitle: userData.jobTitle || '',
          profileImageUrl,
          role: userData.role
        });
      }
      
      res.json({ coaches });
      
    } catch (error) {
      logger.error('Error fetching coaches:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Students function - for external website integration  
exports.students = onRequest(
  { 
    memory: "256MB", 
    timeoutSeconds: 60,
    cors: true 
  },
  async (req, res) => {
    try {
      // Get all users with role 'student'
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('role', '==', 'student')
        .get();
      
      const students = [];
      
      for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        let profileImageUrl = null;
        
        // Try to get profile image URL
        try {
          const bucket = admin.storage().bucket();
          const file = bucket.file(`users/${doc.id}/profile.jpg`);
          const [exists] = await file.exists();
          
          if (exists) {
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            profileImageUrl = url;
          }
        } catch (error) {
          logger.warn(`Could not get profile image for student ${doc.id}:`, error);
        }
        
        students.push({
          id: doc.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          major: userData.major || '',
          graduationYear: userData.graduationYear || '',
          profileImageUrl
        });
      }
      
      res.json({ students });
      
    } catch (error) {
      logger.error('Error fetching students:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);