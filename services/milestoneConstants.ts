
export interface MilestoneDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    targetValue: number;
    points: number;
    category: 'coreProgress' | 'longGame' | 'innerWork' | 'influence';
    color?: string;
    isAutoClaim?: boolean;
}

export const MILESTONES: MilestoneDefinition[] = [
    // Core Progress
    { id: 'first_leap', title: 'You have taken the first leap', description: 'Completed the first task of your first sprint.', icon: '🚀', targetValue: 1, points: 10, category: 'coreProgress', isAutoClaim: true },
    { id: 's2', title: 'The Closer', description: 'You finished your first sprint.', icon: '🏁', targetValue: 1, points: 15, category: 'coreProgress' },
    { id: 's4', title: 'Growth Habit', description: 'Consistency is becoming your default.', icon: '🏗️', targetValue: 14, points: 50, category: 'coreProgress' },
    
    // Long Game
    { id: 'cm1', title: 'Rooted', description: '60 days of intentional growth.', icon: '🌱', targetValue: 60, points: 20, category: 'longGame', color: 'blue' },
    { id: 'cm2', title: 'Quarter Builder', description: '90 days of structured rise.', icon: '🏢', targetValue: 90, points: 50, category: 'longGame', color: 'blue' },
    
    // Inner Work
    { id: 'r1', title: 'Deep Diver', description: 'You went beyond surface-level growth.', icon: '🌊', targetValue: 1, points: 10, category: 'innerWork', color: 'yellow' },
    { id: 'r2', title: 'Self-Aware', description: 'You turned reflection into clarity.', icon: '💎', targetValue: 5, points: 30, category: 'innerWork', color: 'yellow' },
    
    // Influence
    { id: 'i1', title: 'Starter', description: 'You helped someone start their rise.', icon: '🌱', targetValue: 1, points: 5, category: 'influence', color: 'teal' },
    { id: 'i3', title: 'Builder', description: 'You helped 3 people start their rise.', icon: '🔧', targetValue: 3, points: 15, category: 'influence', color: 'teal' },
    { id: 'i5', title: 'Catalyst', description: 'You helped 5 people start their rise.', icon: '⚡', targetValue: 5, points: 30, category: 'influence', color: 'teal' },
    { id: 'i10', title: 'Accelerator', description: 'You ignited growth in 10 people.', icon: '🚀', targetValue: 10, points: 70, category: 'influence', color: 'teal' },
    { id: 'i20', title: 'Architect', description: 'You became an architect of opportunity.', icon: '🧠', targetValue: 20, points: 150, category: 'influence', color: 'teal' },
    { id: 'i30', title: 'Inner Circle', description: 'You joined the inner circle of legacy.', icon: '👑', targetValue: 30, points: 250, category: 'influence', color: 'teal' }
];

export interface UserMilestoneStats {
    completedSprints: number;
    completedTasksCount: number;
    totalTaskDays: number;
    meaningfulReflections: number;
    peopleHelped: number;
}

export const calculateMilestoneStatValue = (milestoneId: string, stats: UserMilestoneStats): number => {
    switch (milestoneId) {
        case 'first_leap': 
        case 's4': 
        case 'cm1': 
        case 'cm2': 
            return stats.completedTasksCount;
        case 's2': 
            return stats.completedSprints;
        case 'r1': 
        case 'r2': 
            return stats.meaningfulReflections;
        case 'i1': 
        case 'i3': 
        case 'i5': 
        case 'i10': 
        case 'i20': 
        case 'i30': 
            return stats.peopleHelped;
        default: 
            return 0;
    }
};

export const computeMilestoneStats = (
    enrollments: Array<any>,
    reflections: Array<{ content?: string; userId?: string }>,
    referralsCount: number
): UserMilestoneStats => {
    const getProgress = (e: any) => (e && (e.progress || e.enrollment?.progress)) || [];

    const completedSprints = enrollments.filter(e => {
        const prog = getProgress(e);
        return prog.length > 0 && prog.every((day: any) => day.completed);
    }).length;

    const completedTasksCount = enrollments.reduce((sum, e) => {
        const prog = getProgress(e);
        return sum + prog.filter((day: any) => day.completed).length;
    }, 0);

    const allCompletedDates = enrollments.flatMap(e => {
        const prog = getProgress(e);
        return prog
            .filter((day: any) => day.completed && day.completedAt)
            .map((day: any) => new Date(day.completedAt!).toDateString());
    });
    const totalTaskDays = new Set(allCompletedDates).size;

    const meaningfulReflections = reflections.filter(r => 
        r.content && r.content.trim().length > 50
    ).length;

    return {
        completedSprints,
        completedTasksCount,
        totalTaskDays,
        meaningfulReflections,
        peopleHelped: referralsCount
    };
};
