
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { User, Participant, Coach, UserRole } from '../types';

export const userService = {
  /**
   * Creates or overwrites a user document in Firestore.
   * Use this on Registration.
   */
  createUserDocument: async (uid: string, data: Partial<User | Participant | Coach>) => {
    try {
      const userRef = doc(db, 'users', uid);
      
      // Ensure basic fields are present, including new activity tracking fields
      const userData = {
        id: uid,
        createdAt: new Date().toISOString(),
        role: UserRole.PARTICIPANT, // Default
        savedSprintIds: [], 
        enrolledSprintIds: [], 
        shinePostIds: [], // Track Shine posts
        shineCommentIds: [], // Track Shine comments
        ...data
      };

      await setDoc(userRef, userData, { merge: true });
      return userData;
    } catch (error) {
      console.error("Error creating user document:", error);
      throw error;
    }
  },

  /**
   * Fetches a user document by UID.
   */
  getUserDocument: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as User | Participant | Coach;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching user document:", error);
      throw error;
    }
  },

  /**
   * Updates specific fields in a user document.
   */
  updateUserDocument: async (uid: string, data: Partial<User | Participant | Coach>) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, data);
    } catch (error) {
      console.error("Error updating user document:", error);
      throw error;
    }
  },

  /**
   * Deletes a user document.
   */
  deleteUserDocument: async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
    } catch (error) {
      console.error("Error deleting user document:", error);
      throw error;
    }
  },

  /**
   * Toggles a sprint ID in the user's savedSprintIds array.
   */
  toggleSavedSprint: async (uid: string, sprintId: string, isSaved: boolean) => {
      try {
          const userRef = doc(db, 'users', uid);
          if (isSaved) {
              // Add to array
              await updateDoc(userRef, {
                  savedSprintIds: arrayUnion(sprintId)
              });
          } else {
              // Remove from array
              await updateDoc(userRef, {
                  savedSprintIds: arrayRemove(sprintId)
              });
          }
      } catch (error) {
          console.error("Error toggling saved sprint:", error);
          throw error;
      }
  },

  /**
   * Adds a sprint ID to the user's enrolledSprintIds array.
   */
  addUserEnrollment: async (uid: string, sprintId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
              enrolledSprintIds: arrayUnion(sprintId)
          });
      } catch (error) {
          console.error("Error adding user enrollment:", error);
      }
  },

  /**
   * Adds a post ID to the user's shinePostIds array.
   */
  addUserPost: async (uid: string, postId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
              shinePostIds: arrayUnion(postId)
          });
      } catch (error) {
          console.error("Error adding user post:", error);
      }
  },

  /**
   * Adds a comment ID to the user's shineCommentIds array.
   */
  addUserComment: async (uid: string, commentId: string) => {
      try {
          const userRef = doc(db, 'users', uid);
          await updateDoc(userRef, {
              shineCommentIds: arrayUnion(commentId)
          });
      } catch (error) {
          console.error("Error adding user comment:", error);
      }
  }
};
