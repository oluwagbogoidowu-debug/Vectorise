import { GoogleGenAI } from "@google/genai";
import type { Request, Response } from "express";

export default async function geminiResearchHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    prompt,
    topic,
    sprintDescription,
    sprintOutcomes,
    category,
    totalMoves,
    dailyContent,
    moveDay,
    stepIndex,
    stepPrompt,
    footnote,
    askAiGuidance,
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
    queryText = `Conduct an in-depth breakdown and strategic explanation of this action step. Ground your breakdown in the overall sprint trajectory and explain how it directly serves the sprint outcome.`;
  } else if (preset === "examples") {
    queryText = `Provide 3 compelling real-world case studies, best practices, or concrete execution models showing how top performers master this action step within this specific sprint domain.`;
  } else if (preset === "research_this") {
    queryText = `Provide high-value strategic research, actionable execution frameworks, and evidence-grounded insights to master this action step in the context of the whole sprint.`;
  } else if (preset === "improve_my_answer") {
    queryText = `Analyze my current input or reflection and suggest 3 high-impact refinements or strategic extensions to elevate my draft execution.`;
  } else if (!queryText) {
    queryText = `Provide strategic guidance, actionable execution frameworks, and relevant insights to master this action step.`;
  }

  // Build comprehensive sprint curriculum from Move 1 to the end
  let curriculumText = "";
  if (Array.isArray(dailyContent) && dailyContent.length > 0) {
    const sortedContent = [...dailyContent].sort(
      (a, b) => (Number(a.day) || 0) - (Number(b.day) || 0)
    );

    curriculumText = sortedContent
      .map((dc) => {
        const dayNum = Number(dc.day) || 1;
        const rawLesson = (dc.lessonText || "").trim();
        // Remove excessive markdown artifacts or keep concise
        const lessonSnippet = rawLesson ? rawLesson.slice(0, 1200) : "(No lesson text provided)";
        
        let stepsFormatted = "";
        if (Array.isArray(dc.taskPrompts) && dc.taskPrompts.filter(Boolean).length > 0) {
          stepsFormatted = dc.taskPrompts
            .map((p: string, idx: number) => {
              const fn = dc.taskFootnotes?.[idx] ? ` [Footnote: "${dc.taskFootnotes[idx]}"]` : "";
              const h = dc.taskHints?.[idx] ? ` [Hint: "${dc.taskHints[idx]}"]` : "";
              const aiNote = dc.taskAskAis?.[idx] ? ` [Coach AI Guide: "${dc.taskAskAis[idx]}"]` : "";
              return `    • Step ${idx + 1}: ${p}${fn}${h}${aiNote}`;
            })
            .join("\n");
        } else if (dc.taskPrompt) {
          stepsFormatted = `    • Action Step: ${dc.taskPrompt}`;
        } else {
          stepsFormatted = `    • (No action steps defined)`;
        }

        return `--- MOVE ${dayNum} ---\nLesson & Insights:\n${lessonSnippet}\nAction Steps:\n${stepsFormatted}`;
      })
      .join("\n\n");
  }

  const outcomesFormatted = Array.isArray(sprintOutcomes) && sprintOutcomes.length > 0
    ? sprintOutcomes.map((o: string, idx: number) => `${idx + 1}. ${o}`).join("\n")
    : "";

  const fullPrompt = `
========================================
SPRINT OVERVIEW & ARCHITECTURE
========================================
Sprint Title: ${topic || "Sprint"}
Category: ${category || "Performance & Growth"}
Total Moves in Sprint: ${totalMoves || (Array.isArray(dailyContent) ? dailyContent.length : 1)} Moves
${sprintDescription ? `Sprint Purpose & Summary:\n${sprintDescription}\n` : ""}
${outcomesFormatted ? `Target Sprint Outcomes:\n${outcomesFormatted}\n` : ""}

========================================
FULL SPRINT CURRICULUM (MOVE 1 TO END)
========================================
${curriculumText || `Move ${moveDay || 1}: ${stepPrompt || ""}`}

========================================
CURRENT PARTICIPANT CONTEXT & FOCUS
========================================
Active Move: Move ${moveDay || 1}
Active Action Step: Step ${(Number(stepIndex) || 0) + 1} ("${stepPrompt || ""}")
${footnote ? `Step Footnote / Context: "${footnote}"\n` : ""}
${askAiGuidance ? `Coach's Special Guidance for this step: "${askAiGuidance}"\n` : ""}
${userAnswer ? `Participant's Current Input / Reflection: "${userAnswer}"\n` : ""}

========================================
USER QUESTION / RESEARCH OBJECTIVE
========================================
${queryText}
  `.trim();

  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
  let research = "";
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[API Gemini Research] Generating context-grounded response with: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: fullPrompt,
        config: {
          systemInstruction: `You are the master AI sprint mentor embedded in Vectorise.

CRITICAL DIRECTIVE - COMPLETE SPRINT CONTEXT UNDERSTANDING:
You have been provided with the complete curriculum and lesson content of this entire sprint from Move 1 through to the final move.
Before answering:
1. Deeply understand the holistic arc, philosophy, specific terms, and methodologies of this sprint.
2. Ground every answer directly in the sprint's unique framework — reference how prior moves build up to this step, and how mastering this step leads toward the upcoming moves and final sprint outcomes.
3. If the coach provided custom step guidance or footnotes, strictly integrate and align with that coach's intent.
4. Avoid generic, boilerplate self-help advice. Make your response hyper-specific, practical, and highly attuned to this exact sprint context.

Style & Formatting:
- Write in clean, structured Markdown with clear section headers (##, ###), bullet points, and bold concepts.
- Provide concrete tactical blueprints, real-world examples, and actionable mental models.
- Avoid fluff, pleasantries, or preamble. Dive straight into high-leverage insight.
- Conclude with a punchy "🔑 Key Takeaway" that captures the single most important action for this step in relation to the entire sprint.`,
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
