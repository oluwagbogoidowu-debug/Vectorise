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
  if (preset === "deep_dive") {
    queryText = `Conduct an in-depth research breakdown and strategic analysis on this action step. Explain the underlying psychological, scientific, or practical principles, why it works, and how to maximize results.`;
  } else if (preset === "examples") {
    queryText = `Provide 3 compelling real-world case studies or practical scenarios demonstrating how top performers, innovators, or leaders successfully execute on this action step.`;
  } else if (preset === "action_plan") {
    queryText = `Formulate a clear, friction-free 3-phase execution checklist and tactical timeline to complete this action step with maximum momentum.`;
  } else if (preset === "pitfalls") {
    queryText = `Identify the top 3 hidden pitfalls, common mistakes, or cognitive biases people encounter when tackling this action step, and provide counter-strategies for each.`;
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
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

    const research = response.text || "No research output returned by Gemini.";
    return res.status(200).json({
      success: true,
      research,
    });
  } catch (error: any) {
    console.error("[API Gemini Research] Error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate research with Gemini AI.",
    });
  }
}
