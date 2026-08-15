// This is a partial demonstration of the fix for getLinkedTagsForStep()
// The actual fix involves modifying the function around line 1620-1709
// to check taskLinkedSources FIRST before calling resolveProgressiveStepSelections()

// BEFORE (lines 1620-1709):
const getLinkedTagsForStep = (stepIndex: number): string[] => {
  if (!dayContent) return [];

  const explicitLinks = getExplicitLinkedSteps(stepIndex, dayContent, sprint?.dailyContent);
  if (explicitLinks.length === 0) {
    return [];
  }

  const progRes = resolveProgressiveStepSelections(
    stepIndex,
    dayContent,
    taskInputs,
    sprint?.dailyContent,
    enrollment?.progress
  );
  if (progRes.allSelections.length > 0) {
    return progRes.allSelections;  // ← EARLY RETURN - IGNORES taskLinkedSources!
  }
  // ... rest of function
};

// AFTER (FIXED):
const getLinkedTagsForStep = (stepIndex: number): string[] => {
  if (!dayContent) return [];

  // CHECK taskLinkedSources FIRST - before any progressive selection logic
  if (Array.isArray(dayContent.taskLinkedSources?.[stepIndex])) {
    const sources = dayContent.taskLinkedSources[stepIndex];
    if (sources.length === 0) return [];
    
    const allTags: string[] = [];
    
    // ITERATE THROUGH ALL SOURCES (not just first!)
    sources.forEach(srcIndex => {
      if (srcIndex >= 0) {
        const srcType = String(dayContent.taskInputTypes?.[srcIndex] || "").trim().toLowerCase();
        // Strictly only poll to poll and tag to poll
        if (srcType === "poll" || srcType === "tags") {
          if (srcIndex < taskInputs.length && taskInputs[srcIndex]) {
            try {
              const val = taskInputs[srcIndex];
              if (val.startsWith("[")) {
                allTags.push(...JSON.parse(val));
              } else if (srcType === "poll") {
                allTags.push(val);
              } else {
                allTags.push(...val.split(",").filter(Boolean));
              }
            } catch (e) {
              console.error("Error parsing tags for source", srcIndex, e);
            }
          }
        }
      } else {
        // Cross-day link!
        const absVal = Math.abs(srcIndex);
        const targetDay = Math.floor(absVal / 100);
        const targetStepIdx = absVal % 100;
        
        const targetProgress = enrollment?.progress?.find((p) => p.day === targetDay);
        const targetDayContent = Array.isArray(sprint?.dailyContent)
          ? sprint.dailyContent.find((dc) => dc.day === targetDay)
          : undefined;
          
        if (targetProgress && targetProgress.answers && Array.isArray(targetProgress.answers) && targetDayContent) {
          const srcType = String(targetDayContent.taskInputTypes?.[targetStepIdx] || "").trim().toLowerCase();
          // Strictly only poll to poll and tag to poll
          if (srcType === "poll" || srcType === "tags") {
            const val = targetProgress.answers[targetStepIdx];
            if (val) {
              try {
                if (val.startsWith("[")) {
                  allTags.push(...JSON.parse(val));
                } else if (srcType === "poll") {
                  allTags.push(val);
                } else {
                  allTags.push(...val.split(",").filter(Boolean));
                }
              } catch (e) {
                console.error("Error parsing cross-day tags for source", srcIndex, e);
              }
            }
          }
        }
      }
    });
    
    // Return deduplicated tags from ALL sources
    return Array.from(new Set(allTags)).filter(Boolean);
  }

  // Fall back to explicit links only if taskLinkedSources not set
  const explicitLinks = getExplicitLinkedSteps(stepIndex, dayContent, sprint?.dailyContent);
  if (explicitLinks.length === 0) {
    return [];
  }

  // ... rest of progressive selection logic
};
