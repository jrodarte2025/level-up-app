import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import AvatarList from "../components/AvatarList";
import GuestCountModal from "../components/GuestCountModal";

export default function EventLandingPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendingUsers, setAttendingUsers] = useState([]);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [currentGuestCount, setCurrentGuestCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Ref for timeout cleanup
  const successTimeoutRef = useRef(null);

  // Helper function for login redirect
  const redirectToLogin = () => {
    sessionStorage.setItem("redirectAfterLogin", location.pathname);
    navigate("/login");
  };

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          setUser({ uid: u.uid, email: u.email, ...userDoc.data() });
        } else {
          setUser({ uid: u.uid, email: u.email });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // First try to find by slug
        const eventsRef = collection(db, "events");
        const slugQuery = query(eventsRef, where("slug", "==", eventId));
        const slugSnapshot = await getDocs(slugQuery);

        let eventData = null;
        let eventDocId = null;

        if (!slugSnapshot.empty) {
          // Found by slug
          const eventSnap = slugSnapshot.docs[0];
          eventData = eventSnap.data();
          eventDocId = eventSnap.id;
        } else {
          // Try by document ID
          const eventDoc = await getDoc(doc(db, "events", eventId));
          if (eventDoc.exists()) {
            eventData = eventDoc.data();
            eventDocId = eventDoc.id;
          }
        }

        if (eventData) {
          setEvent({ id: eventDocId, ...eventData });
        } else {
          setError("Event not found");
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Check RSVP status and fetch attendees
  useEffect(() => {
    if (!event?.id || !user?.uid) return;

    const checkRSVP = async () => {
      try {
        const rsvpDoc = await getDoc(doc(db, "rsvps", `${user.uid}_${event.id}`));
        if (rsvpDoc.exists() && rsvpDoc.data().attending) {
          setIsRSVPed(true);
          setCurrentGuestCount(rsvpDoc.data().guestCount || 0);
        }
      } catch (err) {
        console.error("Error checking RSVP:", err);
      }
    };

    const fetchAttendees = async () => {
      try {
        const rsvpQuery = query(
          collection(db, "rsvps"),
          where("eventId", "==", event.id),
          where("attending", "==", true)
        );
        const rsvpSnapshot = await getDocs(rsvpQuery);

        const attendees = await Promise.all(
          rsvpSnapshot.docs.map(async (rsvpDoc) => {
            const rsvpData = rsvpDoc.data();

            // Use denormalized data if available (new RSVPs)
            if (rsvpData.userName) {
              return {
                id: rsvpData.userId,
                fullName: rsvpData.userName,
                profileImage: rsvpData.userAvatar,
                guestCount: rsvpData.guestCount || 0
              };
            }

            // Fall back to fetching user doc for older RSVPs without denormalized data
            const userDoc = await getDoc(doc(db, "users", rsvpData.userId));
            if (userDoc.exists()) {
              return {
                id: userDoc.id,
                ...userDoc.data(),
                guestCount: rsvpData.guestCount || 0
              };
            }
            return null;
          })
        );

        setAttendingUsers(attendees.filter(Boolean));
      } catch (err) {
        console.error("Error fetching attendees:", err);
      }
    };

    checkRSVP();
    fetchAttendees();
  }, [event?.id, user?.uid]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Handle RSVP
  const handleRSVP = async (guestCount = 0) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    setRsvpLoading(true);
    setErrorMessage("");
    try {
      const rsvpRef = doc(db, "rsvps", `${user.uid}_${event.id}`);

      // Denormalize user data in RSVP for efficient attendee list fetching
      await setDoc(rsvpRef, {
        userId: user.uid,
        eventId: event.id,
        attending: true,
        guestCount: guestCount,
        rsvpTimestamp: Timestamp.now(),
        // Denormalized user data
        userName: user.fullName || user.email,
        userAvatar: user.profileImage || null
      });

      setIsRSVPed(true);
      setCurrentGuestCount(guestCount);
      setSuccessMessage("You're in! See you there.");

      // Clear any existing timeout and set new one
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(""), 5000);

      // Add to attendees list with race condition protection
      setAttendingUsers(prev => {
        // Check if user already exists to prevent duplicates
        if (prev.some(u => u.id === user.uid)) {
          return prev.map(u =>
            u.id === user.uid ? { ...u, guestCount } : u
          );
        }
        return [...prev, {
          id: user.uid,
          fullName: user.fullName,
          profileImage: user.profileImage,
          guestCount
        }];
      });
    } catch (err) {
      console.error("Error RSVPing:", err);
      setErrorMessage("Failed to RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
      setShowGuestModal(false);
    }
  };

  // Handle Cancel RSVP
  const handleCancelRSVP = async () => {
    if (!user || !event) return;

    setRsvpLoading(true);
    setErrorMessage("");
    try {
      const rsvpRef = doc(db, "rsvps", `${user.uid}_${event.id}`);
      await setDoc(rsvpRef, {
        userId: user.uid,
        eventId: event.id,
        attending: false,
        guestCount: 0,
        rsvpTimestamp: Timestamp.now()
      });

      setIsRSVPed(false);
      setCurrentGuestCount(0);
      setAttendingUsers(prev => prev.filter(u => u.id !== user.uid));
    } catch (err) {
      console.error("Error canceling RSVP:", err);
      setErrorMessage("Failed to cancel RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  };

  // Generate calendar links
  const generateCalendarLinks = () => {
    if (!event?.date?.seconds || !event?.timeRange) return {};

    const title = encodeURIComponent(event.name || "Event");
    const locationStr = encodeURIComponent(event.location || "");
    const descriptionStr = encodeURIComponent(event.description?.replace(/<[^>]*>/g, '') || "");

    // Handle multiple dash types (hyphen, en-dash, em-dash)
    const normalizedTimeRange = event.timeRange.replace(/[-–—]/g, "|");
    const [startHour, endHour] = normalizedTimeRange.split("|").map(t => t?.trim());

    if (!startHour || !endHour) return {};

    const start = new Date(event.date.seconds * 1000);
    const startDateTime = new Date(`${start.toDateString()} ${startHour}`);
    const endDateTime = new Date(`${start.toDateString()} ${endHour}`);

    // Validate dates are valid
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return {};

    const format = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${format(startDateTime)}/${format(endDateTime)}`;

    const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${descriptionStr}&location=${locationStr}&sf=true&output=xml`;
    const ics = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ASUMMARY:${title}%0ADESCRIPTION:${descriptionStr}%0ALOCATION:${locationStr}%0ADTSTART:${format(startDateTime)}%0ADTEND:${format(endDateTime)}%0AEND:VEVENT%0AEND:VCALENDAR`;

    return { google, ics, outlook: ics };
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "Date TBD";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading || authLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.palette.background.default
      }}>
        <img src="/logo.png" alt="Level Up Cincinnati" style={{ height: "64px", marginBottom: "1rem" }} />
        <div style={{ fontSize: "0.9rem", color: theme.palette.text.secondary }}>
          Loading event...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.palette.background.default,
        padding: "2rem"
      }}>
        <img src="/logo.png" alt="Level Up Cincinnati" style={{ height: "64px", marginBottom: "1rem" }} />
        <h2 style={{ color: theme.palette.text.primary, marginBottom: "0.5rem" }}>Event Not Found</h2>
        <p style={{ color: theme.palette.text.secondary, marginBottom: "1.5rem" }}>
          This event may have been removed or the link is incorrect.
        </p>
        <button
          className="button-primary"
          onClick={() => navigate("/login")}
        >
          Go to App
        </button>
      </div>
    );
  }

  const imageUrl = event.headerImage || "https://via.placeholder.com/1200x675?text=Level+Up+Event";
  const calendarLinks = generateCalendarLinks();

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: theme.palette.background.default
    }}>
      {/* Success Message Toast */}
      {successMessage && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: theme.palette.success?.main || "#10b981",
            color: "#fff",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            fontWeight: 500
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: "fixed",
            top: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: theme.palette.error?.main || "#dc2626",
            color: "#fff",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            fontWeight: 500
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Hero Section */}
      <div style={{
        position: "relative",
        width: "100%",
        height: "300px",
        overflow: "hidden"
      }}>
        <img
          src={imageUrl}
          alt={event.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)"
        }} />

        {/* Logo */}
        <div style={{
          position: "absolute",
          top: "1rem",
          left: "1rem"
        }}>
          <img
            src="/logo.png"
            alt="Level Up"
            style={{
              height: "40px",
              filter: "brightness(0) invert(1)",
              opacity: 0.9
            }}
          />
        </div>

        {/* Event Title */}
        <div style={{
          position: "absolute",
          bottom: "1.5rem",
          left: "1rem",
          right: "1rem",
          color: "#fff"
        }}>
          {event.required && (
            <span style={{
              backgroundColor: "var(--brand-primary-coral)",
              color: "#fff",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: "0.5rem",
              display: "inline-block"
            }}>
              Required
            </span>
          )}
          <h1 style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            margin: 0,
            textShadow: "0 2px 4px rgba(0,0,0,0.3)"
          }}>
            {event.name}
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <div style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "1.5rem"
      }}>
        {/* Date, Time, Location */}
        <div style={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: `1px solid ${theme.palette.divider}`
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📅</span>
            <div>
              <div style={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {formatDate(event.date)}
              </div>
              <div style={{ color: theme.palette.text.secondary, fontSize: "0.95rem" }}>
                {event.timeRange}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📍</span>
            <div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: theme.palette.primary.main,
                  textDecoration: "underline",
                  fontWeight: 500
                }}
              >
                {event.location}
              </a>
            </div>
          </div>
        </div>

        {/* RSVP Button */}
        {!isRSVPed ? (
          <button
            onClick={() => {
              if (!user) {
                redirectToLogin();
              } else if (event.allowGuests) {
                setShowGuestModal(true);
              } else {
                handleRSVP(0);
              }
            }}
            disabled={rsvpLoading}
            className="button-primary"
            aria-label={user ? "RSVP to this event" : "Log in to RSVP"}
            style={{
              width: "100%",
              padding: "1rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
              opacity: rsvpLoading ? 0.7 : 1
            }}
          >
            {rsvpLoading ? "Saving..." : user ? "RSVP Now" : "Log In to RSVP"}
          </button>
        ) : (
          <div style={{
            backgroundColor: theme.palette.mode === 'dark' ? '#064e3b' : '#dcfce7',
            border: `1px solid ${theme.palette.mode === 'dark' ? '#065f46' : '#bbf7d0'}`,
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1.5rem",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>✓</div>
            <div style={{
              fontWeight: 600,
              color: theme.palette.mode === 'dark' ? '#34d399' : '#16a34a',
              fontSize: "1.1rem"
            }}>
              You're In!
            </div>
            {currentGuestCount > 0 && (
              <div style={{
                fontSize: "0.9rem",
                color: theme.palette.mode === 'dark' ? '#6ee7b7' : '#166534',
                marginTop: "0.25rem"
              }}>
                + {currentGuestCount} guest{currentGuestCount !== 1 ? "s" : ""}
              </div>
            )}
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a href={calendarLinks.google} target="_blank" rel="noreferrer" className="button-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}>
                Add to Google
              </a>
              <a href={calendarLinks.ics} download={`${event.name}.ics`} className="button-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 0.75rem" }}>
                Add to Calendar
              </a>
            </div>
            <button
              onClick={handleCancelRSVP}
              disabled={rsvpLoading}
              aria-label="Cancel your RSVP"
              style={{
                marginTop: "1rem",
                background: "none",
                border: "none",
                color: theme.palette.error?.main || "#dc2626",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              Cancel RSVP
            </button>
          </div>
        )}

        {/* Additional Registration Link */}
        {event.additionalRegistrationUrl && isRSVPed && (
          <div style={{
            backgroundColor: theme.palette.mode === 'dark' ? '#78350f' : '#fef3c7',
            border: `1px solid ${theme.palette.mode === 'dark' ? '#92400e' : '#fde68a'}`,
            borderRadius: "12px",
            padding: "1rem",
            marginBottom: "1.5rem",
            textAlign: "center"
          }}>
            <div style={{
              fontWeight: 600,
              color: theme.palette.mode === 'dark' ? '#fcd34d' : '#92400e',
              marginBottom: "0.5rem"
            }}>
              {event.additionalRegistrationText || "Additional Registration"}
            </div>
            <a
              href={event.additionalRegistrationUrl}
              target="_blank"
              rel="noreferrer"
              className="button-primary"
              style={{ display: "inline-block", padding: "0.5rem 1rem" }}
            >
              Complete Registration
            </a>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: `1px solid ${theme.palette.divider}`
          }}>
            <h3 style={{
              margin: "0 0 0.75rem 0",
              fontSize: "1rem",
              fontWeight: 600,
              color: theme.palette.text.primary
            }}>
              About This Event
            </h3>
            {(() => {
              const isHTML = event.description.includes('<p>') ||
                             event.description.includes('<strong>') ||
                             event.description.includes('<ul>');

              if (isHTML) {
                const sanitizedHTML = DOMPurify.sanitize(event.description, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li'],
                  ALLOWED_ATTR: ['href', 'target', 'rel']
                });
                return (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                      color: theme.palette.text.primary
                    }}
                  />
                );
              } else {
                return (
                  <ReactMarkdown
                    components={{
                      // eslint-disable-next-line no-unused-vars
                      p: ({ node, ...props }) => (
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", lineHeight: 1.6 }} {...props} />
                      ),
                      // eslint-disable-next-line no-unused-vars
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main }} />
                      )
                    }}
                  >
                    {event.description}
                  </ReactMarkdown>
                );
              }
            })()}
          </div>
        )}

        {/* Who's Attending */}
        {attendingUsers.length > 0 && (
          <div style={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: `1px solid ${theme.palette.divider}`
          }}>
            <h3 style={{
              margin: "0 0 0.75rem 0",
              fontSize: "1rem",
              fontWeight: 600,
              color: theme.palette.text.primary
            }}>
              Who's Attending ({attendingUsers.length})
            </h3>
            <AvatarList users={attendingUsers} size={40} />
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          padding: "1rem 0 2rem",
          color: theme.palette.text.secondary,
          fontSize: "0.85rem"
        }}>
          <img src="/logo.png" alt="Level Up Cincinnati" style={{ height: "32px", marginBottom: "0.5rem", opacity: 0.6 }} />
          <div>Level Up Cincinnati</div>
          {user && (
            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: "0.75rem",
                background: "none",
                border: "none",
                color: theme.palette.primary.main,
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              Go to App
            </button>
          )}
        </div>
      </div>

      {/* Guest Count Modal */}
      {showGuestModal && (
        <GuestCountModal
          onClose={() => setShowGuestModal(false)}
          onConfirm={(count) => handleRSVP(count)}
          initialCount={currentGuestCount}
        />
      )}
    </div>
  );
}
