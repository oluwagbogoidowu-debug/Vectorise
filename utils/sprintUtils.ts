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
    
    let dayNum = 1;
    let stepNum = 1;
    let opNum = 1;

    // Pattern 1: Day/Move + Step + Option
    // Matches "M1 Step 3 op 3", "Move 1 Step 3 option 3", "Day 1 Step 3 op3", "D1 S3 O3", "M1 Step 3 choice 3"
    const fullMatch = clean.match(/(?:m|move|day|d)\s*(\d+)\s*(?:step|s)\s*(\d+)\s*(?:op|option|choice|opt|o)\s*(\d+)/i);
    // Pattern 2: Step + Option (without Day specified, defaults to Day 1 / Move 1)
    const stepOpMatch = clean.match(/(?:step|s)\s*(\d+)\s*(?:op|option|choice|opt|o)\s*(\d+)/i);
    // Pattern 3: Separated numbers e.g. "1 3 3" or "1-3-3" or "1.3.3"
    const numMatch = clean.match(/^(\d+)[\s\.\-_]+(\d+)[\s\.\-_]+(\d+)$/);

    if (fullMatch) {
        dayNum = parseInt(fullMatch[1], 10);
        stepNum = parseInt(fullMatch[2], 10);
        opNum = parseInt(fullMatch[3], 10);
    } else if (stepOpMatch) {
        stepNum = parseInt(stepOpMatch[1], 10);
        opNum = parseInt(stepOpMatch[2], 10);
    } else if (numMatch) {
        dayNum = parseInt(numMatch[1], 10);
        stepNum = parseInt(numMatch[2], 10);
        opNum = parseInt(numMatch[3], 10);
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

/**
 * Returns the exact list of recommended sprints for the Explore page,
 * respecting:
 * 1. Superior Option-Coded Sprint Linking (1st Priority: Reorders recommendation when participant clicks tracked {m1 step 3 op 3})
 * 2. Normal Sprint-to-Sprint Linking without coding (2nd Priority Stage: Recorded once someone starts that sprint)
 * 3. Orchestrator Override Sprints (overrideOrchestrator flag)
 * 4. Lifecycle Orchestrator slots (slot_dir_sprint mapping with user focus)
 * 5. Growth Areas (from identity setup)
 * 6. Rise Pathway
 * 7. Fallbacks to remaining available sprints
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
    const participant = user as Participant;
    const list: Sprint[] = [];
    const seenIds = new Set<string>();

    const addSprint = (sprint: Sprint | undefined | null, forceAllowRepeat: boolean = false) => {
        if (sprint && (!enrolledSprintIds.has(sprint.id) || forceAllowRepeat) && !seenIds.has(sprint.id)) {
            list.push(sprint);
            seenIds.add(sprint.id);
        }
    };

    // Determine the source enrollment(s) to evaluate links from
    // Prioritize active enrollments (most recent activity first), then completed enrollments
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

    // If currentOrCompletedSprintId has no enrollment record yet (e.g. freshly viewing/starting), create mock
    if (currentOrCompletedSprintId && candidateEnrollments.length === 0) {
        candidateEnrollments.push({
            id: 'temp_source',
            sprint_id: currentOrCompletedSprintId,
            user_id: user?.id || '',
            started_at: new Date().toISOString(),
            progress: []
        } as any);
    }

    // =========================================================================
    // STAGE 1: SUPERIOR LINKING WITH CODE (1st Priority)
    // When someone clicks that {m1 step 3 op 3} tracked/linked option,
    // it reorders the recommendation of this sprint as the FIRST PRIORITY.
    // =========================================================================
    if (Array.isArray(sprintLinks) && sprintLinks.length > 0) {
        for (const enrollment of candidateEnrollments) {
            const srcSprint = sprints.find(s => s.id === enrollment.sprint_id);
            const codedLinks = sprintLinks.filter(l => l.sourceSprintId === enrollment.sprint_id && l.optionCode && l.optionCode.trim());

            for (const link of codedLinks) {
                if (isOptionLinkMatchedByUser(enrollment, srcSprint, link)) {
                    const target = sprints.find(s => s.id === link.targetSprintId);
                    if (target) {
                        addSprint(target, true); // Allow repeat for explicitly linked same-sprint
                    }
                }
            }
        }
    }

    // =========================================================================
    // STAGE 2: NORMAL SPRINT-TO-SPRINT LINKING WITHOUT CODING (2nd Priority Stage)
    // Once someone starts that sprint, the next linked sprint is what is recorded
    // in the explore page as the second priority stage recommendation.
    // =========================================================================
    for (const enrollment of candidateEnrollments) {
        const srcSprint = sprints.find(s => s.id === enrollment.sprint_id);
        
        // A. Direct links configured in Sprint Links (without option codes)
        if (Array.isArray(sprintLinks) && sprintLinks.length > 0) {
            const directLinks = sprintLinks.filter(l => l.sourceSprintId === enrollment.sprint_id && (!l.optionCode || !l.optionCode.trim()));
            for (const link of directLinks) {
                const target = sprints.find(s => s.id === link.targetSprintId);
                if (target) {
                    addSprint(target, true);
                }
            }
        }

        // B. Sprint Setting direct linked sprint (nextSprintId / linkedSprintId)
        if (srcSprint) {
            const directLinkedId = srcSprint.nextSprintId || srcSprint.linkedSprintId;
            if (directLinkedId) {
                const target = sprints.find(s => s.id === directLinkedId);
                if (target) {
                    addSprint(target, true);
                }
            }
        }
    }

    // =========================================================================
    // STAGE 3: Sprints that override orchestrator
    // =========================================================================
    const overrideSprintsActive = sprints
        .filter(s => s.overrideOrchestrator && !enrolledSprintIds.has(s.id))
        .sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));
    overrideSprintsActive.forEach(s => {
        addSprint(s);
    });

    const userFocus = (participant?.onboardingAnswers as any)?.selected_focus || 
                     Object.values(participant?.onboardingAnswers || {}).find(val => FOCUS_OPTIONS.includes(String(val)));

    // =========================================================================
    // STAGE 4: Prioritization list from orchestrator direction session (slot_dir_sprint)
    // =========================================================================
    const directionMapping = orchestration['slot_dir_sprint'];
    if (directionMapping) {
        const focusMap = directionMapping.sprintFocusMap || {};
        const prioritiesMap = directionMapping.focusOptionPriorityMap || {};
        const assignedIds = directionMapping.sprintIds || (directionMapping.sprintId ? [directionMapping.sprintId] : []);

        if (userFocus) {
            // Sprints mapped to slot_dir_sprint that have the user's active focus tag
            const matches = assignedIds.filter(id => focusMap[id]?.includes(userFocus));
            const priorities = prioritiesMap[userFocus] || [];
            if (matches.length > 0) {
                matches.sort((a, b) => {
                    const idxA = priorities.indexOf(a);
                    const idxB = priorities.indexOf(b);
                    if (idxA > -1 && idxB > -1) return idxA - idxB;
                    if (idxA > -1) return -1;
                    if (idxB > -1) return 1;
                    return 0;
                });

                matches.forEach(sId => {
                    const s = sprints.find(sp => sp.id === sId);
                    if (s) addSprint(s);
                });
            }
        }

        // Fallback: If space permits, add any other assigned sprint ids from slot_dir_sprint in original priority order
        assignedIds.forEach(sId => {
            const s = sprints.find(sp => sp.id === sId);
            if (s) addSprint(s);
        });
    }

    // =========================================================================
    // STAGE 5: Growth Areas (from identity setup)
    // =========================================================================
    const growthAreas = participant?.growthAreas || [];
    if (growthAreas.length > 0) {
        const matchedGroups = GROWTH_AREAS.filter(g => 
            g.options.some(opt => growthAreas.includes(opt))
        );
        if (matchedGroups.length > 0) {
            const targetSprintTitles = matchedGroups.flatMap(g => g.sprints);
            const matchedSprint = sprints.find(s => 
                targetSprintTitles.includes(s.title) && !enrolledSprintIds.has(s.id)
            );
            if (matchedSprint) addSprint(matchedSprint);
        }
    }

    // =========================================================================
    // STAGE 6: Rise Pathway
    // =========================================================================
    const pathwayId = participant?.risePathway;
    if (pathwayId) {
        const pathwaySprintMap: Record<string, string[]> = {
            'student': ['Clarity Sprint', 'Direction Sprint'],
            'early_career': ['Direction Sprint', 'Skill Sprint', 'Confidence Sprint'],
            'growth_pro': ['Leadership Sprint', 'Visibility Sprint', 'Execution Sprint'],
            'builder': ['Execution Sprint', 'Positioning Sprint', 'Focus Sprint'],
            'transition': ['Clarity Sprint', 'Confidence Sprint', 'Consistency Sprint']
        };
        const targetTitles = pathwaySprintMap[pathwayId] || [];
        const matchedSprint = sprints.find(s => 
            targetTitles.includes(s.title) && !enrolledSprintIds.has(s.id)
        );
        if (matchedSprint) addSprint(matchedSprint);
    }

    // =========================================================================
    // STAGE 7: Fallback to any remaining non-enrolled sprints
    // =========================================================================
    sprints.forEach(s => {
        if (!enrolledSprintIds.has(s.id)) {
            addSprint(s);
        }
    });

    return list;
};

/**
 * Returns the first sprint displayed on the Explore page / Next Sprint Recommendation for the user.
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
    const nextSteps = getExploreNextSteps(
        sprintPool, 
        user, 
        orchestration, 
        enrolledSprintIds, 
        userEnrollments, 
        sprintLinks, 
        currentOrCompletedSprintId
    );
    return nextSteps[0] || sprintPool.find(s => !enrolledSprintIds.has(s.id)) || sprintPool[0] || null;
};
