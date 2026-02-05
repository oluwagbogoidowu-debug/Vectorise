
import { db } from './firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, arrayUnion, increment, onSnapshot } from 'firebase/firestore';
import { ShinePost, ShineComment } from '../types';
import { MOCK_SHINE_POSTS } from './mockData';
import { userService, sanitizeData } from './userService';

const COLLECTION_NAME = 'ShinePost';

export const shineService = {
    createPost: async (post: Omit<ShinePost, 'id'>) => {
        try {
            const sanitized = sanitizeData(post);
            const postsRef = collection(db, COLLECTION_NAME);
            const docRef = await addDoc(postsRef, sanitized);
            await userService.addUserPost(post.userId, docRef.id);
            return { id: docRef.id, ...sanitized } as ShinePost;
        } catch (error: any) {
            console.warn("Error creating post in DB:", error.message);
            return { id: `local_${Date.now()}`, ...post } as ShinePost;
        }
    },

    getPosts: async () => {
        try {
            const postsRef = collection(db, COLLECTION_NAME);
            const q = query(postsRef); 
            const querySnapshot = await getDocs(q);
            const dbPosts: ShinePost[] = [];
            querySnapshot.forEach((doc) => {
                dbPosts.push(sanitizeData({ id: doc.id, ...doc.data() }) as ShinePost);
            });
            return [...dbPosts, ...MOCK_SHINE_POSTS].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
        } catch (error: any) {
            return MOCK_SHINE_POSTS;
        }
    },

    subscribeToPosts: (callback: (posts: ShinePost[]) => void) => {
        const postsRef = collection(db, COLLECTION_NAME);
        const q = query(postsRef);
        return onSnapshot(q, (snapshot) => {
            const dbPosts: ShinePost[] = [];
            snapshot.forEach((doc) => {
                dbPosts.push(sanitizeData({ id: doc.id, ...doc.data() }) as ShinePost);
            });
            const mergedPosts = [...dbPosts, ...MOCK_SHINE_POSTS].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            callback(mergedPosts);
        }, (error) => {
            callback(MOCK_SHINE_POSTS);
        });
    },

    addComment: async (postId: string, comment: ShineComment) => {
        try {
            const isMockPost = postId.startsWith('post') || postId.startsWith('local_');
            if (isMockPost) return;

            const sanitizedComment = sanitizeData(comment);
            const postRef = doc(db, COLLECTION_NAME, postId);
            await updateDoc(postRef, {
                commentData: arrayUnion(sanitizedComment),
                comments: increment(1)
            });
            await userService.addUserComment(comment.userId, comment.id);
        } catch (error: any) {
            console.warn("Could not persist comment:", error.message);
        }
    }
};
