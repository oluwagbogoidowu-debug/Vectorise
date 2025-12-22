
import { db } from './firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, arrayUnion, increment, onSnapshot } from 'firebase/firestore';
import { ShinePost, ShineComment } from '../types';
import { MOCK_SHINE_POSTS } from './mockData';
import { userService } from './userService';

// Updated collection name as requested
const COLLECTION_NAME = 'ShinePost';

export const shineService = {
    /**
     * Creates a new post in the 'ShinePost' collection.
     */
    createPost: async (post: Omit<ShinePost, 'id'>) => {
        try {
            const postsRef = collection(db, COLLECTION_NAME);
            const docRef = await addDoc(postsRef, post);
            
            // Update user document
            await userService.addUserPost(post.userId, docRef.id);

            return { id: docRef.id, ...post } as ShinePost;
        } catch (error: any) {
            console.warn("Error creating post in DB (falling back to local):", error.message);
            // Fallback: Return a mock object so UI works optimistically
            return { id: `local_${Date.now()}`, ...post } as ShinePost;
        }
    },

    /**
     * Fetches all posts once.
     */
    getPosts: async () => {
        try {
            const postsRef = collection(db, COLLECTION_NAME);
            const q = query(postsRef); 
            const querySnapshot = await getDocs(q);
            
            const dbPosts: ShinePost[] = [];
            querySnapshot.forEach((doc) => {
                dbPosts.push({ id: doc.id, ...doc.data() } as ShinePost);
            });

            return [...dbPosts, ...MOCK_SHINE_POSTS].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        } catch (error: any) {
            console.warn("Error fetching posts (falling back to mock):", error.message);
            return MOCK_SHINE_POSTS;
        }
    },

    /**
     * Subscribes to real-time updates from the 'ShinePost' collection.
     */
    subscribeToPosts: (callback: (posts: ShinePost[]) => void) => {
        const postsRef = collection(db, COLLECTION_NAME);
        const q = query(postsRef);

        return onSnapshot(q, (snapshot) => {
            const dbPosts: ShinePost[] = [];
            snapshot.forEach((doc) => {
                dbPosts.push({ id: doc.id, ...doc.data() } as ShinePost);
            });
            
            // Merge with Mock Data and Sort
            const mergedPosts = [...dbPosts, ...MOCK_SHINE_POSTS].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            
            callback(mergedPosts);
        }, (error) => {
            console.warn("Real-time sync error (using mock data):", error.message);
            callback(MOCK_SHINE_POSTS);
        });
    },

    /**
     * Adds a comment to a post in Firestore.
     */
    addComment: async (postId: string, comment: ShineComment) => {
        try {
            // Only attempt to update if it looks like a Firestore ID (not one of our mock IDs)
            const isMockPost = postId.startsWith('post') || postId.startsWith('local_');
            
            if (isMockPost) {
                return;
            }

            const postRef = doc(db, COLLECTION_NAME, postId);
            await updateDoc(postRef, {
                commentData: arrayUnion(comment),
                comments: increment(1)
            });

            // Update user document with comment reference
            await userService.addUserComment(comment.userId, comment.id);

        } catch (error: any) {
            console.warn("Could not persist comment:", error.message);
        }
    }
};
