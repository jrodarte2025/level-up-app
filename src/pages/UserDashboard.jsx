import React, { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import EventCard from "../components/EventCard";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { processUpcomingEvents } from "../utils/eventUtils";

export default function UserDashboard({ setShowAdminPanel }) {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(auth.currentUser);
  const [userRole, setUserRole] = useState(null);
  const [rsvps, setRsvps] = useState({});

  // Match tracking
  const [matchUserId, setMatchUserId] = useState(null);
  const [matchRsvps, setMatchRsvps] = useState({});
  // Load matchUserId
  useEffect(() => {
    if (!user) return;
    const fetchMatch = async () => {
      // Find match document
      const snap = await getDocs(query(
        collection(db, "matches"),
        where("coachId", "==", user.uid)
      ));
      let m = snap.docs.length ? snap.docs[0].data() : null;
      if (!m) {
        const snap2 = await getDocs(query(
          collection(db, "matches"),
          where("studentId", "==", user.uid)
        ));
        m = snap2.docs.length ? snap2.docs[0].data() : null;
      }
      if (m) {
        // Determine the other user
        const other = m.coachId === user.uid ? m.studentId : m.coachId;
        setMatchUserId(other);
      }
    };
    fetchMatch();
  }, [user]);

  // Subscribe to match's RSVPs
  useEffect(() => {
    if (!matchUserId) return;
    const unsub = onSnapshot(
      query(collection(db, "rsvps"), where("userId", "==", matchUserId)),
      (snapshot) => {
        const data = {};
        snapshot.docs.forEach((d) => {
          const r = d.data();
          if (r.attending) data[r.eventId] = true;
        });
        setMatchRsvps(data);
      }
    );
    return () => unsub();
  }, [matchUserId]);
  const [filters, setFilters] = useState({
    coach: false,
    student: false,
    required: false,
    notRsvpd: false,
  });
  // Modal state for profile
  const [showProfile, setShowProfile] = useState(false);

  const [profileImage, setProfileImage] = useState("https://via.placeholder.com/64");
  const [profileFile, setProfileFile] = useState(null);
  // Inline edit profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rsvpUsers, setRsvpUsers] = useState([]);
  const [showRsvpList, setShowRsvpList] = useState(false);
  useEffect(() => {
    if (!user) return;
    const loadRole = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserRole(data.role || null);
        // fallback for basic info
        if (!data.firstName && data.displayName) {
          setFirstName(data.displayName.split(" ")[0] || "");
          setLastName(data.displayName.split(" ")[1] || "");
        }
      }
    };
    loadRole();
  }, [user]);


  useEffect(() => {
    if (!selectedEvent) return;

    const loadRsvpUsers = async () => {
      // 1) fetch RSVPs for this event
      const rsvpSnap = await getDocs(
        query(collection(db, "rsvps"), where("eventId", "==", selectedEvent.id))
      );
      const userIds = rsvpSnap.docs.map(d => d.data().userId);
      if (userIds.length === 0) {
        setRsvpUsers([]);
        return;
      }

      // 2) fetch all users and filter to those IDs
      const usersSnap = await getDocs(collection(db, "users"));
      let matched = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => userIds.includes(u.id));

      // 3) for each user, prefer headshotUrl, then profileImage, then fallback to Storage
      const storage = getStorage();
      matched = await Promise.all(matched.map(async u => {
        // 1) Firestore headshotUrl
        if (u.headshotUrl) {
          return { ...u, profileImage: u.headshotUrl };
        }
        // 2) Existing stored profileImage field
        if (u.profileImage) {
          return u;
        }
        // 3) Fallback to Storage lookup
        try {
          const url = await getDownloadURL(ref(storage, `users/${u.id}/profile.jpg`));
          return { ...u, profileImage: url };
        } catch {
          return u;
        }
      }));

      setRsvpUsers(matched);
    };

    loadRsvpUsers();
  }, [selectedEvent]);

  useEffect(() => {
    if (!user) return;
    const loadProfileImage = async () => {
      // 1) Try Firestore fields
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.headshotUrl) {
          setProfileImage(data.headshotUrl);
          return;
        }
        if (data.profileImage) {
          const storage = getStorage();
          try {
            const url = await getDownloadURL(ref(storage, `users/${user.uid}/profile.jpg`));
            setProfileImage(url);
            return;
          } catch {
            setProfileImage(data.profileImage);
            return;
          }
        }
      }
      // 2) Fallback to Storage
      try {
        const storage = getStorage();
        const imageRef = ref(storage, `users/${user.uid}/profile.jpg`);
        const url = await getDownloadURL(imageRef);
        setProfileImage(url);
      } catch {
        setProfileImage("https://via.placeholder.com/64");
      }
    };
    loadProfileImage();
  }, [user]);

  // Load profile data for editing in modal
  useEffect(() => {
    if (!user) return;
    // Load Firestore profile
    getDoc(doc(db, "users", user.uid)).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        // fallback just in case displayName isn't already set
        if (data.displayName) {
          setFirstName(data.displayName.split(" ")[0] || "");
          setLastName(data.displayName.split(" ")[1] || "");
        }
        setCompany(data.company || "");
        setJobTitle(data.title || "");
        setMajor(data.major || "");
        setGraduationYear(data.graduationYear || "");
      }
    });
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(all);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rsvps"), (snapshot) => {
      const data = {};
      snapshot.docs.forEach((doc) => {
        const rsvp = doc.data();
        if (rsvp.userId === user?.uid) {
          data[rsvp.eventId] = true;
        }
      });
      setRsvps(data);
    });

    return () => unsub();
  }, [user]);

  const handleRSVP = async (eventId) => {
    const key = `${user.uid}_${eventId}`;
    const rsvpDocRef = doc(db, "rsvps", key);

    if (rsvps[eventId]) {
      await deleteDoc(rsvpDocRef);
    } else {
      await setDoc(rsvpDocRef, {
        userId: user.uid,
        eventId,
        attending: true,
      });
    }
  };

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sortedEvents = processUpcomingEvents([...events]);

  const filteredEvents = sortedEvents.filter((event) => {
    const isCoach = event.groups?.includes("coaches");
    const isStudent = event.groups?.includes("students");
    const isRequired = event.required;
    const isRSVPed = rsvps[event.id];

    if (filters.coach && !isCoach) return false;
    if (filters.student && !isStudent) return false;
    if (filters.required && !isRequired) return false;
    if (filters.notRsvpd && isRSVPed) return false;

    return true;
  });

  const generateCalendarLinks = (event) => {
    const title = encodeURIComponent(event.name);
    const location = encodeURIComponent(event.location || "");
    const description = encodeURIComponent(event.description || "");
    const start = new Date(event.date?.seconds * 1000);
    const [startHour, endHour] = event.timeRange?.split("–") || ["", ""];

    const startDateTime = new Date(`${start.toDateString()} ${startHour.trim()}`);
    const endDateTime = new Date(`${start.toDateString()} ${endHour.trim()}`);

    const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${format(startDateTime)}/${format(endDateTime)}`;

    const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${description}&location=${location}&sf=true&output=xml`;
    const ics = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:${title}%0ADESCRIPTION:${description}%0ALOCATION:${location}%0ADTSTART:${format(startDateTime)}%0ADTEND:${format(endDateTime)}%0AEND:VEVENT%0AEND:VCALENDAR`;

    return { google, ics, outlook: ics }; // Outlook uses downloadable .ics file
  };


  return (
    <div style={{ padding: "1rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Event Filters Subtitle and Controls */}
      <div style={{ maxWidth: "600px", margin: "0 auto 1.5rem", padding: "0 1rem", textAlign: "center" }}>
        <p style={{ margin: 0, marginBottom: "0.5rem", fontSize: "0.875rem", color: "#6b7280", fontWeight: 500 }}>
          Event Filters
        </p>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.5rem"
        }}>
          {[
            { label: "Coach Event", key: "coach" },
            { label: "Student Event", key: "student" },
            { label: "Required", key: "required" },
            { label: "Not RSVP’d", key: "notRsvpd" }
          ].map(({ label, key }) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`button-toggle ${filters[key] ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {filteredEvents.length > 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          maxWidth: "600px",
          margin: "0 auto"
        }}>
          {filteredEvents.map((event) => {
            const isExpanded = selectedEvent && selectedEvent.id === event.id;
            const attendingUsers = isExpanded ? rsvpUsers : [];

            return (
              <EventCard
                key={event.id}
                event={event}
                isRSVPed={!!rsvps[event.id]}
                isMatchGoing={!!matchRsvps[event.id]}
                onRSVP={handleRSVP}
                onClick={() => {
                  setSelectedEvent(isExpanded ? null : event);
                  setShowRsvpList(false);
                }}
                expanded={isExpanded}
                showDetails={isExpanded}
                attendingUsers={attendingUsers}
                toggleDetails={() => setShowRsvpList(!showRsvpList)}
              />
            );
          })}
        </div>
      ) : (
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>No events match your filters.</p>
      )}
      {/* Slide-up Profile Modal */}
      {showProfile && (
        // Backdrop: clicking outside closes modal
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 1000
          }}
          onClick={() => setShowProfile(false)}
        >
          {/* Modal container */}
          <div
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: "12px",
              borderTopRightRadius: "12px",
              boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
              padding: "1.5rem 1rem",
              width: "100%",
              maxWidth: "400px",
              position: "relative",
              boxSizing: "border-box",
              maxHeight: "95vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button (×) */}
            <button
              onClick={() => setShowProfile(false)}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                background: "transparent",
                border: "none",
                fontSize: "1.25rem",
                color: "#6b7280",
                cursor: "pointer"
              }}
              aria-label="Close"
            >
              ×
            </button>

            {/* ==== Existing modal content goes here ==== */}
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              {/* Hidden file input for profile image upload */}
              <input
                id="profileUpload"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const storage = getStorage();
                  const refPath = ref(storage, `users/${user.uid}/profile.jpg`);
                  await uploadBytes(refPath, file);
                  const url = await getDownloadURL(refPath);
                  setProfileImage(url);
                }}
                style={{ display: "none" }}
              />
              <label htmlFor="profileUpload" style={{ cursor: "pointer", display: "inline-block", position: "relative" }}>
                <img
                  src={profileImage}
                  alt="Profile"
                  style={{ borderRadius: "50%", width: "96px", height: "96px", marginBottom: "1rem", objectFit: "cover" }}
                />
                <span style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  fontSize: "0.7rem",
                  textAlign: "center",
                  color: "#fff",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  padding: "2px",
                  borderBottomLeftRadius: "50%",
                  borderBottomRightRadius: "50%"
                }}>
                  Upload Photo
                </span>
              </label>
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>{user?.email}</p>
            </div>
            {/* Inline edit profile fields */}
            <div style={{ margin: "1rem auto", width: "80%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
              />
              {userRole?.includes("student") ? (
                <>
                  <input
                    type="text"
                    placeholder="Major"
                    value={major}
                    onChange={e => setMajor(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
                  />
                  <input
                    type="text"
                    placeholder="Graduation Year"
                    value={graduationYear}
                    onChange={e => setGraduationYear(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Company"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
                  />
                  <input
                    type="text"
                    placeholder="Job Title"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
                  />
                </>
              )}
            </div>
            <button
              className="button-primary"
              onClick={async () => {
                const userRef = doc(db, "users", user.uid);
                await setDoc(
                  userRef,
                  {
                    firstName,
                    lastName,
                    displayName: `${firstName} ${lastName}`,
                    ...(userRole === "student"
                      ? { major, graduationYear }
                      : { company, title: jobTitle })
                  },
                  { merge: true }
                );
                setShowProfile(false);
              }}
            >
              Save Profile
            </button>
            {/* Only show if userRole is admin */}
            {userRole === "admin" && (
              <button
                className="button-primary"
                onClick={() => {
                  setShowAdminPanel(true);
                  setShowProfile(false);
                }}
              >
                Switch to Admin Panel
              </button>
            )}
            <button
              className="button-danger"
              onClick={() => {
                signOut(auth).then(() => window.location.reload());
              }}
            >
              Sign Out
            </button>
            <button
              className="button-link"
              onClick={() => setShowProfile(false)}
              style={{ marginTop: "1rem", width: "100%" }}
            >
              Close
            </button>
            {/* ============================================ */}
          </div>
        </div>
      )}
      {/* Remove old selectedEvent modal, now replaced by accordion style */}
      {showRsvpList && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.palette.background.paper,
            padding: "1.5rem",
            borderRadius: "12px",
            maxWidth: "400px",
            width: "90%",
            maxHeight: "70vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0, color: theme.palette.text.primary }}>RSVP'd Attendees</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {rsvpUsers.map((user, i) => (
                <li key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                  color: theme.palette.text.primary
                }}>
                  <img
                    src={user.profileImage || "https://via.placeholder.com/32"}
                    alt={user.email}
                    style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <span style={{ fontSize: "0.95rem", fontWeight: 500, color: theme.palette.text.primary }}>
                    {user.displayName || user.email}
                  </span>
                </li>
              ))}
            </ul>
            <button
              className="button-primary"
              onClick={() => setShowRsvpList(false)}
              style={{ marginTop: "1rem", width: "100%" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}