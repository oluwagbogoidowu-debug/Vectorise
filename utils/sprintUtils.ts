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

const DIVERSE_SPRINT_COVERS = [
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80', // Minimal desk & focus
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80', // Planning notebook & coffee
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80', // Team collaboration
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1200&q=80', // Runner morning energy
    'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&w=1200&q=80', // Sticky notes strategy
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80', // Design / Creative layout
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80', // Deep network / space
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80', // Fitness & strength
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80', // Modern workspace team
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80', // Human connection / group
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80', // Mindful meditation
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', // Architecture / modern highrise
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80', // Data analysis / charts
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80', // Code & development
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1200&q=80', // Modern creative office
    'https://images.unsplash.com/photo-1448932223592-d1fc686e76ea?auto=format&fit=crop&w=1200&q=80', // Ideas / innovation
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80', // Mentoring & coaching
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80', // Personal growth
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', // Technology & engineering
    'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1200&q=80'  // Clean desk focus
];

const GENERIC_DEFAULT_COVER = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80';

/**
 * Returns a high quality, distinct cover image for any sprint, ensuring each sprint has its own rich visual.
 */
export const getSprintCoverImage = (sprint?: Partial<Sprint> | null): string => {
    if (!sprint) return DIVERSE_SPRINT_COVERS[0];
    
    const rawCover = sprint.coverImageUrl || (sprint as any).blogImage || (sprint as any).imageUrl;
    if (rawCover && typeof rawCover === 'string' && rawCover.trim().length > 0) {
        const trimmed = rawCover.trim();
        if (trimmed !== GENERIC_DEFAULT_COVER && !trimmed.includes('1517048676732')) {
            return trimmed;
        }
    }

    const key = String(sprint.id || sprint.title || 'sprint');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % DIVERSE_SPRINT_COVERS.length;
    return DIVERSE_SPRINT_COVERS[index];
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
 * - Active or last finished sprint A is the root source.
 * - Coded link {m1 step 3 op1} from Sprint A to Sprint B shows first in Explore ONLY when the option was clicked in Sprint A; otherwise it is disregarded.
 * - Sprints connected to Sprint A via normal sprint-to-sprint links (e.g. Sprint C, Sprint D) show next in order of their first setup.
 * - Level 1 is capped at maximum 6 visible sprints.
 * - Sprint E connected to B cannot show as a second-level sprint UNTIL Sprint B has been unlocked via option clicking.
 * - Sprints connected to visible Level 1 sprints (e.g. Sprint F connected to C and D) show in order of their first setup as second-level locked cards.
 * - Level 2 is capped at maximum 4 visible sprints.
 */
export const getExploreSprintItems = (
    sprints: Sprint[],
    user: Participant | User | null,
    enrolledSprintIds: Set<string> = new Set(),
    userEnrollments: ParticipantSprint[] = [],
    sprintLinks: any[] = [],
    currentOrCompletedSprintId?: string,
    allPublishedSprintsPool?: Sprint[]
): ExploreSprintItem[] => {
    const normalizeId = (val: any): string => String(val || '').trim();
    const lookupPool = (allPublishedSprintsPool && allPublishedSprintsPool.length > 0) ? allPublishedSprintsPool : sprints;
    const findSprint = (id: string): Sprint | undefined => {
        const norm = normalizeId(id);
        if (!norm) return undefined;
        return lookupPool.find(s => normalizeId(s.id) === norm) || 
               sprints.find(s => normalizeId(s.id) === norm);
    };

    // Helper to get enrollment timestamp for recency sorting
    const getEnrollmentTimestamp = (e: ParticipantSprint): number => {
        const dates = [
            e.last_activity_at,
            e.completed_at,
            (e as any).updated_at,
            (e as any).updatedAt,
            e.started_at,
            (e as any).created_at,
            (e as any).createdAt
        ].filter(Boolean);
        if (dates.length === 0) return 0;
        return Math.max(...dates.map(d => new Date(d).getTime() || 0));
    };

    // Helper to sort configured links in setup order (earliest setup first)
    const getSortedLinksFromSource = (sourceId: string): any[] => {
        const normSrc = normalizeId(sourceId);
        if (!Array.isArray(sprintLinks)) return [];
        return sprintLinks
            .filter(l => normalizeId(l.sourceSprintId || l.source_sprint_id || l.sourceId) === normSrc)
            .sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeA - timeB;
            });
    };

    // 1. Identify active or last finished Sprint A
    let sprintAId: string | null = null;
    let enrollmentA: ParticipantSprint | undefined = undefined;

    if (currentOrCompletedSprintId) {
        sprintAId = normalizeId(currentOrCompletedSprintId);
        enrollmentA = userEnrollments.find(e => normalizeId(e.sprint_id) === sprintAId);
    } else if (userEnrollments && userEnrollments.length > 0) {
        // Find active enrollment first, or the most recent finished/started enrollment
        const sortedEnrollments = [...userEnrollments].sort((a, b) => {
            const aIsActive = a.status === 'active';
            const bIsActive = b.status === 'active';
            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;
            return getEnrollmentTimestamp(b) - getEnrollmentTimestamp(a);
        });
        enrollmentA = sortedEnrollments[0];
        sprintAId = normalizeId(enrollmentA?.sprint_id);
    }

    // If no user enrollment exists yet (new participant), find first source sprint in link setup or pool
    if (!sprintAId) {
        const firstLink = Array.isArray(sprintLinks) && sprintLinks.length > 0
            ? [...sprintLinks].sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()))[0]
            : null;
        if (firstLink) {
            sprintAId = normalizeId(firstLink.sourceSprintId || firstLink.source_sprint_id || firstLink.sourceId);
        } else if (lookupPool.length > 0) {
            sprintAId = normalizeId(lookupPool[0].id);
        }
    }

    if (!sprintAId) return [];

    const sprintA = findSprint(sprintAId);
    const sourceLinksA = getSortedLinksFromSource(sprintAId);

    // =========================================================================
    // LEVEL 1: Sprints that active or just finished Sprint A is connected to
    // Priority:
    // 1. Coded links {m1 step 3 op1}: Show first when the option was clicked.
    //    If not clicked, it is disregarded.
    // 2. Normal links: Show next in order of their first setup (e.g. C, then D).
    // Capacity: Max 6 visible at Level 1. If up to 6, don't show others.
    // =========================================================================
    const level1Items: ExploreSprintItem[] = [];
    const level1SprintIds = new Set<string>();

    // A. Coded links from Sprint A
    const codedLinksA = sourceLinksA.filter(l => {
        const code = l.optionCode || l.option_code;
        return code && String(code).trim().length > 0;
    });

    for (const link of codedLinksA) {
        if (isOptionLinkMatchedByUser(enrollmentA, sprintA, link)) {
            const tgtId = normalizeId(link.targetSprintId || link.target_sprint_id || link.targetId);
            const targetSprint = findSprint(tgtId);
            if (targetSprint && !level1SprintIds.has(tgtId)) {
                level1SprintIds.add(tgtId);
                level1Items.push({
                    sprint: targetSprint,
                    level: 1,
                    isSuperior: true,
                    isClickable: true,
                    linkSourceTitle: sprintA?.title
                });
            }
        }
        // If not matched, it is completely disregarded.
    }

    // B. Normal (uncoded) links from Sprint A in setup order
    const normalLinksA = sourceLinksA.filter(l => {
        const code = l.optionCode || l.option_code;
        return !code || String(code).trim().length === 0;
    });

    for (const link of normalLinksA) {
        const tgtId = normalizeId(link.targetSprintId || link.target_sprint_id || link.targetId);
        const targetSprint = findSprint(tgtId);
        if (targetSprint && !level1SprintIds.has(tgtId)) {
            level1SprintIds.add(tgtId);
            level1Items.push({
                sprint: targetSprint,
                level: 1,
                isSuperior: false,
                isClickable: true,
                linkSourceTitle: sprintA?.title
            });
        }
    }

    // Direct nextSprintId / linkedSprintId on Sprint A entity if configured
    if (sprintA) {
        const directId = normalizeId(sprintA.nextSprintId || sprintA.linkedSprintId || (sprintA as any).linked_sprint_id);
        if (directId && !level1SprintIds.has(directId)) {
            const targetSprint = findSprint(directId);
            if (targetSprint) {
                level1SprintIds.add(directId);
                level1Items.push({
                    sprint: targetSprint,
                    level: 1,
                    isSuperior: false,
                    isClickable: true,
                    linkSourceTitle: sprintA?.title
                });
            }
        }
    }

    // ENFORCE LEVEL 1 LIMIT: Exactly 6 is the maximum visible
    const visibleLevel1Items = level1Items.slice(0, 6);
    const visibleLevel1Ids = new Set(visibleLevel1Items.map(item => normalizeId(item.sprint.id)));

    // =========================================================================
    // LEVEL 2: Sprints that the visible Level 1 sprints are connected to
    // Rules:
    // 1. Sprint E connected to B cannot show until Sprint B has been unlocked.
    // 2. Sprint F connected to C and D shows in setup order as a Level 2 locked card.
    // 3. Max 4 visible at Level 2.
    // =========================================================================
    const level2Items: ExploreSprintItem[] = [];
    const level2SprintIds = new Set<string>();

    for (const l1Item of visibleLevel1Items) {
        const l1Id = normalizeId(l1Item.sprint.id);
        const sourceLinksL1 = getSortedLinksFromSource(l1Id);
        const l1Sprint = l1Item.sprint;

        for (const link of sourceLinksL1) {
            const tgtId = normalizeId(link.targetSprintId || link.target_sprint_id || link.targetId);
            if (!tgtId || tgtId === sprintAId || visibleLevel1Ids.has(tgtId) || level2SprintIds.has(tgtId)) {
                continue;
            }
            const targetSprint = findSprint(tgtId);
            if (targetSprint) {
                level2SprintIds.add(tgtId);
                level2Items.push({
                    sprint: targetSprint,
                    level: 2,
                    isSuperior: false,
                    isClickable: false,
                    linkSourceTitle: l1Sprint?.title
                });
            }
        }

        // Direct nextSprintId on Level 1 sprint entity
        const directL1Id = normalizeId(l1Sprint.nextSprintId || l1Sprint.linkedSprintId || (l1Sprint as any).linked_sprint_id);
        if (directL1Id && directL1Id !== sprintAId && !visibleLevel1Ids.has(directL1Id) && !level2SprintIds.has(directL1Id)) {
            const targetSprint = findSprint(directL1Id);
            if (targetSprint) {
                level2SprintIds.add(directL1Id);
                level2Items.push({
                    sprint: targetSprint,
                    level: 2,
                    isSuperior: false,
                    isClickable: false,
                    linkSourceTitle: l1Sprint?.title
                });
            }
        }
    }

    // ENFORCE LEVEL 2 LIMIT: Exactly 4 is the maximum visible
    const visibleLevel2Items = level2Items.slice(0, 4);

    return [...visibleLevel1Items, ...visibleLevel2Items];
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
    currentOrCompletedSprintId?: string,
    allPublishedSprintsPool?: Sprint[]
): Sprint[] => {
    const items = getExploreSprintItems(
        sprints,
        user,
        enrolledSprintIds,
        userEnrollments,
        sprintLinks,
        currentOrCompletedSprintId,
        allPublishedSprintsPool
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
    const items = getExploreSprintItems(
        allPublishedSprints, 
        user, 
        enrolledSprintIds, 
        userEnrollments, 
        sprintLinks, 
        currentOrCompletedSprintId,
        allPublishedSprints
    );
    const firstClickable = items.find(item => item.isClickable)?.sprint;
    return firstClickable || items[0]?.sprint || allPublishedSprints.find(s => !enrolledSprintIds.has(s.id)) || allPublishedSprints[0] || null;
};
