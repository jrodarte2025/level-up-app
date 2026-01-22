import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Typography } from "@mui/material";

const ApprovalsPanel = () => {
  const [registrationCodes, setRegistrationCodes] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [sharedCode, setSharedCode] = useState(null);

  const handleShare = async (code) => {
    const shareText = `Hey - here's a link to register for the Level Up App. When you sign up, please use registration code ${code.id}\n\nhttps://app.levelupcincinnati.org`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        setSharedCode(code.id);
        setTimeout(() => setSharedCode(null), 1500);
      } catch (err) {
        // User cancelled or share failed - only log if not a cancel
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to clipboard for browsers without Web Share API
      try {
        await navigator.clipboard.writeText(shareText);
        setSharedCode(code.id);
        setTimeout(() => setSharedCode(null), 1500);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  useEffect(() => {
    const fetchCodes = async () => {
      const snapshot = await getDocs(collection(db, "registrationCodes"));
      const codes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Only show !levelup! (standard user) and admin codes
      const filteredCodes = codes.filter(code => {
        // Show if it's the !levelup! code (by code field or document ID)
        const isLevelUpCode = code.code === "!levelup!" || code.id === "!levelup!";
        // Show if it's an admin code
        const isAdminCode = code.role === "admin" || code.isAdmin === true;
        return isLevelUpCode || isAdminCode;
      });
      setRegistrationCodes(filteredCodes);
    };
    fetchCodes();
  }, []);

  return (
    <div style={{
      backgroundColor: "var(--brand-off-white)",
      padding: "1.5rem",
      borderRadius: "12px",
      marginBottom: "2rem",
      border: "1px solid var(--brand-muted-gray)"
    }}>
      <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Share Codes</h3>
     <Typography
       variant="body2"
       sx={{ color: "var(--brand-medium-gray)", mb: 2 }}
     >
       Share a registration code below to allow users to sign up with the correct role.
     </Typography>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {registrationCodes.map(code => (
          <li key={code.id} style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{code.code}</strong>{" "}
              <span style={{ color: "var(--brand-medium-gray)" }}>
                – {(code.code === "!levelup!" || code.id === "!levelup!" || code.role === "student") ? "Standard User" : (code.role === "admin" || code.isAdmin === true) ? "Admin" : code.role}
              </span>
              {/* label intentionally not shown */}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => {
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(code.id).then(() => {
                      setCopiedCode(code.id);
                      setTimeout(() => setCopiedCode(null), 1500);
                    }).catch(err => {
                      console.error("Clipboard error:", err);
                    });
                  } else {
                    // Fallback for insecure context or unsupported clipboard API
                    const textarea = document.createElement("textarea");
                    textarea.value = code.id;
                    textarea.style.position = "fixed";
                    document.body.appendChild(textarea);
                    textarea.focus();
                    textarea.select();
                    try {
                      document.execCommand("copy");
                      setCopiedCode(code.id);
                      setTimeout(() => setCopiedCode(null), 1500);
                    } catch (err) {
                      console.error("Fallback copy failed:", err);
                    }
                    document.body.removeChild(textarea);
                  }
                }}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#6B7BA8",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Copy Code
              </button>
              <button
                onClick={() => handleShare(code)}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.85rem",
                  backgroundColor: "#18264E",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share Invite
              </button>
              {copiedCode === code.id && (
                <span style={{ color: "#16a34a", fontSize: "0.8rem" }}>
                  Copied!
                </span>
              )}
              {sharedCode === code.id && (
                <span style={{ color: "#16a34a", fontSize: "0.8rem" }}>
                  Shared!
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApprovalsPanel;