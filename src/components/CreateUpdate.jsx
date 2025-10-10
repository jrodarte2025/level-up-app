import React, { useState } from "react";
import { Box, TextField, Button, Select, MenuItem, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { db, storage, auth } from "../firebase";
import { collection, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import RichTextEditor from "./RichTextEditor";

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
      
      // Ensure the form is visible when editing
      setTimeout(() => {
        const formElement = document.getElementById('update-form');
        if (formElement) {
          formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Add a pulse animation to draw attention
          formElement.style.animation = 'pulse 0.5s ease-in-out 2';
          setTimeout(() => {
            formElement.style.animation = '';
          }, 1000);
        }
      }, 100);
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
      id="update-form"
      sx={{
        backgroundColor: { xs: "transparent", sm: "#fff" },
        borderRadius: { xs: 0, sm: "12px" },
        padding: { xs: "1rem", sm: "1.5rem" },
        boxShadow: { xs: "none", sm: postToEdit ? "0 0 12px rgba(251,191,36,0.3)" : "0 4px 8px rgba(0,0,0,0.05)" },
        border: postToEdit ? "2px solid #fbbf24" : "none",
        maxWidth: { xs: "100%", sm: 600 },
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        scrollMarginTop: "1rem",
        transition: "all 0.3s ease"
      }}
    >
      {/* Edit mode banner */}
      {postToEdit && (
        <Box sx={{
          backgroundColor: "#fef3c7",
          color: "#92400e",
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1
        }}>
          <span>You're editing an existing update.</span>
          <Button
            onClick={onFinish}
            sx={{
              color: "#92400e",
              textTransform: "none",
              fontWeight: 500,
              "&:hover": {
                backgroundColor: "rgba(146, 64, 14, 0.1)"
              }
            }}
          >
            Cancel Edit
          </Button>
        </Box>
      )}
      
      <Typography variant="h6" fontWeight={600} sx={{ color: postToEdit ? "#92400e" : "inherit" }}>
        {postToEdit ? "Edit Update" : "Create Update"}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: "#6b7280", fontSize: "0.875rem", mb: 1 }}
      >
        {postToEdit 
          ? "Modify your update below. Changes will be saved immediately."
          : "Share announcements, resources, or wins with selected groups."}
      </Typography>

      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
      />

      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
          Body
        </Typography>
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Write your update here. You can format text with bold, italic, lists, and more..."
        />
      </Box>

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
              sx={{ color: "#18264E", "&.Mui-checked": { color: "#18264E" } }}
            />
          }
          label="Students"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={forCoaches}
              onChange={() => setForCoaches(!forCoaches)}
              sx={{ color: "#18264E", "&.Mui-checked": { color: "#18264E" } }}
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
                color: "#18264E",
                "&.Mui-checked": { color: "#18264E" },
                "&.MuiCheckbox-indeterminate": { color: "#18264E" }
              }}
            />
          }
          label="All"
        />
      </Box>

      <Button
        variant="contained"
        sx={{
          backgroundColor: postToEdit ? "#92400e" : "#18264E",
          textTransform: "none",
          fontWeight: 500,
          fontSize: "1rem",
          borderRadius: "8px",
          "&:hover": {
            backgroundColor: postToEdit ? "#78350f" : "#17205f"
          }
        }}
        onClick={handleSubmit}
        disabled={!title.trim() || !content.trim() || submitting}
      >
        {submitting 
          ? (postToEdit ? "Updating..." : "Posting...") 
          : success 
            ? (postToEdit ? "Updated!" : "Posted!") 
            : (postToEdit ? "Save Changes" : "Post Update")}
      </Button>
    </Box>
  );
}
