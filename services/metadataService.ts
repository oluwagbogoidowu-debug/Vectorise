import { db } from './firebase';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot 
} from 'firebase/firestore';
import { SystemMetadataField } from '../types';
import { setDynamicMetadataFields, DEFAULT_METADATA_FIELDS } from '../src/utils/stepPlaceholderUtils';

const METADATA_FIELDS_COLLECTION = 'system_metadata_fields';
const LOCAL_STORAGE_KEY = 'vectorise_system_metadata_fields';

// Helper to sanitize data for Firestore
const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitizeData);
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
        const val = data[key];
        if (val !== undefined) {
            cleaned[key] = sanitizeData(val);
        }
    });
    return cleaned;
};

export const BUILTIN_DEFAULT_METADATA: SystemMetadataField[] = [
    {
        id: 'sys_lifeStage',
        key: 'lifeStage',
        label: 'Life Stage',
        category: 'Identity',
        aliases: ['lifestage', 'life stage', 'stage'],
        placeholderSample: 'College Graduate',
        description: "Participant's current life or career phase (e.g. Undergraduate, Career Transitioner, Early Founder)",
        icon: '🎓',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_currentGoal',
        key: 'currentGoal',
        label: 'Current Goal',
        category: 'Objectives',
        aliases: ['currentgoal', 'current goal', 'goal', 'primarygoal'],
        placeholderSample: 'Secure first tech role',
        description: 'Primary milestone or target outcome the participant is pursuing',
        icon: '🎯',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_currentPriority',
        key: 'currentPriority',
        label: 'Current Priority',
        category: 'Objectives',
        aliases: ['currentpriority', 'current priority', 'priority'],
        placeholderSample: 'Portfolio building & networking',
        description: 'Immediate top focus area for weekly actions',
        icon: '⚡',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_desiredDirection',
        key: 'desiredDirection',
        label: 'Desired Direction',
        category: 'Progression',
        aliases: ['desireddirection', 'desired direction', 'direction', 'pathway', 'risepathway'],
        placeholderSample: 'Full-Stack Product Engineering',
        description: 'Long-term pathway, industry focus, or target discipline',
        icon: '🧭',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_interests',
        key: 'interests',
        label: 'Interests',
        category: 'Identity',
        aliases: ['interests', 'interest', 'growthareas', 'growth areas'],
        placeholderSample: 'AI Systems, Web Development',
        description: 'Core curiosity topics and exploration interests',
        icon: '💡',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_strengths',
        key: 'strengths',
        label: 'Strengths',
        category: 'Experience',
        aliases: ['strengths', 'strength', 'skills'],
        placeholderSample: 'System Design, Rapid Prototyping',
        description: 'Key competencies and superpowers identified by user',
        icon: '💪',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_occupation',
        key: 'occupation',
        label: 'Occupation / Role',
        category: 'Demographics',
        aliases: ['occupation', 'role', 'job', 'career'],
        placeholderSample: 'Product Designer',
        description: 'Current professional title or functional craft',
        icon: '💼',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_industry',
        key: 'industry',
        label: 'Industry / Domain',
        category: 'Demographics',
        aliases: ['industry', 'domain', 'sector'],
        placeholderSample: 'FinTech & AI',
        description: 'Operating industry or domain',
        icon: '🏢',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_gender',
        key: 'gender',
        label: 'Gender',
        category: 'Demographics',
        aliases: ['gender', 'sex'],
        placeholderSample: 'Female',
        description: 'Gender demographic identity',
        icon: '👤',
        isSystemDefault: true,
        isActive: true
    },
    {
        id: 'sys_targetNiche',
        key: 'targetNiche',
        label: 'Target Audience / Niche',
        category: 'Business',
        aliases: ['targetniche', 'target niche', 'niche', 'audience'],
        placeholderSample: 'Early-stage SaaS Founders',
        description: 'Target client profile or specific market audience',
        icon: '🎯',
        isSystemDefault: true,
        isActive: true
    }
];

class MetadataService {
    private customFieldsCache: SystemMetadataField[] = [];
    private isInitialized = false;

    constructor() {
        this.loadFromLocalStorage();
    }

    private loadFromLocalStorage() {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        this.customFieldsCache = parsed;
                        this.syncToPlaceholderEngine();
                    }
                }
            } catch (e) {
                console.warn("[metadataService] Failed to load cached metadata fields:", e);
            }
        }
    }

    private saveToLocalStorage(fields: SystemMetadataField[]) {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fields));
                window.dispatchEvent(new CustomEvent('vectorise_metadata_fields_updated', { detail: fields }));
            } catch (e) {}
        }
    }

    private syncToPlaceholderEngine() {
        const combined = this.getCombinedFields();
        setDynamicMetadataFields(combined);
    }

    /**
     * Returns combined list of built-in system metadata + custom admin-added metadata
     */
    public getCombinedFields(): SystemMetadataField[] {
        const map = new Map<string, SystemMetadataField>();
        
        // 1. Built-in defaults
        BUILTIN_DEFAULT_METADATA.forEach(f => {
            map.set(f.key.toLowerCase(), { ...f });
        });

        // 2. Custom Firestore fields override or add
        this.customFieldsCache.forEach(f => {
            const keyLower = f.key.toLowerCase();
            const existing = map.get(keyLower);
            if (existing) {
                map.set(keyLower, {
                    ...existing,
                    ...f,
                    isSystemDefault: existing.isSystemDefault
                });
            } else {
                map.set(keyLower, { ...f });
            }
        });

        return Array.from(map.values());
    }

    /**
     * Subscribes to realtime metadata fields updates in Firestore
     */
    public subscribeToMetadataFields(callback?: (fields: SystemMetadataField[]) => void): () => void {
        try {
            const colRef = collection(db, METADATA_FIELDS_COLLECTION);
            const unsubscribe = onSnapshot(colRef, (snapshot) => {
                const fetched: SystemMetadataField[] = [];
                snapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    fetched.push({
                        id: docSnap.id,
                        ...data,
                        isActive: data.isActive !== false
                    } as SystemMetadataField);
                });

                this.customFieldsCache = fetched;
                this.saveToLocalStorage(fetched);
                this.syncToPlaceholderEngine();

                if (callback) {
                    callback(this.getCombinedFields());
                }
            }, (err) => {
                console.error("[metadataService] Realtime sync error:", err);
                if (callback) {
                    callback(this.getCombinedFields());
                }
            });

            return unsubscribe;
        } catch (e) {
            console.error("[metadataService] Failed to subscribe to metadata fields:", e);
            if (callback) callback(this.getCombinedFields());
            return () => {};
        }
    }

    /**
     * Fetch all metadata fields once
     */
    public async getAllMetadataFields(): Promise<SystemMetadataField[]> {
        try {
            const snap = await getDocs(collection(db, METADATA_FIELDS_COLLECTION));
            const fetched: SystemMetadataField[] = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                fetched.push({
                    id: docSnap.id,
                    ...data,
                    isActive: data.isActive !== false
                } as SystemMetadataField);
            });
            this.customFieldsCache = fetched;
            this.saveToLocalStorage(fetched);
            this.syncToPlaceholderEngine();
            return this.getCombinedFields();
        } catch (err) {
            console.error("[metadataService] Failed to fetch metadata fields:", err);
            return this.getCombinedFields();
        }
    }

    /**
     * Add a new metadata field
     */
    public async createMetadataField(fieldData: Partial<SystemMetadataField>): Promise<SystemMetadataField> {
        if (!fieldData.label || !fieldData.label.trim()) {
            throw new Error("Metadata field label is required");
        }

        // Auto-generate camelCase key if not provided
        let key = (fieldData.key || '')
            .trim()
            .replace(/[^a-zA-Z0-9_]/g, ' ')
            .trim()
            .split(/\s+/)
            .map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');

        if (!key) {
            key = fieldData.label
                .trim()
                .replace(/[^a-zA-Z0-9_]/g, ' ')
                .trim()
                .split(/\s+/)
                .map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');
        }

        // Generate aliases
        const aliasesSet = new Set<string>();
        aliasesSet.add(key.toLowerCase());
        aliasesSet.add(fieldData.label.toLowerCase().trim());
        aliasesSet.add(fieldData.label.toLowerCase().replace(/[\s_\-]+/g, ''));
        
        if (Array.isArray(fieldData.aliases)) {
            fieldData.aliases.forEach(a => {
                if (a && typeof a === 'string' && a.trim()) {
                    aliasesSet.add(a.trim().toLowerCase());
                }
            });
        }

        const docId = fieldData.id || doc(collection(db, METADATA_FIELDS_COLLECTION)).id;
        const newField: SystemMetadataField = {
            id: docId,
            key,
            label: fieldData.label.trim(),
            category: fieldData.category || 'Custom',
            aliases: Array.from(aliasesSet),
            placeholderSample: fieldData.placeholderSample?.trim() || 'Sample response',
            description: fieldData.description?.trim() || `User metadata attribute for ${fieldData.label.trim()}`,
            icon: fieldData.icon || '🏷️',
            isSystemDefault: false,
            isActive: fieldData.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = doc(db, METADATA_FIELDS_COLLECTION, docId);
        await setDoc(docRef, sanitizeData(newField), { merge: true });

        // Update local cache
        this.customFieldsCache = this.customFieldsCache.filter(f => f.id !== docId);
        this.customFieldsCache.push(newField);
        this.saveToLocalStorage(this.customFieldsCache);
        this.syncToPlaceholderEngine();

        return newField;
    }

    /**
     * Update an existing metadata field
     */
    public async updateMetadataField(id: string, updates: Partial<SystemMetadataField>): Promise<SystemMetadataField> {
        const docRef = doc(db, METADATA_FIELDS_COLLECTION, id);
        
        const existing = this.getCombinedFields().find(f => f.id === id);
        if (!existing) {
            throw new Error(`Metadata field with id ${id} not found.`);
        }

        const updatedData: SystemMetadataField = {
            ...existing,
            ...updates,
            id,
            updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, sanitizeData(updatedData), { merge: true });

        this.customFieldsCache = this.customFieldsCache.filter(f => f.id !== id);
        this.customFieldsCache.push(updatedData);
        this.saveToLocalStorage(this.customFieldsCache);
        this.syncToPlaceholderEngine();

        return updatedData;
    }

    /**
     * Delete a custom metadata field
     */
    public async deleteMetadataField(id: string): Promise<void> {
        const existing = this.getCombinedFields().find(f => f.id === id);
        if (existing?.isSystemDefault) {
            throw new Error("System default metadata fields cannot be deleted. You can disable them instead.");
        }

        try {
            await deleteDoc(doc(db, METADATA_FIELDS_COLLECTION, id));
            this.customFieldsCache = this.customFieldsCache.filter(f => f.id !== id);
            this.saveToLocalStorage(this.customFieldsCache);
            this.syncToPlaceholderEngine();
        } catch (err) {
            console.error("[metadataService] Failed to delete metadata field:", err);
            throw err;
        }
    }

    /**
     * Toggle active state of a metadata field
     */
    public async toggleMetadataField(id: string, isActive: boolean): Promise<void> {
        const existing = this.getCombinedFields().find(f => f.id === id);
        if (!existing) throw new Error("Metadata field not found");

        const docRef = doc(db, METADATA_FIELDS_COLLECTION, id);
        const updated: SystemMetadataField = {
            ...existing,
            isActive,
            updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, sanitizeData(updated), { merge: true });
        this.customFieldsCache = this.customFieldsCache.filter(f => f.id !== id);
        this.customFieldsCache.push(updated);
        this.saveToLocalStorage(this.customFieldsCache);
        this.syncToPlaceholderEngine();
    }
}

export const metadataService = new MetadataService();
