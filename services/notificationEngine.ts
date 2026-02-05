
import { GoogleGenAI, Type } from "@google/genai";
import { NotificationPayload } from "../types";

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export type UserStage = 'clarity' | 'skill-building' | 'execution';
export type NotificationType = 'reminder' | 'nudge' | 'reflection';

export const notificationEngine = {
  /**
   * Generates a personalized notification based on user state using Gemini.
   */
  generateNotification: async (
    timeOfDay: TimeOfDay,
    userStage: UserStage,
    notificationType: NotificationType
  ): Promise<NotificationPayload | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `
Purpose:
Generate push notifications that help users take consistent action toward clarity, skill growth, and career direction.
Context:
Notifications are delivered as web push (Android, Desktop, PWA)
User is not actively inside the app
Notification must stand alone and make sense instantly
Rules:
One clear idea per notification
Calm, human, coach-like tone
No emojis
No marketing language
No exclamation marks
Max 120 characters
Action-oriented or reflective, not informational
User state variables you may receive:
time_of_day: morning | afternoon | evening
user_stage: clarity | skill-building | execution
notification_type: reminder | nudge | reflection

Behavior:
Match tone to time_of_day
Match message intent to notification_type
Align content with user_stage
Encourage one small, doable action
Generate exactly ONE notification per request.
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `time_of_day: ${timeOfDay}, user_stage: ${userStage}, notification_type: ${notificationType}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A concise title for the notification." },
              body: { type: Type.STRING, description: "The core coaching message, max 120 chars." }
            },
            required: ["title", "body"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text.trim()) as NotificationPayload;
      }
      return null;
    } catch (error) {
      console.error("Notification Engine Failure:", error);
      return null;
    }
  }
};
