import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  query,
  where,
  getDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import CardWrapper from "./CardWrapper";

const selectableItemStyle = (selected) => ({
  padding: 8,
  marginBottom: "8px",
  border: selected ? "2px solid #1976d2" : "1px solid #ccc",
  borderRadius: "5px",
  cursor: "pointer",
  backgroundColor: selected ? 'primary.light' : 'background.paper',
  transition: "border 0.2s, background 0.2s",
});

const MatchMakingPanel = () => {
  const [students, setStudents] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState([]);

  // Fetch unmatched students and coaches
  useEffect(() => {
    const fetchUnmatched = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        // Fetch all students
        const allStudentsSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "student"))
        );
        const allStudents = allStudentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch all coaches
        const allCoachesSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "coach"))
        );
        const allCoaches = allCoachesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch all matches
        const matchSnap = await getDocs(collection(db, "matches"));
        const matches = matchSnap.docs.map((doc) => doc.data());

        // Get IDs of matched users
        const matchedStudentIds = matches.map(m => m.studentId);
        const matchedCoachIds = matches.map(m => m.coachId);

        // Filter out matched users
        const unmatchedStudents = allStudents.filter(s => !matchedStudentIds.includes(s.id));
        const unmatchedCoaches = allCoaches.filter(c => !matchedCoachIds.includes(c.id));

        setStudents(unmatchedStudents);
        setCoaches(unmatchedCoaches);

        // Fetch matches from the 'matches' collection
        const matchDocs = matchSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const pairs = [];

        for (const match of matchDocs) {
          const coachDoc = await getDoc(doc(db, "users", match.coachId));
          const studentDoc = await getDoc(doc(db, "users", match.studentId));
          if (coachDoc.exists() && studentDoc.exists()) {
            pairs.push({
              id: match.id,
              userA: { id: coachDoc.id, ...coachDoc.data() },
              userB: { id: studentDoc.id, ...studentDoc.data() }
            });
          }
        }

        setMatchedPairs(pairs);
      } catch (err) {
        setError("Failed to fetch users. Please try again.");
      }
      setLoading(false);
    };
    fetchUnmatched();
  }, [refreshToggle]);

  // Handle selection
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSuccess("");
    setError("");
  };
  const handleSelectCoach = (coach) => {
    setSelectedCoach(coach);
    setSuccess("");
    setError("");
  };

  // Handle pairing
  const handlePair = async () => {
    if (!selectedStudent || !selectedCoach) {
      setError("Please select both a student and a coach to pair.");
      setSuccess("");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await addDoc(collection(db, "matches"), {
        coachId: selectedCoach.id,
        studentId: selectedStudent.id,
      });
      setSuccess(
        `Paired ${selectedStudent.firstName} ${selectedStudent.lastName} with ${selectedCoach.firstName} ${selectedCoach.lastName}.`
      );
      setSelectedStudent(null);
      setSelectedCoach(null);
      setRefreshToggle((prev) => !prev);
    } catch (err) {
      console.error("Pairing Firestore error:", err);
      setError("Pairing failed. Please try again.");
    }
    setLoading(false);
  };

  const handleUnpair = async (matchId) => {
    try {
      await deleteDoc(doc(db, "matches", matchId));
      setSuccess("Unmatched successfully.");
      setRefreshToggle(prev => !prev);
    } catch (err) {
      setError("Failed to unmatch. Please try again.");
    }
  };

  return (
    <CardWrapper sx={{ p: 4, maxWidth: 960, mx: "auto" }}>
      <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.125rem", mb: 2 }}>
        Matchmaking
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "#6b7280", mb: 2 }}
      >
        Pair students with their coaches below.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      <Grid container spacing={2} direction="column">
        <Grid item xs={12}>
          <CardWrapper>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Unmatched Students
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : students.length === 0 ? (
              <Typography>No unmatched students found.</Typography>
            ) : (
              students.map((student) => (
                <Box
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    mb: 2,
                    borderRadius: 2,
                    boxShadow: 1,
                    border: selectedStudent?.id === student.id ? "2px solid #1976d2" : "1px solid #ccc",
                    backgroundColor: selectedStudent?.id === student.id ? "#f0f6ff" : "background.paper",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  data-testid={`student-${student.id}`}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      color: "#374151",
                    }}
                  >
                    {student.firstName?.charAt(0)}
                  </Box>
                  <Box>
                    <Typography variant="body1" fontWeight="600">
                      {student.firstName} {student.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Student
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </CardWrapper>
        </Grid>
        <Grid item xs={12}>
          <CardWrapper>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Unmatched Coaches
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : coaches.length === 0 ? (
              <Typography>No unmatched coaches found.</Typography>
            ) : (
              coaches.map((coach) => (
                <Box
                  key={coach.id}
                  onClick={() => handleSelectCoach(coach)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1.5,
                    mb: 2,
                    borderRadius: 2,
                    boxShadow: 1,
                    border: selectedCoach?.id === coach.id ? "2px solid #1976d2" : "1px solid #ccc",
                    backgroundColor: selectedCoach?.id === coach.id ? "#f0f6ff" : "background.paper",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                  data-testid={`coach-${coach.id}`}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      color: "#374151",
                    }}
                  >
                    {coach.firstName?.charAt(0)}
                  </Box>
                  <Box>
                    <Typography variant="body1" fontWeight="600">
                      {coach.firstName} {coach.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Coach
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </CardWrapper>
        </Grid>
        <Grid item xs={12}>
          <CardWrapper sx={{ display: "flex", flexDirection: "column", gap: 2, px: 2, alignItems: "stretch", justifyContent: "center", height: "100%" }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ mb: 2, borderRadius: "8px", fontWeight: 600, textTransform: "none" }}
              fullWidth
              disabled={
                loading ||
                !selectedStudent ||
                !selectedCoach ||
                (selectedStudent && selectedCoach && selectedStudent.id === selectedCoach.id)
              }
              onClick={handlePair}
              data-testid="pair-button"
            >
              Pair Selected
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              sx={{ borderRadius: "8px", fontWeight: 600, textTransform: "none" }}
              onClick={() => {
                setSelectedStudent(null);
                setSelectedCoach(null);
                setError("");
                setSuccess("");
              }}
              disabled={loading}
              data-testid="clear-selection"
            >
              Clear Selection
            </Button>
          </CardWrapper>
        </Grid>
      </Grid>
      <Box mt={6}>
        <Typography variant="h6" fontWeight={600} sx={{ fontSize: "1.125rem", mb: 2 }}>
          Current Matches
        </Typography>
        {matchedPairs.length === 0 ? (
          <Typography>No matches found.</Typography>
        ) : (
          <Grid container spacing={2} columns={12}>
            {matchedPairs.map(({ id, userA, userB }) => (
              <Grid item xs={12} key={id} sx={{ mb: 2 }}>
                <CardWrapper
                  sx={{
                    px: 3,
                    py: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexDirection: { xs: "column", sm: "row" },
                    textAlign: { xs: "center", sm: "left" },
                    gap: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    boxShadow: 1,
                    backgroundColor: (theme) => theme.palette.background.paper,
                    mx: "auto",
                    width: "100%",
                    maxWidth: 600
                  }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={3}
                    width="100%"
                    flexWrap="wrap"
                  >
                    <Box
                      textAlign={{ xs: "center", sm: "left" }}
                      sx={{ minWidth: 0 }}
                    >
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        fontSize={{ xs: "0.95rem", sm: "1rem" }}
                        sx={{
                          overflowWrap: "break-word",
                          wordBreak: "break-word",
                          maxWidth: "100%"
                        }}
                      >
                        {userA.firstName} {userA.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userA.role}
                      </Typography>
                    </Box>

                    <LinkOutlinedIcon sx={{ fontSize: { xs: "1rem", sm: "1.25rem" }, color: "text.secondary" }} />

                    <Box
                      textAlign={{ xs: "center", sm: "left" }}
                      sx={{ minWidth: 0 }}
                    >
                      <Typography
                        variant="body1"
                        fontWeight={600}
                        fontSize={{ xs: "0.95rem", sm: "1rem" }}
                        sx={{
                          overflowWrap: "break-word",
                          wordBreak: "break-word",
                          maxWidth: "100%"
                        }}
                      >
                        {userB.firstName} {userB.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userB.role}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{
                      borderRadius: "6px",
                      fontWeight: 600,
                      textTransform: "none",
                      mt: { xs: 1.5, sm: 0 },
                      alignSelf: { xs: "center", sm: "auto" }
                    }}
                    onClick={() => handleUnpair(id)}
                  >
                    Unmatch
                  </Button>
                </CardWrapper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </CardWrapper>
  );
};

export default MatchMakingPanel;