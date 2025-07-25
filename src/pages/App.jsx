import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Navigate
} from "react-router-dom";
import PostPage from "./PostPage";
import CommentThreadPage from "./CommentThreadPage";
import ProfileModal from "../components/ProfileModal";
import AppShell from "../components/AppShell";
import ToastManager from "../components/ToastManager";
import CreateUpdate from "../components/CreateUpdate";
import { getStorage, ref as storageRef, getDownloadURL, uploadBytes } from "firebase/storage";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { setDoc } from "firebase/firestore";
import Login from "./Login";
import Signup from "./Signup";
import UserDashboard from "./UserDashboard";
import AdminPanel from "./AdminPanel";
import Directory from "./Directory";
import AdminMatches from "./AdminMatches";
import EventIcon       from '@mui/icons-material/Event';
import PeopleIcon      from '@mui/icons-material/People';
import LinkIcon        from '@mui/icons-material/Link';
import HowToRegIcon    from '@mui/icons-material/HowToReg';
import MenuBookIcon    from '@mui/icons-material/MenuBook';
import ChatBubbleIcon  from '@mui/icons-material/ChatBubble';
import Resources from "./Resources";
import Updates from "./Updates";
import "../App.css";

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [selectedTab, setSelectedTab] = useState("updates");
  const [showProfile, setShowProfile] = useState(false);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem("profileImage") || "/default-avatar.png");
  const [imageChecked, setImageChecked] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  // Register for push notifications when authenticated and authLoaded is true
  useEffect(() => {
    if (!authLoaded || !user) return;
    const registerForNotifications = async () => {
      if (typeof Notification === "undefined" || Notification.permission === "denied") return;

      const { getMessaging, getToken } = await import("firebase/messaging");
      const messaging = getMessaging();

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }

      const token = await getToken(messaging, {
        vapidKey: "BGIu5yYG52Ry8kOt1wfY7KkJ-ZilDdT95o1zrGlsUdF907-URK4qvBnZ3sf2xua1JTxOAxIaNopmQw8apLSaEEQ"
      });

      if (auth.currentUser && token) {
        const { doc, setDoc } = await import("firebase/firestore");
        const tokenRef = doc(db, "notification_tokens", auth.currentUser.uid);
        await setDoc(tokenRef, { token }, { merge: true });
      }
    };
    registerForNotifications();
  }, [authLoaded, user]);

  // Allow initial selected tab to be set from navigation state
  const location = useLocation();
  useEffect(() => {
    if (location.state?.selectedTab) {
      setSelectedTab(location.state.selectedTab);
    }
  }, [location.state?.selectedTab]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [isHoveringProfile, setIsHoveringProfile] = useState(false);

  // Track pending user approvals for admins
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  // Fetch pending user approval count for admins
  useEffect(() => {
    if (!isAdmin) return;
    const fetchPendingCount = async () => {
      const q = query(collection(db, "users"), where("approved", "==", false));
      const snap = await getDocs(q);
      setPendingApprovalCount(snap.size);
    };
    fetchPendingCount();
  }, [isAdmin]);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        const userDocRef = doc(db, "users", u.uid);
        getDoc(userDocRef).then(async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({ uid: u.uid, email: u.email, ...data });
            setUserRole(data.role);
            setIsAdmin(data.isAdmin === true);
          } else {
            // Retry once after a short delay
            setTimeout(async () => {
              const retrySnap = await getDoc(userDocRef);
              if (retrySnap.exists()) {
                const data = retrySnap.data();
                setUser({ uid: u.uid, email: u.email, ...data });
                setUserRole(data.role);
                setIsAdmin(data.isAdmin === true);
              } else {
                setUser({ uid: u.uid, email: u.email });
              }
              setShowSignup(false);
              setShowAdminPanel(false);
              setAuthLoaded(true);
            }, 500);
            return;
          }
          setShowSignup(false);
          setShowAdminPanel(false);
          setAuthLoaded(true);
        });
      } else {
        setUser(null);
        setShowSignup(false);
        setShowAdminPanel(false);
        setAuthLoaded(true);
      }
    });
    return unsubscribe;
  }, [navigate]);

  // (user role and isAdmin now set in onAuthStateChanged)

  // Load profile image and profile data
  useEffect(() => {
    if (!user?.uid) return;
    const loadProfile = async () => {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.headshotUrl) {
          setProfileImage(data.headshotUrl);
          localStorage.setItem("profileImage", data.headshotUrl);
        } else if (data.profileImage) {
          setProfileImage(data.profileImage);
          localStorage.setItem("profileImage", data.profileImage);
        }
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setCompany(data.company || "");
        setJobTitle(data.title || "");
        setMajor(data.major || "");
        setGraduationYear(data.graduationYear || "");
        setLinkedinUrl(data.linkedinUrl || "");
        // do not return here; continue to storage fallback only if no Firestore image
      }
      try {
        const storage = getStorage();
        const imgRef = storageRef(storage, `users/${user.uid}/profile.jpg`);
        const url = await getDownloadURL(imgRef);
        setProfileImage(url);
        localStorage.setItem("profileImage", url);
      } catch {
        setProfileImage("/default-avatar.png");
        localStorage.setItem("profileImage", "/default-avatar.png");
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!imageChecked && profileImage !== "https://via.placeholder.com/32") {
      const testImage = new Image();
      testImage.src = profileImage;
      testImage.onload = () => setImageChecked(true);
      testImage.onerror = () => {
        console.warn("❌ Failed to load profile image:", profileImage);
        setProfileImage("https://via.placeholder.com/32");
        localStorage.setItem("profileImage", "https://via.placeholder.com/32");
        setImageChecked(true);
      };
    }
  }, [profileImage, imageChecked]);

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Preview locally
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
      localStorage.setItem("profileImage", reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    const storage = getStorage();
    const imgRef = storageRef(storage, `users/${user.uid}/profile.jpg`);
    await uploadBytes(imgRef, file);
    const url = await getDownloadURL(imgRef);
    setProfileImage(url);
    localStorage.setItem("profileImage", url);
    // Update Firestore
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { headshotUrl: url }, { merge: true });
  };

  const [showProfileReminder, setShowProfileReminder] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(() => {
    return sessionStorage.getItem("dismissProfileReminder") === "true";
  });

  useEffect(() => {
    const isStudent = userRole === "student";
    const isCoachLike = ["coach", "board", "employee"].includes(userRole);
    const missingFields = !firstName || !lastName ||
      (userRole === "student" && (!major || !graduationYear)) ||
      (isCoachLike && (!company || !jobTitle));
    setShowProfileReminder(missingFields);
  }, [firstName, lastName, major, graduationYear, company, jobTitle, userRole]);

  console.log("App.jsx state — authLoaded:", authLoaded, "user:", user);
  // Redirect authenticated users away from /login or /signup
  if (!authLoaded) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff"
      }}>
        <img src="/logo.png" alt="Level Up Cincinnati" style={{ height: "64px", marginBottom: "1rem" }} />
        <div style={{ fontSize: "0.9rem", color: "#888" }}>
          Just a sec — awesome is on its way…
        </div>
      </div>
    );
  }

  if (authLoaded && user && (location.pathname === "/login" || location.pathname === "/signup")) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/test-update" element={<CreateUpdate />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // (Admin approval logic removed)

  const userTabs = [
    { key: "updates", label: "Updates" },
    { key: "events", label: "Events" },
    { key: "directory", label: "Directory" },
    { key: "resources", label: "Resources" }
  ];
  const adminTabs = [
    { key: "updates", label: "Updates" },
    { key: "events", label: "Events" },
    { key: "directory", label: "Directory" },
    { key: "resources", label: "Resources" },
    { key: "adminMatches", label: pendingApprovalCount > 0 ? `Admin (${pendingApprovalCount})` : "Admin" }
  ];
  const tabs = showAdminPanel && isAdmin ? adminTabs : userTabs;

  const iconMap = {
    events: EventIcon,
    directory: PeopleIcon,
    adminMatches: HowToRegIcon,
    resources: MenuBookIcon,
    updates: ChatBubbleIcon
  };


  // Main app with universal header and bottom navigation (now with React Router)
  return (
    <>
      {showProfile && (
        <ProfileModal
          user={user}
          userRole={userRole}
          profileImage={profileImage}
          isHovering={isHoveringProfile}
          setIsHovering={setIsHoveringProfile}
          firstName={firstName}
          lastName={lastName}
          major={major}
          graduationYear={graduationYear}
          company={company}
          jobTitle={jobTitle}
          linkedinUrl={linkedinUrl}
          onProfileImageChange={handleProfileImageChange}
          onSave={(field, value) => {
            if (field === "submit") {
              const userRef = doc(db, "users", user.uid);
              setDoc(userRef, {
                firstName,
                lastName,
                displayName: `${firstName} ${lastName}`,
                ...(userRole === "student"
                  ? { major, graduationYear }
                  : ["coach", "board", "employee"].includes(userRole)
                    ? { company, title: jobTitle }
                    : {}),
                linkedinUrl
              }, { merge: true });
              setShowProfile(false);
              showToast("Profile updated successfully!");
            } else {
              const setters = {
                firstName: setFirstName,
                lastName: setLastName,
                major: setMajor,
                graduationYear: setGraduationYear,
                company: setCompany,
                jobTitle: setJobTitle,
                linkedinUrl: setLinkedinUrl
              };
              if (setters[field]) setters[field](value);
            }
          }}
          onSignOut={() => {
            signOut(auth).then(() => window.location.reload());
          }}
          onSwitchAdminView={(toAdmin) => {
            setShowProfile(false);
            setShowAdminPanel(toAdmin);
            setSelectedTab(toAdmin ? "events" : "events");
          }}
          onClose={() => setShowProfile(false)}
          isAdminPanel={showAdminPanel}
          isAdmin={isAdmin}
        />
      )}

      {showProfileReminder && !reminderDismissed && (
        <div style={{
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "1rem",
          textAlign: "center",
          fontSize: "0.95rem",
          borderBottom: "1px solid #ffeeba"
        }}>
          Your profile is missing some information.{" "}
          <button className="button-link" onClick={() => setShowProfile(true)}>
            Complete your profile
          </button>{" "}
          <button className="button-link" onClick={() => {
            setReminderDismissed(true);
            sessionStorage.setItem("dismissProfileReminder", "true");
          }}>
            Dismiss
          </button>
        </div>
      )}

      <ToastManager message={toastMessage} />

      <Routes>
        <Route
          path="/"
          element={
            <AppShell
              title={
                !showAdminPanel
                  ? (selectedTab === "events" ? "Upcoming Events"
                    : selectedTab === "directory" ? "Directory"
                    : selectedTab === "resources" ? "Resources"
                    : selectedTab === "updates" ? "Updates"
                    : "")
                  : (selectedTab === "events" ? "Upcoming Events"
                    : selectedTab === "directory" ? "Directory"
                    : selectedTab === "adminMatches" ? (pendingApprovalCount > 0 ? `Admin (${pendingApprovalCount})` : "Admin")
                    : selectedTab === "resources" ? "Resources"
                    : selectedTab === "updates" ? "Updates"
                    : "")
              }
              profileImage={profileImage}
              onProfileClick={() => setShowProfile(true)}
              selectedTab={selectedTab}
              onTabChange={(tabKey) => {
                if (tabKey === "exit") {
                  setShowAdminPanel(false);
                  setSelectedTab("events");
                  navigate("/", { state: { selectedTab: "events" } });
                } else {
                  setSelectedTab(tabKey);
                  navigate("/", { state: { selectedTab: tabKey } });
                  if (["events", "users", "matches"].includes(tabKey)) {
                    setShowAdminPanel(tabKey !== "events" ? true : showAdminPanel);
                  }
                }
              }}
              tabs={tabs}
            >
              {showAdminPanel && isAdmin ? (
                <>
                  {selectedTab === "events" && <AdminPanel tab="events" />}
                  {selectedTab === "directory" && (
                    <Directory roleFilter="all" isAdmin={showAdminPanel && isAdmin} showAdminPanel={true} />
                  )}
                  {selectedTab === "adminMatches" && <AdminMatches />}
                  {selectedTab === "resources" && <AdminPanel tab="resources" />}
                  {selectedTab === "updates" && <AdminPanel tab="posts" />}
                </>
              ) : (
                <>
                  {selectedTab === "events" && <UserDashboard setShowAdminPanel={setShowAdminPanel} />}
                  {selectedTab === "directory" && (
                    <Directory roleFilter="all" showAdminPanel={false} />
                  )}
                  {selectedTab === "resources" && <Resources />}
                  {selectedTab === "updates" && <Updates />}
                </>
              )}
            </AppShell>
          }
        />
        <Route
          path="/post/:postId"
          element={
            <AppShell
              title="Post"
              showBack
              onBack={() => navigate("/", { state: { selectedTab: "updates" } })}
              profileImage={profileImage}
              onProfileClick={() => setShowProfile(true)}
              selectedTab="updates"
              onTabChange={(tabKey) => {
                setSelectedTab(tabKey);
                navigate("/", { state: { selectedTab: tabKey } });
              }}
              tabs={tabs}
            >
              <PostPage />
            </AppShell>
          }
        />
        <Route
          path="/post/:postId/comment/:commentId"
          element={
            <AppShell
              title="Thread"
              showBack
              onBack={() => navigate("/", { state: { selectedTab: "updates" } })}
              profileImage={profileImage}
              onProfileClick={() => setShowProfile(true)}
              selectedTab="updates"
              onTabChange={(tabKey) => {
                setSelectedTab(tabKey);
                navigate("/", { state: { selectedTab: tabKey } });
              }}
              tabs={tabs}
            >
              <CommentThreadPage />
            </AppShell>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/test-update" element={<CreateUpdate />} />
      </Routes>
    </>
  );
}