import EventCard from "../components/EventCard";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useTheme } from "@mui/material/styles";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const user = auth.currentUser;
  const theme = useTheme();

  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsubEvents = onSnapshot(q, (snapshot) => {
      const eventData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventData);
    });

    if (user) {
      const rsvpRef = collection(db, "rsvps");
      const unsubRsvps = onSnapshot(rsvpRef, (snapshot) => {
        const data = {};
        snapshot.docs.forEach((doc) => {
          const rsvp = doc.data();
          if (rsvp.userId === user.uid) {
            data[rsvp.eventId] = true;
          }
        });
        setRsvps(data);
      });

      return () => {
        unsubEvents();
        unsubRsvps();
      };
    } else {
      return () => unsubEvents();
    }
  }, [user]);

  const toggleRSVP = async (eventId, forceCancel = false) => {
    const rsvpRef = doc(db, "rsvps", `${user.uid}_${eventId}`);
    const shouldCancel = forceCancel || rsvps[eventId];

    if (shouldCancel) {
      await deleteDoc(rsvpRef);
    } else {
      await setDoc(rsvpRef, {
        userId: user.uid,
        eventId,
        attending: true,
      });
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary
      }}
    >
      <h2
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "1rem"
        }}
      >
        Upcoming Events
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isRSVPed={!!rsvps[event.id]}
            onRSVP={toggleRSVP}
          />
        ))}
      </div>
    </div>
  );
}