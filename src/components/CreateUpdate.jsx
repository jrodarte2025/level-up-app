import React, { useState } from "react";
import { Box, TextField, Button, Select, MenuItem, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { db, storage, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

export default function CreateUpdate({ postToEdit = null, onFinish = () => {} }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("announcement");
  const [link, setLink] = useState("");
  const [forStudents, setForStudents] = useState(true);
  const [forCoaches, setForCoaches] = useState(true);
  const [forBoard, setForBoard] = useState(false);
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (postToEdit) {
      setTitle(postToEdit.title || "");
      setContent(postToEdit.body || "");
      setPostType(postToEdit.type || "announcement");
      setLink(postToEdit.link || "");
      setImage(null); // Reset upload
      setForStudents(postToEdit.visibleTo?.includes("student") || false);
      setForCoaches(postToEdit.visibleTo?.includes("coach") || false);
      setForBoard(postToEdit.visibleTo?.includes("board") || false);
    }
  }, [postToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    const postRef = postToEdit ? doc(db, "posts", postToEdit.id) : doc(collection(db, "posts"));
    let imageUrl = "";

    try {
      if (image) {
        const imageRef = storageRef(storage, `posts/${postRef.id}/image.jpg`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const visibility = [];
      if (forStudents) visibility.push("student");
      if (forCoaches) visibility.push("coach");
      if (forBoard) visibility.push("board");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      await setDoc(postRef, {
        title,
        body: content,
        type: postType,
        link: link || "",
        imageUrl,
        visibleTo: visibility,
        uid: user.uid,
        displayName: userData.displayName || user.displayName || "Unknown User",
        headshotUrl: userData.headshotUrl || "",
        timestamp: serverTimestamp()
      });

      setSuccess(true);
      setTitle("");
      setContent("");
      setLink("");
      setImage(null);
      setForStudents(true);
      setForCoaches(true);
      setForBoard(false);
      setTimeout(() => setSuccess(false), 3000);
      onFinish();
    } catch (error) {
      console.error("❌ Error posting update:", error);
    }

    setSubmitting(false);
  };

  return (
    <Box
      sx={{
        backgroundColor: { xs: "transparent", sm: "#fff" },
        borderRadius: { xs: 0, sm: "12px" },
        padding: { xs: "1rem", sm: "1.5rem" },
        boxShadow: { xs: "none", sm: "0 4px 8px rgba(0,0,0,0.05)" },
        maxWidth: { xs: "100%", sm: 600 },
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2
      }}
    >
      <Typography variant="h6" fontWeight={600}>
        Create Update
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "#6b7280", fontSize: "0.875rem", mb: 1 }}
      >
        Share announcements, resources, or wins with selected groups.
      </Typography>

      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
      />

      <TextField
        label="Body"
        multiline
        minRows={4}
        maxRows={10}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        fullWidth
        inputProps={{
          style: {
            WebkitUserSelect: "text",
            userSelect: "text"
          }
        }}
      />

      <Select
        value={postType}
        onChange={(e) => setPostType(e.target.value)}
        displayEmpty
        fullWidth
        sx={{
          fontSize: "1rem",
          borderRadius: "6px"
        }}
      >
        <MenuItem value="announcement">Announcement</MenuItem>
        <MenuItem value="event">Event</MenuItem>
        <MenuItem value="resource">Resource</MenuItem>
        <MenuItem value="celebration">Celebration</MenuItem>
        <MenuItem value="update">Program Update</MenuItem>
      </Select>

      <TextField
        label="Link (optional)"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        fullWidth
      />

      <Button
        component="label"
        variant="outlined"
        sx={{ textTransform: "none" }}
      >
        {image ? "Change Image" : "Upload Image"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setImage(e.target.files[0])}
        />
      </Button>

      {image && (
        <Box sx={{ mt: 1, position: "relative" }}>
          <img
            src={URL.createObjectURL(image)}
            alt="Preview"
            style={{ maxWidth: "100%", borderRadius: "8px" }}
          />
          <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
            {image.name}
          </Typography>
          <Button
            size="small"
            variant="text"
            color="error"
            onClick={() => setImage(null)}
            sx={{ mt: 1 }}
          >
            Remove Image
          </Button>
        </Box>
      )}

      <Typography
        variant="body1"
        sx={{ mt: 3, mb: 0.5, fontWeight: 600, fontSize: "1rem", color: "#374151" }}
      >
        Select Audience
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          backgroundColor: "#f9fafb",
          padding: "0.75rem",
          borderRadius: "6px"
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={forStudents}
              onChange={() => setForStudents(!forStudents)}
              sx={{ color: "#1e2a78", "&.Mui-checked": { color: "#1e2a78" } }}
            />
          }
          label="Students"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={forCoaches}
              onChange={() => setForCoaches(!forCoaches)}
              sx={{ color: "#1e2a78", "&.Mui-checked": { color: "#1e2a78" } }}
            />
          }
          label="Coaches"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={forStudents && forCoaches}
              indeterminate={forStudents !== forCoaches}
              onChange={(e) => {
                const checked = e.target.checked;
                setForStudents(checked);
                setForCoaches(checked);
              }}
              sx={{
                color: "#1e2a78",
                "&.Mui-checked": { color: "#1e2a78" },
                "&.MuiCheckbox-indeterminate": { color: "#1e2a78" }
              }}
            />
          }
          label="All"
        />
      </Box>

      <Button
        variant="contained"
        sx={{
          backgroundColor: "#1e2a78",
          textTransform: "none",
          fontWeight: 500,
          fontSize: "1rem",
          borderRadius: "8px",
          "&:hover": {
            backgroundColor: "#17205f"
          }
        }}
        onClick={handleSubmit}
        disabled={!title.trim() || !content.trim() || submitting}
      >
        {submitting ? "Posting..." : success ? "Posted!" : "Post Update"}
      </Button>
    </Box>
  );
}
