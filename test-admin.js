// Quick test to check if the current user is admin in Firestore
// Run this in your browser console when logged in

import { auth, db } from './src/firebase';
import { doc, getDoc } from 'firebase/firestore';

async function checkAdminStatus() {
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No user logged in');
    return;
  }
  
  console.log('Current user:', user.email, 'UID:', user.uid);
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('User data:', userData);
      console.log('Is Admin?', userData.isAdmin === true || userData.role === 'admin');
      console.log('Role:', userData.role);
    } else {
      console.log('❌ User document not found in Firestore');
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
}

// Call the function
checkAdminStatus();