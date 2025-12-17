// Test script to manually trigger the new user email notification
// Run this with: node test-email-notification.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Your Firebase configuration (from your existing firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyDkRFGx0Dk3WzBAhEzjbE5SuL36a5I0SYs",
  authDomain: "level-up-app-c9f47.firebaseapp.com",
  projectId: "level-up-app-c9f47",
  storageBucket: "level-up-app-c9f47.firebasestorage.app",
  messagingSenderId: "368574932719",
  appId: "1:368574932719:web:7d5b92c7ff2c51ef696c26",
  measurementId: "G-3H6JLKL1VG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestUser() {
  try {
    console.log('Creating test user to trigger email notification...');

    const testUserId = `test_user_${Date.now()}`;
    const testUserData = {
      uid: testUserId,
      email: 'test@example.com',
      displayName: 'Test User',
      firstName: 'Test',
      lastName: 'User',
      role: 'student',
      major: 'Computer Science',
      graduationYear: '2025',
      registrationCodeVerified: true,
      isAdmin: false,
      linkedinUrl: 'https://linkedin.com/in/testuser',
      phoneNumber: '5131234567',
      registrationCodeUsed: 'TEST123',
      createdAt: serverTimestamp()
    };

    // Create the test user document - this should trigger the Cloud Function
    await setDoc(doc(db, 'users', testUserId), testUserData);

    console.log('✅ Test user created successfully!');
    console.log(`User ID: ${testUserId}`);
    console.log('');
    console.log('✉️  Check your email at: jim@levelupcincinnati.org');
    console.log('📊 Check Firebase logs: https://console.firebase.google.com/project/level-up-app-c9f47/functions/logs');
    console.log('');
    console.log('🧹 To clean up this test user, run:');
    console.log(`   firebase firestore:delete users/${testUserId}`);
    console.log('');
    console.log('⏳ Email should arrive within 1-2 minutes...');

    // Give the function time to execute
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();
