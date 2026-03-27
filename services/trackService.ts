
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, onSnapshot, deleteField, increment, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Track } from '../types';
import { sanitizeData } from './userService';

const TRACKS_COLLECTION = 'tracks';

export const trackService = {
    createTrack: async (track: Track) => {
        const now = new Date().toISOString();
        const newTrack = sanitizeData({ ...track, createdAt: now, updatedAt: now });
        await setDoc(doc(db, TRACKS_COLLECTION, track.id), newTrack);
        return newTrack;
    },

    getTrackById: async (trackId: string) => {
        const snap = await getDoc(doc(db, TRACKS_COLLECTION, trackId));
        return snap.exists() ? sanitizeData(snap.data()) as Track : null;
    },

    subscribeToTrack: (trackId: string, callback: (track: Track | null) => void) => {
        return onSnapshot(doc(db, TRACKS_COLLECTION, trackId), (doc) => {
            callback(doc.exists() ? sanitizeData(doc.data()) as Track : null);
        });
    },

    getAllTracks: async () => {
        const q = query(collection(db, TRACKS_COLLECTION));
        const snap = await getDocs(q);
        return snap.docs.map(doc => sanitizeData(doc.data()) as Track);
    },

    subscribeToTracks: (callback: (tracks: Track[]) => void) => {
        const q = query(collection(db, TRACKS_COLLECTION));
        return onSnapshot(q, (snapshot) => {
            callback(snapshot.docs.map(doc => sanitizeData(doc.data()) as Track));
        });
    },

    updateTrack: async (trackId: string, data: Partial<Track>) => {
        const trackRef = doc(db, TRACKS_COLLECTION, trackId);
        await updateDoc(trackRef, sanitizeData({ ...data, updatedAt: new Date().toISOString() }));
    },

    deleteTrack: async (trackId: string) => {
        // 1. Delete the track document
        await deleteDoc(doc(db, TRACKS_COLLECTION, trackId));

        // 2. Remove from Orchestration
        try {
            const orchRef = doc(db, 'orchestration', 'current_mapping');
            const orchSnap = await getDoc(orchRef);
            if (orchSnap.exists()) {
                const data = orchSnap.data();
                const assignments = data.assignments as Record<string, any> || {};
                let changed = false;

                for (const slotId in assignments) {
                    const assignment = assignments[slotId];
                    
                    // Check primary sprintId (which can be a track ID)
                    if (assignment.sprintId === trackId) {
                        assignment.sprintId = '';
                        changed = true;
                    }

                    // Check sprintIds array (which can contain track IDs)
                    if (assignment.sprintIds && assignment.sprintIds.includes(trackId)) {
                        assignment.sprintIds = assignment.sprintIds.filter((id: string) => id !== trackId);
                        changed = true;
                    }

                    // Check focus map
                    if (assignment.sprintFocusMap && assignment.sprintFocusMap[trackId]) {
                        delete assignment.sprintFocusMap[trackId];
                        changed = true;
                    }
                }

                if (changed) {
                    await updateDoc(orchRef, { 
                        assignments,
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error("[TrackService] Failed to cleanup orchestration after track deletion:", err);
        }
    }
};
