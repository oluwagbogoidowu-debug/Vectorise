import { GoogleGenAI } from "@google/genai";
import type { Request, Response } from "express";

export default async function geminiResearchHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    prompt,
    topic,
    moveDay,
    stepIndex,
    stepPrompt,
    footnote,
    userAnswer,
    preset,
  } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured on the server. Please verify your environment configuration.",
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Construct a tailored, high-value prompt based on preset or user query
  let queryText = prompt?.trim() || "";
  if (preset === "explain_this") {
    queryText = `Conduct an in-depth breakdown and strategic explanation of this action step. Focus on the core concepts, psychological principles, or leverage points, and explain how to apply them directly.`;
  } else if (preset === "examples") {
    queryText = `Provide 3 compelling real-world case studies, best practices, or practical scenarios demonstrating how top performers and leaders successfully execute on this action step.`;
  } else if (preset === "research_this") {
    queryText = `Provide high-value strategic research, actionable execution frameworks, and evidence-grounded insights to fully master this action step.`;
  } else if (preset === "improve_my_answer") {
    queryText = `Analyze my current input or reflection and suggest 3 high-impact refinements, concrete improvements, or strategic extensions to take my draft execution to the next level.`;
  } else if (!queryText) {
    queryText = `Provide strategic research, actionable execution frameworks, and relevant insights to master this action step.`;
  }

  const fullPrompt = `
Sprint / Program: ${topic || "Personal Growth Sprint"}
Move (Day): ${moveDay || 1}
Action Step ${(Number(stepIndex) || 0) + 1}: "${stepPrompt || ""}"
${footnote ? `Additional Context / Footnote: "${footnote}"\n` : ""}${userAnswer ? `Participant's Current Input / Reflection: "${userAnswer}"\n` : ""}
Research Objective / Query:
${queryText}
  `.trim();

  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
  let research = "";
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[API Gemini Research] Attempting generation with model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config: {
          systemInstruction: `You are an elite research assistant and high-performance strategy advisor embedded in Vectorise, a personal growth sprint platform.
Your mission is to conduct high-fidelity, evidence-grounded, and intensely practical research on action steps that users and coaches are working on.

Style & Formatting:
- Use clean Markdown with structured headers (##, ###), bullet points, and key bold takeaways.
- Provide clear, actionable frameworks, operational tactics, and relevant mental models.
- Avoid generic filler, platitudes, or long winded introductions. Dive straight into high-value insights.
- End with a punchy "🔑 Key Takeaway" summarizing the single highest-leverage move.`,
        },
      });

      research = response.text || "";
      if (research) {
        console.log(`[API Gemini Research] Successfully generated research using ${modelName}`);
        return res.status(200).json({
          success: true,
          research,
          modelUsed: modelName
        });
      }
    } catch (error: any) {
      console.warn(`[API Gemini Research] Model ${modelName} failed/overloaded:`, error?.message || error);
      lastError = error;
    }
  }

  // If all models failed, propagate the error response
  console.error("[API Gemini Research] All configured models failed.", lastError);
  return res.status(503).json({
    success: false,
    error: lastError?.message || "All Gemini models are currently experiencing high demand. Please try again in a few moments.",
  });
}
