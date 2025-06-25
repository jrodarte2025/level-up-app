import React from "react";
import { useTheme } from "@mui/material/styles";

export default function ToastManager({ message }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: "6rem",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      padding: "0.75rem 1.25rem",
      borderRadius: "8px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      zIndex: 2000
    }}>
      {message}
    </div>
  );
}