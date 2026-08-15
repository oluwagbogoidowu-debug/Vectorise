# Implementation Guide: Multi-Linked Poll Tags Fix

## Problem
When linking 3+ tags to a poll step, only the first (or last) tag source appears. The poll should show tags from ALL linked sources combined.

## Root Cause
In `getLinkedTagsForStep()` function:
1. Calls `resolveProgressiveStepSelections()` 
2. `resolveProgressiveStepSelections()` only processes `explicitLinks[0]` (first link)
3. Returns early before iterating through ALL `taskLinkedSources`

## Solution
Reorder the logic to check `taskLinkedSources` FIRST before any narrowing logic.

---

## File 1: `pages/Participant/SprintView.tsx`

### Location: Lines 1619-1710

### Replace the `getLinkedTagsForStep` function with:

```typescript
const getLinkedTagsForStep = (stepIndex: number): string[] => {
  if (!dayContent) return [];

  // ✅ CHECK taskLinkedSources FIRST - before any progressive selection logic
  if (Array.isArray(dayContent.taskLinkedSources?.[stepIndex])) {
    const sources = dayContent.taskLinkedSources[stepIndex];
    if (sources.length === 0) return [];
    
    const allTags: string[] = [];
    
    // ✅ ITERATE THROUGH ALL SOURCES (not just first!)
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
    
    // ✅ Return deduplicated tags from ALL sources
    return Array.from(new Set(allTags)).filter(Boolean);
  }

  // Fall back to explicit links only if taskLinkedSources not set
  const explicitLinks = getExplicitLinkedSteps(stepIndex, dayContent, sprint?.dailyContent);
  if (explicitLinks.length === 0) {
    return [];
  }

  // Check step linking resolution
  const progRes = resolveProgressiveStepSelections(
    stepIndex,
    dayContent,
    taskInputs,
    sprint?.dailyContent,
    enrollment?.progress
  );
  if (progRes.allSelections.length > 0) {
    return progRes.allSelections;
  }

  // If mainLink is present and not connected, return empty (don't draw options)
  const hasMainLink = explicitLinks.some(l => l.mode === 'main' && l.opNum !== undefined);
  if (hasMainLink) {
    return [];
  }

  return [];
};
```

---

## File 2: `pages/Participant/SprintPreview.tsx`

### Location: Lines 1055-1140

### Apply the same fix to the `getLinkedTagsForStep` function in SprintPreview

Replace the function with the same implementation as above (the logic is identical).

---

## Testing

After implementing:

1. **Create a poll step** linked to 3 previous tag/poll steps
2. **Fill in tags** for each of the 3 source steps:
   - Step 0: "Tag A", "Tag B"
   - Step 1: "Tag C", "Tag D"
   - Step 2: "Tag E", "Tag F"
3. **View the poll** - should now display ALL 6 tags combined ✅

### Expected Result:
```
Poll Options:
✓ Tag A
✓ Tag B
✓ Tag C
✓ Tag D
✓ Tag E
✓ Tag F
```

---

## Why This Works

| Step | What Changes |
|------|--------------|
| 1 | Check `taskLinkedSources[stepIndex]` FIRST |
| 2 | If it exists, iterate through **ALL** source indices |
| 3 | Collect tags from each source (not just first) |
| 4 | Deduplicate using `Set` |
| 5 | Return all combined tags |
| 6 | Skip `resolveProgressiveStepSelections()` early return trap |

---

## Files Modified
- ✅ pages/Participant/SprintView.tsx
- ✅ pages/Participant/SprintPreview.tsx

## Commit
Branch: `fix/multi-linked-poll-tags`
