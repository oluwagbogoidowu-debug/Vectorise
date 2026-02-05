import { Sprint } from '../types';

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
    return !sprint.title?.trim() || 
           !sprint.description?.trim() || 
           !sprint.category?.trim() || 
           !sprint.coverImageUrl?.trim() ||
           !sprint.outcomes || 
           sprint.outcomes.length === 0 || 
           sprint.outcomes.some(o => !o.trim());
};

/**
 * Checks if a sprint is missing daily content (lesson/task).
 */
export const isSprintIncomplete = (sprint: Sprint): boolean => {
    if (!sprint.dailyContent || sprint.dailyContent.length < sprint.duration) {
        return true;
    }
    
    for (let i = 1; i <= sprint.duration; i++) {
        const content = sprint.dailyContent.find(c => c.day === i);
        if (!content || !content.lessonText?.trim() || !content.taskPrompt?.trim()) {
            return true;
        }
    }
    
    return false;
};