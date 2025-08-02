
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const VAPID_KEY = "BGIu5yYG52Ry8kOt1wfY7KkJ-ZilDdT95o1zrGlsUdF907-URK4qvBnZ3sf2xua1JTxOAxIaNopmQw8apLSaEEQ";

export async function registerForNotifications() {
  console.log("🔔 Starting notification registration...");
  console.log("🔔 Browser:", navigator.userAgent.includes('Safari') ? 'Safari' : 'Other');
  
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return { success: false, error: "Browser not supported" };
  }

  // Safari-specific checks
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    console.log("🔔 Safari detected - checking FCM support...");
    
    // Safari doesn't support FCM on HTTP or in some cases
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn("🔔 ❌ Safari requires HTTPS for push notifications");
      return { success: false, error: "Safari requires HTTPS for notifications" };
    }
    
    // Check if FCM is supported in this Safari version
    try {
      const { isSupported } = await import("firebase/messaging");
      const supported = await isSupported();
      if (!supported) {
        console.warn("🔔 ❌ FCM not supported in this Safari version");
        return { success: false, error: "Push notifications not supported in this Safari version" };
      }
      console.log("🔔 ✅ FCM supported in Safari");
    } catch (error) {
      console.error("🔔 ❌ Error checking Safari FCM support:", error);
      return { success: false, error: "Cannot check FCM support: " + error.message };
    }
  }

  if (!("serviceWorker" in navigator)) {
    console.warn("Service Worker not supported");
    return { success: false, error: "Service Worker not supported" };
  }

  try {
    console.log("🔔 Requesting notification permission...");
    const permission = await Notification.requestPermission();
    console.log("🔔 Permission result:", permission);
    
    if (permission !== "granted") {
      console.log("Notification permission not granted.");
      return { success: false, error: "Permission denied" };
    }

    console.log("🔔 Waiting for service worker...");
    
    // Safari sometimes needs more time for service worker registration
    let registration;
    try {
      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Service worker timeout")), 10000)
        )
      ]);
      console.log("🔔 Service worker ready:", registration);
    } catch (swError) {
      console.error("🔔 ❌ Service worker error:", swError);
      return { success: false, error: "Service worker failed: " + swError.message };
    }

    console.log("🔔 Getting messaging instance...");
    // Import messaging dynamically to avoid initialization issues
    const { getMessaging, getToken } = await import("firebase/messaging");
    
    let messaging;
    try {
      messaging = getMessaging();
    } catch (msgError) {
      console.error("🔔 ❌ Messaging initialization error:", msgError);
      return { success: false, error: "Messaging init failed: " + msgError.message };
    }
    
    console.log("🔔 Getting FCM token...");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    
    console.log("🔔 Token received:", token ? "✅ Yes" : "❌ No");

    if (token) {
      if (auth.currentUser) {
        console.log("🔔 Saving token to Firestore for user:", auth.currentUser.uid);
        const tokenRef = doc(db, "notification_tokens", auth.currentUser.uid);
        await setDoc(tokenRef, { token }, { merge: true });
        console.log("🔔 ✅ Notification token saved to Firestore.");
        return { success: true, token };
      } else {
        console.warn("🔔 ❌ User not logged in. Token not saved.");
        return { success: false, error: "User not authenticated" };
      }
    } else {
      console.warn("🔔 ❌ No token received from FCM.");
      return { success: false, error: "No token received from FCM" };
    }
  } catch (err) {
    console.error("🔔 ❌ Error getting notification token:", err);
    console.error("🔔 ❌ Error details:", {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    return { success: false, error: `${err.name}: ${err.message}` };
  }
}

