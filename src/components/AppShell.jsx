import React from "react";
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import HeaderBar from "./HeaderBar";
import BottomNavBar from "./BottomNavBar";
import { useTheme } from "@mui/material/styles";

export default function AppShell({
  title = "",
  profileImage = "https://via.placeholder.com/32",
  onProfileClick = () => {},
  selectedTab = "",
  onTabChange = () => {},
  tabs = [],
  children
}) {
  const theme = useTheme();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedTab]);

  const iconMap = {
    events: EventIcon,
    directory: PeopleIcon,
    adminMatches: HowToRegIcon,
    resources: HowToRegIcon, // Temporary icon assignment; consider updating if a better match is available
    updates: ChatBubbleIcon
  };

  return (
    <div className="app-container" style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
      paddingBottom: "calc(6rem + env(safe-area-inset-bottom))"
    }}>
      <HeaderBar
        title={title}
        profileImage={profileImage}
        onProfileClick={onProfileClick}
        onLogoClick={() => selectedTab && onTabChange("updates")}
      />

      {/* Main content */}
      <div className="page-content" style={{
        flex: 1,
        backgroundColor: theme.palette.background.default,
        paddingBottom: "calc(6rem + env(safe-area-inset-bottom))",
        padding: "1rem",
        boxSizing: "border-box",
        overflowY: "auto",
        maxWidth: "100vw"
      }}>
        {/* Children will be injected here */}
        <div style={{
          animation: "fadeIn 0.3s ease-in-out"
        }}>
          {children}
        </div>
      </div>

      <BottomNavBar
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={onTabChange}
      />
    </div>
  );
}