import { Sprint, UserRole, Participant, LifecycleSlotAssignment, User, ParticipantSprint } from '../types';
import { FOCUS_OPTIONS } from '../services/mockData';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../constants';

export const parseOptionCodeHelper = (code: string, sprint?: Sprint | null) => {
    if (!code) return null;
    const clean = code.trim().replace(/^\{|\}$/g, '').trim();
    
    let dayNum = 1;
    let stepNum = 1;
    let opNum = 1;

    const mMatch = clean.match(/M(\d+)\s+Step\s+(\d+)\s+op(\d+)/i);
    const dMatch = clean.match(/Day\s+(\d+)\s+Step\s+(\d+)\s+op(\d+)/i);
    const sMatch = clean.match(/Step\s+(\d+)\s+op(\d+)/i);
    const shortMatch = clean.match(/M(\d+)\s+S(\d+)\s+O(\d+)/i);

    if (mMatch) {
        dayNum = parseInt(mMatch[1], 10);
        stepNum = parseInt(mMatch[2], 10);
        opNum = parseInt(mMatch[3], 10);
    } else if (dMatch) {
        dayNum = parseInt(dMatch[1], 10);
        stepNum = parseInt(dMatch[2], 10);
        opNum = parseInt(dMatch[3], 10);
    } else if (shortMatch) {
        dayNum = parseInt(shortMatch[1], 10);
        stepNum = parseInt(shortMatch[2], 10);
        opNum = parseInt(shortMatch[3], 10);
    } else if (sMatch) {
        stepNum = parseInt(sMatch[1], 10);
        opNum = parseInt(sMatch[2], 10);
    } else {
        return null;
    }

    const stepIdx = stepNum - 1;
    const optionIdx = opNum - 1;

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
 */
export const isOptionLinkMatchedByUser = (
    enrollment: ParticipantSprint | undefined | null,
    sourceSprint: Sprint | undefined | null,
    link: any
): boolean => {
    if (!link || (!link.optionCode || !link.optionCode.trim())) return true;
    if (!enrollment) return false;
    const parsed = parseOptionCodeHelper(link.optionCode, sourceSprint);
    const targetOptionText = (link.optionText || parsed?.optionText || '').trim().toLowerCase();

    const progressList = Array.isArray(enrollment.progress) ? enrollment.progress : [];

    // Check specific day/step if parsed
    if (parsed) {
        const dayProg = progressList.find(p => Number(p.day) === Number(parsed.dayNum));
        if (dayProg) {
            const answer = dayProg.answers?.[parsed.stepIdx];
            if (answer && typeof answer === 'string') {
                const cleanAns = answer.trim().toLowerCase();
                if (targetOptionText && (cleanAns === targetOptionText || cleanAns.includes(targetOptionText) || targetOptionText.includes(cleanAns))) {
                    return true;
                }
            }
        }
    }

    // Check across all progress answers and submissions
    for (const p of progressList) {
        if (Array.isArray(p.answers)) {
            for (const ans of p.answers) {
                if (typeof ans === 'string' && ans.trim()) {
                    const cleanAns = ans.trim().toLowerCase();
                    if (targetOptionText && (cleanAns === targetOptionText || cleanAns.includes(targetOptionText) || targetOptionText.includes(cleanAns))) {
                        return true;
                    }
                    if (link.optionCode && cleanAns.includes(link.optionCode.toLowerCase())) {
                        return true;
                    }
                }
            }
        }
        if (typeof p.submission === 'string' && targetOptionText) {
            const cleanSub = p.submission.toLowerCase();
            if (cleanSub.includes(targetOptionText)) {
                return true;
            }
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
    if (!user) return allSprints;

    return allSprints.filter(s => {
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
 * 0. Sprint-to-Sprint Option Linking (Senior Brother: Option match via Orchestrator Lifecycle or Sprint Setting Bypass)
 * 1. Orchestrator Override Sprints (overrideOrchestrator flag)
 * 2. Lifecycle Orchestrator slots (slot_dir_sprint mapping with user focus)
 * 3. Growth Areas (from identity setup)
 * 4. Rise Pathway
 * 5. Fallbacks to remaining available sprints
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

    // =========================================================================
    // 0. SENIOR BROTHER: Sprint-to-Sprint Option Linking & Sprint Setting Bypass
    // =========================================================================
    let sourceSprintId = currentOrCompletedSprintId;
    let sourceEnrollment: ParticipantSprint | undefined = undefined;

    if (userEnrollments && userEnrollments.length > 0) {
        if (sourceSprintId) {
            sourceEnrollment = userEnrollments.find(e => e.sprint_id === sourceSprintId);
        } else {
            // Find most recently completed or active enrollment
            const completed = userEnrollments
                .filter(e => e.completed_at || (Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every(p => p.completed)))
                .sort((a, b) => new Date(b.completed_at || b.started_at || 0).getTime() - new Date(a.completed_at || a.started_at || 0).getTime());
            
            if (completed.length > 0) {
                sourceEnrollment = completed[0];
                sourceSprintId = completed[0].sprint_id;
            } else {
                const active = [...userEnrollments].sort((a, b) => 
                    new Date(b.last_activity_at || b.started_at || 0).getTime() - new Date(a.last_activity_at || a.started_at || 0).getTime()
                );
                if (active.length > 0) {
                    sourceEnrollment = active[0];
                    sourceSprintId = active[0].sprint_id;
                }
            }
        }
    }

    if (sourceSprintId) {
        const sourceSprint = sprints.find(s => s.id === sourceSprintId);

        // A. Check Option-based linking configured in Lifecycle Orchestrator
        if (Array.isArray(sprintLinks) && sprintLinks.length > 0) {
            const relevantLinks = sprintLinks.filter(l => l.sourceSprintId === sourceSprintId);
            
            // First check for links where participant answers actually matched the option choice
            for (const link of relevantLinks) {
                if (isOptionLinkMatchedByUser(sourceEnrollment, sourceSprint, link)) {
                    const target = sprints.find(s => s.id === link.targetSprintId);
                    if (target) {
                        addSprint(target, true); // Allow repeat for explicitly linked same-sprint
                    }
                }
            }

            // Fallback: If user had no specific poll match but source sprint has direct link rules
            for (const link of relevantLinks) {
                const target = sprints.find(s => s.id === link.targetSprintId);
                if (target) {
                    addSprint(target, true); // Allow repeat for explicitly linked same-sprint
                }
            }
        }

        // B. Check Sprint Setting Bypass (Direct linked sprint set on source sprint itself)
        if (sourceSprint) {
            const directLinkedId = sourceSprint.nextSprintId || sourceSprint.linkedSprintId;
            if (directLinkedId) {
                const target = sprints.find(s => s.id === directLinkedId);
                if (target) {
                    addSprint(target, true); // Allow repeat for explicitly linked same-sprint
                }
            }
        }
    }

    // =========================================================================
    // 1. Sprints that override orchestrator
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
    // 2. Prioritization list from orchestrator direction session (slot_dir_sprint)
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
    // 3. Growth Areas (from identity setup)
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
    // 4. Rise Pathway
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
    // 5. Fallback to any remaining non-enrolled sprints
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
