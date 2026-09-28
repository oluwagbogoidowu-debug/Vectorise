import { db, isFirebaseAdminAvailable } from "../lib/firebaseAdmin";
import type { Request, Response } from "express";

export default async function geminiFeedbackHandler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    sprintKey,
    moveDay,
    stepIndex,
    stepPrompt,
    rating,
    researchText,
    comment,
  } = req.body || {};

  if (!rating || (rating !== "up" && rating !== "down")) {
    return res.status(400).json({ error: "Invalid or missing rating. Must be 'up' or 'down'." });
  }

  console.log(`[API Gemini Feedback] Received AI Rating: ${rating.toUpperCase()} for Step ${Number(stepIndex) + 1} (Day ${moveDay})`);
  if (comment) {
    console.log(`[API Gemini Feedback] Comment: "${comment}"`);
  }

  const docId = `feedback_${sprintKey}_day_${moveDay}_step_${stepIndex}`;

  try {
    const feedbackPayload = {
      sprintKey: sprintKey || "default",
      moveDay: Number(moveDay) || 1,
      stepIndex: Number(stepIndex) || 0,
      stepPrompt: stepPrompt || "",
      rating,
      comment: comment || "",
      researchTextPreview: researchText ? researchText.slice(0, 500) : "",
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseAdminAvailable()) {
      await db.collection("ai_feedback").doc(docId).set(feedbackPayload, { merge: true });
      console.log(`[API Gemini Feedback] Successfully persisted feedback to Firestore document: ${docId}`);
    } else {
      console.log("[API Gemini Feedback] Firestore not configured. Logged feedback to console safely.");
    }

    return res.status(200).json({
      success: true,
      message: "Feedback submitted successfully. Thank you for helping us fine-tune our models!",
    });
  } catch (err: any) {
    console.error("[API Gemini Feedback] Error writing feedback to database:", err);
    return res.status(500).json({
      error: err?.message || "Failed to record AI feedback.",
    });
  }
}
