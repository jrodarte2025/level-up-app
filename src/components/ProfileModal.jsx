import React, { useState } from "react";
import { Chip, Switch } from "@mui/material";
import CropModal from "./CropModal";
import { resizeImage } from "../utils/resizeImage";
import { useTheme } from "@mui/material/styles";
import { getDocs, updateDoc, collection, query, where } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db, auth } from "../firebase";

export default function ProfileModal({
  user,
  userRole,
  profileImage,
  isHovering,
  setIsHovering,
  firstName,
  lastName,
  major,
  graduationYear,
  company,
  jobTitle,
  linkedinUrl,
  onProfileImageChange,
  onSave,
  onSignOut,
  onSwitchAdminView,
  isAdminPanel,
  isAdmin,
  onClose
}) {
  const theme = useTheme();
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setAuthLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const isSelf = auth.currentUser?.uid && user?.uid && auth.currentUser.uid === user.uid;

  return (
    <div
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
        zIndex: 1000,
        maxHeight: "90vh",
        overflowY: "auto"
      }}
      onClick={(e) => {
        // Prevent closing the modal when interacting with CropModal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "relative",
          backgroundColor: theme.palette.background.paper,
          padding: "1rem",
          borderRadius: "12px",
          maxWidth: "480px",
          width: "95vw",
          boxSizing: "border-box",
          overflowY: "auto",
          maxHeight: "calc(100vh - 2rem)",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            background: "transparent",
            border: "none",
            fontSize: "1.25rem",
            lineHeight: "1",
            color: "#6b7280",
            cursor: "pointer"
          }}
        >
          ×
        </button>
        <div style={{ margin: "1rem 0", textAlign: "center" }}>
          <label
            htmlFor="profile-upload"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{ display: "inline-block", position: "relative", width: "96px", height: "96px", cursor: "pointer" }}
          >
            <img
              src={profileImage}
              alt="Profile"
              style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "#fff",
              display: isHovering ? "flex" : "none",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem"
            }}>
              New Photo
            </div>
          </label>
          <input
            id="profile-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setCropImageSrc(reader.result);
              reader.readAsDataURL(file);
            }}
            style={{ display: "none" }}
          />
        </div>
        <p style={{ textAlign: "center", fontWeight: 600, color: theme.palette.text.primary }}>
          {user?.displayName || user?.email}
        </p>
        <div style={{ textAlign: "center", marginTop: "0.5rem", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          {(user?.role || "")
            .split("-")
            .filter(Boolean)
            .map((role) => (
              <Chip
                key={role}
                label={role.charAt(0).toUpperCase() + role.slice(1)}
                size="small"
                sx={{ fontSize: "0.7rem", textTransform: "capitalize" }}
              />
            ))}
          {user?.alumni && (
            <Chip
              label="Alumni"
              size="small"
              color="info"
              sx={{ fontSize: "0.7rem", textTransform: "capitalize" }}
            />
          )}
        </div>
        <div style={{
          margin: "1rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          width: "100%",
          boxSizing: "border-box"
        }}>
          {isAdmin === true && !isSelf && (
            <div style={{ marginTop: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label>
                <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>User Role</span>
                <select
                  value={user.role}
                  onChange={(e) => {
                    onSave("role", e.target.value);
                    setHasChanges(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "16px",
                    borderRadius: "6px",
                    border: `1px solid ${theme.palette.divider}`,
                    marginTop: "0.25rem"
                  }}
                >
                  <option value="student">Student</option>
                  <option value="coach">Coach</option>
                  <option value="board">Board Member</option>
                  <option value="coach-board">Coach + Board</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={user.alumni || false}
                  onChange={(e) => {
                    onSave("alumni", e.target.checked);
                    setHasChanges(true);
                  }}
                />
                <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>Alumni</span>
              </label>
            </div>
          )}
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => { onSave("firstName", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => { onSave("lastName", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
          {userRole === "student" ? (
            <>
              <input type="text" placeholder="Major" value={major} onChange={(e) => { onSave("major", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
              <input type="number" placeholder="Graduation Year" value={graduationYear} onChange={(e) => { onSave("graduationYear", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
            </>
          ) : (
            <>
              <input type="text" placeholder="Company" value={company} onChange={(e) => { onSave("company", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
              <input type="text" placeholder="Job Title" value={jobTitle} onChange={(e) => { onSave("jobTitle", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
            </>
          )}
          <input type="url" placeholder="LinkedIn Profile URL" value={linkedinUrl} onChange={(e) => { onSave("linkedinUrl", e.target.value); setHasChanges(true); }} style={inputStyle(theme)} />
  {console.log("Rendering toggle? ", { authLoaded, notificationSupport: typeof Notification })}
  {authLoaded && typeof Notification !== "undefined" && (
  <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
    <Switch
      checked={typeof Notification !== "undefined" && Notification.permission === "granted"}
      onChange={async () => {
        if (typeof Notification === "undefined") return;

        if (Notification.permission === "granted") {
          alert("To disable notifications, please change your browser settings.");
        } else {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const registration = await navigator.serviceWorker.ready;
            const { getMessaging, getToken } = await import("firebase/messaging");
            const messaging = getMessaging();
            await getToken(messaging, {
              vapidKey: "BGIu5yYG52Ry8kOt1wfY7KkJ-ZilDdT95o1zrGlsUdF907-URK4qvBnZ3sf2xua1JTxOAxIaNopmQw8apLSaEEQ",
              serviceWorkerRegistration: registration
            });
          }
        }
      }}
      color="primary"
    />
    <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>
      {typeof Notification !== "undefined" && Notification.permission === "granted"
        ? "Notifications enabled"
        : "Enable notifications"}
    </span>
  </label>
  )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem" }}>
            {hasChanges && (
              <button
                className="button-primary"
                style={{
                  minHeight: "44px",
                  padding: "0.75rem 1rem"
                }}
                onClick={() => {
                  const missingName = !firstName?.trim() || !lastName?.trim();
                  const missingStudentFields = userRole === "student" && (!major?.trim() || !graduationYear);
                  const missingCoachFields = userRole !== "student" && (!company?.trim() || !jobTitle?.trim());
                  const invalidLinkedIn = linkedinUrl?.trim() && !/^((https?:\/\/)?(www\.)?)?linkedin\.com\/.+$/.test(linkedinUrl);

                  if (missingName || missingStudentFields || missingCoachFields) {
                    alert("Please complete all required fields.");
                    return;
                  }
                  if (invalidLinkedIn) {
                    alert("Please enter a valid LinkedIn URL.");
                    return;
                  }

                  onSave("submit");
                  setHasChanges(false);
                }}
              >
                Save Profile
              </button>
            )}

            {isAdmin === true && (
              <button
                className="button-primary"
                style={{
                  minHeight: "44px",
                  padding: "0.75rem 1rem"
                }}
                onClick={() => onSwitchAdminView(!isAdminPanel)}
              >
                {isAdminPanel ? "Switch to User Experience" : "Switch to Admin Panel"}
              </button>
            )}

            <button className="button-danger" style={{
              minHeight: "44px",
              padding: "0.75rem 1rem"
            }} onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
      {cropImageSrc && (
        <CropModal
          imageSrc={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCropComplete={async (croppedFile) => {
            const resizedBlob = await resizeImage(croppedFile, 800, 0.8);
            const resizedFile = new File([resizedBlob], croppedFile.name, { type: "image/jpeg" });
            await onProfileImageChange({ target: { files: [resizedFile] } });
            // Update all posts with new headshotUrl
            if (user && user.uid) {
              try {
                const postsRef = collection(db, "posts");
                const q = query(postsRef, where("userId", "==", user.uid));
                const snapshot = await getDocs(q);

                const storage = getStorage();
                const profileRef = ref(storage, `users/${user.uid}/profile.jpg`);
                const url = await getDownloadURL(profileRef);

                snapshot.forEach((doc) => {
                  updateDoc(doc.ref, { headshotUrl: url });
                });
              } catch (e) {
                // Optionally handle error
                // console.error("Error updating posts with new headshotUrl:", e);
              }
            }
            setCropImageSrc(null);
          }}
        />
      )}
    </div>
  );
}

const inputStyle = (theme) => ({
  width: "100%",
  padding: "0.5rem",
  fontSize: "16px",
  borderRadius: "6px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary
});
