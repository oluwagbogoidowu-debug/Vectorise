import { Sprint, UserRole, Participant, LifecycleSlotAssignment, User } from '../types';
import { FOCUS_OPTIONS } from '../services/mockData';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../constants';

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
 * respecting orchestrator override, slot_dir_sprint mapping with user focus,
 * growth areas, rise pathways, and fallbacks.
 */
export const getExploreNextSteps = (
    sprints: Sprint[],
    user: Participant | User | null,
    orchestration: Record<string, LifecycleSlotAssignment> = {},
    enrolledSprintIds: Set<string> = new Set()
): Sprint[] => {
    const participant = user as Participant;
    const list: Sprint[] = [];
    const seenIds = new Set<string>();

    const addSprint = (sprint: Sprint | undefined | null) => {
        if (sprint && !enrolledSprintIds.has(sprint.id) && !seenIds.has(sprint.id)) {
            list.push(sprint);
            seenIds.add(sprint.id);
        }
    };

    // 0. Include sprints that override orchestrator
    const overrideSprintsActive = sprints
        .filter(s => s.overrideOrchestrator && !enrolledSprintIds.has(s.id))
        .sort((a, b) => (a.overrideOrder || 0) - (b.overrideOrder || 0));
    overrideSprintsActive.forEach(s => {
        addSprint(s);
    });

    const userFocus = (participant?.onboardingAnswers as any)?.selected_focus || 
                     Object.values(participant?.onboardingAnswers || {}).find(val => FOCUS_OPTIONS.includes(String(val)));

    // 1. Prioritization list from the orchestrator in direction session (slot_dir_sprint) first
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

    // 2. If list is still empty, check Growth Areas (from identity setup)
    const growthAreas = participant?.growthAreas || [];
    if (list.length === 0 && growthAreas.length > 0) {
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

    // 3. If list is still empty, check Rise Pathway
    const pathwayId = participant?.risePathway;
    if (list.length === 0 && pathwayId) {
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

    // 4. Fallback to any remaining non-enrolled sprints
    sprints.forEach(s => {
        if (!enrolledSprintIds.has(s.id)) {
            addSprint(s);
        }
    });

    return list;
};

/**
 * Returns the first sprint displayed on the Explore page for the user.
 */
export const getExploreFirstSprint = (
    allPublishedSprints: Sprint[],
    user: Participant | User | null,
    orchestration: Record<string, LifecycleSlotAssignment> = {},
    enrolledSprintIds: Set<string> = new Set()
): Sprint | null => {
    const allowedSprints = filterAllowedSprintsForUser(allPublishedSprints, user);
    const sprintPool = allowedSprints.length > 0 ? allowedSprints : allPublishedSprints;
    const nextSteps = getExploreNextSteps(sprintPool, user, orchestration, enrolledSprintIds);
    return nextSteps[0] || sprintPool.find(s => !enrolledSprintIds.has(s.id)) || sprintPool[0] || null;
};
