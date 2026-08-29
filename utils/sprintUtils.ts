import { Sprint, UserRole, Participant, LifecycleSlotAssignment, User, ParticipantSprint } from '../types';
import { FOCUS_OPTIONS } from '../services/mockData';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../constants';

export interface ParsedOptionCode {
    dayNum: number;
    stepIdx: number;
    optionIdx: number;
    optionText: string;
}

export const parseOptionCodeHelper = (code: string, sprint?: Sprint | null): ParsedOptionCode | null => {
    if (!code) return null;
    const clean = code.trim().replace(/^[\{\[\(\<]+|[\}\]\)\>]+$/g, '').trim();
    if (!clean) return null;
    
    let dayNum = 1;
    let stepNum = 1;
    let opNum = 1;

    // Pattern 1: Day/Move + (optional step) + Option
    // Matches: "M1 step op 1", "M1 Step 3 op 3", "Move 1 Step 3 option 3", "Day 1 Step 3 op3", "D1 S3 O3", "M1 op 2"
    const fullMatch = clean.match(/(?:m|move|day|d)\s*(\d+)(?:\s*(?:step|s)\s*(\d*))?\s*(?:op|option|choice|opt|o)\s*(\d+)/i);
    // Pattern 2: (optional step) + Option (without Day specified, defaults to Day 1 / Move 1)
    // Matches: "Step 3 op 2", "Step op 1", "step 2 option 3", "op 2", "choice 3"
    const stepOpMatch = clean.match(/(?:(?:step|s)\s*(\d*)\s*)?(?:op|option|choice|opt|o)\s*(\d+)/i);
    // Pattern 3: Separated numbers e.g. "1 3 3" or "1-3-3" or "1.3.3"
    const numMatch3 = clean.match(/^(\d+)[\s\.\-_]+(\d+)[\s\.\-_]+(\d+)$/);
    // Pattern 4: Two numbers e.g. "1 2" -> step 1, option 2 (or day 1, option 2)
    const numMatch2 = clean.match(/^(\d+)[\s\.\-_]+(\d+)$/);

    if (fullMatch) {
        dayNum = parseInt(fullMatch[1], 10) || 1;
        stepNum = fullMatch[2] ? (parseInt(fullMatch[2], 10) || 1) : 1;
        opNum = parseInt(fullMatch[3], 10) || 1;
    } else if (stepOpMatch && stepOpMatch[2]) {
        dayNum = 1;
        stepNum = stepOpMatch[1] ? (parseInt(stepOpMatch[1], 10) || 1) : 1;
        opNum = parseInt(stepOpMatch[2], 10) || 1;
    } else if (numMatch3) {
        dayNum = parseInt(numMatch3[1], 10) || 1;
        stepNum = parseInt(numMatch3[2], 10) || 1;
        opNum = parseInt(numMatch3[3], 10) || 1;
    } else if (numMatch2) {
        dayNum = 1;
        stepNum = parseInt(numMatch2[1], 10) || 1;
        opNum = parseInt(numMatch2[2], 10) || 1;
    } else {
        return null;
    }

    const stepIdx = Math.max(0, stepNum - 1);
    const optionIdx = Math.max(0, opNum - 1);

    let optionText = '';
    if (sprint && sprint.dailyContent) {
        const dc = sprint.dailyContent.find(d => Number(d.day) === Number(dayNum)) || sprint.dailyContent[dayNum - 1];
        if (dc && dc.taskPollOptions && dc.taskPollOptions[stepIdx]) {
            const rawOpts = dc.taskPollOptions[stepIdx];
            let optionsList: string[] = [];
            try {
                if (typeof rawOpts === 'string' && rawOpts.trim().startsWith('[')) {
                    optionsList = JSON.parse(rawOpts);
                } else if (typeof rawOpts === 'string') {
                    optionsList = rawOpts.split(',').map(s => s.trim());
                } else if (Array.isArray(rawOpts)) {
                    optionsList = rawOpts;
                }
            } catch (e) {
                optionsList = String(rawOpts).split(',').map(s => s.trim());
            }
            optionText = optionsList[optionIdx] || '';
        }
    }

    return { dayNum, stepIdx, optionIdx, optionText };
};

/**
 * Checks if a participant's recorded answers in their enrollment match a configured sprint link.
 * Used for Superior Option-Coded Sprint Linking.
 */
export const isOptionLinkMatchedByUser = (
    enrollment: ParticipantSprint | undefined | null,
    sourceSprint: Sprint | undefined | null,
    link: any
): boolean => {
    if (!link || !link.optionCode || !link.optionCode.trim()) {
        // Not an option-coded link (uncoded links belong to normal Stage 2 priority)
        return false;
    }
    if (!enrollment) return false;

    const parsed = parseOptionCodeHelper(link.optionCode, sourceSprint);
    const targetOptionText = (link.optionText || parsed?.optionText || '').trim().toLowerCase();
    const cleanCode = link.optionCode.trim().toLowerCase().replace(/^[\{\[\(\<]+|[\}\]\)\>]+$/g, '');

    const progressList = Array.isArray(enrollment.progress) ? enrollment.progress : [];

    // Helper to evaluate if a user answer/value matches the option
    const testValueMatch = (val: any): boolean => {
        if (!val) return false;
        if (typeof val === 'string') {
            const trimmed = val.trim().toLowerCase();
            if (!trimmed) return false;

            // Direct match with resolved option text
            if (targetOptionText && (trimmed === targetOptionText || trimmed.includes(targetOptionText) || targetOptionText.includes(trimmed))) {
                return true;
            }

            // Direct match with option code
            if (cleanCode && (trimmed.includes(cleanCode) || trimmed.includes(link.optionCode.toLowerCase()))) {
                return true;
            }

            // If value is a JSON array string (from multi-select polls)
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsedArr = JSON.parse(trimmed);
                    if (Array.isArray(parsedArr)) {
                        return parsedArr.some(item => testValueMatch(item));
                    }
                } catch (e) {}
            }
        } else if (Array.isArray(val)) {
            return val.some(item => testValueMatch(item));
        }
        return false;
    };

    // 1. Check exact Day and Step from parsed code
    if (parsed) {
        const dayProg = progressList.find(p => Number(p.day) === Number(parsed.dayNum));
        if (dayProg && dayProg.answers) {
            const stepAns = dayProg.answers[parsed.stepIdx];
            if (testValueMatch(stepAns)) return true;

            // Check against options list of source sprint at the option index
            if (sourceSprint?.dailyContent) {
                const dc = sourceSprint.dailyContent.find(d => Number(d.day) === Number(parsed.dayNum)) || sourceSprint.dailyContent[parsed.dayNum - 1];
                if (dc?.taskPollOptions?.[parsed.stepIdx]) {
                    const rawOpts = dc.taskPollOptions[parsed.stepIdx];
                    let opts: string[] = [];
                    try {
                        opts = typeof rawOpts === 'string' && rawOpts.trim().startsWith('[') ? JSON.parse(rawOpts) : String(rawOpts).split(',').map(s => s.trim());
                    } catch (e) {
                        opts = String(rawOpts).split(',').map(s => s.trim());
                    }
                    const optAtIdx = opts[parsed.optionIdx];
                    if (optAtIdx && testValueMatch(optAtIdx) && testValueMatch(stepAns)) {
                        return true;
                    }
                    if (optAtIdx && stepAns && typeof stepAns === 'string' && stepAns.trim().toLowerCase() === optAtIdx.trim().toLowerCase()) {
                        return true;
                    }
                }
            }
        }
    }

    // 2. Comprehensive fallback across all progress items and submission strings
    for (const p of progressList) {
        if (Array.isArray(p.answers)) {
            for (const ans of p.answers) {
                if (testValueMatch(ans)) return true;
            }
        }
        if (p.submission && testValueMatch(p.submission)) {
            return true;
        }
    }

    return false;
};

export const getSprintOutcomes = (sprint: Sprint | string) => {
    const category = typeof sprint === 'string' ? sprint : sprint.category;
    const customOutcomes = typeof sprint === 'object' ? sprint.outcomes : null;

    if (customOutcomes && customOutcomes.length > 0) {
        return customOutcomes;
    }

    const outcomes: Record<string, string[]> = {
        'Productivity': ['Master your daily schedule', 'Eliminate procrastination', 'Achieve deep focus states'],
        'Personal Fitness': ['Boost daily energy levels', 'Build sustainable physical habits', 'Improve overall vitality'],
        'Leadership': ['Communicate with authority', 'Inspire and motivate teams', 'Make decisions with confidence'],
        'Personal Branding': ['Define your unique voice', 'Grow your audience organically', 'Monetize your expertise'],
        'Interpersonal Relationship': ['Deepen meaningful connections', 'Resolve conflicts gracefully', 'Build a strong support network'],
        'Skill Acquisition': ['Accelerate learning speed', 'Apply new skills immediately', 'Overcome the learning curve'],
        'default': ['Gain clarity on your goals', 'Build consistent daily habits', 'See visible progress in days']
    };
    return outcomes[category] || outcomes['default'];
};

/**
 * Checks if the core landing page info is missing.
 */
export const isRegistryIncomplete = (sprint: Sprint): boolean => {
    // Check core sprint identity fields
    if (!sprint.title?.trim() || !sprint.subtitle?.trim() || !sprint.coverImageUrl?.trim()) {
        return true;
    }

    // Check dynamic sections
    if (!Array.isArray(sprint.dynamicSections) || sprint.dynamicSections.length === 0) {
        return true;
    }

    for (const section of sprint.dynamicSections) {
        if (!section.title?.trim() || !section.body?.trim()) {
            return true;
        }
    }

    // Also check the metadata fields that are still separate for now
    if (!sprint.category?.trim() || 
        !sprint.difficulty?.trim() || 
        !sprint.duration || 
        !sprint.outcomeTag?.trim()
    ) {
        return true;
    }

    return false;
};

/**
 * Checks if a sprint is missing daily content (lesson/task).
 */
export const isSprintIncomplete = (sprint: Sprint): boolean => {
    if (!Array.isArray(sprint.dailyContent) || sprint.dailyContent.length < sprint.duration) {
        return true;
    }
    
    for (let i = 1; i <= sprint.duration; i++) {
        const content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(c => c.day === i) : undefined;
        if (!content || !content.lessonText?.trim() || !content.taskPrompt?.trim()) {
            return true;
        }
    }
    
    return false;
};

/**
 * Filters all published sprints according to the user's role, persona, and audience matching
 * exactly as done on the Explore page.
 */
export const filterAllowedSprintsForUser = (allSprints: Sprint[], user: User | Participant | null): Sprint[] => {
    // Sprints on Explore page must strictly exclude Ignite and Blog posts
    const validSprints = allSprints.filter(s => 
        s.contentType !== 'ignite' && 
        (s as any).subcategory !== 'ignite' &&
        s.contentType !== 'blog' && 
        (s as any).subcategory !== 'riseblog'
    );

    if (!user) return validSprints;

    return validSprints.filter(s => {
        if (user?.role === UserRole.ADMIN) {
            return true;
        }

        if (!s.audience || s.audience.length === 0) {
            return false;
        }

        const userAudiences: string[] = [];

        if (user?.role === UserRole.COACH || (user as any)?.persona === 'Coach') {
            userAudiences.push('coach');
            userAudiences.push('coaches');

            const sprintAudiences = s.audience.map((a: any) => String(a).toLowerCase().trim());
            return sprintAudiences.some((sa: string) => 
                userAudiences.some(ua => sa === ua || sa.includes(ua) || ua.includes(sa))
            );
        }

        const pathway = String((user as any)?.risePathway || '').toLowerCase().trim();
        const persona = String((user as any)?.persona || '').toLowerCase().trim();
        const occupation = String((user as any)?.occupation || '').toLowerCase().trim();

        if (
            pathway === 'student' || 
            persona === 'student' || 
            persona.includes('student') || 
            persona.includes('graduate') || 
            occupation === 'student' ||
            occupation.includes('student')
        ) {
            userAudiences.push('student');
            userAudiences.push('students');
            userAudiences.push('student/graduate');
        }

        if (
            pathway === 'early_career' || 
            pathway === 'growth_pro' || 
            persona.includes('9-5') || 
            persona.includes('professional') || 
            occupation.includes('professional') || 
            occupation.includes('employee') || 
            occupation.includes('corporate')
        ) {
            userAudiences.push('9-5 professional');
            userAudiences.push('9-5 professionals');
            userAudiences.push('professional');
            userAudiences.push('professionals');
            userAudiences.push('corporate professionals');
        }

        if (
            pathway === 'builder' || 
            persona.includes('entrepreneur') || 
            persona.includes('owner') || 
            persona.includes('founder') || 
            occupation.includes('entrepreneur') || 
            occupation.includes('business owner') || 
            occupation.includes('founder')
        ) {
            userAudiences.push('entrepreneur');
            userAudiences.push('entrepreneurs');
            userAudiences.push('business owner');
            userAudiences.push('business owners');
            userAudiences.push('founders / entrepreneurs');
            userAudiences.push('founder');
            userAudiences.push('builder');
            userAudiences.push('builders');
        }

        if (
            pathway === 'transition' || 
            persona.includes('freelancer') || 
            persona.includes('consultant') || 
            persona.includes('creative') || 
            persona.includes('hustler') || 
            occupation.includes('freelancer') || 
            occupation.includes('consultant') || 
            occupation.includes('creative') || 
            occupation.includes('hustler')
        ) {
            userAudiences.push('freelancer/consultant');
            userAudiences.push('creative/hustler');
            userAudiences.push('freelancer');
            userAudiences.push('consultant');
            userAudiences.push('creative');
            userAudiences.push('hustler');
            userAudiences.push('freelancers');
            userAudiences.push('consultants');
            userAudiences.push('creatives');
            userAudiences.push('hustlers');
        }

        const sprintAudiences = s.audience.map((a: any) => String(a).toLowerCase().trim());
        const isMatch = sprintAudiences.some((sa: string) => 
            userAudiences.some(ua => sa === ua || sa.includes(ua) || ua.includes(sa))
        );

        const isCoachSprint = sprintAudiences.some(sa => sa === 'coach' || sa === 'coaches');
        if (isCoachSprint) {
            return false;
        }

        return isMatch;
    });
};

export interface ExploreSprintItem {
    sprint: Sprint;
    level: number; // 1 = First level (active & clickable), 2 = Second level (inactive & not clickable), 3 = Later levels (inactive)
    isSuperior?: boolean; // If triggered by superior option-code match (e.g. {M1 step op 1})
    isClickable: boolean; // true for level 1, false for level 2+
    linkSourceTitle?: string;
}

/**
 * Traverses and returns the exact ordered list of Explore items using strict Sprint-to-Sprint linking:
 * 1. Superior Option-Coded Linking ({M1 step op 1}) becomes superior to all once the user clicks that option.
 *    (Does not take effect until the user clicks that option).
 * 2. Level 1 Linking: All first-level direct links from the current sprint show first before second-level links.
 *    Level 1 cards are active and clickable.
 * 3. Level 2 Linking: Sprints that the first-level sprints link to.
 *    Level 2 cards are shown after Level 1, in an inactive, non-clickable state.
 * 4. Level 3+ Linking: Sprints linked from Level 2 sprints (also inactive and non-clickable).
 * 5. Fallback: Remaining published non-enrolled sprints.
 *
 * NOTE: Orchestrator linking logic is strictly deactivated on the Explore page as requested.
 */
export const getExploreSprintItems = (
    sprints: Sprint[],
    user: Participant | User | null,
    enrolledSprintIds: Set<string> = new Set(),
    userEnrollments: ParticipantSprint[] = [],
    sprintLinks: any[] = [],
    currentOrCompletedSprintId?: string
): ExploreSprintItem[] => {
    const list: ExploreSprintItem[] = [];
    const seenIds = new Set<string>();

    const addSprintItem = (
        sprint: Sprint | undefined | null,
        level: number,
        isSuperior: boolean = false,
        isClickable: boolean = true,
        sourceTitle?: string,
        forceAllowRepeat: boolean = false
    ) => {
        if (!sprint) return;
        if ((!enrolledSprintIds.has(sprint.id) || forceAllowRepeat) && !seenIds.has(sprint.id)) {
            list.push({
                sprint,
                level,
                isSuperior,
                isClickable: level === 1 && isClickable,
                linkSourceTitle: sourceTitle
            });
            seenIds.add(sprint.id);
        }
    };

    // 1. Identify Candidate Source Enrollments
    const candidateEnrollments: ParticipantSprint[] = [];
    if (currentOrCompletedSprintId && userEnrollments) {
        const exact = userEnrollments.find(e => e.sprint_id === currentOrCompletedSprintId);
        if (exact) {
            candidateEnrollments.push(exact);
        }
    }

    if (userEnrollments && userEnrollments.length > 0) {
        const active = [...userEnrollments]
            .filter(e => !candidateEnrollments.some(ce => ce.id === e.id) && (!e.completed_at && !(Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every(p => p.completed))))
            .sort((a, b) => new Date(b.last_activity_at || b.started_at || 0).getTime() - new Date(a.last_activity_at || a.started_at || 0).getTime());

        const completed = [...userEnrollments]
            .filter(e => !candidateEnrollments.some(ce => ce.id === e.id) && (e.completed_at || (Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every(p => p.completed))))
            .sort((a, b) => new Date(b.completed_at || b.started_at || 0).getTime() - new Date(a.completed_at || a.started_at || 0).getTime());

        candidateEnrollments.push(...active, ...completed);
    }

    // Helper to find all direct target sprint IDs from a source sprint ID (uncoded links or nextSprintId)
    const getDirectLinkedSprintIds = (sourceId: string): string[] => {
        const targetIds: string[] = [];
        const srcSprint = sprints.find(s => s.id === sourceId);

        // A. From configured uncoded sprintLinks
        if (Array.isArray(sprintLinks)) {
            const uncoded = sprintLinks.filter(l => l.sourceSprintId === sourceId && (!l.optionCode || !l.optionCode.trim()));
            uncoded.forEach(l => {
                if (l.targetSprintId && !targetIds.includes(l.targetSprintId)) {
                    targetIds.push(l.targetSprintId);
                }
            });
        }

        // B. From direct nextSprintId or linkedSprintId on sprint entity
        if (srcSprint) {
            const directId = srcSprint.nextSprintId || srcSprint.linkedSprintId;
            if (directId && !targetIds.includes(directId)) {
                targetIds.push(directId);
            }
        }

        return targetIds;
    };

    // =========================================================================
    // STEP 1: SUPERIOR LINKING WITH CODE {M1 step op 1} (Superior to all on click)
    // This particular type of linking doesn't take effect until the person clicks that option.
    // Once clicked, it becomes superior to all (Level 1, Clickable, #1 Priority).
    // =========================================================================
    const superiorSprintIds: string[] = [];
    if (Array.isArray(sprintLinks) && sprintLinks.length > 0) {
        for (const enrollment of candidateEnrollments) {
            const srcSprint = sprints.find(s => s.id === enrollment.sprint_id);
            const codedLinks = sprintLinks.filter(l => l.sourceSprintId === enrollment.sprint_id && l.optionCode && l.optionCode.trim());

            for (const link of codedLinks) {
                if (isOptionLinkMatchedByUser(enrollment, srcSprint, link)) {
                    const target = sprints.find(s => s.id === link.targetSprintId);
                    if (target && !superiorSprintIds.includes(target.id)) {
                        superiorSprintIds.push(target.id);
                        addSprintItem(target, 1, true, true, srcSprint?.title, true);
                    }
                }
            }
        }
    }

    // =========================================================================
    // STEP 2: FIRST LEVEL LINKING (Level 1)
    // Every sprint at its first level linking shows first before second level linking.
    // Level 1 cards are fully active and clickable.
    // =========================================================================
    const level1SprintIds: string[] = [];
    
    // Determine the root source sprint IDs for Level 1 expansion
    let rootSourceIds: string[] = [];
    if (candidateEnrollments.length > 0) {
        rootSourceIds = candidateEnrollments.map(e => e.sprint_id);
    } else if (currentOrCompletedSprintId) {
        rootSourceIds = [currentOrCompletedSprintId];
    } else if (sprints.length > 0) {
        // For new users without enrollments, evaluate links from the starting sprint(s)
        rootSourceIds = [sprints[0].id];
    }

    for (const srcId of rootSourceIds) {
        const srcSprint = sprints.find(s => s.id === srcId);
        const directTargets = getDirectLinkedSprintIds(srcId);
        for (const targetId of directTargets) {
            if (!superiorSprintIds.includes(targetId) && !level1SprintIds.includes(targetId)) {
                level1SprintIds.push(targetId);
                const target = sprints.find(s => s.id === targetId);
                if (target) {
                    addSprintItem(target, 1, false, true, srcSprint?.title, true);
                }
            }
        }
    }

    // All Level 1 sources (both clicked superior links and direct links) form the base for Level 2 expansion
    const allLevel1Sources = Array.from(new Set([...superiorSprintIds, ...level1SprintIds]));

    // =========================================================================
    // STEP 3: SECOND LEVEL LINKING (Level 2)
    // Sprints that the first level sprints link to.
    // The second level in Explore shows the card in an INACTIVE state (not clickable).
    // =========================================================================
    const level2SprintIds: string[] = [];
    for (const l1Id of allLevel1Sources) {
        const l1Sprint = sprints.find(s => s.id === l1Id);
        const level2Targets = getDirectLinkedSprintIds(l1Id);
        for (const targetId of level2Targets) {
            if (!seenIds.has(targetId) && !level2SprintIds.includes(targetId)) {
                level2SprintIds.push(targetId);
                const target = sprints.find(s => s.id === targetId);
                if (target) {
                    addSprintItem(target, 2, false, false, l1Sprint?.title, true);
                }
            }
        }
    }

    // =========================================================================
    // STEP 4: THIRD LEVEL LINKING (Level 3+)
    // Sprints that Level 2 links to, and so on. Also shown inactive and not clickable.
    // =========================================================================
    const level3SprintIds: string[] = [];
    for (const l2Id of level2SprintIds) {
        const l2Sprint = sprints.find(s => s.id === l2Id);
        const level3Targets = getDirectLinkedSprintIds(l2Id);
        for (const targetId of level3Targets) {
            if (!seenIds.has(targetId) && !level3SprintIds.includes(targetId)) {
                level3SprintIds.push(targetId);
                const target = sprints.find(s => s.id === targetId);
                if (target) {
                    addSprintItem(target, 3, false, false, l2Sprint?.title, true);
                }
            }
        }
    }

    // Strictly sprint-to-sprint linking only:
    // No orchestrator fallbacks or unlinked arbitrary sprints are displayed in Explore.
    return list;
};

/**
 * Returns the exact list of recommended sprints for the Explore page,
 * driven strictly by the Sprint-to-Sprint linking graph.
 */
export const getExploreNextSteps = (
    sprints: Sprint[],
    user: Participant | User | null,
    orchestration: Record<string, LifecycleSlotAssignment> = {},
    enrolledSprintIds: Set<string> = new Set(),
    userEnrollments: ParticipantSprint[] = [],
    sprintLinks: any[] = [],
    currentOrCompletedSprintId?: string
): Sprint[] => {
    const items = getExploreSprintItems(
        sprints,
        user,
        enrolledSprintIds,
        userEnrollments,
        sprintLinks,
        currentOrCompletedSprintId
    );
    return items.map(item => item.sprint);
};

/**
 * Returns the first sprint displayed on the Explore page / Next Sprint Recommendation for the user.
 * Prioritizes clicked superior option-coded sprints, then first Level-1 clickable sprint.
 */
export const getExploreFirstSprint = (
    allPublishedSprints: Sprint[],
    user: Participant | User | null,
    orchestration: Record<string, LifecycleSlotAssignment> = {},
    enrolledSprintIds: Set<string> = new Set(),
    userEnrollments: ParticipantSprint[] = [],
    sprintLinks: any[] = [],
    currentOrCompletedSprintId?: string
): Sprint | null => {
    const allowedSprints = filterAllowedSprintsForUser(allPublishedSprints, user);
    const sprintPool = allowedSprints.length > 0 ? allowedSprints : allPublishedSprints;
    const items = getExploreSprintItems(
        sprintPool, 
        user, 
        enrolledSprintIds, 
        userEnrollments, 
        sprintLinks, 
        currentOrCompletedSprintId
    );
    const firstClickable = items.find(item => item.isClickable)?.sprint;
    return firstClickable || items[0]?.sprint || sprintPool.find(s => !enrolledSprintIds.has(s.id)) || sprintPool[0] || null;
};
