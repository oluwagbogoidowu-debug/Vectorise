import { db } from './firebase';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where,
    collectionGroup
} from 'firebase/firestore';
import { UserIdentificationRule, Sprint, ParticipantSprint } from '../types';
import { parseOptionCodeHelper } from '../utils/sprintUtils';

const RULES_COLLECTION = 'user_identification_rules';

// Helper to sanitize objects for Firestore
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

export const userIdentificationService = {
    /**
     * Get all configured identification rules
     */
    getUserIdentificationRules: async (): Promise<UserIdentificationRule[]> => {
        try {
            const snap = await getDocs(collection(db, RULES_COLLECTION));
            const rules: UserIdentificationRule[] = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                rules.push({
                    id: docSnap.id,
                    ...data,
                    isActive: data.isActive !== false
                } as UserIdentificationRule);
            });
            // Sort by creation date descending
            return rules.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        } catch (err) {
            console.error("[userIdentificationService] Failed to fetch rules:", err);
            return [];
        }
    },

    /**
     * Save or update an identification rule
     */
    saveUserIdentificationRule: async (rule: Partial<UserIdentificationRule>): Promise<UserIdentificationRule> => {
        const ruleId = rule.id || doc(collection(db, RULES_COLLECTION)).id;
        const docRef = doc(db, RULES_COLLECTION, ruleId);
        const dataToSave: UserIdentificationRule = {
            id: ruleId,
            sourceSprintId: rule.sourceSprintId || 'ALL',
            optionCode: (rule.optionCode || '').trim(),
            optionText: rule.optionText || '',
            targetField: (rule.targetField || '').trim(),
            targetCategory: rule.targetCategory || 'Identity',
            valueToSave: rule.valueToSave ? rule.valueToSave.trim() : '',
            description: rule.description || '',
            isActive: rule.isActive !== false,
            createdAt: rule.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, sanitizeData(dataToSave), { merge: true });
        return dataToSave;
    },

    /**
     * Delete an identification rule
     */
    deleteUserIdentificationRule: async (ruleId: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, RULES_COLLECTION, ruleId));
        } catch (err) {
            console.error("[userIdentificationService] Failed to delete rule:", err);
            throw err;
        }
    },

    /**
     * Toggle rule active state
     */
    toggleUserIdentificationRule: async (ruleId: string, isActive: boolean): Promise<void> => {
        try {
            const docRef = doc(db, RULES_COLLECTION, ruleId);
            await updateDoc(docRef, { isActive, updatedAt: new Date().toISOString() });
        } catch (err) {
            console.error("[userIdentificationService] Failed to toggle rule:", err);
            throw err;
        }
    },

    /**
     * Core Real-Time Processor:
     * Receives user's input/answers from a sprint, matches against active {M1 Step op1} rules,
     * and saves automatically into the user's data doc in Firestore.
     */
    applyUserIdentificationTracking: async (
        userId: string,
        sprint: Sprint | { id: string; title: string; dailyContent?: any[] } | null | undefined,
        dayNum: number,
        answers: any[]
    ): Promise<Record<string, any>> => {
        if (!userId || !sprint || !answers || !Array.isArray(answers) || answers.length === 0) {
            return {};
        }

        try {
            const allRules = await userIdentificationService.getUserIdentificationRules();
            const activeRules = allRules.filter(r => r.isActive && (r.sourceSprintId === 'ALL' || r.sourceSprintId === sprint.id));

            if (activeRules.length === 0) return {};

            const userDocRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            if (!userSnap.exists()) return {};

            const userData = userSnap.data() || {};
            const existingIdentification = userData.identificationData || {};
            
            const updatesToUser: Record<string, any> = {};
            const updatedIdentification = { ...existingIdentification };
            let hasChanges = false;

            for (const rule of activeRules) {
                if (!rule.targetField || !rule.optionCode) continue;

                // Parse option code logic: {M1 Step 1 op 1} or {M1 Step 1} or {Step 1 op 1}
                const parsed = parseOptionCodeHelper(rule.optionCode, sprint as Sprint);
                if (!parsed) continue;

                // Check if current dayNum matches rule dayNum
                if (Number(parsed.dayNum) !== Number(dayNum)) continue;

                const stepIdx = parsed.stepIdx;
                if (stepIdx < 0 || stepIdx >= answers.length) continue;

                const userAnswer = answers[stepIdx];
                if (userAnswer === undefined || userAnswer === null || userAnswer === '') continue;

                // Evaluate whether the user's answer matches the target option
                let isMatch = false;
                let capturedValue = '';

                // Get the target option text from sprint if available
                let targetOptText = (rule.optionText || parsed.optionText || '').trim().toLowerCase();
                
                // If sprint daily content has poll options
                if (!targetOptText && (sprint as any)?.dailyContent) {
                    const dc = (sprint as any).dailyContent.find((d: any) => Number(d.day) === Number(dayNum)) || (sprint as any).dailyContent[dayNum - 1];
                    if (dc?.taskPollOptions?.[stepIdx]) {
                        const raw = dc.taskPollOptions[stepIdx];
                        let opts: string[] = [];
                        try {
                            opts = typeof raw === 'string' && raw.trim().startsWith('[') ? JSON.parse(raw) : String(raw).split(',').map(s => s.trim());
                        } catch (e) {
                            opts = String(raw).split(',').map(s => s.trim());
                        }
                        targetOptText = (opts[parsed.optionIdx] || '').toLowerCase();
                    }
                }

                // If user selected poll option or provided text
                if (typeof userAnswer === 'string') {
                    const cleanAnswer = userAnswer.trim().toLowerCase();
                    if (targetOptText) {
                        // Direct match with the option text
                        if (cleanAnswer === targetOptText || cleanAnswer.includes(targetOptText) || targetOptText.includes(cleanAnswer)) {
                            isMatch = true;
                            capturedValue = rule.valueToSave?.trim() ? rule.valueToSave.trim() : (parsed.optionText || userAnswer);
                        }
                    } else {
                        // Rule targets step text answer directly
                        isMatch = true;
                        capturedValue = rule.valueToSave?.trim() ? rule.valueToSave.trim() : userAnswer;
                    }
                } else if (Array.isArray(userAnswer)) {
                    // Multi-select poll answer
                    const matchedItem = userAnswer.find(item => {
                        const itemStr = String(item).trim().toLowerCase();
                        return targetOptText && (itemStr === targetOptText || itemStr.includes(targetOptText) || targetOptText.includes(itemStr));
                    });
                    if (matchedItem) {
                        isMatch = true;
                        capturedValue = rule.valueToSave?.trim() ? rule.valueToSave.trim() : String(matchedItem);
                    }
                }

                if (isMatch && capturedValue) {
                    const fieldKey = rule.targetField.trim();
                    updatesToUser[fieldKey] = capturedValue;
                    updatedIdentification[fieldKey] = {
                        field: fieldKey,
                        value: capturedValue,
                        optionCode: rule.optionCode,
                        optionText: rule.optionText || parsed.optionText || '',
                        sourceSprintId: sprint.id,
                        sourceSprintTitle: sprint.title,
                        capturedAt: new Date().toISOString()
                    };
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                updatesToUser.identificationData = updatedIdentification;
                updatesToUser.lastIdentificationUpdate = new Date().toISOString();
                await updateDoc(userDocRef, sanitizeData(updatesToUser));
                console.log(`[userIdentificationService] Successfully captured & saved identification fields for user ${userId}:`, updatesToUser);
            }

            return updatesToUser;
        } catch (err) {
            console.error("[userIdentificationService] Error applying tracking:", err);
            return {};
        }
    },

    /**
     * Backfill / Scan all users to populate identification data from existing sprint progress
     */
    backfillAllUsersIdentification: async (
        onProgress?: (msg: string) => void
    ): Promise<{ processedUsers: number; updatedUsers: number; capturedFieldsCount: number }> => {
        let processedUsers = 0;
        let updatedUsers = 0;
        let capturedFieldsCount = 0;

        try {
            onProgress?.("Fetching identification tracking rules and all users...");
            const rules = await userIdentificationService.getUserIdentificationRules();
            const activeRules = rules.filter(r => r.isActive);

            if (activeRules.length === 0) {
                onProgress?.("No active identification rules found to backfill.");
                return { processedUsers: 0, updatedUsers: 0, capturedFieldsCount: 0 };
            }

            // Fetch all users
            const usersSnap = await getDocs(collection(db, 'users'));
            const userDocs = usersSnap.docs;

            // Fetch all sprints for reference
            const sprintsSnap = await getDocs(collection(db, 'sprints'));
            const sprintsMap: Record<string, Sprint> = {};
            sprintsSnap.forEach(d => {
                sprintsMap[d.id] = { id: d.id, ...d.data() } as Sprint;
            });

            onProgress?.(`Found ${userDocs.length} users and ${activeRules.length} active rules. Scanning enrollments...`);

            for (const userDoc of userDocs) {
                processedUsers++;
                const uId = userDoc.id;
                const userData = userDoc.data() || {};
                const existingIdentification = userData.identificationData || {};
                const userUpdates: Record<string, any> = {};
                const updatedIdentification = { ...existingIdentification };
                let userModified = false;

                // Fetch user's enrollments
                const enrollmentsSnap = await getDocs(collection(db, 'users', uId, 'enrollments'));
                for (const enrollDoc of enrollmentsSnap.docs) {
                    const enrollData = enrollDoc.data() as ParticipantSprint;
                    const sprint = sprintsMap[enrollData.sprint_id];
                    if (!sprint || !Array.isArray(enrollData.progress)) continue;

                    for (const prog of enrollData.progress) {
                        if (!prog || !Array.isArray(prog.answers)) continue;
                        const dayNum = Number(prog.day || 1);

                        for (const rule of activeRules) {
                            if (rule.sourceSprintId !== 'ALL' && rule.sourceSprintId !== sprint.id) continue;
                            const parsed = parseOptionCodeHelper(rule.optionCode, sprint);
                            if (!parsed || Number(parsed.dayNum) !== dayNum) continue;

                            const stepIdx = parsed.stepIdx;
                            if (stepIdx < 0 || stepIdx >= prog.answers.length) continue;

                            const ans = prog.answers[stepIdx];
                            if (ans === undefined || ans === null || ans === '') continue;

                            let isMatch = false;
                            let capturedVal = '';
                            const targetOptText = (rule.optionText || parsed.optionText || '').trim().toLowerCase();

                            if (typeof ans === 'string') {
                                const clean = ans.trim().toLowerCase();
                                if (targetOptText) {
                                    if (clean === targetOptText || clean.includes(targetOptText) || targetOptText.includes(clean)) {
                                        isMatch = true;
                                        capturedVal = rule.valueToSave?.trim() ? rule.valueToSave.trim() : (parsed.optionText || ans);
                                    }
                                } else {
                                    isMatch = true;
                                    capturedVal = rule.valueToSave?.trim() ? rule.valueToSave.trim() : ans;
                                }
                            } else if (Array.isArray(ans)) {
                                const ansArr: any[] = ans;
                                const matched = ansArr.find((item: any) => {
                                    const s = String(item).trim().toLowerCase();
                                    return targetOptText && (s === targetOptText || s.includes(targetOptText) || targetOptText.includes(s));
                                });
                                if (matched) {
                                    isMatch = true;
                                    capturedVal = rule.valueToSave?.trim() ? rule.valueToSave.trim() : String(matched);
                                }
                            }

                            if (isMatch && capturedVal) {
                                const fKey = rule.targetField.trim();
                                userUpdates[fKey] = capturedVal;
                                updatedIdentification[fKey] = {
                                    field: fKey,
                                    value: capturedVal,
                                    optionCode: rule.optionCode,
                                    optionText: rule.optionText || parsed.optionText || '',
                                    sourceSprintId: sprint.id,
                                    sourceSprintTitle: sprint.title,
                                    capturedAt: new Date().toISOString()
                                };
                                userModified = true;
                                capturedFieldsCount++;
                            }
                        }
                    }
                }

                if (userModified) {
                    userUpdates.identificationData = updatedIdentification;
                    userUpdates.lastIdentificationUpdate = new Date().toISOString();
                    await updateDoc(doc(db, 'users', uId), sanitizeData(userUpdates));
                    updatedUsers++;
                }

                if (processedUsers % 10 === 0) {
                    onProgress?.(`Scanned ${processedUsers}/${userDocs.length} users (${updatedUsers} updated)...`);
                }
            }

            onProgress?.(`Backfill complete! ${updatedUsers} users updated with ${capturedFieldsCount} identification attributes.`);
            return { processedUsers, updatedUsers, capturedFieldsCount };
        } catch (err: any) {
            console.error("[userIdentificationService] Backfill failed:", err);
            onProgress?.(`Error during backfill: ${err.message || String(err)}`);
            return { processedUsers, updatedUsers, capturedFieldsCount };
        }
    }
};
