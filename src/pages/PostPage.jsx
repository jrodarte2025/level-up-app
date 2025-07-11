import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "@mui/material/styles";
import { Box, Typography, Divider } from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { MessageCircle, Heart, Pencil, Trash } from "lucide-react";
import Comment from "../components/Comment";
import HeaderBar from "../components/HeaderBar";

const PostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromTab = location.state?.fromTab || "updates";
  const auth = getAuth();
  const user = {
    ...auth.currentUser,
    displayName: auth.currentUser?.firstName && auth.currentUser?.lastName
      ? `${auth.currentUser.firstName} ${auth.currentUser.lastName}`
      : auth.currentUser?.displayName || auth.currentUser?.email
  };
  const [fullUser, setFullUser] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  // Reaction bar state
  const [likes, setLikes] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef(null);

  const theme = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setFullUser({ id: userSnap.id, ...userSnap.data() });
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const userHasLiked = (commentId) => {
    return Object.keys(likes).includes(commentId) && likes[commentId + "_liked"];
  };

  // Tally likes and replies after comments load
  useEffect(() => {
    const likeTally = {};
    const repliesTally = {};

    comments.forEach((c) => {
      likeTally[c.id] = c.likes?.length || 0;
      likeTally[c.id + "_liked"] = !!c.reactions?.[user?.uid || user?.email];
      if (c.parentCommentId) {
        repliesTally[c.parentCommentId] = (repliesTally[c.parentCommentId] || 0) + 1;
      }
    });

    setLikes(likeTally);
    setCommentCounts(repliesTally);
  }, [comments]);

  // Firestore-enabled like handler
  const handleLike = async (commentId) => {
    const userId = user?.uid || user?.email;
    const reactionRef = doc(db, "posts", postId, "comments", commentId, "reactions", userId);
    const existing = await getDoc(reactionRef);

    if (existing.exists()) {
      await deleteDoc(reactionRef);
      setLikes((prev) => ({
        ...prev,
        [commentId]: Math.max((prev[commentId] || 1) - 1, 0),
        [commentId + "_liked"]: false,
      }));
    } else {
      await setDoc(reactionRef, {
        emoji: "❤️",
        userId,
        timestamp: serverTimestamp()
      });
      setLikes((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || 0) + 1,
        [commentId + "_liked"]: true,
      }));
    }
  };

  useEffect(() => {
    const fetchPost = async () => {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (snap.exists()) {
        setPost({ id: snap.id, ...snap.data() });
      }
    };

    fetchPost();

    const commentsRef = collection(db, "posts", postId, "comments");
    const q = query(commentsRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map((doc) => {
        const c = { id: doc.id, ...doc.data() };
        if (c.userId === fullUser?.id) {
          return {
            ...c,
            headshotUrl: fullUser?.headshotUrl || "",
            displayName: fullUser?.displayName ||
              (fullUser?.firstName && fullUser?.lastName
                ? `${fullUser.firstName} ${fullUser.lastName}`
                : c.displayName || c.userId)
          };
        }
        return c;
      });
      setComments(loaded);
    });

    return () => unsubscribe();
  }, [postId, fullUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);

    const commentRef = collection(db, "posts", postId, "comments");
    const commentData = {
      userId: user?.uid || user?.email,
      displayName: fullUser?.displayName ||
        (fullUser?.firstName && fullUser?.lastName
          ? `${fullUser.firstName} ${fullUser.lastName}`
          : user?.displayName || user?.email),
      text: newComment,
      timestamp: serverTimestamp(),
      parentCommentId: replyTo || null,
      headshotUrl: fullUser?.headshotUrl || "",
    };

    await addDoc(commentRef, commentData);
    setNewComment("");
    setReplyTo(null);
    setIsSubmitting(false);
  };

  const groupedComments = comments.reduce((acc, comment) => {
    const parent = comment.parentCommentId || "root";
    acc[parent] = [...(acc[parent] || []), comment];
    return acc;
  }, {});

  const renderComments = (parentId = "root", depth = 0) => {
    // Ensure comments are rendered directly, not wrapped in a Box or styled container
    return (groupedComments[parentId] || []).map((c) =>
      <Box key={c.id} sx={{ mb: 3 }}>
        <Comment
          comment={{ ...c, postId }}
          avatarUrl={c.headshotUrl || ""}
          onReply={() => setReplyTo(c.id)}
          onLike={() => handleLike(c.id)}
          onDelete={async () => {
            await deleteDoc(doc(db, "posts", postId, "comments", c.id));
          }}
          onEdit={() => {
            setEditingCommentId(c.id);
            setEditedCommentText(c.text);
            inputRef.current?.focus();
          }}
          onCancelEdit={() => {
            setEditingCommentId(null);
            setEditedCommentText("");
          }}
          isEditing={editingCommentId === c.id}
          editedText={editedCommentText}
          setEditedText={setEditedCommentText}
          onSubmitEdit={async () => {
            if (editedCommentText.trim()) {
              const ref = doc(db, "posts", postId, "comments", c.id);
              await setDoc(ref, { text: editedCommentText }, { merge: true });
              setEditingCommentId(null);
              setEditedCommentText("");
            }
          }}
          replyCount={commentCounts[c.id] || 0}
          userId={user?.uid || user?.email}
          depth={0}
        />
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: 2,
        maxWidth: 600,
        mx: "auto",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      {/* Back button for returning to Updates */}
      <button
        onClick={() => navigate("/", { state: { selectedTab: "updates" } })}
        style={{
          background: "none",
          border: "none",
          color: "#1e2d5f",
          fontWeight: 500,
          fontSize: "0.875rem",
          textDecoration: "underline",
          marginBottom: "1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}
      >
        ← Return to Updates
      </button>
      {post ? (
        <Box
          sx={{
            backgroundColor: theme.palette.background.paper,
            p: "1rem",
            borderRadius: "12px",
            boxShadow: theme.palette.mode === "dark"
              ? "0 1px 3px rgba(0, 0, 0, 0.7)"
              : "0 1px 3px rgba(0, 0, 0, 0.1)",
            mb: "1.5rem",
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: "0.5rem", color: theme.palette.text.primary }}>
            {post.title}
          </Typography>
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <Typography
                  variant="body1"
                  gutterBottom
                  sx={{ color: theme.palette.text.primary, lineHeight: 1.6 }}
                  {...props}
                />
              ),
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#1e40af",
                    textDecoration: "underline"
                  }}
                />
              )
            }}
          >
            {post.body}
          </ReactMarkdown>
          {post.link && (
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#3b82f6",
                textDecoration: "underline",
                fontSize: "0.875rem"
              }}
            >
              {post.link}
            </a>
          )}
          <Typography
            variant="caption"
            sx={{ display: "block", mt: "1rem", color: theme.palette.text.secondary }}
          >
            Posted by {post.displayName || "Unknown"} · {new Date(post.timestamp?.toDate?.()).toLocaleDateString()}
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ color: theme.palette.text.primary }}>Loading post...</Typography>
      )}

      <Divider sx={{ my: 3, borderColor: theme.palette.divider }} />

      <Box sx={{ mb: "1rem" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: "0.5rem", color: theme.palette.text.primary }}>
          {comments.filter((c) => !c.parentCommentId).length} Comments
        </Typography>
        {/* Render comments directly, no extra wrapper adding background, padding, or border */}
        {renderComments()}
      </Box>

      {!editingCommentId && (
      <form onSubmit={handleSubmit} style={{ marginTop: "2rem" }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={replyTo ? "Replying..." : "Write a comment..."}
          value={editingCommentId ? editedCommentText : newComment}
          onChange={(e) => {
            editingCommentId
              ? setEditedCommentText(e.target.value)
              : setNewComment(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            borderRadius: "9999px",
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            outline: "none",
            color: theme.palette.text.primary
          }}
          disabled={isSubmitting}
        />
        {replyTo && (
          <div style={{ fontSize: "0.875rem", marginTop: "1.25rem", color: theme.palette.text.primary }}>
            Replying to{" "}
            <strong>
              {comments.find((c) => c.id === replyTo)?.displayName || "a comment"}
            </strong>.{" "}
            <button
              onClick={() => setReplyTo(null)}
              style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            (editingCommentId
              ? !editedCommentText.trim()
              : !newComment.trim())
          }
          style={{
            marginTop: "0.75rem",
            padding: "0.5rem 1.25rem",
            backgroundColor: isSubmitting ? "#9CA3AF" : "#1e2d5f",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: isSubmitting ? "default" : "pointer"
          }}
        >
          {isSubmitting
            ? editingCommentId ? "Updating..." : "Posting..."
            : editingCommentId ? "Update" : "Comment"}
        </button>
      </form>
      )}
    </Box>
  );
};

export default PostPage;