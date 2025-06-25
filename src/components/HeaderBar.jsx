import React from "react";
import { useTheme } from "@mui/material/styles";
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar } from "@mui/material";

export default function HeaderBar({ title, profileImage, onProfileClick, onLogoClick }) {
  const theme = useTheme();
  return (
    <AppBar position="static" elevation={0} color="default" sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box onClick={onLogoClick} sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <Box component="img" src="/logo.png" alt="Level Up Cincinnati" sx={{ height: 32, objectFit: "contain" }} />
        </Box>
        <Typography
          variant="h6"
          noWrap
          sx={{ flex: 1, textAlign: "center", fontWeight: 600, color: theme.palette.text.primary }}
        >
          {title}
        </Typography>
        <IconButton onClick={onProfileClick} title="View Profile">
          <Avatar
            src={profileImage}
            alt="User"
            sx={{
              width: 32,
              height: 32,
              transition: "opacity 0.2s",
              "&:hover": { opacity: 0.85 }
            }}
          />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}