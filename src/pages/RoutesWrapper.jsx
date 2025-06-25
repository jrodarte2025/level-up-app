


import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import AdminPanel from './AdminPanel';
import UserDashboard from './UserDashboard';
import LoadingScreen from '../components/LoadingScreen'; // Create if not yet built
import LoginPage from './LoginPage'; // Replace with actual login component

const RequireAuth = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        setUser({ ...currentUser, ...userDoc.data() });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return user ? children : <Navigate to="/login" />;
};

const RequireAdmin = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        setUser({ ...currentUser, ...userData });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" />;
};

export default function RoutesWrapper() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPanel />
          </RequireAdmin>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <UserDashboard />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}