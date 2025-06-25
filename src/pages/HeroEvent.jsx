import React from "react";
import { useTheme } from "@mui/material/styles";

export default function HeroEvent({ event, onRSVP, isRSVPed }) {
  const theme = useTheme();

  if (!event) return null;

  const {
    name,
    description,
    location,
    timeRange,
    date,
    headerImage,
    required
  } = event;

  const dateObj = date?.toDate?.() || new Date(date);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dateObj);

  const imageUrl = headerImage || "https://via.placeholder.com/1200x675?text=Upcoming+Event";

  return (
    <div style={{
      position: "relative",
      borderRadius: "12px",
      overflow: "hidden",
      marginBottom: "2rem",
      boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      <img
        src={imageUrl}
        alt={name}
        style={{
          width: "100%",
          height: "auto",
          objectFit: "cover",
          display: "block"
        }}
      />
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "2rem 1.5rem",
        background: "linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent 80%)",
        color: theme.palette.common.white,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        height: "100%",
        zIndex: 2
      }}>
        <h2 style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>{name}</h2>
        <p style={{ margin: "0.5rem 0", fontSize: "1rem", fontWeight: 400 }}>
          {formattedDate} &bull; {timeRange} &bull; {location}
        </p>
        {required && (
          <span style={{
            backgroundColor: theme.palette.error.main,
            color: theme.palette.common.white,
            padding: "0.25rem 0.6rem",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: 500,
            width: "fit-content",
            marginBottom: "0.75rem"
          }}>
            Required
          </span>
        )}
        <p style={{ maxWidth: "600px", fontSize: "1rem", lineHeight: 1.5 }}>{description}</p>
        <button
          onClick={onRSVP}
          style={{
            marginTop: "1rem",
            backgroundColor: isRSVPed ? theme.palette.grey[500] : theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            width: "fit-content"
          }}
        >
          {isRSVPed ? "Cancel RSVP" : "RSVP Now"}
        </button>
      </div>
    </div>
  );
}