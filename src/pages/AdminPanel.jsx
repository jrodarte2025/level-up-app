// --- User Role and Alumni Controls (for future user management UI) ---
// Role options for admin assignment
const roleOptions = [
  { value: "student", label: "Student" },
  { value: "coach", label: "Coach" },
  { value: "board", label: "Board Member" },
  { value: "coach-board", label: "Coach + Board" },
  { value: "future-coach", label: "Future Coach" }
];

// Example: selectedUser and update handlers for role/alumni assignment
// (These would be implemented in user management logic/modal)
// const [selectedUser, setSelectedUser] = useState(null);
// function updateSelectedUserRole(newRole) {
//   setSelectedUser(prev => ({ ...prev, role: newRole }));
// }
// function updateSelectedUserAlumni(isAlumni) {
//   setSelectedUser(prev => ({ ...prev, alumni: isAlumni }));
// }

// --- Reusable JSX for admin user role/alumni controls ---
// Place this inside a user edit section/modal as needed:
/*
<div style={{ marginTop: "1rem" }}>
  <label style={{ fontWeight: 600 }}>User Role</label>
  <select
    name="userRole"
    value={selectedUser?.role || ""}
    onChange={(e) => updateSelectedUserRole(e.target.value)}
    style={{
      marginTop: "0.25rem",
      padding: "0.5rem",
      borderRadius: "6px",
      border: `1px solid ${theme.palette.divider}`
    }}
  >
    {roleOptions.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
  <label style={{ marginTop: "0.5rem", display: "block" }}>
    <input
      type="checkbox"
      checked={selectedUser?.alumni || false}
      onChange={(e) => updateSelectedUserAlumni(e.target.checked)}
      style={{ marginRight: "0.4rem" }}
    />
    Alumni
  </label>
</div>
*/

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@mui/material/styles";
import { resizeImage } from "../utils/resizeImage";
import CropModal from "../components/CropModal";
import CreateUpdate from "../components/CreateUpdate";
import RichTextEditor from "../components/RichTextEditor";
import { db, auth } from "../firebase";
import { collection, addDoc, Timestamp, getDocs, deleteDoc, doc, updateDoc, query, where, getDoc, setDoc, orderBy, onSnapshot } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { filterUpcomingEvents, sortEventsByDateTime } from "../utils/eventUtils";
import "../App.css";

import { loadGoogleMapsScript } from "../utils/loadGoogleMapsScript";

export default function AdminPanel({ tab }) {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(() => {
    return localStorage.getItem("adminTab") || tab || "events";
  });
  // Posts admin state and shared success state
  const [success, setSuccess] = useState("");
  const [posts, setPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  // Post image upload state
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  // Track if existing image should be removed (for post editing)
  const [clearExistingImage, setClearExistingImage] = useState(false);
  // Track user role for post filtering
  // Posts UI: Track expanded post
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  // Posts filter state
  const [filterType, setFilterType] = useState("");
  const [filterAudience, setFilterAudience] = useState("");
  useEffect(() => {
    // Fetch user role if not already set
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || null);
        }
      } catch (e) {
        setUserRole(null);
      }
    };
    if (selectedTab === "posts" && !userRole) {
      fetchRole();
    }
  }, [selectedTab, userRole]);
  // Fetch posts when posts tab is selected - with role-based query
  useEffect(() => {
    if (selectedTab !== "posts" || !userRole) return;
    // Conditionally construct query: admin sees all, others see only their role
    const baseQuery = query(
      collection(db, "posts"),
      ...(userRole === "admin" ? [] : [where("roles", "array-contains", userRole)]),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [selectedTab, userRole]);
  // Handler for controlled resource form inputs
  const handleResourceFormChange = (e) => {
    const { name, value } = e.target;
    setResourceForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  // Resource editing state
  const [editingResourceId, setEditingResourceId] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    title: "",
    section: "",
    role: [],
    type: "",
    url: "",
    description: ""
  });
  // Resource search state
  const [resourceSearch, setResourceSearch] = useState("");

  // Resource admin handler (add or edit)
  const handleAddResource = async (e) => {
    e.preventDefault();
    const newResource = {
      title: resourceForm.title,
      section: resourceForm.section,
      role: resourceForm.role,
      type: resourceForm.type,
      url: resourceForm.url,
      description: resourceForm.description,
      timestamp: Timestamp.now()
    };

    // Validation: Require at least one audience role selected
    if (!newResource.role || (Array.isArray(newResource.role) && newResource.role.length === 0)) {
      alert("Please select at least one audience role.");
      return;
    }

    try {
      if (editingResourceId) {
        await updateDoc(doc(db, "resources", editingResourceId), newResource);
        setResources(prev =>
          prev.map(r =>
            r.id === editingResourceId ? { ...r, ...newResource } : r
          )
        );
        setSuccess("Resource updated!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        await addDoc(collection(db, "resources"), newResource);
        setSuccess("Resource added!");
        setTimeout(() => setSuccess(""), 3000);
      }

      setResourceForm({
        title: "",
        section: "",
        role: "",
        type: "",
        url: "",
        description: ""
      });
      setEditingResourceId(null);
    } catch (err) {
      console.error("❌ Error saving resource:", err);
    }
  };

  const [form, setForm] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    groups: "both",
    required: true,
    allowGuests: false,
  });
  const [headerImageFile, setHeaderImageFile] = useState(null);
  const [existingHeaderImage, setExistingHeaderImage] = useState(null);
  const [events, setEvents] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [cropImageSrc, setCropImageSrc] = useState(null);
  useEffect(() => {
    if (tab) {
      setSelectedTab(tab);
      localStorage.setItem("adminTab", tab);
    }
  }, [tab]);
  useEffect(() => {
    localStorage.setItem("adminTab", selectedTab);
  }, [selectedTab]);
  // Resource management state
  const [resources, setResources] = useState([]);
  useEffect(() => {
    if (selectedTab !== "resources") return;
    const fetchResources = async () => {
      const snapshot = await getDocs(collection(db, "resources"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(data);
    };
    fetchResources();
  }, [selectedTab]);

  // RSVP Modal state
  const [rsvpModalOpen, setRsvpModalOpen] = useState(false);
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [rsvpAttendees, setRsvpAttendees] = useState([]); // will be array of user objects
  // RSVP Add User state
  const [rsvpSearchInput, setRsvpSearchInput] = useState("");
  const [rsvpSelectedUser, setRsvpSelectedUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  // RSVP Role Filter
  const [rsvpRoleFilter, setRsvpRoleFilter] = useState(() => localStorage.getItem("rsvpRoleFilter") || "all");

  // Load RSVPs for an event
  const loadRsvpsForEvent = async (eventId) => {
    try {
      // fetch RSVP docs
      const rsvpSnap = await getDocs(query(
        collection(db, "rsvps"),
        where("eventId", "==", eventId),
        where("attending", "==", true)
      ));
      const rsvps = rsvpSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // fetch user details by document ID
      const attendees = await Promise.all(rsvps.map(async (r) => {
        try {
          const userRef = doc(db, "users", r.userId);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            console.warn(`User ${r.userId} not found for RSVP`);
            return null;
          }
          const u = userSnap.data();
          return {
            id: r.userId,
            rsvpDocId: r.id, // Store the actual RSVP document ID for deletion
            role: u.role,
            displayName: u.displayName || `${u.firstName} ${u.lastName}`,
            guestCount: r.guestCount || 0
          };
        } catch (error) {
          console.error(`Error fetching user ${r.userId}:`, error);
          return null;
        }
      }));
      
      // Filter out null entries and update state
      const validAttendees = attendees.filter(Boolean);
      setRsvpAttendees(validAttendees);
      
      // Fetch all users for manual RSVP (only if not already loaded)
      if (allUsers.length === 0) {
        const allUserSnap = await getDocs(collection(db, "users"));
        setAllUsers(allUserSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (error) {
      console.error("Error loading RSVPs:", error);
      setRsvpAttendees([]);
    }
  };

  const locationInputRef = useRef(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("❌ Google Maps API key missing.");
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (
          window.google &&
          window.google.maps &&
          window.google.maps.places &&
          typeof window.google.maps.places.Autocomplete === "function"
        ) {
          const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
            types: ["geocode"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            setForm((prev) => ({
              ...prev,
              location: place.formatted_address || place.name || prev.location,
            }));
          });
        } else {
          console.warn("❌ Google Places API not available after script load.");
        }
      })
      .catch((err) => {
        console.error("❌ Failed to load Google Maps script:", err);
      });
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      const snapshot = await getDocs(collection(db, "events"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(data);
    };
    fetchEvents();
  }, []);



  const handleDelete = async (eventId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this event? This action cannot be undone.");
    if (!confirmDelete) return;
    
    await deleteDoc(doc(db, "events", eventId));
    setEvents(prev => prev.filter(e => e.id !== eventId));
    setSuccess("Event deleted successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };


  const handleEdit = (event) => {
    // Parse the timeRange into "HH:MM" 24hr format for input fields
    let startTimeString = "";
    let endTimeString = "";
    if (event.timeRange) {
      const [start, end] = event.timeRange.split("–").map(s => s.trim());
      // Convert "2:00 PM" to "14:00" etc for input type="time"
      const to24Hour = (ampm) => {
        if (!ampm) return "";
        const d = new Date(`1970-01-01T${ampm}`);
        if (!isNaN(d)) {
          return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        }
        // fallback: try to parse manually
        const match = ampm.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
        if (!match) return "";
        let [_, h, m, ap] = match;
        h = parseInt(h, 10);
        if (ap.toUpperCase() === "PM" && h !== 12) h += 12;
        if (ap.toUpperCase() === "AM" && h === 12) h = 0;
        return `${h.toString().padStart(2, "0")}:${m}`;
      };
      startTimeString = to24Hour(start);
      endTimeString = to24Hour(end);
    }
    setForm({
      name: event.name,
      date: event.date?.toDate
        ? event.date.toDate().toISOString().split("T")[0]
        : new Date(event.date.seconds * 1000).toISOString().split("T")[0],
      startTime: startTimeString,
      endTime: endTimeString,
      location: event.location,
      description: event.description,
      groups: event.groups.includes("students") && event.groups.includes("coaches")
        ? "both"
        : event.groups[0],
      required: event.required,
      allowGuests: event.allowGuests || false,
    });
    setEditingId(event.id);
    setExistingHeaderImage(event.headerImage || null);
    setHeaderImageFile(null);
    // Scroll to top when editing begins
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime) {
      setSuccess("Please select valid start and end times.");
      return;
    }
    // Convert startTime/endTime "HH:MM" to Date objects for formatting
    const toDateObj = (time) => {
      if (!time) return null;
      const [h, m] = time.split(":");
      const d = new Date();
      d.setHours(Number(h), Number(m), 0, 0);
      return d;
    };
    const startTimeObj = toDateObj(form.startTime);
    const endTimeObj = toDateObj(form.endTime);
    // Format as "h:mm AM/PM"
    const startTimeString = startTimeObj
      ? startTimeObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
      : "";
    const endTimeString = endTimeObj
      ? endTimeObj.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
      : "";
    const eventDate = new Date(form.date);
    if (isNaN(eventDate)) {
      setSuccess("Please select a valid date.");
      return;
    }
    // Construct full start datetime for comparison
    if (startTimeObj) {
      eventDate.setHours(startTimeObj.getHours(), startTimeObj.getMinutes(), 0, 0);
    }
    if (eventDate < new Date()) {
      setSuccess("Cannot create events in the past.");
      return;
    }

    let headerImageUrl = "";

    try {
      if (headerImageFile) {
        const resizedBlob = await resizeImage(headerImageFile, 800, 0.8);
        const resizedFile = new File([resizedBlob], headerImageFile.name, { type: "image/jpeg" });
        const storage = getStorage();
        const imageRef = storageRef(storage, `headers/${Date.now()}-${headerImageFile.name}`);
        await uploadBytes(imageRef, resizedFile);
        headerImageUrl = await getDownloadURL(imageRef);
      }

      // --- Convert form.date (YYYY-MM-DD) to local Date object for Firestore Timestamp ---
      const [yyyy, mm, dd] = form.date.split("-");
      const eventDateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

      if (editingId) {
        await updateDoc(doc(db, "events", editingId), {
          name: form.name,
          date: Timestamp.fromDate(eventDateObj),
          timeRange: `${startTimeString} – ${endTimeString}`,
          location: form.location,
          description: form.description,
          groups: form.groups === "both" ? ["students", "coaches"] : [form.groups],
          required: form.required,
          allowGuests: form.allowGuests,
          headerImage: headerImageUrl || existingHeaderImage || "",
        });
      } else {
        // Add new event, update local events list, show success message
        const newEventRef = await addDoc(collection(db, "events"), {
          name: form.name,
          date: Timestamp.fromDate(eventDateObj),
          timeRange: `${startTimeString} – ${endTimeString}`,
          location: form.location,
          description: form.description,
          groups: form.groups === "both" ? ["students", "coaches"] : [form.groups],
          required: form.required,
          allowGuests: form.allowGuests,
          createdBy: auth.currentUser?.email || "unknown",
          headerImage: headerImageUrl,
        });
        setEvents(prev => [
          ...prev,
          { id: newEventRef.id, ...form, timeRange: `${startTimeString} – ${endTimeString}`, date: Timestamp.fromDate(eventDateObj), headerImage: headerImageUrl }
        ]);
        setSuccess("Event created!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (error) {
      console.error("❌ Firestore error:", error);
      setSuccess("Error creating event. See console.");
      return;
    }

    setForm({
      name: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      groups: "both",
      required: true,
      allowGuests: false,
    });
    setHeaderImageFile(null);
    setExistingHeaderImage(null);
    setEditingId(null);
    if (editingId) {
      setSuccess("Event updated!");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  // Resource edit handler for Edit button in resources
  const handleEditResource = (r) => {
    setEditingResourceId(r.id);
    setResourceForm({
      title: r.title,
      section: r.section,
      role: r.role,
      type: r.type,
      url: r.url,
      description: r.description || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Mobile detection for responsive admin forms
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      style={{
        padding: "1rem",
        paddingBottom: "6rem",
        margin: "auto",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
        overflowY: "auto",
        maxHeight: "calc(100vh - 4rem)",
        ...(selectedTab === "posts"
          ? { maxWidth: "100%", width: "100%" }
          : { maxWidth: "600px" })
      }}
    >
      {selectedTab === "events" && (
        <>
          <h2 style={{
            fontSize: "1.375rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            color: editingId ? "#92400e" : theme.palette.text.primary
          }}>
            {editingId ? "Edit Event" : "Create New Event"}
          </h2>
          <p style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "#6b7280",
            textTransform: "uppercase",
            marginBottom: "1.5rem",
            letterSpacing: "0.04em"
          }}>
          </p>
          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", marginBottom: "1.5rem" }} />
          {success && (
            <div style={{ 
              position: "fixed", 
              top: "1rem", 
              right: "1rem", 
              backgroundColor: success.includes("Cannot") || success.includes("Error") ? "#fee2e2" : "#dcfce7", 
              color: success.includes("Cannot") || success.includes("Error") ? "#dc2626" : "#16a34a", 
              padding: "0.75rem 1rem", 
              borderRadius: "8px", 
              border: `1px solid ${success.includes("Cannot") || success.includes("Error") ? "#fecaca" : "#bbf7d0"}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 9999,
              maxWidth: "300px",
              fontWeight: 500,
              fontSize: "0.9rem"
            }}>
              {success}
            </div>
          )}
          <div style={{
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: editingId ? "2px solid #fbbf24" : `1px solid ${theme.palette.divider}`,
            padding: isMobile ? "1rem" : "2rem",
            borderRadius: isMobile ? "0" : "14px",
            boxShadow: isMobile ? "none" : (editingId ? "0 0 8px rgba(251,191,36,0.5)" : "0 4px 16px rgba(0,0,0,0.06)"),
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          }}>
            {/* Edit mode banner */}
            {editingId && (
              <div style={{
                backgroundColor: "#fef3c7",
                color: "#92400e",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontWeight: 500,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                You’re editing an existing event.
                <button
                  className="button-link"
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setExistingHeaderImage(null);
                    setHeaderImageFile(null);
                    setForm({
                      name: "",
                      date: "",
                      startTime: "",
                      endTime: "",
                      location: "",
                      description: "",
                      groups: "both",
                      required: true,
                      allowGuests: false
                    });
                  }}
                >
                  Cancel Edit
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <input
                type="text"
                name="name"
                placeholder="Event Name"
                value={form.name}
                onChange={handleChange}
                required
                style={{
                  padding: "0.65rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  fontWeight: 400,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                style={{
                  padding: "0.65rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  fontWeight: 400,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
                style={{
                  padding: "0.65rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  fontWeight: 400,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
                style={{
                  padding: "0.65rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  fontWeight: 400,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em"
                  }}>
                    Location:
                  </label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Location"
                    ref={locationInputRef}
                    value={form.location}
                    onChange={handleChange}
                    required
                    style={{
                      padding: "0.65rem",
                      fontSize: "1rem",
                      borderRadius: "6px",
                      border: `1px solid ${theme.palette.divider}`,
                      color: theme.palette.text.primary,
                      backgroundColor: theme.palette.background.default,
                      fontWeight: 400,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                      width: "100%"
                    }}
                  />
                </div>
                <label style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  marginBottom: "0.25rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em"
                }}>
                  Description
                </label>
                <RichTextEditor
                  content={form.description}
                  onChange={(value) => setForm(prev => ({ ...prev, description: value }))}
                  placeholder="Enter details about the event. You can format text with bold, italic, lists, and more..."
                />
                <select
                  name="groups"
                  value={form.groups}
                  onChange={handleChange}
                  style={{
                    padding: "0.65rem",
                    fontSize: "1rem",
                    borderRadius: "6px",
                    border: `1px solid ${theme.palette.divider}`,
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.background.default,
                    fontWeight: 400,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                  }}
                >
                  <option value="both">Both Students & Coaches</option>
                  <option value="students">Students Only</option>
                  <option value="coaches">Coaches Only</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
                  <input type="checkbox" name="required" checked={form.required} onChange={handleChange} />
                  Required Event
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 500 }}>
                  <input type="checkbox" name="allowGuests" checked={form.allowGuests} onChange={handleChange} />
                  Allow Guests
                  <span style={{ fontSize: "0.8rem", color: "#6b7280", marginLeft: "0.5rem" }}>
                    (People can bring additional guests when RSVPing)
                  </span>
                </label>
                <div>
                  <label style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em"
                  }}>
                    Header Image (1200 × 675px recommended)
                  </label>
                  {(existingHeaderImage || headerImageFile) && (
                    <div style={{
                      marginTop: "0.5rem",
                      marginBottom: "0.5rem",
                      position: "relative",
                      display: "inline-block"
                    }}>
                      <img
                        src={headerImageFile ? URL.createObjectURL(headerImageFile) : existingHeaderImage}
                        alt="Header preview"
                        style={{
                          maxWidth: "300px",
                          maxHeight: "169px",
                          borderRadius: "6px",
                          border: `1px solid ${theme.palette.divider}`
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderImageFile(null);
                          setExistingHeaderImage(null);
                        }}
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          right: "0.5rem",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "0.25rem 0.5rem",
                          cursor: "pointer",
                          fontSize: "0.75rem"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setCropImageSrc(reader.result);
                      reader.readAsDataURL(file);
                    }}
                    style={{ marginTop: "0.5rem", display: "block" }}
                  />
                </div>
                <button type="submit" className="button-primary">
                  {editingId ? "Save Changes" : "Create Event"}
                </button>
            </form>
          </div>
          <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>📅 Upcoming Events</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {sortEventsByDateTime(filterUpcomingEvents(events))
              .map((event) => (
                <li key={event.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                  <strong>{event.name}</strong>
                  <p style={{ margin: "0.25rem 0", color: "#6b7280" }}>
                    {event.date?.seconds
                      ? new Date(event.date.seconds * 1000).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        })
                      : "Date Unknown"} · {event.timeRange} @ {event.location}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="button-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.95rem" }}
                      onClick={() => handleEdit(event)}
                    >
                      Edit
                    </button>
                    <button
                      className="button-danger"
                      onClick={() => {
                        const confirmed = window.confirm("Deleting this cannot be undone. Are you sure?");
                        if (confirmed) handleDelete(event.id);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="button-primary"
                      onClick={async () => {
                        setRsvpEvent(event);
                        await loadRsvpsForEvent(event.id);
                        setRsvpModalOpen(true);
                      }}
                    >
                      View RSVPs
                    </button>
                  </div>
                </li>
              ))}
          </ul>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "2rem 0 1rem" }}>📜 Past Events</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {events
              .filter(e => {
                // Show events that occurred yesterday or earlier
                const eventDate = new Date(e.date?.seconds * 1000);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return eventDate < today;
              })
              .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
              .map((event) => (
                <li key={event.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "8px", backgroundColor: "#f9fafb" }}>
                  <strong>{event.name}</strong>
                  <p style={{ margin: "0.25rem 0", color: "#6b7280" }}>
                    {event.date?.seconds
                      ? new Date(event.date.seconds * 1000).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric"
                        })
                      : "Date Unknown"} · {event.timeRange} @ {event.location}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="button-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.95rem" }}
                      onClick={() => handleEdit(event)}
                    >
                      Edit
                    </button>
                    <button
                      className="button-danger"
                      onClick={() => {
                        const confirmed = window.confirm("Deleting this cannot be undone. Are you sure?");
                        if (confirmed) handleDelete(event.id);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="button-primary"
                      onClick={async () => {
                        setRsvpEvent(event);
                        await loadRsvpsForEvent(event.id);
                        setRsvpModalOpen(true);
                      }}
                    >
                      View RSVPs
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}
      {/* RSVP Modal */}
      {rsvpModalOpen && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 1000
          }}
          onClick={() => setRsvpModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "12px",
              padding: "1.5rem 1rem",
              width: "90%",
              maxWidth: "400px",
              position: "relative",
              overflowY: "auto",
              maxHeight: "90vh",
              boxSizing: "border-box"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setRsvpModalOpen(false)}
              style={{
                position: "absolute", top: "0.5rem", right: "0.5rem",
                background: "transparent", border: "none", fontSize: "1.25rem",
                color: "#6b7280", cursor: "pointer"
              }}
              aria-label="Close"
            >×</button>
            <h3 style={{ marginTop: 0 }}>RSVP'd Attendees</h3>
            {/* RSVP Role Filter Dropdown */}
            <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              Filter by Role:
              <select
                value={rsvpRoleFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setRsvpRoleFilter(val);
                  localStorage.setItem("rsvpRoleFilter", val);
                }}
                style={{
                  marginLeft: "0.5rem",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.85rem"
                }}
              >
                <option value="all">All</option>
                <option value="coach">Coaches</option>
                <option value="student">Students</option>
                <option value="board">Board</option>
              </select>
            </label>
            {rsvpAttendees.length === 0 ? (
              <p>No attendees yet.</p>
            ) : (
              (() => {
                // Group by filtered role values
                const groups = rsvpAttendees
                  .filter(u => rsvpRoleFilter === "all" || u.role === rsvpRoleFilter)
                  .reduce((acc, u) => {
                    const role = u.role || "unknown";
                    if (!acc[role]) acc[role] = [];
                    acc[role].push(u);
                    return acc;
                  }, {});
                const labelMap = { coach: "Coaches", student: "Students", board: "Board Members" };
                return Object.entries(groups).map(([roleKey, list]) => (
                  <div key={roleKey} style={{ marginBottom: "1rem" }}>
                    <strong>{labelMap[roleKey] || roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}</strong>
                    <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                      {list.map(u => (
                        <li
                          key={u.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.5rem 0",
                            borderBottom: "1px solid #e5e7eb"
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span>{u.displayName}</span>
                            {u.guestCount > 0 && (
                              <span style={{ 
                                fontSize: "0.75rem", 
                                color: "#6b7280", 
                                fontStyle: "italic" 
                              }}>
                                + {u.guestCount} guest{u.guestCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              const confirmed = window.confirm(`Are you sure you want to remove ${u.displayName} from this event?`);
                              if (!confirmed) return;
                              
                              // Show immediate feedback by updating UI optimistically
                              const originalAttendees = [...rsvpAttendees];
                              const updatedAttendees = rsvpAttendees.filter(attendee => attendee.id !== u.id);
                              setRsvpAttendees(updatedAttendees);
                              
                              try {
                                // Use the actual RSVP document ID stored in rsvpDocId
                                await deleteDoc(doc(db, "rsvps", u.rsvpDocId));
                                // Show success notification immediately
                                setSuccess(`${u.displayName} removed from event.`);
                                setTimeout(() => setSuccess(""), 3000);
                              } catch (error) {
                                console.error("Error removing RSVP:", error);
                                console.error("RSVP Doc ID:", u.rsvpDocId);
                                console.error("User ID:", u.id);
                                console.error("Event ID:", rsvpEvent.id);
                                // Revert the optimistic update on error
                                setRsvpAttendees(originalAttendees);
                                setSuccess("Error removing RSVP. Please try again.");
                                setTimeout(() => setSuccess(""), 3000);
                              }
                            }}
                            style={{
                              backgroundColor: "#ef4444",
                              color: "#fff",
                              padding: "0.25rem 0.5rem",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.75rem"
                            }}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ));
              })()
            )}
            
            {/* Guests Section */}
            {(() => {
              const totalGuests = rsvpAttendees
                .filter(u => rsvpRoleFilter === "all" || u.role === rsvpRoleFilter)
                .reduce((sum, u) => sum + (u.guestCount || 0), 0);
              
              if (totalGuests > 0) {
                return (
                  <div style={{ marginBottom: "1rem" }}>
                    <strong>Guests</strong>
                    <p style={{ 
                      fontSize: "0.9rem", 
                      color: "#6b7280", 
                      margin: "0.25rem 0",
                      fontStyle: "italic"
                    }}>
                      {totalGuests} additional guest{totalGuests !== 1 ? 's' : ''} attending
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Total Attendees */}
            {rsvpAttendees.length > 0 && (
              <div style={{ 
                backgroundColor: theme.palette.background.default,
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem"
              }}>
                <strong style={{ color: theme.palette.text.primary }}>
                  Total Attendees: {(() => {
                    const filteredAttendees = rsvpAttendees.filter(u => 
                      rsvpRoleFilter === "all" || u.role === rsvpRoleFilter
                    );
                    const totalPeople = filteredAttendees.length;
                    const totalGuests = filteredAttendees.reduce((sum, u) => sum + (u.guestCount || 0), 0);
                    return totalPeople + totalGuests;
                  })()}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#6b7280", marginLeft: "0.5rem" }}>
                  ({rsvpAttendees.filter(u => rsvpRoleFilter === "all" || u.role === rsvpRoleFilter).length} RSVPs 
                  {(() => {
                    const totalGuests = rsvpAttendees
                      .filter(u => rsvpRoleFilter === "all" || u.role === rsvpRoleFilter)
                      .reduce((sum, u) => sum + (u.guestCount || 0), 0);
                    return totalGuests > 0 ? ` + ${totalGuests} guests` : '';
                  })()})
                </span>
              </div>
            )}
            
            <hr style={{ margin: "1rem 0" }} />
            <h4 style={{ margin: "0.25rem 0" }}>Add RSVP</h4>
            <input
              type="text"
              placeholder="Search users... (type name to find user)"
              value={rsvpSearchInput}
              onChange={(e) => {
                const val = e.target.value;
                setRsvpSearchInput(val);
                // More flexible matching - search by first name, last name, or full name
                const match = allUsers.find(u => {
                  const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
                  const searchTerm = val.toLowerCase();
                  return fullName === searchTerm || 
                         fullName.includes(searchTerm) ||
                         u.firstName?.toLowerCase() === searchTerm ||
                         u.lastName?.toLowerCase() === searchTerm;
                });
                setRsvpSelectedUser(match || null);
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "0.9rem",
                marginBottom: "0.5rem",
                border: `1px solid ${rsvpSelectedUser ? "#10b981" : "#d1d5db"}`,
                borderRadius: "4px"
              }}
              list="rsvp-user-options"
            />
            <datalist id="rsvp-user-options">
              {allUsers.map(u => (
                <option key={u.id} value={`${u.firstName} ${u.lastName}`} />
              ))}
            </datalist>
            {rsvpSelectedUser && (
              <div style={{
                fontSize: "0.8rem",
                color: "#10b981",
                marginBottom: "0.5rem",
                padding: "0.25rem",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "4px"
              }}>
                ✓ Selected: {rsvpSelectedUser.firstName} {rsvpSelectedUser.lastName} ({rsvpSelectedUser.role})
              </div>
            )}
            {rsvpSearchInput && !rsvpSelectedUser && (
              <div style={{
                fontSize: "0.8rem",
                color: "#dc2626",
                marginBottom: "0.5rem",
                padding: "0.25rem"
              }}>
                No user found matching "{rsvpSearchInput}"
              </div>
            )}
            <button
              className="button-primary"
              onClick={async () => {
                if (!rsvpEvent || !rsvpSelectedUser) {
                  setSuccess("Please select a valid user.");
                  setTimeout(() => setSuccess(""), 3000);
                  return;
                }

                const userId = rsvpSelectedUser.id;
                const userToAdd = {
                  id: userId,
                  rsvpDocId: `${userId}_${rsvpEvent.id}`,
                  role: rsvpSelectedUser.role,
                  displayName: `${rsvpSelectedUser.firstName} ${rsvpSelectedUser.lastName}`,
                  guestCount: 0 // Default to 0 guests for admin-added RSVPs
                };

                // Optimistically add user to UI immediately
                const originalAttendees = [...rsvpAttendees];
                setRsvpAttendees(prev => [...prev, userToAdd]);
                
                // Clear the search input immediately
                const selectedUserName = `${rsvpSelectedUser.firstName} ${rsvpSelectedUser.lastName}`;
                setRsvpSearchInput("");
                setRsvpSelectedUser(null);

                try {
                  await setDoc(doc(db, "rsvps", `${userId}_${rsvpEvent.id}`), {
                    userId: userId,
                    eventId: rsvpEvent.id,
                    attending: true,
                    guestCount: 0
                  });

                  // Show success notification immediately
                  setSuccess(`${selectedUserName} added to event!`);
                  setTimeout(() => setSuccess(""), 3000);
                } catch (error) {
                  console.error("Error adding RSVP:", error);
                  // Revert optimistic update on error
                  setRsvpAttendees(originalAttendees);
                  setSuccess("Error adding RSVP. Please try again.");
                  setTimeout(() => setSuccess(""), 3000);
                }
              }}
            >
              Add RSVP
            </button>
            <button
              className="button-primary"
              onClick={() => setRsvpModalOpen(false)}
              style={{ display: "block", margin: "1rem auto 0" }}
            >Close</button>
          </div>
        </div>
      )}
    {/* Image Crop Modal */}
    {cropImageSrc && (
      <CropModal
        imageSrc={cropImageSrc}
        aspect={16 / 9}
        onCancel={() => setCropImageSrc(null)}
        onCropComplete={(croppedFile) => {
          setHeaderImageFile(croppedFile);
          setCropImageSrc(null);
        }}
      />
    )}
    {/* Resources Admin */}
    {selectedTab === "resources" && (
      <>
        {/* Resource Edit Handler */}
        {/*
          Handles prefilling the form for editing a resource and scrolls to the top.
        */}
        {/* --- handleEditResource function will be defined above the return block --- */}
        <div style={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          border: isMobile ? "none" : `1px solid ${theme.palette.divider}`,
          padding: isMobile ? "1rem" : "2rem",
          borderRadius: isMobile ? "0" : "14px",
          boxShadow: isMobile ? "none" : "0 4px 16px rgba(0,0,0,0.06)",
          marginTop: "1rem",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}>
          <h2 style={{
            fontSize: "1.375rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          }}>
            Add New Resource
          </h2>
          {editingResourceId && (
            <div style={{
              backgroundColor: "#fef3c7",
              color: "#92400e",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              You’re editing an existing resource.
              <button
                className="button-link"
                type="button"
                onClick={() => {
                  setEditingResourceId(null);
                  setResourceForm({
                    title: "",
                    section: "",
                    role: "",
                    type: "",
                    url: "",
                    description: ""
                  });
                }}
              >
                Cancel Edit
              </button>
            </div>
          )}
          {/* Success message for resource add/edit */}
          {success && (
            <div style={{ 
              position: "fixed", 
              top: "1rem", 
              right: "1rem", 
              backgroundColor: success.includes("Error") ? "#fee2e2" : "#dcfce7", 
              color: success.includes("Error") ? "#dc2626" : "#16a34a", 
              padding: "0.75rem 1rem", 
              borderRadius: "8px", 
              border: `1px solid ${success.includes("Error") ? "#fecaca" : "#bbf7d0"}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              zIndex: 9999,
              maxWidth: "300px",
              fontWeight: 500,
              fontSize: "0.9rem"
            }}>
              {success}
            </div>
          )}
          <form onSubmit={handleAddResource} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              name="title"
              placeholder="Title"
              required
              value={resourceForm.title}
              onChange={handleResourceFormChange}
              style={{
                padding: "0.65rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                fontWeight: 400,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            />
            <select
              name="section"
              required
              value={resourceForm.section}
              onChange={handleResourceFormChange}
              style={{
                padding: "0.65rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                fontWeight: 400,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            >
              <option value="">Select Section</option>
              <option value="Networking">Networking</option>
              <option value="Professional Development">Professional Development</option>
              <option value="Mental Wellness">Mental Wellness</option>
              <option value="Financial Literacy">Financial Literacy</option>
              <option value="Forms & Waivers">Forms & Waivers</option>
              <option value="KPI & Program Info">KPI & Program Info</option>
              <option value="Annual Calendar">Annual Calendar</option>
              <option value="Launch Network">Launch Network</option>
              <option value="Things to Do">Things to Do</option>
              <option value="Support & Feedback">Support & Feedback</option>
            </select>
            <div>
              <label style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#6b7280",
                marginBottom: "0.25rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                Visible to Roles:
              </label>
              {["student", "coach", "board", "employee"].map(roleOption => (
                <label key={roleOption} style={{ display: "inline-block", marginRight: "1rem" }}>
                  <input
                    type="checkbox"
                    checked={Array.isArray(resourceForm.role) ? resourceForm.role.includes(roleOption) : resourceForm.role === roleOption}
                    onChange={() =>
                      setResourceForm(prev => ({
                        ...prev,
                        role: Array.isArray(prev.role)
                          ? (prev.role.includes(roleOption)
                            ? prev.role.filter(r => r !== roleOption)
                            : [...prev.role, roleOption])
                          : (prev.role === roleOption
                            ? []
                            : [prev.role, roleOption].filter(Boolean))
                      }))
                    }
                  />
                  {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                </label>
              ))}
            </div>
            <select
              name="type"
              required
              value={resourceForm.type}
              onChange={handleResourceFormChange}
              style={{
                padding: "0.65rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                fontWeight: 400,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            >
              <option value="">Select Type</option>
              <option value="Form">Form</option>
              <option value="Document">Document</option>
              <option value="Resource Link">Resource Link</option>
              <option value="Curriculum">Curriculum</option>
            </select>
            <input
              name="url"
              placeholder="Resource URL"
              required
              value={resourceForm.url}
              onChange={handleResourceFormChange}
              style={{
                padding: "0.65rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                fontWeight: 400,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            />
            <textarea
              name="description"
              placeholder="Optional description"
              rows={2}
              value={resourceForm.description}
              onChange={handleResourceFormChange}
              style={{
                padding: "0.65rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                fontWeight: 400,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
              }}
            />
            <button className="button-primary" type="submit">
              {editingResourceId ? "Save Changes" : "Add Resource"}
            </button>
          </form>
          {/* Existing Resources section */}
          <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Existing Resources</h3>
          <input
            type="text"
            placeholder="Search resources..."
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.65rem",
              fontSize: "1rem",
              marginBottom: "1rem",
              borderRadius: "6px",
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.background.default,
              fontWeight: 400,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            }}
          />
          {(() => {
            // Filter, group, and sort resources by section, then by timestamp descending
            const groupedResources = resources
              .filter(r =>
                r.title.toLowerCase().includes(resourceSearch.toLowerCase()) ||
                r.description?.toLowerCase().includes(resourceSearch.toLowerCase())
              )
              .slice()
              .sort((a, b) => {
                // Default: sort by timestamp descending (latest first)
                return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
              })
              .reduce((acc, item) => {
                acc[item.section] = acc[item.section] || [];
                acc[item.section].push(item);
                return acc;
              }, {});
            return Object.keys(groupedResources).map(section => (
              <div key={section} style={{ marginBottom: "2rem" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{section}</h4>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {groupedResources[section].map((r) => (
                    <li
                      key={r.id}
                      style={{
                        marginBottom: "1rem",
                        padding: "1rem",
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: "8px",
                        backgroundColor: theme.palette.background.paper
                      }}
                    >
                      <strong>{r.title}</strong>
                      <p style={{ margin: "0.25rem 0", color: "#6b7280" }}>
                        {r.type} — {r.section}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          marginTop: "0.5rem"
                        }}
                      >
                        <button
                          className="button-danger"
                          onClick={async () => {
                            const confirmed = window.confirm("Deleting this cannot be undone. Are you sure?");
                            if (confirmed) {
                              await deleteDoc(doc(db, "resources", r.id));
                              setResources(resources.filter(x => x.id !== r.id));
                            }
                          }}
                        >
                          Delete
                        </button>
                        <button
                          className="button-primary"
                          onClick={() => handleEditResource(r)}
                        >
                          Edit
                        </button>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: "#f3f4f6",
                            color: "#1e2d5f",
                            padding: "0.5rem 1rem",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            textDecoration: "none"
                          }}
                        >
                          Open Link
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ));
          })()}
        </div>
      </>
    )}
    {/* Posts Admin */}
    {selectedTab === "posts" && (
      <div
        style={{
          width: "100%",
          margin: "0 auto",
          padding: "0 1rem",
          maxWidth: "100%",
          ...(typeof window !== "undefined" && window.innerWidth >= 640 && {
            maxWidth: "640px",
            padding: "0 2rem"
          })
        }}
      >
        <CreateUpdate
          postToEdit={posts.find(p => p.id === editingPostId) || null}
          onFinish={() => setEditingPostId(null)}
        />
        <hr style={{ margin: "2rem 0", borderTop: "1px solid #e5e7eb" }} />
        <h4 style={{ fontWeight: 600, marginBottom: "1rem" }}>Existing Posts</h4>
        {/* Filter controls for posts */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "0.9rem" }}
          >
            <option value="">All Types</option>
            <option value="announcement">Announcement</option>
            <option value="event">Event</option>
            <option value="resource">Resource</option>
            <option value="celebration">Celebration</option>
            <option value="update">Program Update</option>
          </select>
          <select
            value={filterAudience}
            onChange={(e) => setFilterAudience(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "0.9rem" }}
          >
            <option value="">All Audiences</option>
            <option value="student">Students</option>
            <option value="coach">Coaches</option>
            <option value="board">Board</option>
          </select>
        </div>
        {(() => {
          const filteredPosts = posts.filter(p =>
            (!filterType || p.type === filterType) &&
            (!filterAudience || p.roles?.includes(filterAudience))
          );
          return filteredPosts.length === 0 ? (
            <p style={{ fontSize: "0.9rem", color: "#6b7280", fontStyle: "italic", marginTop: "1rem" }}>
              No posts found for the selected filters.
            </p>
          ) : (
            filteredPosts.map((p) => (
              <div
                key={p.id}
                onClick={() => setExpandedPostId(prev => prev === p.id ? null : p.id)}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "1rem 1.25rem",
                  borderRadius: "10px",
                  marginBottom: "1.25rem",
                  cursor: "pointer",
                  backgroundColor: expandedPostId === p.id ? "#f1f5f9" : theme.palette.background.paper,
                  boxShadow: expandedPostId === p.id ? "0 1px 8px 0 rgba(0,0,0,0.04)" : "none",
                  transition: "background 0.15s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <strong style={{ fontSize: "1.05rem", fontWeight: 600 }}>{p.title}</strong>
                </div>
                {/* Post type label */}
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor: "#E0F2FE",
                      color: "#0369A1",
                      padding: "0.1rem 0.75em",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      display: "inline-block",
                      marginTop: "0.35em",
                      marginBottom: expandedPostId === p.id ? "0.1em" : "0"
                    }}
                  >
                    {p.type}
                  </span>
                </div>
                {expandedPostId === p.id && (
                  <>
                    {/* Check if content is HTML (new posts) or Markdown (legacy posts) */}
                    {p.body && p.body.includes('<') && p.body.includes('>') ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: p.body }}
                        style={{ 
                          marginTop: "0.75em", 
                          marginBottom: "0.5em", 
                          color: "#1e293b",
                          lineHeight: 1.6
                        }}
                        className="post-content-html"
                      />
                    ) : (
                      <ReactMarkdown style={{ marginTop: "0.75em", marginBottom: "0.5em", color: "#1e293b" }}>
                        {p.body}
                      </ReactMarkdown>
                    )}
                    {p.link && (
                      <div style={{ wordBreak: "break-word", margin: "0.5rem 0" }}>
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#1e40af",
                            fontSize: "0.9rem",
                            display: "inline-block",
                            wordWrap: "break-word"
                          }}
                        >
                          {p.link}
                        </a>
                      </div>
                    )}
                    {/* Post timestamp line */}
                    <div style={{ marginTop: "0.5em", marginBottom: "0.5em" }}>
                      <span style={{ fontSize: "0.8em", color: "#64748b" }}>
                        Posted on{" "}
                        {p.timestamp?.seconds
                          ? new Date(p.timestamp.seconds * 1000).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : "Unknown"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button className="button-primary" onClick={(e) => {
                        e.stopPropagation();
                        setEditingPostId(p.id);
                        
                        // Scroll to top smoothly
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        
                        // Also scroll the container if it exists
                        const adminContainer = document.querySelector('[style*="overflowY"]');
                        if (adminContainer) {
                          adminContainer.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        
                        setTimeout(() => {
                          document.querySelector('[name="title"]').value = p.title;
                          document.querySelector('[name="body"]').value = p.body;
                          document.querySelector('[name="link"]').value = p.link;
                          document.querySelector('[name="type"]').value = p.type;
                          Array.from(document.querySelectorAll('[name="roles"]')).forEach(input => {
                            input.checked = p.roles.includes(input.value);
                          });
                          setPostImagePreview(p.imageUrl || null);
                          setPostImageFile(null);
                          setClearExistingImage(false);
                        }, 0);
                      }}>
                        Edit
                      </button>
                      <button className="button-danger" onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this post?")) {
                          await deleteDoc(doc(db, "posts", p.id));
                          setPosts(prev => prev.filter(x => x.id !== p.id));
                        }
                      }}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          );
        })()}
      </div>
    )}
    </div>
  );
}
