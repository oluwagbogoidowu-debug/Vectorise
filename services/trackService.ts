
import { db } from './firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, onSnapshot, deleteField, increment, serverTimestamp } from 'firebase/firestore';
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
        // We could do a soft delete if needed
        await updateDoc(doc(db, TRACKS_COLLECTION, trackId), { published: false });
    }
};
