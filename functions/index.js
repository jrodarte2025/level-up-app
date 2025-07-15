/****
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

setGlobalOptions({ maxInstances: 10 });

const admin = require("firebase-admin");
admin.initializeApp();

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
      title: `📅 Event Added: ${eventData.title}`,
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