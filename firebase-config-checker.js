/**
 * Firebase Cloud Messaging Configuration Checker
 * Run this in your browser console at http://localhost:5173
 * to diagnose FCM configuration issues
 */

async function checkFirebaseConfig() {
  console.log("🔍 FIREBASE CLOUD MESSAGING CONFIGURATION CHECK");
  console.log("=" + "=".repeat(55));
  
  const issues = [];
  const warnings = [];
  const success = [];

  // 1. Check Firebase Project Info
  console.log("\n📋 Step 1: Project Configuration");
  console.log("-".repeat(40));
  
  const expectedConfig = {
    apiKey: "AIzaSyB3iCL2C6654eo6mrLboG45f0H_aiFvWsw",
    authDomain: "level-up-app-c9f47.firebaseapp.com", 
    projectId: "level-up-app-c9f47",
    storageBucket: "level-up-app-c9f47.firebasestorage.app",
    messagingSenderId: "256858356257",
    appId: "1:256858356257:web:e849c127252e552b58c160"
  };

  console.log("Project ID:", expectedConfig.projectId);
  console.log("Messaging Sender ID:", expectedConfig.messagingSenderId);
  console.log("App ID:", expectedConfig.appId);
  
  // 2. Check VAPID Key
  console.log("\n📋 Step 2: VAPID Key Configuration");
  console.log("-".repeat(40));
  
  const currentVapidKey = "BEi0fTYMR3xxvHF3WXYbAHVa2xMj1n4ryBzFVHYj4IngmOJH7aL5CJB_wh50IIREf7oLqyDAB0KrO9kNh5iLibw";
  console.log("Current VAPID Key:", currentVapidKey.substring(0, 20) + "...");
  console.log("Key Length:", currentVapidKey.length, "(should be 88)");
  
  if (currentVapidKey.length === 88) {
    success.push("✅ VAPID key length is correct");
  } else {
    issues.push("❌ VAPID key length is incorrect");
  }

  // 3. Check Service Worker
  console.log("\n📋 Step 3: Service Worker Status");
  console.log("-".repeat(40));
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const fbSw = registrations.find(r => 
      r.active?.scriptURL?.includes('firebase-messaging-sw.js')
    );
    
    if (fbSw) {
      console.log("✅ Firebase service worker found");
      console.log("   Scope:", fbSw.scope);
      console.log("   State:", fbSw.active.state);
      success.push("✅ Service worker registered");
      
      // Check if SW has latest version
      if (fbSw.active.scriptURL.includes('firebase-messaging-sw.js')) {
        console.log("   Script URL:", fbSw.active.scriptURL);
      }
    } else {
      issues.push("❌ Firebase messaging service worker not found");
      console.error("❌ Firebase messaging service worker not registered");
    }
  } catch (error) {
    issues.push("❌ Service worker check failed: " + error.message);
  }

  // 4. Test FCM Token Generation with Detailed Error Analysis
  console.log("\n📋 Step 4: FCM Token Generation Test");
  console.log("-".repeat(40));
  
  if (Notification.permission !== "granted") {
    warnings.push("⚠️ Notification permission not granted - skipping token test");
    console.warn("⚠️ Notification permission:", Notification.permission);
    console.log("💡 Request permission first to test token generation");
  } else {
    try {
      // Dynamic import to avoid issues
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { getApps } = await import('firebase/app');
      
      const apps = getApps();
      if (apps.length === 0) {
        issues.push("❌ No Firebase app initialized");
        console.error("❌ No Firebase app found");
      } else {
        const messaging = getMessaging(apps[0]);
        const registration = await navigator.serviceWorker.ready;
        
        console.log("🔑 Attempting token generation...");
        console.log("   Using VAPID key:", currentVapidKey.substring(0, 20) + "...");
        
        const token = await getToken(messaging, {
          vapidKey: currentVapidKey,
          serviceWorkerRegistration: registration
        });
        
        if (token) {
          console.log("✅ FCM token generated successfully!");
          console.log("   Token length:", token.length);
          success.push("✅ FCM token generation working");
        } else {
          issues.push("❌ No FCM token received");
          console.error("❌ No token returned from getToken()");
        }
      }
    } catch (error) {
      issues.push(`❌ FCM token error: ${error.code || error.message}`);
      console.error("❌ FCM Token Generation Error:");
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      
      // Specific error guidance
      if (error.code === 'messaging/token-subscribe-failed') {
        console.log("\n💡 TOKEN-SUBSCRIBE-FAILED SOLUTIONS:");
        console.log("   1. Check VAPID key in Firebase Console");
        console.log("   2. Verify Cloud Messaging API is enabled");
        console.log("   3. Ensure web credentials are properly configured");
        console.log("   4. Check Firebase project billing status");
        
      } else if (error.code === 'messaging/unsupported-browser') {
        console.log("💡 Use Chrome, Firefox, or Edge for FCM support");
        
      } else if (error.code === 'messaging/failed-service-worker-registration') {
        console.log("💡 Service worker registration issue - check firebase-messaging-sw.js");
        
      } else if (error.message?.includes('permission')) {
        console.log("💡 Permission-related error - check notification permissions");
      }
    }
  }

  // 5. Check Firebase Console URLs
  console.log("\n📋 Step 5: Firebase Console Links");
  console.log("-".repeat(40));
  
  const consoleUrls = {
    project: `https://console.firebase.google.com/project/${expectedConfig.projectId}`,
    messaging: `https://console.firebase.google.com/project/${expectedConfig.projectId}/messaging`,
    settings: `https://console.firebase.google.com/project/${expectedConfig.projectId}/settings/general`,
    cloudMessaging: `https://console.firebase.google.com/project/${expectedConfig.projectId}/settings/cloudmessaging`
  };
  
  console.log("🔗 Firebase Console URLs:");
  Object.entries(consoleUrls).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`);
  });

  // Summary
  console.log("\n" + "=".repeat(55));
  console.log("📊 CONFIGURATION STATUS");
  console.log("=".repeat(55));
  
  if (success.length > 0) {
    console.log(`\n✅ Working (${success.length}):`);
    success.forEach(s => console.log(`   ${s}`));
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️ Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`   ${w}`));
  }
  
  if (issues.length > 0) {
    console.log(`\n❌ Issues Found (${issues.length}):`);
    issues.forEach(i => console.log(`   ${i}`));
  }

  // Next Steps
  console.log("\n💡 NEXT STEPS:");
  console.log("=".repeat(55));
  
  if (issues.some(i => i.includes('token-subscribe-failed'))) {
    console.log("🔧 TOKEN-SUBSCRIBE-FAILED FIX:");
    console.log("1. Open Firebase Console: " + consoleUrls.cloudMessaging);
    console.log("2. Go to Project Settings → Cloud Messaging");
    console.log("3. Check Web Configuration section");
    console.log("4. Verify VAPID key matches: " + currentVapidKey.substring(0, 20) + "...");
    console.log("5. If no VAPID key exists, generate new one");
    console.log("6. Enable Cloud Messaging API if disabled");
  }
  
  if (issues.some(i => i.includes('Service worker'))) {
    console.log("🔧 SERVICE WORKER FIX:");
    console.log("1. Check /public/firebase-messaging-sw.js exists");
    console.log("2. Verify SW registration in main.jsx or index.html");
    console.log("3. Clear browser cache and restart dev server");
  }
  
  console.log("\n🔍 Run this function again after making changes");
  console.log("   Command: await checkFirebaseConfig()");
  
  return { success, warnings, issues, consoleUrls };
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.checkFirebaseConfig = checkFirebaseConfig;
  console.log("🔧 Firebase Config Checker loaded!");
  console.log("   Run: await checkFirebaseConfig()");
}

export default checkFirebaseConfig;