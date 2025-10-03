import React, { useState } from "react";
import { Chip, Switch } from "@mui/material";
import CropModal from "./CropModal";
import { resizeImage } from "../utils/resizeImage";
import { validateImageFile, getOptimalImageSize } from "../utils/imageValidation";
import { useTheme } from "@mui/material/styles";
import { getDocs, updateDoc, collection, query, where } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db, auth } from "../firebase";
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from "../utils/phoneValidation";

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
  phoneNumber,
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
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [phoneError, setPhoneError] = useState("");
  const [copiedUid, setCopiedUid] = useState(false);

  // Detect if app is installed as PWA
  const isPWAInstalled = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  };

  // Detect iOS Safari
  const isIOSSafari = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
           !window.MSStream &&
           /Safari/i.test(navigator.userAgent);
  };

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setAuthLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync notification permission state when modal opens
  React.useEffect(() => {
    // Debug mobile Safari notification support
    console.log("📱 ProfileModal Debug:");
    console.log("📱 User Agent:", navigator.userAgent);
    console.log("📱 Notification API:", typeof Notification !== "undefined" ? "✅ Available" : "❌ Not Available");
    console.log("📱 Service Worker:", "serviceWorker" in navigator ? "✅ Available" : "❌ Not Available");
    console.log("📱 PWA Installed:", isPWAInstalled());
    console.log("📱 iOS Safari:", isIOSSafari());
    console.log("📱 authLoaded:", authLoaded);
    
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
      console.log("📱 Current permission:", Notification.permission);
    }
  }, [authLoaded]);

  const isSelf = auth.currentUser?.uid && user?.uid && auth.currentUser.uid === user.uid;

  const copyUidToClipboard = () => {
    const uid = user?.uid;
    if (!uid) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(uid).then(() => {
        setCopiedUid(true);
        setTimeout(() => setCopiedUid(false), 1500);
      }).catch(err => {
        console.error("Clipboard error:", err);
      });
    } else {
      // Fallback for insecure context or unsupported clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = uid;
      textarea.style.position = "fixed";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedUid(true);
        setTimeout(() => setCopiedUid(false), 1500);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textarea);
    }
  };

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
              
              // Validate the image file
              const validation = validateImageFile(file);
              if (!validation.isValid) {
                alert(validation.errors.join('\n'));
                e.target.value = ''; // Reset input
                return;
              }
              
              const reader = new FileReader();
              reader.onload = () => setCropImageSrc(reader.result);
              reader.onerror = () => {
                alert("Failed to read the image file. Please try again.");
                e.target.value = ''; // Reset input
              };
              reader.readAsDataURL(file);
            }}
            style={{ display: "none" }}
          />
        </div>
        <p style={{ textAlign: "center", fontWeight: 600, color: theme.palette.text.primary }}>
          {user?.displayName || user?.email}
        </p>
        <div style={{ textAlign: "center", marginTop: "0.5rem", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          {user?.role === "coach-board" ? (
            <Chip
              label="Coach + Board"
              size="small"
              sx={{ fontSize: "0.7rem" }}
            />
          ) : user?.role ? (
            <Chip
              label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              size="small"
              sx={{ fontSize: "0.7rem", textTransform: "capitalize" }}
            />
          ) : null}
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
          {isAdmin === true && (
            <div style={{
              padding: "0.75rem",
              backgroundColor: theme.palette.mode === 'dark' ? "rgba(99, 102, 241, 0.1)" : "#f0f0f0",
              borderRadius: "6px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                flex: 1,
                minWidth: 0
              }}>
                <span style={{ fontWeight: 600, color: theme.palette.text.primary }}>Firebase UID:</span>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: theme.palette.text.secondary,
                  wordBreak: "break-all"
                }}>
                  {user?.uid}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={copyUidToClipboard}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.8rem",
                    backgroundColor: theme.palette.primary.main,
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Copy ID
                </button>
                {copiedUid && (
                  <span style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 500 }}>
                    Copied!
                  </span>
                )}
              </div>
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
          <div>
            <input
              type="tel"
              placeholder="Phone Number (optional)"
              value={formatPhoneNumber(phoneNumber || "")}
              onChange={(e) => {
                const rawValue = e.target.value;
                const cleaned = rawValue.replace(/\D/g, '');

                // Allow typing up to 11 digits (1 + 10 for US with country code)
                if (cleaned.length <= 11) {
                  // Store the cleaned number
                  onSave("phoneNumber", cleaned);
                  setHasChanges(true);

                  // Only validate when they have enough digits or when field is empty
                  if (cleaned.length === 0) {
                    setPhoneError("");
                  } else if (cleaned.length >= 10) {
                    const validation = validatePhoneNumber(cleaned);
                    if (!validation.isValid) {
                      setPhoneError(validation.error || "Invalid phone number");
                    } else {
                      setPhoneError("");
                    }
                  } else {
                    // While typing, don't show error until they have 10+ digits
                    setPhoneError("");
                  }
                }
              }}
              style={{
                ...inputStyle(theme),
                borderColor: phoneError ? "#ef4444" : theme.palette.divider
              }}
            />
            {phoneError && (
              <div style={{
                color: "#ef4444",
                fontSize: "0.8rem",
                marginTop: "0.25rem"
              }}>
                {phoneError}
              </div>
            )}
          </div>
  
  {/* iOS Installation Guide - Show if on iOS Safari and not installed as PWA */}
  {authLoaded && isIOSSafari() && !isPWAInstalled() && (
    <div style={{ 
      padding: "1rem", 
      backgroundColor: theme.palette.mode === 'dark' ? "rgba(66, 165, 245, 0.1)" : "#e3f2fd", 
      borderRadius: "8px", 
      fontSize: "0.85rem",
      margin: "0.5rem 0",
      border: `1px solid ${theme.palette.mode === 'dark' ? "rgba(66, 165, 245, 0.3)" : "#90caf9"}`
    }}>
      <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: theme.palette.primary.main }}>
        📲 Enable Push Notifications
      </div>
      <div style={{ lineHeight: "1.5", color: theme.palette.text.primary }}>
        To receive notifications on iOS:
        <br />1. Tap the Share button <span style={{ fontSize: "1.1em" }}>⬆️</span>
        <br />2. Select "Add to Home Screen"
        <br />3. Open Level Up from your home screen
        <br />4. Enable notifications in settings
      </div>
    </div>
  )}

  {/* Notification toggle - show for non-iOS or installed PWA */}
  {authLoaded && typeof Notification !== "undefined" && (!isIOSSafari() || isPWAInstalled()) && (
      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
        <Switch
          checked={notificationPermission === "granted"}
          onChange={async () => {
            if (typeof Notification === "undefined") return;

            if (notificationPermission === "granted") {
              // Better UX: Provide instructions instead of just an alert
              const message = "To disable notifications:\n• Chrome/Edge: Go to Settings > Privacy > Site Settings > Notifications\n• Firefox: Click the lock icon in address bar > Permissions\n• Safari: Go to Safari > Preferences > Websites > Notifications";
              alert(message);
            } else {
              try {
                const { registerForNotifications } = await import("../utils/notifications");
                const result = await registerForNotifications();
                
                if (result.success) {
                  // Update the local state to reflect the permission change
                  setNotificationPermission("granted");
                } else {
                  console.warn("Notification registration failed:", result.error);
                  
                  // Provide more helpful error messages for Safari
                  if (result.error.includes("Safari") || result.error.includes("FCM")) {
                    alert(`Notifications not available: ${result.error}\n\nSafari on iOS requires version 16.4+ for web push notifications.`);
                  } else {
                    alert(`Failed to enable notifications: ${result.error}\n\nPlease try again or check browser settings.`);
                  }
                }
              } catch (error) {
                console.error("Error enabling notifications:", error);
                alert("Failed to enable notifications. Please try again.");
              }
            }
          }}
          color="primary"
        />
        <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>
          {notificationPermission === "granted"
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
                  const phoneValidation = validatePhoneNumber(phoneNumber || '');
                  const invalidPhone = phoneNumber && phoneNumber.length > 0 && !phoneValidation.isValid;

                  if (missingName || missingStudentFields || missingCoachFields) {
                    alert("Please complete all required fields.");
                    return;
                  }
                  if (invalidLinkedIn) {
                    alert("Please enter a valid LinkedIn URL.");
                    return;
                  }
                  if (invalidPhone) {
                    alert(phoneValidation.error || "Please enter a valid phone number.");
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
            try {
              const optimal = getOptimalImageSize();
              const resizedBlob = await resizeImage(croppedFile, optimal.maxWidth, optimal.quality);
              const resizedFile = new File([resizedBlob], "profile.jpg", { type: "image/jpeg" });
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
                }
              }
              setCropImageSrc(null);
            } catch (error) {
              console.error("Error processing cropped image:", error);
              alert("Failed to process the image. Please try again.");
              setCropImageSrc(null);
            }
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
