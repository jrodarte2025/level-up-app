import { messaging, auth, db } from "../firebase";
import { getToken } from "firebase/messaging";
import { doc, setDoc, getDoc } from "firebase/firestore";

const VAPID_KEY = "BGIu5yYG52Ry8kOt1wrY7KkJ-ZilDdT95o1zrGlsUdF907-URK4qvBnZ3sf2xua1JTxOAxIaNopmQw8apLSaEEQ";

export async function testNotificationSetup() {
  console.log("🔍 TESTING PUSH NOTIFICATION SETUP");
  console.log("=" + "=".repeat(50));
  
  const results = {
    browser: null,
    permission: null,
    serviceWorker: null,
    token: null,
    storage: null,
    overall: false
  };

  // 1. Check browser support
  console.log("\n📋 Step 1: Browser Support");
  if (!("Notification" in window)) {
    console.error("❌ Notification API not supported");
    results.browser = "Not supported";
  } else if (!("serviceWorker" in navigator)) {
    console.error("❌ Service Worker not supported");
    results.browser = "Service Worker not supported";
  } else {
    console.log("✅ Browser supports notifications");
    results.browser = "Supported";
  }

  // 2. Check permission status
  console.log("\n📋 Step 2: Permission Status");
  const permission = Notification.permission;
  console.log(`Current permission: ${permission}`);
  results.permission = permission;
  
  if (permission === "denied") {
    console.error("❌ Notifications blocked - user must enable in browser settings");
    return results;
  } else if (permission === "default") {
    console.warn("⚠️ Permission not yet requested");
  } else {
    console.log("✅ Permission granted");
  }

  // 3. Check service worker
  console.log("\n📋 Step 3: Service Worker");
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const fbSw = registrations.find(r => 
      r.active?.scriptURL?.includes('firebase-messaging-sw.js')
    );
    
    if (fbSw) {
      console.log("✅ Firebase service worker registered");
      console.log(`   URL: ${fbSw.active.scriptURL}`);
      results.serviceWorker = "Registered";
    } else {
      console.warn("⚠️ Firebase service worker not found");
      results.serviceWorker = "Not found";
    }
  } catch (error) {
    console.error("❌ Service worker check failed:", error);
    results.serviceWorker = "Error: " + error.message;
  }

  // 4. Try to get FCM token
  console.log("\n📋 Step 4: FCM Token Generation");
  
  if (permission !== "granted") {
    console.log("⏭️ Skipping - need permission first");
    results.token = "Skipped - no permission";
  } else {
    try {
      console.log("🔑 Generating FCM token...");
      const registration = await navigator.serviceWorker.ready;
      
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      
      if (token) {
        console.log("✅ Token generated successfully!");
        console.log(`   Token preview: ${token.substring(0, 20)}...`);
        console.log(`   Length: ${token.length} characters`);
        results.token = token;
        results.overall = true;
      } else {
        console.error("❌ No token received");
        results.token = "No token received";
      }
    } catch (error) {
      console.error("❌ Token generation failed:", error);
      console.error("   Error code:", error.code);
      console.error("   Error message:", error.message);
      results.token = `Error: ${error.message}`;
      
      // Provide helpful error messages
      if (error.message?.includes("messaging/unsupported-browser")) {
        console.log("💡 This browser doesn't support FCM");
      } else if (error.message?.includes("messaging/token-subscribe-failed")) {
        console.log("💡 Check VAPID key in Firebase Console");
      } else if (error.message?.includes("messaging/failed-service-worker-registration")) {
        console.log("💡 Service worker registration issue");
      }
    }
  }

  // 5. Check Firestore storage (if user is logged in)
  console.log("\n📋 Step 5: Token Storage");
  if (auth.currentUser && results.token && typeof results.token === 'string') {
    try {
      const tokenDoc = await getDoc(doc(db, 'notification_tokens', auth.currentUser.uid));
      
      if (tokenDoc.exists()) {
        console.log("✅ Token already in Firestore");
        results.storage = "Exists";
      } else {
        console.log("⚠️ Token not in Firestore - saving now...");
        await setDoc(doc(db, 'notification_tokens', auth.currentUser.uid), {
          token: results.token
        });
        console.log("✅ Token saved to Firestore");
        results.storage = "Saved";
      }
    } catch (error) {
      console.error("❌ Storage check failed:", error);
      results.storage = "Error: " + error.message;
    }
  } else if (!auth.currentUser) {
    console.log("ℹ️ User not logged in - cannot check storage");
    results.storage = "User not authenticated";
  } else {
    results.storage = "No token to store";
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log("Browser Support:", results.browser);
  console.log("Permission:", results.permission);
  console.log("Service Worker:", results.serviceWorker);
  console.log("FCM Token:", results.token ? "✅ Generated" : "❌ Failed");
  console.log("Storage:", results.storage);
  console.log("\nOverall Status:", results.overall ? "✅ WORKING" : "❌ NOT WORKING");
  
  if (!results.overall) {
    console.log("\n💡 TO FIX:");
    if (permission === "default") {
      console.log("1. Request notification permission");
    }
    if (permission === "denied") {
      console.log("1. Enable notifications in browser settings");
    }
    if (!results.token || results.token.includes("Error")) {
      console.log("2. Check Firebase Console settings");
      console.log("3. Verify Cloud Messaging API is enabled");
    }
  }
  
  return results;
}

export async function requestNotificationPermission() {
  console.log("📣 Requesting notification permission...");
  
  try {
    const permission = await Notification.requestPermission();
    console.log(`Permission result: ${permission}`);
    
    if (permission === "granted") {
      console.log("✅ Permission granted!");
      // Immediately try to generate token
      const results = await testNotificationSetup();
      return results;
    } else {
      console.log("❌ Permission denied");
      return { permission, overall: false };
    }
  } catch (error) {
    console.error("❌ Permission request failed:", error);
    return { error: error.message, overall: false };
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.testNotifications = testNotificationSetup;
  window.requestNotifications = requestNotificationPermission;
  console.log("🧪 Notification test functions loaded!");
  console.log("   Run: testNotifications()");
  console.log("   Or: requestNotifications()");
}