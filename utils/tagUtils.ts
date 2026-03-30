
import { PERSONA_TAG_MAPPING } from '../services/mockData';

/**
 * Translates a full sentence answer into a concise 1-2 word tag.
 */
export const translateToTag = (persona: string, answer: string): string => {
  if (PERSONA_TAG_MAPPING[persona]?.[answer]) {
    return PERSONA_TAG_MAPPING[persona][answer];
  }
  // Fallback: take first two words if no mapping
  return (answer || '').split(' ').slice(0, 2).join(' ');
};

/**
 * Calculates a match score (0-10) between a user's tag-based profile and a sprint's targeting.
 * More specific tags (p1, p2, p3) have higher priority than the general persona.
 */
export const calculateMatchScore = (userProfile: any, sprintTargeting: any): number => {
    if (!userProfile || !sprintTargeting) return 0;
    
    let score = 0;
    // Persona is base level (weight 1)
    if (userProfile.persona === sprintTargeting.persona) score += 1;
    
    // Specific focus areas have higher weight (weight 2 each)
    if (userProfile.p1 && userProfile.p1 === sprintTargeting.p1) score += 2;
    if (userProfile.p2 && userProfile.p2 === sprintTargeting.p2) score += 2;
    if (userProfile.p3 && userProfile.p3 === sprintTargeting.p3) score += 2;
    
    return score;
};

// QUIZ_STRUCTURE is deprecated in favor of PERSONA_QUIZZES in mockData.ts
