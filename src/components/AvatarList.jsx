import React from "react";
import { useTheme } from '@mui/material/styles';

export default function AvatarList({ users }) {
  const theme = useTheme();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        cursor: "pointer",
        marginBottom: "1rem"
      }}
    >
      {users.slice(0, 3).map((user, i) => (
        <div style={{ textAlign: "center" }} key={i} title={user.displayName}>
          <img
            src={user.profileImage || "https://via.placeholder.com/32"}
            alt={user.email}
            title={user.email}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              objectFit: "cover",
              border: user.isMatch
                ? (theme.palette.mode === 'dark'
                    ? '2px solid #ffffff'
                    : `2px solid ${['coach', 'coach-board'].includes(user.role) ? '#18264E' : '#F15F5E'}`)
                : 'none'
            }}
          />
          {user.isMatch && (
            <div style={{
              fontSize: "0.65rem",
              color: user.isMatch
                ? (theme.palette.mode === 'dark'
                    ? '#ffffff'
                    : ['coach', 'coach-board'].includes(user.role) ? '#18264E' : '#F15F5E')
                : undefined,
              marginTop: "0.25rem",
              fontWeight: 600
            }}>
              My Match
            </div>
          )}
        </div>
      ))}
      {users.length > 3 && (
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: theme.palette.text.primary,
          color: theme.palette.background.default,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          fontWeight: 500,
          textAlign: "center"
        }}>
          +{users.length - 3}
        </div>
      )}
    </div>
  );
}