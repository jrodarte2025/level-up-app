
import { db, auth } from "../firebase";
import { doc, setDoc } from "firebase/firestore";



import { messaging, getToken } from "../firebase";

const VAPID_KEY = "BGIu5yYG52Ry8kOt1wfY7KkJ-ZilDdT95o1zrGlsUdF907-URK4qvBnZ3sf2xua1JTxOAxIaNopmQw8apLSaEEQ";

export async function registerForNotifications() {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("Notification permission not granted.");
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      if (auth.currentUser) {
        const tokenRef = doc(db, "notification_tokens", auth.currentUser.uid);
        await setDoc(tokenRef, { token }, { merge: true });
        console.log("Notification token saved to Firestore.");
      } else {
        console.warn("User not logged in. Token not saved.");
      }
    } else {
      console.warn("No token received.");
    }
  } catch (err) {
    console.error("Error getting notification token:", err);
  }
}

