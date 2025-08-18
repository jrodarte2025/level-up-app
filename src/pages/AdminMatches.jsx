import React, { useEffect, useState } from "react";
import { Typography, Box } from "@mui/material";
import ApprovalsPanel from "../components/ApprovalsPanel";
import MatchMakingPanel from "../components/MatchMakingPanel";
import PasswordResetPanel from "../components/PasswordResetPanel";
import CardWrapper from "../components/CardWrapper";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

const AdminMatches = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const pendingSnap = await getDocs(
        query(collection(db, "users"), where("approved", "==", false))
      );
      setPendingUsers(pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const studentSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "student"), where("approved", "==", true))
      );
      const coachSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "coach"), where("approved", "==", true))
      );
      setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCoaches(coachSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const matchSnap = await getDocs(collection(db, "matches"));
      setMatchesList(matchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    loadData();
  }, []);

  const handleCreateMatch = async () => {
    if (!selectedCoach || !selectedStudent) return;
    await addDoc(collection(db, "matches"), {
      coachId: selectedCoach.id,
      studentId: selectedStudent.id,
    });
    const matchSnap = await getDocs(collection(db, "matches"));
    setMatchesList(matchSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setSelectedCoach(null);
    setSelectedStudent(null);
  };

  const handleDeleteMatch = async (matchId) => {
    await deleteDoc(doc(db, "matches", matchId));
    setMatchesList(prev => prev.filter(m => m.id !== matchId));
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 2, sm: 4 }, maxWidth: 960, mx: "auto" }}>
      <ApprovalsPanel
        pendingUsers={pendingUsers}
        setPendingUsers={setPendingUsers}
        setSuccess={() => {}}
      />

      <CardWrapper sx={{ p: { xs: 0, sm: 4 }, mb: 4 }}>
        <MatchMakingPanel
          coaches={coaches}
          students={students}
          matchesList={matchesList}
          selectedCoach={selectedCoach}
          setSelectedCoach={setSelectedCoach}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          handleCreateMatch={handleCreateMatch}
          handleDeleteMatch={handleDeleteMatch}
        />
      </CardWrapper>

      <CardWrapper sx={{ p: { xs: 0, sm: 4 }, mb: 0 }}>
        <PasswordResetPanel />
      </CardWrapper>
    </Box>
  );
};

export default AdminMatches;
