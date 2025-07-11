import React, { useEffect, useState, useRef } from "react";
import {
  collection, query, where, orderBy, onSnapshot, addDoc,
  serverTimestamp, getDocs, deleteDoc, doc, getDoc, setDoc
} from "firebase/firestore";
import { db, auth } from "../firebase";
import PostCard from "../components/PostCard";
import CardWrapper from "../components/CardWrapper";
import { Container, Typography, Box } from "@mui/material";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Updates() {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [newComment, setNewComment] = useState({});
  const [reactionsByPost, setReactionsByPost] = useState({});
  const user = auth.currentUser;
  const [userRole, setUserRole] = useState(null);

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

        // Comments listener
        const commentsUnsub = onSnapshot(collection(db, "posts", postId, "comments"), (snap) => {
          setCommentsByPost(prev => ({
            ...prev,
            [postId]: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          }));
        });
        postListenersRef.current[`${postId}-comments`] = commentsUnsub;

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
          sx={{ mt: 0.5, fontSize: "0.9rem" }}
        >
          Stay connected with updates, wins, and announcements.
        </Typography>
      </Box> 
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={{
            ...post,
            roles: Array.isArray(post.roles) ? post.roles : [],
            reactionCount: Object.values(reactionsByPost[post.id] || {}).reduce((a, b) => a + b, 0),
            isLiked: isLikedByUser(post.id),
            commentCount: commentsByPost[post.id]?.length || 0,
          }}
          onCommentClick={handleCommentClick}
          onLikeClick={handleLikeClick}
        />
      ))}
    </Container>
  );
}