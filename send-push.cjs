const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

async function sendTestPush() {
  try {
    const snapshot = await db.collection("notification_tokens").get();
    const tokens = snapshot.docs.map(doc => doc.data().token).filter(Boolean);

    if (tokens.length === 0) {
      console.log("No tokens found.");
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: {
            title: "🚀 Push Test",
            body: "This is a test notification from your local script!",
            icon: "/icons/icon-192.png"
          },
          data: {
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            priority: "high",
            customData: "debug-push"
          },
          webpush: {
            notification: {
              title: "🚀 Push Test",
              body: "This is a test notification from your local script!",
              icon: "/icons/icon-192.png",
              requireInteraction: true
            },
            fcmOptions: {
              link: "https://level-up-app-c9f47.web.app"
            }
          }
        });
        successCount++;
      } catch (err) {
        console.warn(`⚠ Failed to send to ${token}:`, err.message);
        failureCount++;
      }
    }

    console.log(`✅ Sent to ${successCount} device(s).`);
    if (failureCount > 0) {
      console.warn(`⚠ ${failureCount} messages failed.`);
    }
  } catch (err) {
    console.error("❌ Error sending push:", err);
  }
}

sendTestPush();