// This file is not visible in the project files
// Please provide the contents of src/pages/Directory.jsx 
// so I can fix the role chip display to show "Coach + Board"
// instead of "Coach-board"

// The fix will be similar to what we did in ProfileModal.jsx and PostCard.jsx:
// Replace any logic that displays user.role directly with:
// user?.role === "coach-board" ? "Coach + Board" : (user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1))