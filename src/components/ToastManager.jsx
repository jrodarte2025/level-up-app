export default function ToastManager({ message }) {
  // Don't render if message is null, undefined, or empty string
  if (!message || message === "") return null;
  
  // Debug log to see if we're getting unexpected messages
  console.log("🟡 ToastManager rendering with message:", message);
  
  return (
    <div style={{
      position: "fixed",
      bottom: "6rem",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#4CAF50", // Green color instead of yellow/primary
      color: "#ffffff",
      padding: "0.75rem 1.25rem",
      borderRadius: "8px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      zIndex: 2000
    }}>
      {message}
    </div>
  );
}