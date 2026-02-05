import { GoogleGenAI } from "@google/genai";

/**
 * Generates inspiring content for a sprint using Gemini.
 */
export const generateSprintContent = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, inspiring lesson text for a personal growth sprint based on this topic: "${prompt}". Keep it concise and actionable, under 150 words.`,
    });
    return response.text || "I'm sorry, I couldn't generate that content right now.";
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      return "Network error: Unable to reach the content engine. Please check your connection and try again.";
    }
    return "There was an error generating content. Please try again.";
  }
};

/**
 * Generates a personalized growth audit based on user activity data.
 */
export const generateGrowthInsights = async (stats: {
  completedCount: number;
  activeCount: number;
  categories: Record<string, number>;
  avgCompletionTimeHrs: number;
  streak: number;
}): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const categoryStr = Object.entries(stats.categories).map(([k, v]) => `${k}: ${v} tasks`).join(', ');
  
  const prompt = `
    Acts as an elite high-performance coach. Analyze these user growth metrics:
    - Completed Tasks: ${stats.completedCount}
    - Active Sprints: ${stats.activeCount}
    - Category Focus: ${categoryStr}
    - Avg. Completion Pace: ${stats.avgCompletionTimeHrs.toFixed(1)} hours after unlock
    - Current Streak: ${stats.streak} days
    
    Provide a concise "Growth Audit" (max 100 words). 
    Highlight their strongest category, identify a "blind spot" (least active category), 
    and give one specific recommendation on how to improve their "Pace" or "Consistency".
    Format: Use 3 bullet points with bold headers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Continue your path; momentum is your greatest ally.";
  } catch (error: any) {
    console.error("Gemini Insights Error:", error);
    if (error.message?.includes('fetch')) {
      return "Unable to perform audit due to network constraints. Focus on your most consistent category today.";
    }
    return "Focus on your least active category this week to build well-rounded leverage.";
  }
};