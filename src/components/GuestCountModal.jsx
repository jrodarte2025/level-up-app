import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';

export default function GuestCountModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  eventName, 
  isRSVPing = true 
}) {
  const theme = useTheme();
  const [guestCount, setGuestCount] = useState(0);

  const handleConfirm = () => {
    onConfirm(guestCount);
    setGuestCount(0); // Reset for next time
    onClose();
  };

  const handleCancel = () => {
    setGuestCount(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "12px",
          padding: "2rem",
          width: "90%",
          maxWidth: "400px",
          position: "relative",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            fontSize: "1.5rem",
            color: theme.palette.text.secondary,
            cursor: "pointer"
          }}
          aria-label="Close"
        >
          ×
        </button>

        <h3 style={{ 
          marginTop: 0, 
          marginBottom: "1rem",
          fontSize: "1.25rem",
          fontWeight: 600
        }}>
          {isRSVPing ? 'RSVP to ' : 'Update RSVP for '} {eventName}
        </h3>

        <p style={{ 
          marginBottom: "1.5rem", 
          fontSize: "0.95rem",
          color: theme.palette.text.secondary,
          lineHeight: 1.5
        }}>
          Will you be bringing any guests? Please let us know how many additional people will be joining you.
        </p>

        <div style={{ marginBottom: "2rem" }}>
          <label style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: 600,
            fontSize: "0.9rem"
          }}>
            Number of guests (including yourself):
          </label>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={() => setGuestCount(Math.max(0, guestCount - 1))}
              disabled={guestCount <= 0}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: guestCount <= 0 ? theme.palette.action.disabled : theme.palette.background.paper,
                color: guestCount <= 0 ? theme.palette.text.disabled : theme.palette.text.primary,
                fontSize: "1.2rem",
                cursor: guestCount <= 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              −
            </button>
            
            <span style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              minWidth: "3rem",
              textAlign: "center",
              color: theme.palette.text.primary
            }}>
              {guestCount}
            </span>
            
            <button
              onClick={() => setGuestCount(Math.min(10, guestCount + 1))} // Max 10 guests
              disabled={guestCount >= 10}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: guestCount >= 10 ? theme.palette.action.disabled : theme.palette.background.paper,
                color: guestCount >= 10 ? theme.palette.text.disabled : theme.palette.text.primary,
                fontSize: "1.2rem",
                cursor: guestCount >= 10 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              +
            </button>
          </div>
          
          <p style={{
            fontSize: "0.8rem",
            color: theme.palette.text.secondary,
            marginTop: "0.5rem",
            marginBottom: 0
          }}>
            {guestCount === 0 ? 'Just you attending' : 
             guestCount === 1 ? 'You + 1 guest (2 people total)' : 
             `You + ${guestCount} guests (${guestCount + 1} people total)`}
          </p>
        </div>

        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: "0.75rem 1.5rem",
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: "transparent",
              color: theme.palette.text.primary,
              borderRadius: "8px",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            style={{
              padding: "0.75rem 1.5rem",
              border: "none",
              backgroundColor: "var(--brand-primary-coral)",
              color: "#fff",
              borderRadius: "8px",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            {isRSVPing ? 'Confirm RSVP' : 'Update RSVP'}
          </button>
        </div>
      </div>
    </div>
  );
}