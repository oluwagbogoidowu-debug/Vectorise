
import { GoogleGenAI } from "@google/genai";

// This is a mock service. In a real application, the API key would be
// securely managed and provided through environment variables.
// The code uses process.env.API_KEY as per the instructions.
const apiKey = process.env.API_KEY;

export const generateSprintContent = async (prompt: string): Promise<string> => {
  console.log("Generating content for prompt:", prompt);

  if (!apiKey) {
    console.warn("API_KEY is not set. Using mock response.");
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(`This is a mock AI response for the prompt: "${prompt}". In a real scenario, Gemini would generate a detailed lesson or task prompt here. For example, a lesson on 'The Power of Habit' might start with: 'Understanding the cue-routine-reward loop is the first step to mastering your habits...'`);
      }, 1500);
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, inspiring lesson text for a personal growth sprint based on this topic: "${prompt}". Keep it concise and actionable, under 150 words.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error generating content. Please try again.";
  }
};
