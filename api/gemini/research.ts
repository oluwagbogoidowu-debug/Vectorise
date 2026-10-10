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
    history,
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
  const isResearchMode = preset === "research_this" || queryText.toLowerCase().includes("research");

  // Ensure stepPrompt has placeholders resolved if any raw tokens remain
  let resolvedStepPrompt = (stepPrompt || "").trim();
  if (userAnswer && /\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d+[^}]*\}/i.test(resolvedStepPrompt)) {
    resolvedStepPrompt = resolvedStepPrompt.replace(
      /\{(?:\s*[dDmM](?:ay|ove)?\s*\d+\s+)?\s*[sS]?tep\s*\d+[^}]*\}/gi,
      typeof userAnswer === "string" ? userAnswer : String(userAnswer)
    );
  }

  if (preset === "explain_this") {
    queryText = `Explain this action step or concept clearly in the context of this sprint. Explain why it matters and how to approach it.`;
  } else if (preset === "examples") {
    queryText = `Give relevant, high-quality, practical examples showing how to successfully execute this action step in this domain.`;
  } else if (preset === "research_this") {
    queryText = `Actually perform web research on this action step topic. Search current, relevant information from multiple credible sources, synthesize findings, identify useful patterns, examples, roles, opportunities, or insights relevant to completing this action step, and cite the sources used. Do NOT teach how to research; deliver the actual researched findings.`;
  } else if (preset === "improve_my_answer") {
    queryText = `Review and improve my current answer/reflection without replacing my own thinking. Suggest sharp refinements, strategic extensions, and improvements.`;
  } else if (!queryText) {
    queryText = `Help me complete this current action step with actionable guidance and insights.`;
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

  let historySection = "";
  if (Array.isArray(history) && history.length > 0) {
    historySection = `
========================================
PRIOR CONVERSATION IN THIS TAB
========================================
${history
  .map((m: any) => `${m.role === 'user' ? 'User Question' : 'Research Assistant'}: ${m.text || m.content || ''}`)
  .join('\n\n')}
`;
  }

  const fullPrompt = `
========================================
SPRINT CONTEXT
========================================
Sprint Title: ${topic || "Sprint"}
Category: ${category || "Performance & Growth"}
Total Moves in Sprint: ${totalMoves || (Array.isArray(dailyContent) ? dailyContent.length : 1)} Moves
${sprintDescription ? `Sprint Purpose & Summary:\n${sprintDescription}\n` : ""}
${outcomesFormatted ? `Target Sprint Outcomes:\n${outcomesFormatted}\n` : ""}

========================================
FULL SPRINT CURRICULUM (MOVE 1 TO END)
========================================
${curriculumText || `Move ${moveDay || 1}: ${resolvedStepPrompt || ""}`}

========================================
CURRENT ACTION STEP DETAILS
========================================
Active Move: Move ${moveDay || 1}
Active Action Step: Step ${(Number(stepIndex) || 0) + 1} ("${resolvedStepPrompt || ""}")
${footnote ? `Step Footnote / Context: "${footnote}"\n` : ""}
${askAiGuidance ? `Coach's Special Guidance for this step: "${askAiGuidance}"\n` : ""}
${userAnswer ? `Participant's Current Input / Draft: "${userAnswer}"\n` : ""}
${historySection}
========================================
REQUESTED OBJECTIVE / QUERY
========================================
${queryText}
  `.trim();

  const systemInstruction = `You are the VectoRise Research Assistant.

Your job is to help the user complete the current action step.

CRITICAL INSTRUCTION ON DYNAMIC USER CHOICES:
If an action step states or references a user's choice (for example: "You chose Financial Analysis" or "Selected option: Financial Analysis"), ALWAYS explain, research, and provide examples for the concrete chosen concept ("Financial Analysis"), rather than referencing template variables, bracketed tags, or internal step numbers. Treat the resolved choice as the explicit subject of the user's action step.

When the user selects "Research this", actually research the topic using web search/Google Search grounding. Do NOT teach the user how to research it.
- Search current, relevant information from multiple credible sources.
- Analyze and synthesize the findings.
- Identify useful patterns, examples, roles, opportunities, or insights relevant to the action step.
- Cite the sources used.
- Clearly distinguish facts from your interpretation.
- Keep the response concise and focused on helping the user move forward.

Only explain how to conduct the research if the user explicitly asks.

Modes:
- Explain this: Explain the action or concept.
- Give me examples: Give relevant examples.
- Research this: Actually perform web research and report findings with sources.
- Improve my answer: Review and improve the user's response without replacing their thinking.

  Do not invent information or sources.
Structure output in crisp, clean Markdown with headings and bullet points.`;

  // Ordered fallback plans to ensure high reliability and avoid hitting single-model quota
  interface AttemptConfig {
    model: string;
    useSearch: boolean;
    label: string;
  }

  const fallbackPlans: AttemptConfig[] = [
    // 1. Primary: gemini-3.8-flash (with search if requested)
    { model: "gemini-3.8-flash", useSearch: isResearchMode, label: "Primary (gemini-3.8-flash)" },
    // 2. Fallback 1: gemini-flash-latest (with search if requested)
    { model: "gemini-flash-latest", useSearch: isResearchMode, label: "Fallback 1 (gemini-flash-latest)" },
    // 3. Fallback 2: gemini-3.1-flash-lite (with search if requested)
    { model: "gemini-3.1-flash-lite", useSearch: isResearchMode, label: "Fallback 2 (gemini-3.1-flash-lite)" },
    // 4. Safety net without search tool if search tool was rate limited or exhausted
    ...(isResearchMode
      ? [
          { model: "gemini-3.8-flash", useSearch: false, label: "Fallback 3 (gemini-3.8-flash without tool)" },
          { model: "gemini-flash-latest", useSearch: false, label: "Fallback 4 (gemini-flash-latest without tool)" },
        ]
      : []),
  ];

  const isQuotaOrRateLimitError = (err: any): boolean => {
    if (!err) return false;
    const status = err.status || err.statusCode || err.code || err.response?.status;
    if (status === 429 || status === 503) return true;

    const msg = (err.message || String(err)).toLowerCase();
    return (
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('resource_exhausted') ||
      msg.includes('too many requests') ||
      msg.includes('overloaded') ||
      msg.includes('temporarily unavailable')
    );
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  let research = "";
  let lastError: any = null;

  for (let i = 0; i < fallbackPlans.length; i++) {
    const plan = fallbackPlans[i];
    try {
      console.log(`[API Gemini Research] Attempt ${i + 1}/${fallbackPlans.length}: Generating with ${plan.label}`);

      const config: any = {
        systemInstruction,
      };

      if (plan.useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: plan.model,
        contents: fullPrompt,
        config,
      });

      research = response.text || "";

      // Append grounding citations if provided by Google Search and not already in text
      const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (searchChunks && Array.isArray(searchChunks) && searchChunks.length > 0 && plan.useSearch) {
        const webSources = searchChunks
          .map((chunk: any) => chunk.web)
          .filter((w: any) => w && (w.uri || w.title));

        if (webSources.length > 0 && !research.toLowerCase().includes("sources") && !research.toLowerCase().includes("references")) {
          const formattedSources = webSources
            .slice(0, 5)
            .map((s: any, idx: number) => `- [${s.title || s.uri}](${s.uri})`)
            .join("\n");
          research += `\n\n### Sources\n${formattedSources}`;
        }
      }

      if (research) {
        console.log(`[API Gemini Research] Successfully generated research using ${plan.label}`);
        return res.status(200).json({
          success: true,
          research,
          modelUsed: plan.model,
        });
      }
    } catch (error: any) {
      lastError = error;
      const isQuota = isQuotaOrRateLimitError(error);

      if (isQuota) {
        console.warn(`[API Gemini Research] ${plan.label} hit quota limit / rate limit (429). Switching to fallback model...`);
      } else {
        console.warn(`[API Gemini Research] ${plan.label} failed: ${error?.message || error}. Trying fallback...`);
      }

      // If there are more fallback plans, add a brief pause and continue to next model in background
      if (i < fallbackPlans.length - 1) {
        await sleep(isQuota ? 500 : 250);
      }
    }
  }

  // If all fallback models failed, return a friendly user message (never a raw technical 429 API error)
  console.error("[API Gemini Research] All configured model fallbacks failed.", lastError);
  return res.status(503).json({
    success: false,
    error: "The AI research assistant is currently experiencing high demand. Please try again in a few moments.",
  });
}
