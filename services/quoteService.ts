
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Quote } from '../types';

const COLLECTION_NAME = 'quotes';

export const quoteService = {
    /**
     * Fetches all quotes from the registry.
     */
    getQuotes: async (): Promise<Quote[]> => {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Quote));
        } catch (error) {
            console.error("Error fetching quotes:", error);
            return [];
        }
    },

    /**
     * Adds a new inspirational quote.
     */
    addQuote: async (text: string, author: string = 'Anonymous') => {
        try {
            const newQuote = {
                text,
                author,
                createdAt: new Date().toISOString()
            };
            return await addDoc(collection(db, COLLECTION_NAME), newQuote);
        } catch (error) {
            console.error("Error adding quote:", error);
            throw error;
        }
    },

    /**
     * Deletes a quote from the registry.
     */
    deleteQuote: async (id: string) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting quote:", error);
            throw error;
        }
    }
};
