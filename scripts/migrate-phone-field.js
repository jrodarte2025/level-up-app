/**
 * Migration script to add phoneNumber field to existing users
 * Run this once after deploying the phone number feature
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  // Copy your config from src/firebase.js
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migratePhoneNumbers() {
  console.log('Starting phone number field migration...');

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let updateCount = 0;
    let skipCount = 0;

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();

      // Only update if phoneNumber field doesn't exist
      if (!('phoneNumber' in userData)) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          phoneNumber: ''
        });
        updateCount++;
        console.log(`✓ Updated user ${userDoc.id}`);
      } else {
        skipCount++;
        console.log(`- Skipped user ${userDoc.id} (already has phoneNumber field)`);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Updated: ${updateCount} users`);
    console.log(`Skipped: ${skipCount} users`);

  } catch (error) {
    console.error('Migration failed:', error);
  }

  process.exit(0);
}

// Run the migration
migratePhoneNumbers();