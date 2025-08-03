import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAuth } from 'firebase/auth';

const TypingContext = createContext();

export const useTyping = () => {
  const context = useContext(TypingContext);
  if (!context) {
    throw new Error('useTyping must be used within a TypingProvider');
  }
  return context;
};

export const TypingProvider = ({ children }) => {
  const [typingUsers, setTypingUsers] = useState({}); // { postId: [users] }
  const [newCommentIds, setNewCommentIds] = useState(new Set()); // Track new comments for highlighting
  const typingTimeouts = useRef({});
  const auth = getAuth();

  // Listen to typing indicators for all posts
  useEffect(() => {
    const unsubscribes = {};

    // Set up listeners for typing indicators
    const setupTypingListener = (postId) => {
      const typingRef = collection(db, 'typing', postId, 'users');
      const unsubscribe = onSnapshot(typingRef, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTypingUsers(prev => ({
          ...prev,
          [postId]: users
        }));
      });
      
      unsubscribes[postId] = unsubscribe;
    };

    // Clean up function
    return () => {
      Object.values(unsubscribes).forEach(unsubscribe => unsubscribe());
      Object.values(typingTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const startTyping = async (postId) => {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const userDisplayName = auth.currentUser.displayName || 
                           auth.currentUser.email || 
                           'Anonymous User';

    try {
      // Set typing indicator
      await setDoc(doc(db, 'typing', postId, 'users', userId), {
        displayName: userDisplayName,
        timestamp: serverTimestamp(),
        userId
      });

      // Clear existing timeout
      if (typingTimeouts.current[`${postId}-${userId}`]) {
        clearTimeout(typingTimeouts.current[`${postId}-${userId}`]);
      }

      // Set timeout to remove typing indicator after 3 seconds of inactivity
      typingTimeouts.current[`${postId}-${userId}`] = setTimeout(() => {
        stopTyping(postId);
      }, 3000);
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  };

  const stopTyping = async (postId) => {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;

    try {
      await deleteDoc(doc(db, 'typing', postId, 'users', userId));
      
      // Clear timeout
      if (typingTimeouts.current[`${postId}-${userId}`]) {
        clearTimeout(typingTimeouts.current[`${postId}-${userId}`]);
        delete typingTimeouts.current[`${postId}-${userId}`];
      }
    } catch (error) {
      console.error('Error removing typing indicator:', error);
    }
  };

  const markCommentAsNew = (commentId) => {
    setNewCommentIds(prev => new Set(prev).add(commentId));
    
    // Remove highlight after 5 seconds
    setTimeout(() => {
      setNewCommentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    }, 5000);
  };

  const isCommentNew = (commentId) => {
    return newCommentIds.has(commentId);
  };

  const value = {
    typingUsers,
    startTyping,
    stopTyping,
    markCommentAsNew,
    isCommentNew,
    newCommentIds
  };

  return (
    <TypingContext.Provider value={value}>
      {children}
    </TypingContext.Provider>
  );
};

export default TypingContext;