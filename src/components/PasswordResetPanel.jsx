import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { db, auth } from "../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

export default function PasswordResetPanel() {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [useResetLink, setUseResetLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [recentActions, setRecentActions] = useState([]);
  const [generatedLink, setGeneratedLink] = useState("");

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    fetchRecentActions();
  }, []);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        displayName: doc.data().displayName || `${doc.data().firstName} ${doc.data().lastName}`
      }));
      setUsers(userData);
    } catch (error) {
      console.error("Error fetching users:", error);
      setMessage({ text: "Error loading users", type: "error" });
    }
  };

  const fetchRecentActions = async () => {
    try {
      const q = query(
        collection(db, "admin_actions"),
        orderBy("timestamp", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const actions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentActions(actions);
    } catch (error) {
      console.error("Error fetching admin actions:", error);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) {
      setMessage({ text: "Please select a user", type: "error" });
      return;
    }

    if (!useResetLink) {
      if (!newPassword || newPassword.length < 6) {
        setMessage({ text: "Password must be at least 6 characters", type: "error" });
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage({ text: "Passwords do not match", type: "error" });
        return;
      }
    }

    setLoading(true);
    setMessage({ text: "", type: "" });
    setGeneratedLink("");

    try {
      // Get current user's auth token
      const user = auth.currentUser;
      const idToken = await user.getIdToken();
      
      // Call the Cloud Function as HTTP endpoint with proper auth headers
      const response = await fetch('https://us-central1-level-up-app-c9f47.cloudfunctions.net/adminResetPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          userEmail: selectedUser.email,
          newPassword: useResetLink ? undefined : newPassword,
          generateResetLink: useResetLink
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Function call failed');
      }
      
      const result = await response.json();
      
      if (useResetLink && result.resetLink) {
        setGeneratedLink(result.resetLink);
        setMessage({ 
          text: "Reset link generated successfully!", 
          type: "success" 
        });
      } else {
        setMessage({ 
          text: "Password reset successfully!", 
          type: "success" 
        });
        // Clear password fields
        setNewPassword("");
        setConfirmPassword("");
      }

      // Refresh recent actions
      await fetchRecentActions();
      
      // Don't auto-clear selection if we generated a link (user needs to copy it)
      if (!useResetLink) {
        // Only auto-clear for direct password resets
        setTimeout(() => {
          setSelectedUser(null);
          setSearchTerm("");
        }, 2000);
      }

    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage({ 
        text: error.message || "Failed to reset password", 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      padding: "1rem",
      maxWidth: "800px",
      margin: "0 auto",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      <h2 style={{
        fontSize: "1.5rem",
        fontWeight: 600,
        marginBottom: "1rem",
        color: theme.palette.text.primary
      }}>
        Password Management
      </h2>

      {/* User Search Section */}
      <div style={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1.5rem"
      }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Select User
        </h3>
        
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            borderRadius: "6px",
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.default,
            color: theme.palette.text.primary,
            marginBottom: "1rem"
          }}
        />

        {searchTerm && (
          <div style={{
            maxHeight: "200px",
            overflowY: "auto",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "6px",
            backgroundColor: theme.palette.background.default
          }}>
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => {
                  setSelectedUser(user);
                  setSearchTerm(user.displayName);
                }}
                style={{
                  padding: "0.75rem",
                  cursor: "pointer",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: selectedUser?.id === user.id ? theme.palette.action.selected : "transparent",
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
              >
                <div style={{ fontWeight: 500 }}>{user.displayName}</div>
                <div style={{ fontSize: "0.875rem", color: theme.palette.text.secondary }}>
                  {user.email} • {user.role || "No role"}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedUser && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: theme.palette.action.selected,
            borderRadius: "6px"
          }}>
            <strong>Selected User:</strong> {selectedUser.displayName}
            <br />
            <span style={{ fontSize: "0.875rem", color: theme.palette.text.secondary }}>
              {selectedUser.email}
            </span>
          </div>
        )}
      </div>

      {/* Password Reset Options */}
      {selectedUser && (
        <div style={{
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem"
        }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Reset Method
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="radio"
                checked={!useResetLink}
                onChange={() => setUseResetLink(false)}
              />
              Set New Password Directly
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="radio"
                checked={useResetLink}
                onChange={() => setUseResetLink(true)}
              />
              Generate Password Reset Link
            </label>
          </div>

          {!useResetLink && (
            <>
              <input
                type="password"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.default,
                  color: theme.palette.text.primary,
                  marginBottom: "0.75rem"
                }}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.default,
                  color: theme.palette.text.primary,
                  marginBottom: "1rem"
                }}
              />
            </>
          )}

          {message.text && (
            <div style={{
              padding: "0.75rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              backgroundColor: message.type === "error" ? "#fee" : "#efe",
              color: message.type === "error" ? "#c00" : "#060",
              border: `1px solid ${message.type === "error" ? "#fcc" : "#cfc"}`
            }}>
              {message.text}
            </div>
          )}

          {generatedLink && (
            <div style={{
              padding: "1rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              backgroundColor: "#e0f2fe",
              border: "1px solid #0284c7"
            }}>
              <strong>Reset Link Generated:</strong>
              <div style={{
                marginTop: "0.5rem",
                padding: "0.5rem",
                backgroundColor: "white",
                borderRadius: "4px",
                wordBreak: "break-all",
                fontSize: "0.875rem",
                fontFamily: "monospace"
              }}>
                {generatedLink}
              </div>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    setMessage({ text: "Link copied to clipboard!", type: "success" });
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#0284c7",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.875rem"
                  }}
                >
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    setGeneratedLink("");
                    setSelectedUser(null);
                    setSearchTerm("");
                    setMessage({ text: "", type: "" });
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.875rem"
                  }}
                >
                  Clear & Done
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handlePasswordReset}
            disabled={loading}
            className="button-primary"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Processing..." : (useResetLink ? "Generate Reset Link" : "Reset Password")}
          </button>
        </div>
      )}

      {/* Recent Actions */}
      <div style={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: "12px",
        padding: "1.5rem"
      }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Recent Password Actions
        </h3>
        
        {recentActions.length === 0 ? (
          <p style={{ color: theme.palette.text.secondary }}>No recent actions</p>
        ) : (
          <div style={{ fontSize: "0.875rem" }}>
            {recentActions.map(action => (
              <div
                key={action.id}
                style={{
                  padding: "0.75rem",
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  "&:last-child": { borderBottom: "none" }
                }}
              >
                <div style={{ fontWeight: 500 }}>
                  {action.action === "password_reset" ? "Password Reset" : "Reset Link Generated"}
                </div>
                <div style={{ color: theme.palette.text.secondary, marginTop: "0.25rem" }}>
                  Admin: {action.adminEmail}
                  <br />
                  Target: {action.targetEmail}
                  <br />
                  {action.timestamp && (
                    <>
                      Date: {new Date(action.timestamp.seconds * 1000).toLocaleString()}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}