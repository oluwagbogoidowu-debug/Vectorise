
export interface MilestoneDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    targetValue: number;
    points: number;
    category: 'coreProgress' | 'longGame' | 'innerWork' | 'influence' | 'onboarding';
    color?: string;
    isAutoClaim?: boolean;
}

export const MILESTONES: MilestoneDefinition[] = [
    // Onboarding
    { id: 'setup_account', title: 'Identity Set', description: 'You completed your profile setup.', icon: '👤', targetValue: 1, points: 10, category: 'onboarding', color: 'orange', isAutoClaim: true },
    { id: 'welcome_login', title: 'First Entry', description: 'Your first login to the platform.', icon: '👋', targetValue: 1, points: 10, category: 'onboarding', color: 'orange', isAutoClaim: true },
    
    // Core Progress
    { id: 's1', title: 'First Spark', description: 'You started your rise.', icon: '🚀', targetValue: 1, points: 5, category: 'coreProgress', isAutoClaim: true },
    { id: 's2', title: 'The Closer', description: 'You finished what you started.', icon: '🏁', targetValue: 1, points: 15, category: 'coreProgress' },
    { id: 's4', title: 'Growth Habit', description: 'Consistency is becoming your default.', icon: '🏗️', targetValue: 3, points: 50, category: 'coreProgress' },
    
    // Long Game
    { id: 'cm1', title: 'Rooted', description: '60 days of intentional growth.', icon: '🌱', targetValue: 60, points: 20, category: 'longGame', color: 'blue' },
    { id: 'cm2', title: 'Quarter Builder', description: '90 days of structured rise.', icon: '🏢', targetValue: 90, points: 50, category: 'longGame', color: 'blue' },
    
    // Inner Work
    { id: 'r1', title: 'Deep Diver', description: 'You went beyond surface-level growth.', icon: '🌊', targetValue: 1, points: 10, category: 'innerWork', color: 'yellow' },
    { id: 'r2', title: 'Self-Aware', description: 'You turned reflection into clarity.', icon: '💎', targetValue: 5, points: 30, category: 'innerWork', color: 'yellow' },
    
    // Influence
    { id: 'i1', title: 'Catalyst', description: 'You helped someone start their rise.', icon: '🌱', targetValue: 1, points: 5, category: 'influence', color: 'teal' },
    { id: 'i10', title: 'Multiplier', description: 'You ignited growth in 10 people.', icon: '🌳', targetValue: 10, points: 50, category: 'influence', color: 'teal' }
];
