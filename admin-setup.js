#!/usr/bin/env node

/**
 * Admin Setup Script for Firebase App
 * 
 * This script sets up admin users with custom claims for the password reset functionality.
 * It uses the Firebase Admin SDK with a service account key.
 * 
 * Usage:
 *   node admin-setup.js
 * 
 * Prerequisites:
 *   - Service account key file (service-account-key.json) in project root
 *   - Firebase Admin SDK installed
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for service account key
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account key not found!');
  console.log('📋 To get your service account key:');
  console.log('   1. Go to https://console.firebase.google.com/project/level-up-app-c9f47/settings/serviceaccounts/adminsdk');
  console.log('   2. Click "Generate new private key"');
  console.log('   3. Save the file as "service-account-key.json" in your project root');
  console.log('   4. Run this script again');
  process.exit(1);
}

// Initialize Firebase Admin SDK
try {
  const serviceAccount = JSON.parse(fs.readFileSync('./service-account-key.json', 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'level-up-app-c9f47'
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

/**
 * Set admin custom claims for a user
 * @param {string} email - User email
 * @param {boolean} isAdmin - Whether user should have admin privileges
 */
async function setAdminClaims(email, isAdmin = true) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: isAdmin,
      role: 'admin'
    });
    
    console.log(`✅ Set admin claims for ${email} (UID: ${userRecord.uid})`);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User not found: ${email}`);
    } else {
      console.error(`❌ Error setting admin claims for ${email}:`, error.message);
    }
    return null;
  }
}

/**
 * Update Firestore admin role for users who already have custom claims
 */
async function syncFirestoreAdminRoles() {
  try {
    console.log('🔄 Syncing Firestore admin roles with custom claims...');
    
    const db = admin.firestore();
    const usersRef = db.collection('users');
    
    // Get all users with admin custom claims
    const listUsersResult = await admin.auth().listUsers();
    const adminUsers = listUsersResult.users.filter(user => 
      user.customClaims && user.customClaims.admin === true
    );
    
    for (const user of adminUsers) {
      // Update Firestore document
      const userDocRef = usersRef.doc(user.uid);
      const userDoc = await userDocRef.get();
      
      if (userDoc.exists) {
        await userDocRef.update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Updated Firestore role for ${user.email}`);
      } else {
        console.log(`⚠️  Firestore document not found for ${user.email}`);
      }
    }
    
    console.log('✅ Firestore sync completed');
  } catch (error) {
    console.error('❌ Error syncing Firestore roles:', error.message);
  }
}

/**
 * Set up admin users from Firestore
 */
async function setupAdminsFromFirestore() {
  try {
    console.log('🔍 Looking for existing admin users in Firestore...');
    
    const db = admin.firestore();
    const adminUsersSnapshot = await db.collection('users')
      .where('role', '==', 'admin')
      .get();
    
    if (adminUsersSnapshot.empty) {
      console.log('⚠️  No admin users found in Firestore');
      return;
    }
    
    console.log(`📋 Found ${adminUsersSnapshot.size} admin users in Firestore`);
    
    for (const doc of adminUsersSnapshot.docs) {
      const userData = doc.data();
      if (userData.email) {
        await setAdminClaims(userData.email, true);
      }
    }
    
  } catch (error) {
    console.error('❌ Error setting up admins from Firestore:', error.message);
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Starting admin setup...\n');
  
  try {
    // Option 1: Set up admin users from existing Firestore data
    await setupAdminsFromFirestore();
    
    // Option 2: Sync Firestore roles with custom claims
    await syncFirestoreAdminRoles();
    
    // Option 3: Manually add admin users (uncomment and modify as needed)
    /*
    const manualAdminEmails = [
      'admin@example.com',
      'your-email@domain.com'
    ];
    
    console.log('\n📝 Setting up manual admin users...');
    for (const email of manualAdminEmails) {
      await setAdminClaims(email, true);
    }
    */
    
    console.log('\n✅ Admin setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Deploy your Cloud Functions: npm run deploy');
    console.log('   2. Test admin functionality in your app');
    console.log('   3. Admin users will need to refresh their auth tokens');
    
  } catch (error) {
    console.error('❌ Admin setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

export {
  setAdminClaims,
  syncFirestoreAdminRoles,
  setupAdminsFromFirestore
};