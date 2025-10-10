import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Typography } from "@mui/material";

const ApprovalsPanel = () => {
  const [registrationCodes, setRegistrationCodes] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchCodes = async () => {
      const snapshot = await getDocs(collection(db, "registrationCodes"));
      const codes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Only show !levelup! (standard user) and admin codes
      const filteredCodes = codes.filter(code =>
        code.code === "!levelup!" || code.role === "admin" || code.isAdmin === true
      );
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
                – {code.role === "student" ? "Standard User" : (code.role === "admin" || code.isAdmin === true) ? "Admin" : code.role}
              </span>
              {/* label intentionally not shown */}
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
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
                Copy
              </button>
              {copiedCode === code.id && (
                <span style={{ marginLeft: "0.5rem", color: "#16a34a", fontSize: "0.8rem" }}>
                  Copied!
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