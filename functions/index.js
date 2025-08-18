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
const functions = require("firebase-functions/v2");

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
      const tokens = tokenSnapshot.docs.map(doc => doc.data().token);

      if (tokens.length === 0) {
        res.status(404).send("No notification tokens found.");
        return;
      }

      const message = {
        notification: {
          title: "🔔 Level Up Test",
          body: "This is a test push from Firebase Functions!"
        },
        tokens: tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      logger.info("Push sent:", response);
      res.status(200).send(`Push sent to ${response.successCount} devices.`);
    } catch (error) {
      logger.error("Error sending push:", error);
      res.status(500).send("Error sending notification.");
    }
  }
);

exports.sendUpdateNotification = onDocumentCreated('posts/{postId}', async (event) => {
  const tokensSnapshot = await admin.firestore().collection("notification_tokens").get();
  const tokens = tokensSnapshot.docs
    .map(doc => doc.data()?.token)
    .filter(token => typeof token === 'string' && token.length > 0);

  logger.info(`Collected ${tokens.length} tokens for update push`);

  if (tokens.length === 0) return;

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
    const response = await messaging.sendEach(
      tokens.map(token => ({
        token,
        notification: message.notification,
      }))
    );
    logger.info("Update push response:", response);
  } catch (error) {
    logger.error("Error sending update notification:", error);
  }
});

exports.sendEventNotification = onDocumentCreated('events/{eventId}', async (event) => {
  const tokensSnapshot = await admin.firestore().collection("notification_tokens").get();
  const tokens = tokensSnapshot.docs
    .map(doc => doc.data()?.token)
    .filter(token => typeof token === 'string' && token.length > 0);

  logger.info(`Collected ${tokens.length} tokens for event push`);

  if (tokens.length === 0) return;

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
    const response = await messaging.sendEach(
      tokens.map(token => ({
        token,
        notification: message.notification,
      }))
    );
    logger.info("Event push response:", response);
  } catch (error) {
    logger.error("Error sending event notification:", error);
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