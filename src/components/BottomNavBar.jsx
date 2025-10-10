// src/components/BottomNavBar.jsx

import React from "react";
import { useTheme } from '@mui/material/styles';
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';

const iconMap = {
  events: EventIcon,
  directory: PeopleIcon,
  matches: LinkIcon,
  approvals: HowToRegIcon,
  resources: MenuBookIcon,
  updates: ChatBubbleIcon,
  adminMatches: HowToRegIcon,
};

export default function BottomNavBar({ tabs, selectedTab, onTabChange }) {
  const theme = useTheme();

  return (
    <BottomNavigation
      value={selectedTab}
      onChange={(event, newValue) => onTabChange(newValue)}
      showLabels
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 100,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        height: "72px",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingTop: "0.25rem"
      }}
    >
      {[...tabs].sort((a, b) => {
        const order = ["updates", "events", "directory", "resources", "adminMatches"];
        const indexA = order.indexOf(a.key);
        const indexB = order.indexOf(b.key);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }).map((tab) => {
        const Icon = iconMap[tab.key] || (() => <span style={{ fontSize: 24 }}>?</span>);
        return (
          <BottomNavigationAction
            key={tab.key}
            label={tab.label}
            value={tab.key}
            icon={<Icon />}
            sx={{
              padding: "0.5rem 0.25rem",
              minWidth: 0,
              color: selectedTab === tab.key ? "#F15F5E" : theme.palette.text.secondary,
              "&.Mui-selected, &.Mui-focusVisible": {
                outline: "none",
                boxShadow: "none",
                color: "#F15F5E"
              },
              "& .MuiBottomNavigationAction-label": {
                fontSize: "0.75rem",
                fontWeight: 600
              },
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
                borderRadius: "8px"
              }
            }}
          />
        );
      })}
    </BottomNavigation>
  );
}