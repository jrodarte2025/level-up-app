import React, { useEffect, useState, useRef } from "react";
import {
  collection, query, where, orderBy, onSnapshot, addDoc,
  serverTimestamp, getDocs, deleteDoc, doc, getDoc, setDoc, limit
} from "firebase/firestore";
import { db, auth } from "../firebase";
import PostCard from "../components/PostCard";
import CardWrapper from "../components/CardWrapper";
import UpdateRequestModal from "../components/UpdateRequestModal";
import { Container, Typography, Box, Button, Fab } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Updates() {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentCountsByPost, setCommentCountsByPost] = useState({});
  const [newComment, setNewComment] = useState({});
  const [reactionsByPost, setReactionsByPost] = useState({});
  const user = auth.currentUser;
  const [userRole, setUserRole] = useState(null);
  const [showUpdateRequestModal, setShowUpdateRequestModal] = useState(false);

  // Load user role (optimized)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
    })();
  }, [user]);

  // Track nested listeners for posts' comments and reactions
  const postListenersRef = useRef({});

  // Load posts, reactions, comments with proper cleanup for nested listeners
  useEffect(() => {
    if (!userRole) return;
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchData = async () => {
        const data = await Promise.all(snapshot.docs.map(async d => {
          const postData = d.data();
          const visibleTo = Array.isArray(postData.visibleTo) ? postData.visibleTo : null;
          if (userRole !== "admin" && visibleTo && !visibleTo.includes(userRole)) return null;

          return {
            id: d.id,
            ...postData,
          };
        }));
        setPosts(data.filter(Boolean));
      };
      fetchData();

      // Clean up any existing nested listeners before setting new ones
      Object.values(postListenersRef.current).forEach(unsubFn => unsubFn && unsubFn());
      postListenersRef.current = {};

      snapshot.docs.forEach((docSnap) => {
        const postId = docSnap.id;

        // Recent comments listener - get 3 most recent comments
        const recentCommentsQuery = query(
          collection(db, "posts", postId, "comments"), 
          orderBy("timestamp", "desc"),
          limit(3)
        );
        const commentsUnsub = onSnapshot(recentCommentsQuery, (snap) => {
          const comments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCommentsByPost(prev => ({
            ...prev,
            [postId]: comments
          }));
        });
        postListenersRef.current[`${postId}-comments`] = commentsUnsub;

        // Total comment count listener
        const allCommentsUnsub = onSnapshot(collection(db, "posts", postId, "comments"), (snap) => {
          setCommentCountsByPost(prev => ({
            ...prev,
            [postId]: snap.size
          }));
        });
        postListenersRef.current[`${postId}-comment-count`] = allCommentsUnsub;

        // Reactions listener
        const reactionsUnsub = onSnapshot(collection(db, "posts", postId, "reactions"), (snap) => {
          const counts = {};
          snap.docs.forEach(r => {
            const d = r.data();
            if (d.emoji) counts[d.emoji] = (counts[d.emoji] || 0) + 1;
          });
          setReactionsByPost(prev => ({ ...prev, [postId]: counts }));
        });
        postListenersRef.current[`${postId}-reactions`] = reactionsUnsub;
      });
    });
    return () => {
      unsub();
      Object.values(postListenersRef.current).forEach(unsubFn => unsubFn && unsubFn());
    };
  }, [userRole]);

  const handleCommentClick = (postId) => {
    window.location.href = `/post/${postId}`;
  };

  const handleLikeClick = async (postId) => {
    const userId = user?.uid || user?.email;
    const reactionRef = doc(db, "posts", postId, "reactions", userId);
    const existing = await getDoc(reactionRef);

    if (existing.exists()) {
      await deleteDoc(reactionRef); // Remove like
    } else {
      await setDoc(reactionRef, {
        emoji: "❤️",
        userId,
        timestamp: serverTimestamp()
      });
    }
  };

  const isLikedByUser = (postId) => {
    const userId = user?.uid || user?.email;
    const userReactions = reactionsByPost[postId] || {};
    return !!userReactions["❤️"];
  };

  // Enhanced emoji reaction handler for posts
  const handlePostEmojiReaction = async (postId, emojiKey, emoji) => {
    const userId = user?.uid || user?.email;
    const reactionRef = doc(db, "posts", postId, "reactions", userId);
    const existing = await getDoc(reactionRef);

    if (existing.exists() && existing.data().emoji === emoji) {
      // Remove reaction if same emoji
      await deleteDoc(reactionRef);
    } else {
      // Add or update reaction
      await setDoc(reactionRef, {
        emoji: emoji,
        emojiKey: emojiKey,
        userId,
        timestamp: serverTimestamp()
      });
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: 2,
        backgroundColor: (theme) => theme.palette.background.default,
        minHeight: '100vh',
      }}
    >
      <Box sx={{ textAlign: "center", mb: 2, px: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, fontSize: "0.9rem", mb: 2 }}
        >
          Stay connected with updates, wins, and announcements.
        </Typography>
        
        {/* Request Update Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowUpdateRequestModal(true)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1
          }}
        >
          Share Update
        </Button>
      </Box> 
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={{
            ...post,
            roles: Array.isArray(post.roles) ? post.roles : [],
            reactionCount: Object.values(reactionsByPost[post.id] || {}).reduce((a, b) => a + b, 0),
            reactions: reactionsByPost[post.id] || {},
            isLiked: isLikedByUser(post.id),
            commentCount: commentCountsByPost[post.id] || 0,
            recentComments: commentsByPost[post.id]?.slice(0, 3) || [],
          }}
          onCommentClick={handleCommentClick}
          onLikeClick={handleLikeClick}
          onEmojiReaction={handlePostEmojiReaction}
        />
      ))}
      
      {/* Update Request Modal */}
      <UpdateRequestModal
        open={showUpdateRequestModal}
        onClose={() => setShowUpdateRequestModal(false)}
      />
    </Container>
  );
}