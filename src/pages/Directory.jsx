import React, { useState, useEffect } from "react";
import AvatarList from "../components/AvatarList";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";
import { auth } from "../firebase";
import "../App.css";
import { useTheme } from "@mui/material/styles";

// roleFilter: "all" | "coach" | "student" | "board"
export default function Directory({ roleFilter = "all", showAdminPanel = false }) {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(roleFilter);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [matchUserId, setMatchUserId] = useState(null);
  // Set of user IDs matched to the current user
  const [myMatchSet, setMyMatchSet] = useState(new Set());
  const [myUserId, setMyUserId] = useState(null);
  const [matches, setMatches] = useState([]);
  // New: editing state for admin edit mode
  const [isEditing, setIsEditing] = useState(false);
  // Load the current user's match and all matches
  useEffect(() => {
    const loadMatch = async () => {
      const me = auth.currentUser;
      if (me) {
        setMyUserId(me.uid);
      }
      // Fetch all matches
      const snap = await getDocs(collection(db, "matches"));
      const matchArr = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMatches(matchArr);
      // Keep legacy matchUserId for highlighting the logged-in user's match in the list
      if (me) {
        // Try as coach
        let q = query(collection(db, "matches"), where("coachId", "==", me.uid));
        let snap2 = await getDocs(q);
        let m = snap2.docs.length ? snap2.docs[0].data() : null;
        if (!m) {
          // Try as student
          q = query(collection(db, "matches"), where("studentId", "==", me.uid));
          snap2 = await getDocs(q);
          m = snap2.docs.length ? snap2.docs[0].data() : null;
        }
        if (m) {
          const otherId = m.coachId === me.uid ? m.studentId : m.coachId;
          setMatchUserId(otherId);
        }
      }
    };
    loadMatch();
  }, []);

  // Build a Set of user IDs matched to the current user
  useEffect(() => {
    if (!myUserId || !matches.length) {
      setMyMatchSet(new Set());
      return;
    }
    const s = new Set();
    matches.forEach(m => {
      if (m.coachId === myUserId) s.add(m.studentId);
      if (m.studentId === myUserId) s.add(m.coachId);
    });
    setMyMatchSet(s);
  }, [myUserId, matches]);
  const editable = currentUserIsAdmin;

  // Fetch users from Firestore
  useEffect(() => {
    const loadUsers = async () => {
      const col = collection(db, "users");
      const snap = await getDocs(col);
      const data = await Promise.all(
        snap.docs.map(async (d) => {
          const u = { id: d.id, ...d.data() };
          // Resolve headshotUrl or profileImage or storage fallback
          if (!u.headshotUrl && !u.profileImage) {
            try {
              const storage = getStorage();
              const url = await getDownloadURL(storageRef(storage, `users/${u.id}/profile.jpg`));
              u.headshotUrl = url;
            } catch {
              // no-op, leave undefined
            }
          }
          return u;
        })
      );
      setUsers(data);
    };
    loadUsers();
  }, []);

  // Load the current authenticated user's role and isAdmin for admin editing
  useEffect(() => {
    const loadCurrentRole = async () => {
      const u = auth.currentUser;
      if (u) {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setCurrentUserRole(snap.data().role);
          setCurrentUserIsAdmin(snap.data().isAdmin === true);
        } else {
          setCurrentUserIsAdmin(false);
        }
      } else {
        setCurrentUserIsAdmin(false);
      }
    };
    loadCurrentRole();
  }, []);

  // Compute filtered list, excluding the current user
  const filtered = users.filter((u) => {
    let matchesRole = false;
    if (filter === "all") {
      matchesRole = true;
    } else if (filter === "coach") {
      matchesRole = ["coach", "coach-board"].includes(u.role);
    } else if (filter === "board") {
      matchesRole = ["board", "coach-board"].includes(u.role);
    } else {
      matchesRole = u.role === filter;
    }
    const isNotMe = u.id !== myUserId;
    const searchLower = search.toLowerCase();
    const nameString = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const emailString = (u.email || "").toLowerCase();
    const matchesSearch = nameString.includes(searchLower) || emailString.includes(searchLower);
    return matchesRole && matchesSearch && isNotMe;
  });
  // Sort the filtered list alphabetically by last name
  filtered.sort((a, b) => {
    const lastA = a.lastName?.toLowerCase() || "";
    const lastB = b.lastName?.toLowerCase() || "";
    return lastA.localeCompare(lastB);
  });

  // Role pills
  const roles = [
    { key: "all", label: "All" },
    { key: "coach", label: "Coaches" },
    { key: "student", label: "Students" },
    { key: "board", label: "Board" },
    { key: "future-coach", label: "Future Coaches" },
  ];

  // Role badge background colors
  const roleColors = {
    coach: "#1e2d5f",
    student: "#F15F5E",
    board: "#2D7D7D",
    "coach-board": "#7c3aed",
    "future-coach": "#34D399",
    admin: "#6B7280"
  };

  return (
    <div className="page-content">
      {/* Sticky Search + Filter */}
      <div
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 10,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)"
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            maxWidth: "100%",
            padding: "0.75rem",
            marginBottom: "1rem",
            borderRadius: "6px",
            border: `1px solid ${theme.palette.divider}`,
            fontSize: "16px", // Prevent iOS zoom
            boxSizing: "border-box",
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          }}
        />
        {/* Role filter pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "0", flexWrap: "wrap" }}>
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setFilter(r.key)}
              className={`button-toggle ${filter === r.key ? "active" : ""}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filtered.length > 0 ? (
          filtered.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setSelectedUser(u);
                setEditForm({
                  firstName: u.firstName || "",
                  lastName: u.lastName || "",
                  email: u.email || "",
                  phone: u.phone || "",
                  title: u.title || "",
                  company: u.company || "",
                  major: u.major || "",
                  graduationYear: u.graduationYear || "",
                  linkedinUrl: u.linkedinUrl || "",
                  boardRole: u.boardRole || "",
                  role: u.role || "student",
                  alumni: u.alumni || false,
                });
              }}
              className="directory-user-card"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "1rem 0.75rem",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "8px",
                cursor: "pointer",
                backgroundColor: theme.palette.background.paper,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                color: theme.palette.text.primary,
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
                minHeight: "56px", // Normalize card touch target
              }}
            >
              <div style={{ marginRight: "1rem" }}>
                <AvatarList users={[{
                  id: u.id,
                  email: u.email,
                  displayName: `${u.firstName} ${u.lastName}`,
                  profileImage: u.headshotUrl || u.profileImage || "/default-avatar.png",
                  isMatch: myMatchSet.has(u.id),
                  role: u.role
                }]} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%"
                }}>
                  <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                    {u.firstName} {u.lastName}
                  </div>
                </div>
                <div style={{ fontSize: "0.9rem", color: theme.palette.text.secondary }}>
                  {(() => {
                    let subtitle = "";
                    const roles = u.role?.split("-") || [];

                    if (["coach", "coach-board", "future-coach"].includes(u.role) && u.title && u.company) {
                      subtitle = `${u.title} at ${u.company}`;
                    } else if (["board", "coach-board"].includes(u.role) && (u.title || u.company)) {
                      subtitle = `${u.title || ""}${u.company ? " at " + u.company : ""}`;
                    } else if (roles.includes("student") && u.major) {
                      subtitle = `${u.major}${u.graduationYear ? ", Class of " + u.graduationYear : ""}`;
                    } else if (u.role === "admin") {
                      // For admin users, show title if available, otherwise just company
                      if (u.title && u.company) {
                        subtitle = `${u.title} at ${u.company}`;
                      } else if (u.title) {
                        subtitle = u.title;
                      } else if (u.company) {
                        subtitle = u.company;
                      }
                    }
                    return subtitle || u.email;
                  })()}
                </div>
                {/* Role and alumni badges */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {(() => {
                    const role = u.role || "";
                    // Handle special roles that shouldn't be split
                    if (role === "admin") {
                      return (
                        <div
                          key={role}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            color: "#fff",
                            backgroundColor: roleColors[role] || "#6b7280"
                          }}
                        >
                          Level Up Team
                        </div>
                      );
                    }
                    if (role === "future-coach") {
                      return (
                        <div
                          key={role}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            color: "#fff",
                            backgroundColor: roleColors[role] || "#6b7280"
                          }}
                        >
                          Future Coach
                        </div>
                      );
                    }
                    // Handle coach-board as a single badge
                    if (role === "coach-board") {
                      return (
                        <div
                          key={role}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            color: "#fff",
                            backgroundColor: roleColors[role] || "#6b7280"
                          }}
                        >
                          Coach + Board
                        </div>
                      );
                    }
                    // For other roles, use the original logic
                    return role
                      .split("-")
                      .filter(Boolean)
                      .map((r) => (
                        <div
                          key={r}
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            color: "#fff",
                            backgroundColor: roleColors[r] || "#6b7280"
                          }}
                        >
                          {r === "admin" ? "Level Up Team" : r.charAt(0).toUpperCase() + r.slice(1)}
                        </div>
                      ));
                  })()}
                  {u.alumni && (
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: "#3b82f6",
                        color: "#fff"
                      }}
                    >
                      Alumni
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "1.25rem", color: "#6b7280" }}>›</div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: "0.95rem" }}>
            No users found. Try adjusting your search or filter.
          </p>
        )}
      </div>

      {/* Detail modal */}
      {selectedUser && (
        <div
          onClick={() => {
            setSelectedUser(null);
            setIsEditing(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "12px",
              padding: "1.5rem 1rem",
              maxWidth: "400px",
              width: "90%",
              textAlign: "center",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
              boxSizing: "border-box"
            }}
          >
            {/* Role badge in top-left corner */}
            <div style={{
              position: "absolute",
              top: "0.75rem",
              left: "0.75rem",
              backgroundColor: roleColors[selectedUser.role] || "#6b7280",
              color: "#fff",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600
            }}>
              {selectedUser.role === "admin" ? "Level Up Team" : selectedUser.role === "future-coach" ? "Future Coach" : selectedUser.role === "coach-board" ? "Coach + Board" : selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                background: "transparent",
                border: "none",
                fontSize: "1.25rem",
                color: "#6b7280",
                cursor: "pointer"
              }}
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={selectedUser.headshotUrl || selectedUser.profileImage || "/default-avatar.png"}
              alt={selectedUser.displayName || selectedUser.email}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "1rem"
              }}
            />
            {/* Editable fields for admin, static for others */}
            {editable && isEditing ? (
              <>
                {/* Define a shared input style for consistency */}
                {(() => {
                  const inputStyle = {
                    margin: "0.25rem 0",
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: `1px solid ${theme.palette.divider}`,
                    fontSize: "1rem",
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.background.paper
                  };
                  return (
                    <>
                      {/* Name Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Name</h4>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="First Name"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Last Name"
                          style={inputStyle}
                        />
                      </div>

                      {/* Work Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Work</h4>
                        {["coach", "board", "coach-board", "future-coach", "admin"].includes(editForm.role) ? (
                          <>
                            {["board", "coach-board"].includes(editForm.role) && (
                              <input
                                type="text"
                                value={editForm.boardRole}
                                onChange={e => setEditForm({ ...editForm, boardRole: e.target.value })}
                                placeholder="Board Role"
                                style={inputStyle}
                              />
                            )}
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                              placeholder="Job Title"
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              value={editForm.company}
                              onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                              placeholder="Company"
                              style={inputStyle}
                            />
                          </>
                        ) : selectedUser.role === "student" ? (
                          <>
                            <input
                              type="text"
                              value={editForm.major}
                              onChange={e => setEditForm({ ...editForm, major: e.target.value })}
                              placeholder="Major"
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              value={editForm.graduationYear}
                              onChange={e => setEditForm({ ...editForm, graduationYear: e.target.value })}
                              placeholder="Graduation Year"
                              style={inputStyle}
                            />
                          </>
                        ) : null}
                      </div>

                      {/* Contact Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Contact Info</h4>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="Email"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Phone"
                          style={inputStyle}
                        />
                      </div>

                      {/* LinkedIn Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>LinkedIn</h4>
                        <input
                          type="text"
                          value={editForm.linkedinUrl}
                          onChange={e => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                          placeholder="LinkedIn URL"
                          style={inputStyle}
                        />
                      </div>

                      {/* Role and Alumni (Admin Only) */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Admin Controls</h4>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>User Role</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            borderRadius: "6px",
                            border: `1px solid ${theme.palette.divider}`,
                            marginTop: "0.25rem",
                            marginBottom: "0.75rem"
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="coach">Coach</option>
                          <option value="board">Board Member</option>
                          <option value="coach-board">Coach + Board</option>
                          <option value="future-coach">Future Coach</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                          <input
                            type="checkbox"
                            checked={editForm.alumni}
                            onChange={(e) => setEditForm({ ...editForm, alumni: e.target.checked })}
                          />
                          Alumni
                        </label>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>

                {/* Work Section */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>Work</h4>
                  <p style={{ margin: 0, fontSize: "1rem", fontWeight: 500 }}>
                    {(["coach", "board", "coach-board", "future-coach", "admin"].includes(selectedUser.role))
                      ? (selectedUser.title && selectedUser.company
                        ? `${selectedUser.title} at ${selectedUser.company}`
                        : selectedUser.title || selectedUser.company || "—")
                      : selectedUser.role === "student"
                      ? `${selectedUser.major || ""}${selectedUser.graduationYear ? ", Class of " + selectedUser.graduationYear : ""}`
                      : "—"}
                  </p>
                </div>

                {/* Contact Section */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>Contact Info</h4>
                  <p style={{ margin: 0 }}>
                    <a
                      href={`mailto:${selectedUser.email}`}
                      style={{ color: theme.palette.text.primary, fontSize: "1rem", textDecoration: "underline" }}
                    >
                      {selectedUser.email}
                    </a>
                  </p>
                  {selectedUser.phone && (
                    <p style={{ margin: 0 }}>
                      <a href={`tel:${selectedUser.phone}`} style={{ color: theme.palette.text.primary, fontSize: "1rem" }}>
                        {selectedUser.phone}
                      </a>
                    </p>
                  )}
                </div>

                {/* LinkedIn Section */}
                {selectedUser.linkedinUrl && (
                  <div style={{ marginBottom: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>LinkedIn</h4>
                    <a
                      href={selectedUser.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: theme.palette.text.primary, fontSize: "1rem", textDecoration: "underline" }}
                    >
                      View Profile
                    </a>
                  </div>
                )}

                {/* Matched User Section */}
                {(() => {
                  // Find the match for the selected user
                  const matchData = matches.find(match => 
                    match.studentId === selectedUser.id || match.coachId === selectedUser.id
                  );
                  
                  if (!matchData) return null;
                  
                  // Get the other user in the match
                  const matchedUserId = matchData.studentId === selectedUser.id 
                    ? matchData.coachId 
                    : matchData.studentId;
                  
                  const match = users.find(u => u.id === matchedUserId);
                  return match ? (
                    <div style={{
                      marginTop: "2rem",
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                      color: theme.palette.text.primary,
                      width: "100%"
                    }}
                      onClick={() => {
                        setSelectedUser(match);
                        setEditForm({
                          firstName: match.firstName || "",
                          lastName: match.lastName || "",
                          email: match.email || "",
                          phone: match.phone || "",
                          title: match.title || "",
                          company: match.company || "",
                          major: match.major || "",
                          graduationYear: match.graduationYear || "",
                          linkedinUrl: match.linkedinUrl || "",
                          boardRole: match.boardRole || "",
                          role: match.role || "student",
                          alumni: match.alumni || false,
                        });
                      }}
                    >
                      <img
                        src={match.headshotUrl || match.profileImage || "/default-avatar.png"}
                        alt={match.displayName || match.email}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginRight: "0.5rem"
                        }}
                      />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>Matched With</div>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: theme.palette.text.primary }}>
                          {match.firstName} {match.lastName}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            )}
            {/* Admin Save/Delete/Make Admin buttons */}
            {editable && isEditing && (
              <div style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%"
              }}>
                <button
                  onClick={async () => {
                    const userRef = doc(db, "users", selectedUser.id);
                    await setDoc(userRef, editForm, { merge: true });
                    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u));
                    setSelectedUser(null);
                    setIsEditing(false);
                  }}
                  style={{
                    backgroundColor: "#1e2d5f",
                    color: "#fff",
                    padding: "0.75rem 1rem",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    minHeight: "44px", // Ensure button tap area
                  }}
                >
                  Save
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Delete this user? This cannot be undone.")) {
                      await deleteDoc(doc(db, "users", selectedUser.id));
                      setUsers(users.filter(u => u.id !== selectedUser.id));
                      setSelectedUser(null);
                      setIsEditing(false);
                    }
                  }}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    padding: "0.75rem 1rem",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    minHeight: "44px", // Ensure button tap area
                  }}
                >
                  Delete
                </button>
                <button
                  className="button-link"
                  onClick={() => setIsEditing(false)}
                  style={{
                    minHeight: "44px",
                    padding: "0.75rem 1rem",
                  }}
                >
                  Cancel
                </button>
                {/* Make Admin button (only for admins, only if not already admin) */}
                {editable && showAdminPanel && isEditing && !selectedUser.isAdmin && (
                  <button
                    className="button-primary"
                    onClick={async () => {
                      const userRef = doc(db, "users", selectedUser.id);
                      const confirm = window.confirm("Are you sure you want to grant this user admin abilities?");
                      if (confirm) {
                        await setDoc(userRef, { isAdmin: true }, { merge: true });
                        setUsers(users.map(u =>
                          u.id === selectedUser.id ? { ...u, isAdmin: true } : u
                        ));
                        setSelectedUser({ ...selectedUser, isAdmin: true });
                      }
                    }}
                    style={{
                      minHeight: "44px",
                      padding: "0.75rem 1rem",
                    }}
                  >
                    Make Admin
                  </button>
                )}
                {/* Remove Admin button (only for admins, only if currently admin) */}
                {editable && showAdminPanel && isEditing && selectedUser.isAdmin && (
                  <button
                    className="button-danger"
                    onClick={async () => {
                      const userRef = doc(db, "users", selectedUser.id);
                      const confirm = window.confirm("Are you sure you want to remove admin access from this user?");
                      if (confirm) {
                        await setDoc(userRef, { isAdmin: false }, { merge: true });
                        setUsers(users.map(u =>
                          u.id === selectedUser.id ? { ...u, isAdmin: false } : u
                        ));
                        setSelectedUser({ ...selectedUser, isAdmin: false });
                      }
                    }}
                    style={{
                      minHeight: "44px",
                      padding: "0.75rem 1rem",
                    }}
                  >
                    Remove Admin
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Move Edit button for admin inside the modal, just above the matched user section */}
      {selectedUser && (
        <div
          onClick={() => {
            setSelectedUser(null);
            setIsEditing(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "12px",
              padding: "1.5rem 1rem",
              maxWidth: "400px",
              width: "90%",
              textAlign: "center",
              position: "relative",
              boxSizing: "border-box",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
          >
            {/* Role badge in top-left corner */}
            <div style={{
              position: "absolute",
              top: "0.75rem",
              left: "0.75rem",
              backgroundColor: roleColors[selectedUser.role] || "#6b7280",
              color: "#fff",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600
            }}>
              {selectedUser.role === "admin" ? "Level Up Team" : selectedUser.role === "future-coach" ? "Future Coach" : selectedUser.role === "coach-board" ? "Coach + Board" : selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                background: "transparent",
                border: "none",
                fontSize: "1.25rem",
                color: "#6b7280",
                cursor: "pointer"
              }}
              aria-label="Close"
            >
              ×
            </button>
            <img
              src={selectedUser.headshotUrl || selectedUser.profileImage || "/default-avatar.png"}
              alt={selectedUser.displayName || selectedUser.email}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "1rem"
              }}
            />
            {/* Editable fields for admin, static for others */}
            {editable && isEditing ? (
              <>
                {/* Define a shared input style for consistency */}
                {(() => {
                  const inputStyle = {
                    margin: "0.25rem 0",
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: `1px solid ${theme.palette.divider}`,
                    fontSize: "1rem",
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.background.paper
                  };
                  return (
                    <>
                      {/* Name Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Name</h4>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="First Name"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Last Name"
                          style={inputStyle}
                        />
                      </div>

                      {/* Work Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Work</h4>
                        {["coach", "board", "coach-board", "future-coach", "admin"].includes(editForm.role) ? (
                          <>
                            {["board", "coach-board"].includes(selectedUser.role) && (
                              <input
                                type="text"
                                value={editForm.boardRole}
                                onChange={e => setEditForm({ ...editForm, boardRole: e.target.value })}
                                placeholder="Board Role"
                                style={inputStyle}
                              />
                            )}
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                              placeholder="Job Title"
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              value={editForm.company}
                              onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                              placeholder="Company"
                              style={inputStyle}
                            />
                          </>
                        ) : selectedUser.role === "student" ? (
                          <>
                            <input
                              type="text"
                              value={editForm.major}
                              onChange={e => setEditForm({ ...editForm, major: e.target.value })}
                              placeholder="Major"
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              value={editForm.graduationYear}
                              onChange={e => setEditForm({ ...editForm, graduationYear: e.target.value })}
                              placeholder="Graduation Year"
                              style={inputStyle}
                            />
                          </>
                        ) : null}
                      </div>

                      {/* Contact Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Contact Info</h4>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="Email"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={editForm.phone}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Phone"
                          style={inputStyle}
                        />
                      </div>

                      {/* LinkedIn Section */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>LinkedIn</h4>
                        <input
                          type="text"
                          value={editForm.linkedinUrl}
                          onChange={e => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                          placeholder="LinkedIn URL"
                          style={inputStyle}
                        />
                      </div>

                      {/* Role and Alumni (Admin Only) */}
                      <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
                        <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>Admin Controls</h4>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>User Role</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            borderRadius: "6px",
                            border: `1px solid ${theme.palette.divider}`,
                            marginTop: "0.25rem",
                            marginBottom: "0.75rem"
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="coach">Coach</option>
                          <option value="board">Board Member</option>
                          <option value="coach-board">Coach + Board</option>
                          <option value="future-coach">Future Coach</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                          <input
                            type="checkbox"
                            checked={editForm.alumni}
                            onChange={(e) => setEditForm({ ...editForm, alumni: e.target.checked })}
                          />
                          Alumni
                        </label>
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </h2>

                {/* Work Section */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>Work</h4>
                  <p style={{ margin: 0, fontSize: "1rem", fontWeight: 500 }}>
                    {(["coach", "board", "coach-board", "future-coach", "admin"].includes(selectedUser.role))
                      ? (selectedUser.title && selectedUser.company
                        ? `${selectedUser.title} at ${selectedUser.company}`
                        : selectedUser.title || selectedUser.company || "—")
                      : selectedUser.role === "student"
                      ? `${selectedUser.major || ""}${selectedUser.graduationYear ? ", Class of " + selectedUser.graduationYear : ""}`
                      : "—"}
                  </p>
                </div>

                {/* Contact Section */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>Contact Info</h4>
                  <p style={{ margin: 0 }}>
                    <a
                      href={`mailto:${selectedUser.email}`}
                      style={{ color: theme.palette.text.primary, fontSize: "1rem", textDecoration: "underline" }}
                    >
                      {selectedUser.email}
                    </a>
                  </p>
                  {selectedUser.phone && (
                    <p style={{ margin: 0 }}>
                      <a href={`tel:${selectedUser.phone}`} style={{ color: theme.palette.text.primary, fontSize: "1rem" }}>
                        {selectedUser.phone}
                      </a>
                    </p>
                  )}
                </div>

                {/* LinkedIn Section */}
                {selectedUser.linkedinUrl && (
                  <div style={{ marginBottom: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>LinkedIn</h4>
                    <a
                      href={selectedUser.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: theme.palette.text.primary, fontSize: "1rem", textDecoration: "underline" }}
                    >
                      View Profile
                    </a>
                  </div>
                )}

                {/* Show Edit button for admin if not currently editing and a user is selected, and showAdminPanel is true */}
                {editable && showAdminPanel && !isEditing && selectedUser && (
                  <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
                    <button
                      className="button-danger"
                      style={{
                        padding: "0.75rem 1.25rem",
                        minHeight: "44px",
                      }}
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </button>
                  </div>
                )}

                {/* Matched User Section */}
                {(() => {
                  // Find the match for the selected user
                  const matchData = matches.find(match => 
                    match.studentId === selectedUser.id || match.coachId === selectedUser.id
                  );
                  
                  if (!matchData) return null;
                  
                  // Get the other user in the match
                  const matchedUserId = matchData.studentId === selectedUser.id 
                    ? matchData.coachId 
                    : matchData.studentId;
                  
                  const match = users.find(u => u.id === matchedUserId);
                  return match ? (
                    <div style={{
                      marginTop: "2rem",
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                      color: theme.palette.text.primary,
                      width: "100%"
                    }}
                      onClick={() => {
                        setSelectedUser(match);
                        setEditForm({
                          firstName: match.firstName || "",
                          lastName: match.lastName || "",
                          email: match.email || "",
                          phone: match.phone || "",
                          title: match.title || "",
                          company: match.company || "",
                          major: match.major || "",
                          graduationYear: match.graduationYear || "",
                          linkedinUrl: match.linkedinUrl || "",
                          boardRole: match.boardRole || "",
                        });
                      }}
                    >
                      <img
                        src={match.headshotUrl || match.profileImage || "/default-avatar.png"}
                        alt={match.displayName || match.email}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          marginRight: "0.5rem"
                        }}
                      />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>Matched With</div>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem", color: theme.palette.text.primary }}>
                          {match.firstName} {match.lastName}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            )}
            {/* Admin Save/Delete/Make Admin buttons */}
            {editable && isEditing && (
              <div style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%"
              }}>
                <button
                  onClick={async () => {
                    const userRef = doc(db, "users", selectedUser.id);
                    await setDoc(userRef, editForm, { merge: true });
                    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...editForm } : u));
                    setSelectedUser(null);
                    setIsEditing(false);
                  }}
                  style={{ backgroundColor: "#1e2d5f", color: "#fff", padding: "0.5rem 1rem", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Save
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Delete this user? This cannot be undone.")) {
                      await deleteDoc(doc(db, "users", selectedUser.id));
                      setUsers(users.filter(u => u.id !== selectedUser.id));
                      setSelectedUser(null);
                      setIsEditing(false);
                    }
                  }}
                  style={{ backgroundColor: "#ef4444", color: "#fff", padding: "0.5rem 1rem", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Delete
                </button>
                <button
                  className="button-link"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                {/* Make Admin button (only for admins, only if not already admin) */}
                {editable && showAdminPanel && isEditing && !selectedUser.isAdmin && (
                  <button
                    className="button-primary"
                    onClick={async () => {
                      const userRef = doc(db, "users", selectedUser.id);
                      const confirm = window.confirm("Are you sure you want to grant this user admin abilities?");
                      if (confirm) {
                        await setDoc(userRef, { isAdmin: true }, { merge: true });
                        setUsers(users.map(u =>
                          u.id === selectedUser.id ? { ...u, isAdmin: true } : u
                        ));
                        setSelectedUser({ ...selectedUser, isAdmin: true });
                      }
                    }}
                  >
                    Make Admin
                  </button>
                )}
                {/* Remove Admin button (only for admins, only if currently admin) */}
                {editable && showAdminPanel && isEditing && selectedUser.isAdmin && (
                  <button
                    className="button-danger"
                    onClick={async () => {
                      const userRef = doc(db, "users", selectedUser.id);
                      const confirm = window.confirm("Are you sure you want to remove admin access from this user?");
                      if (confirm) {
                        await setDoc(userRef, { isAdmin: false }, { merge: true });
                        setUsers(users.map(u =>
                          u.id === selectedUser.id ? { ...u, isAdmin: false } : u
                        ));
                        setSelectedUser({ ...selectedUser, isAdmin: false });
                      }
                    }}
                  >
                    Remove Admin
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}