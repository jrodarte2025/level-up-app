import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { registerForNotifications } from "../utils/notifications";

export default function Login({ onLogin = () => {} }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const navigate = useNavigate();
  const theme = useTheme();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await registerForNotifications();
      onLogin();
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(error.message);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setResetMessage("Please enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Password reset email sent.");
    } catch (error) {
      setResetMessage(error.message);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: theme.palette.background.default,
      padding: "1rem"
    }}>
      <div style={{
        backgroundColor: theme.palette.background.paper,
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/logo.png" alt="Level Up Logo" style={{ height: "48px", marginBottom: "0.5rem" }} />
          <h2 style={{ fontWeight: 600, fontSize: "1.5rem" }}>Welcome Back</h2>
          <p style={{ marginTop: "0.25rem", fontSize: "0.95rem", color: theme.palette.text.primary }}>
            Log in to continue
          </p>
        </div>

        <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: "0.75rem", borderRadius: "6px", border: `1px solid ${theme.palette.divider}`, fontSize: "1rem", color: theme.palette.text.primary }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: "0.75rem", borderRadius: "6px", border: `1px solid ${theme.palette.divider}`, fontSize: "1rem", color: theme.palette.text.primary }}
          />
          <p style={{ textAlign: "right", marginTop: "-0.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
            <button
              type="button"
              className="button-link"
              onClick={handlePasswordReset}
              style={{
                color: theme.palette.primary.main,
                textDecoration: "underline",
                fontWeight: 500
              }}
            >
              Forgot password?
            </button>
          </p>
          <button type="submit" className="button-primary" style={{ width: "100%" }}>
            Log In
          </button>
        </form>

        {loginError && (
          <p style={{ color: "#ef4444", marginTop: "1rem", textAlign: "center" }}>
            {loginError}
          </p>
        )}

        <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #eee" }} />

        <Link to="/signup" style={{ width: "100%", display: "inline-block", textAlign: "center" }}>
          <button
            className="button-primary"
            style={{ width: "100%", backgroundColor: "#F66E5B", color: "#fff" }}
          >
            New User? Sign Up
          </button>
        </Link>

      </div>
      {resetMessage && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            padding: "1.5rem 2rem",
            borderRadius: "12px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            maxWidth: "360px",
            textAlign: "center"
          }}>
            <p style={{ fontSize: "1rem", marginBottom: "1rem" }}>{resetMessage}</p>
            <button className="button-primary" onClick={() => setResetMessage("")}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}