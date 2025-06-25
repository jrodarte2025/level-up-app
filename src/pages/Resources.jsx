import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";
import { Box, Typography, useTheme, Paper } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SchoolIcon from "@mui/icons-material/School";
import DescriptionIcon from "@mui/icons-material/Description";
import PeopleIcon from "@mui/icons-material/People";

export default function Resources() {
  const theme = useTheme();

  const [resources, setResources] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  useEffect(() => {
    const fetchUserRoleAndResources = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const role = userSnap.data().role;
        setUserRole(role);
      }

      const resSnap = await getDocs(collection(db, "resources"));
      const allResources = resSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(allResources);
    };

    fetchUserRoleAndResources();
  }, []);

  const grouped = resources
    .filter(r => {
      const matchRole =
        ["admin", "board", "employee"].includes(userRole) ||
        (Array.isArray(r.role) ? r.role.includes(userRole) : r.role === userRole);
      const matchSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = !typeFilter || r.type === typeFilter;
      const matchSection = !sectionFilter || r.section === sectionFilter;
      return matchRole && matchSearch && matchType && matchSection;
    })
    .reduce((acc, item) => {
      acc[item.section] = acc[item.section] || [];
      acc[item.section].push(item);
      return acc;
    }, {});

  if (!userRole || resources.length === 0) {
    return (
      <Box sx={{ p: 4, backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
        <Typography>Loading resources...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: "5rem", backgroundColor: theme.palette.background.default, color: theme.palette.text.primary }}>
      <Paper
        elevation={1}
        sx={{
          px: 2,
          py: 2.5,
          mb: 4,
          mx: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, mb: 1, color: theme.palette.text.secondary }}
        >
          Search & Filter
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.75rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              width: "100%",
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary
            }}
          />

          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, flexWrap: "wrap", gap: "1rem" }}>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{
              padding: "0.65rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              fontWeight: 400,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              width: "100%",
              minWidth: "160px",
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary
            }}>
              <option value="">All Types</option>
              <option value="Form">Form</option>
              <option value="Document">Document</option>
              <option value="Resource Link">Resource Link</option>
              <option value="Curriculum">Curriculum</option>
            </select>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={{
              padding: "0.65rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              fontWeight: 400,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              width: "100%",
              minWidth: "160px",
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary
            }}>
              <option value="">All Sections</option>
              {Array.from(new Set(resources.map(r => r.section))).map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("");
                setSectionFilter("");
              }}
              style={{
                backgroundColor: theme.palette.background.paper,
                color: "#1E2D5F",
                border: "1px solid #1E2D5F",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "0.5rem",
                alignSelf: "flex-start"
              }}
            >
              Clear All Filters
            </button>
          </Box>
        </Box>
      </Paper>
      {Object.keys(grouped).length === 0 && (
        <Typography sx={{ px: 2 }}>No resources available for your role yet.</Typography>
      )}

      {Object.keys(grouped).length > 0 && (
        Object.keys(grouped).map(section => (
          <Box key={section} sx={{ mb: 4, px: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              {section.includes("Professional") && <SchoolIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />}
              {section.includes("Forms") && <DescriptionIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />}
              {section.includes("Networking") && <PeopleIcon sx={{ fontSize: 20, color: theme.palette.text.secondary }} />}
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  px: 1,
                  py: 0.25,
                  borderLeft: `4px solid #EF4444`,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                  borderRadius: 1
                }}
              >
                {section}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {grouped[section].map((r) => (
                <Box
                  key={r.id}
                  sx={{
                    p: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                      boxShadow: 1,
                    },
                    mx: "auto",
                    maxWidth: "720px",
                    width: "100%",
                  }}
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography fontWeight={600}>{r.title}</Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Box sx={{
                        backgroundColor: r.type === "Form" ? "#FEE2E2" : "#E0F2FE",
                        color: r.type === "Form" ? "#B91C1C" : "#0369A1",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: "9999px",
                        px: 1,
                        py: 0.25,
                        userSelect: "none"
                      }}>
                        {r.type}
                      </Box>
                      {expandedId === r.id ? (
                        <ExpandLessIcon sx={{ fontSize: "1.5rem", color: theme.palette.text.secondary }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: "1.5rem", color: theme.palette.text.secondary }} />
                      )}
                    </Box>
                  </Box>

                  {expandedId === r.id && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={{ fontSize: "0.875rem", mb: 1 }}>{r.description}</Typography>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {r.timestamp?.seconds && (
                          <Typography sx={{ fontSize: "0.75rem", color: theme.palette.text.secondary, mb: 0.5 }}>
                            Last updated: {new Date(r.timestamp.seconds * 1000).toLocaleDateString()}
                          </Typography>
                        )}
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                          <Box
                            component="span"
                            sx={{
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              "&:hover": { textDecoration: "underline" }
                            }}
                          >
                            Open {r.type} →
                          </Box>
                        </a>
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}