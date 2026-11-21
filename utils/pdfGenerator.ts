import { jsPDF } from 'jspdf';
import { Sprint, DailyContent } from '../types';
import {
  parseStepVersions,
  parseHintVersions,
  getStepVersionValue,
} from '../src/utils/stepPlaceholderUtils';

const INPUT_TYPE_LABELS: Record<string, string> = {
  text: 'Text Response',
  'multi-text': 'Multi-Field Text',
  tags: 'Tags / Keywords',
  poll: 'Poll / Selection',
  note: 'Journal / Note',
  mark: 'Confirmation Check',
  none: 'Read-Only Information',
};

interface CompiledStepVersion {
  versionIndex: number;
  prompt: string;
  inputTypeLabel: string;
  pollOptions: string[];
  multiTextLabels: string[];
  fillTemplate: string;
  hint: string;
  footnote: string;
  coachNote: string;
}

interface CompiledActionStep {
  stepNumber: number;
  versions: CompiledStepVersion[];
}

interface CompiledMoveData {
  moveNumber: number;
  totalMoves: number;
  insightText: string;
  actionSteps: CompiledActionStep[];
  progressNote: string;
  bridgeNote: string;
  completionNote: string;
  riseReportIntro: string;
  riseReportFramings: { stepNumber: number; framing: string }[];
  submissionPrompt: string;
}

const stripMarkdownInline = (text: string): string =>
  text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,!?;:]|$)/g, '$1$2')
    .replace(/(^|\s)_([^_\n]+)_(?=\s|[.,!?;:]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');

const sanitizeMovePdfText = (input: string): string =>
  input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2192|->/g, '->')
    .replace(/\u21A0|=>/g, '=>')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')
    .trimEnd();

const buildSprintSlug = (title?: string): string => {
  const cleaned = (title || 'sprint')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return cleaned || 'sprint';
};

const parsePollOptionsForVersion = (rawField: any, vIdx: number): string[] => {
  const raw = getStepVersionValue(rawField, vIdx, '');
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((o) => String(o || '').trim()).filter(Boolean);
      }
    } catch {
      // Fallback to line/delimiter split
    }
  }
  return trimmed
    .split(/\r?\n|;/)
    .map((o) => o.trim())
    .filter(Boolean);
};

const extractCompiledMoveData = (sprint: Sprint, dayContent: DailyContent): CompiledMoveData => {
  const moveNumber = Number(dayContent?.day || 1);
  const totalMoves = Number(sprint?.duration || 7);

  const prompts =
    Array.isArray(dayContent?.taskPrompts) && dayContent.taskPrompts.length > 0
      ? dayContent.taskPrompts
      : [dayContent?.taskPrompt || ''];

  const actionSteps: CompiledActionStep[] = [];

  prompts.forEach((rawPrompt, index) => {
    const stepVersions = parseStepVersions(rawPrompt || '');
    const hintVersions = parseHintVersions(dayContent?.taskHints?.[index]);
    const rawInputType = dayContent?.taskInputTypes?.[index] || 'text';
    const rawPollOpts = dayContent?.taskPollOptions?.[index];
    const footnote = (dayContent?.taskFootnotes?.[index] || '').trim();
    const coachNote = (dayContent?.taskNotes?.[index] || '').trim();
    const fillRaw = dayContent?.taskFills?.[index] || '';
    const rawMultiLabels = dayContent?.taskMultiTextLabels?.[index];
    const multiTextLabels = Array.isArray(rawMultiLabels)
      ? rawMultiLabels.map((l) => String(l || '').trim()).filter(Boolean)
      : [];

    const compiledVersions: CompiledStepVersion[] = [];

    stepVersions.forEach((promptVer, vIdx) => {
      const cleanPrompt = (promptVer || '').trim();
      const inputTypeKey = String(
        getStepVersionValue(rawInputType, vIdx, getStepVersionValue(rawInputType, 0, 'text'))
      )
        .trim()
        .toLowerCase();
      const pollOptions =
        inputTypeKey === 'poll' ? parsePollOptionsForVersion(rawPollOpts, vIdx) : [];
      const hint = (
        hintVersions[vIdx] !== undefined ? hintVersions[vIdx] : hintVersions[0] || ''
      ).trim();
      const fillTemplate = getStepVersionValue(fillRaw, vIdx, '').trim();

      const hasAnyStepData = Boolean(
        cleanPrompt ||
          pollOptions.length > 0 ||
          hint ||
          (vIdx === 0 && (footnote || coachNote || multiTextLabels.length > 0 || fillTemplate))
      );

      if (hasAnyStepData) {
        compiledVersions.push({
          versionIndex: vIdx,
          prompt: cleanPrompt,
          inputTypeLabel: INPUT_TYPE_LABELS[inputTypeKey] || 'Text Response',
          pollOptions,
          multiTextLabels: vIdx === 0 ? multiTextLabels : [],
          fillTemplate,
          hint,
          footnote: vIdx === 0 ? footnote : '',
          coachNote: vIdx === 0 ? coachNote : '',
        });
      }
    });

    if (compiledVersions.length > 0) {
      actionSteps.push({
        stepNumber: index + 1,
        versions: compiledVersions,
      });
    }
  });

  const riseReportFramings: { stepNumber: number; framing: string }[] = [];
  if (dayContent?.mirrorActive && Array.isArray(dayContent.mirrorFraming)) {
    dayContent.mirrorFraming.forEach((framing, idx) => {
      if (!dayContent.mirrorDisabledSteps?.[idx] && framing && framing.trim()) {
        riseReportFramings.push({ stepNumber: idx + 1, framing: framing.trim() });
      }
    });
  }

  return {
    moveNumber,
    totalMoves,
    insightText: (dayContent?.lessonText || '').trim(),
    actionSteps,
    progressNote: (dayContent?.progressNote || '').trim(),
    bridgeNote: moveNumber < totalMoves ? (dayContent?.bridgeNote || '').trim() : '',
    completionNote: moveNumber >= totalMoves ? (dayContent?.completionNote || '').trim() : '',
    riseReportIntro: dayContent?.mirrorActive ? (dayContent?.mirrorIntro || '').trim() : '',
    riseReportFramings,
    submissionPrompt: (dayContent?.submissionPrompt || '').trim(),
  };
};

const renderMovesToPDF = (
  sprint: Sprint,
  moves: DailyContent[],
  filename: string,
  isFullCurriculum: boolean
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const displaySprintTitle = sanitizeMovePdfText(sprint.title || 'Sprint') || 'Sprint';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  let y = 24;
  let pageNum = 1;
  const firstMoveNum = moves[0]?.day || 1;
  const footerContext = isFullCurriculum
    ? `Full Curriculum (${sprint.duration || moves.length} Moves)`
    : `Move ${firstMoveNum} of ${sprint.duration || 1}`;

  const drawPageChrome = (currentPage: number) => {
    doc.setFillColor(14, 120, 80); // #0E7850
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(145, 145, 145);
    doc.text(`${displaySprintTitle} - ${footerContext}`, margin, pageHeight - 10);
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 14) {
      doc.addPage();
      pageNum += 1;
      drawPageChrome(pageNum);
      y = margin + 8;
    }
  };

  const renderMarkdownBlockPDF = (rawText: string, leftIndent = 0, fontSize = 10) => {
    const lines = rawText.split(/\r?\n/);
    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y += 2.8;
        continue;
      }

      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        checkPageBreak(5);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.line(margin + leftIndent, y, pageWidth - margin, y);
        y += 4;
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const headingText = sanitizeMovePdfText(stripMarkdownInline(headingMatch[2]));
        checkPageBreak(7);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(headingMatch[1].length === 1 ? 12 : 11);
        doc.setTextColor(17, 24, 39);
        const wrapped = doc.splitTextToSize(headingText, contentWidth - leftIndent);
        for (const w of wrapped) {
          checkPageBreak(5.5);
          doc.text(w, margin + leftIndent, y);
          y += 5.5;
        }
        y += 1;
        continue;
      }

      const bulletMatch = trimmed.match(/^([•\-\*\+↠→]|->|=>)\s+(.+)$/);
      if (bulletMatch) {
        const cleanBody = sanitizeMovePdfText(stripMarkdownInline(bulletMatch[2]));
        const wrapped = doc.splitTextToSize(cleanBody, contentWidth - leftIndent - 8);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(55, 65, 81);
        wrapped.forEach((w: string, wIdx: number) => {
          checkPageBreak(5.2);
          if (wIdx === 0) {
            doc.setFillColor(14, 120, 80);
            doc.circle(margin + leftIndent + 2.5, y - 1.1, 0.8, 'F');
          }
          doc.text(w, margin + leftIndent + 6.5, y);
          y += 5;
        });
        y += 0.8;
        continue;
      }

      const numMatch = trimmed.match(/^(\d+[\.\)])\s+(.+)$/);
      if (numMatch) {
        const marker = numMatch[1];
        const cleanBody = sanitizeMovePdfText(stripMarkdownInline(numMatch[2]));
        const wrapped = doc.splitTextToSize(cleanBody, contentWidth - leftIndent - 9);
        wrapped.forEach((w: string, wIdx: number) => {
          checkPageBreak(5.2);
          if (wIdx === 0) {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(fontSize);
            doc.setTextColor(14, 120, 80);
            doc.text(marker, margin + leftIndent + 1, y);
          }
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(fontSize);
          doc.setTextColor(55, 65, 81);
          doc.text(w, margin + leftIndent + 8, y);
          y += 5;
        });
        y += 0.8;
        continue;
      }

      const isQuote = trimmed.startsWith('> ');
      const cleanPara = sanitizeMovePdfText(
        stripMarkdownInline(isQuote ? trimmed.slice(2).trim() : trimmed)
      );
      if (!cleanPara) continue;

      doc.setFont('Helvetica', isQuote ? 'oblique' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(isQuote ? 100 : 55, isQuote ? 105 : 65, isQuote ? 115 : 81);
      const wrapped = doc.splitTextToSize(
        cleanPara,
        contentWidth - leftIndent - (isQuote ? 6 : 0)
      );
      for (const w of wrapped) {
        checkPageBreak(5.2);
        if (isQuote) {
          doc.setDrawColor(14, 120, 80);
          doc.setLineWidth(0.7);
          doc.line(margin + leftIndent + 1.5, y - 3.5, margin + leftIndent + 1.5, y + 1);
        }
        doc.text(w, margin + leftIndent + (isQuote ? 5 : 0), y);
        y += 5.2;
      }
      y += 1.2;
    }
  };

  drawPageChrome(pageNum);

  if (isFullCurriculum) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(14, 120, 80);
    doc.text('FULL SPRINT CURRICULUM', margin, y);
    y += 7;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(17, 24, 39);
    const titleLines = doc.splitTextToSize(displaySprintTitle, contentWidth);
    for (const line of titleLines) {
      checkPageBreak(8);
      doc.text(line, margin, y);
      y += 7.5;
    }
    y += 1;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`${sprint.duration || moves.length} Moves  |  Compiled ${dateLabel}`, margin, y);
    y += 7;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  }

  moves.forEach((rawMove, mIdx) => {
    if (isFullCurriculum && mIdx > 0) {
      doc.addPage();
      pageNum += 1;
      drawPageChrome(pageNum);
      y = 24;
    }

    const compiled = extractCompiledMoveData(sprint, rawMove);

    // Move Header Block
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(isFullCurriculum ? 18 : 21);
    doc.setTextColor(14, 120, 80);
    doc.text(`MOVE ${compiled.moveNumber} CURRICULUM`, margin, y);
    y += 7.5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`Sprint: ${displaySprintTitle}`, margin, y);
    y += 4.5;
    doc.text(`Move ${compiled.moveNumber} of ${compiled.totalMoves}  |  ${dateLabel}`, margin, y);
    y += 7;

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 9;

    // 1. Move's Insight
    checkPageBreak(14);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(17, 24, 39);
    doc.text("Move's Insight", margin, y);
    y += 6.5;

    if (compiled.insightText) {
      renderMarkdownBlockPDF(compiled.insightText, 0, 10);
    } else {
      doc.setFont('Helvetica', 'oblique');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('No insight compiled for this move.', margin, y);
      y += 6;
    }
    y += 6;

    // 2. Action Steps
    checkPageBreak(14);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Action Steps', margin, y);
    y += 7;

    if (compiled.actionSteps.length > 0) {
      compiled.actionSteps.forEach((step) => {
        checkPageBreak(16);

        // Action Step Header Pill-like Bar
        doc.setFillColor(246, 250, 248);
        doc.setDrawColor(220, 235, 228);
        doc.roundedRect(margin, y - 4.3, contentWidth, 7.8, 1.5, 1.5, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(14, 120, 80);
        doc.text(`Action Step ${step.stepNumber}`, margin + 3, y + 0.8);

        if (step.versions.length === 1) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(107, 114, 128);
          doc.text(step.versions[0].inputTypeLabel, pageWidth - margin - 3, y + 0.8, {
            align: 'right',
          });
        }
        y += 8;

        step.versions.forEach((ver) => {
          if (step.versions.length > 1) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(79, 70, 229);
            doc.text(
              `Context Version ${ver.versionIndex + 1} (${ver.inputTypeLabel})`,
              margin + 2,
              y
            );
            y += 5;
          }

          if (ver.prompt) {
            renderMarkdownBlockPDF(ver.prompt, step.versions.length > 1 ? 4 : 2, 10);
            y += 1.5;
          }

          if (ver.pollOptions.length > 0) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(75, 85, 99);
            doc.text('Poll Options:', margin + 4, y);
            y += 4.5;

            ver.pollOptions.forEach((opt, oIdx) => {
              const cleanOpt = sanitizeMovePdfText(stripMarkdownInline(opt));
              const wrappedOpt = doc.splitTextToSize(`${oIdx + 1}. ${cleanOpt}`, contentWidth - 10);
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(9.5);
              doc.setTextColor(55, 65, 81);
              for (const line of wrappedOpt) {
                checkPageBreak(4.8);
                doc.text(line, margin + 7, y);
                y += 4.8;
              }
            });
            y += 2;
          }

          if (ver.multiTextLabels.length > 0) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(75, 85, 99);
            doc.text('Input Fields:', margin + 4, y);
            y += 4.5;

            ver.multiTextLabels.forEach((lbl) => {
              const cleanLbl = sanitizeMovePdfText(stripMarkdownInline(lbl));
              const wrappedLbl = doc.splitTextToSize(`- ${cleanLbl}`, contentWidth - 10);
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(9.5);
              doc.setTextColor(55, 65, 81);
              for (const line of wrappedLbl) {
                checkPageBreak(4.8);
                doc.text(line, margin + 7, y);
                y += 4.8;
              }
            });
            y += 2;
          }

          if (ver.fillTemplate) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(14, 120, 80);
            doc.text('Pre-filled Template', margin + 4, y);
            y += 4.5;
            renderMarkdownBlockPDF(ver.fillTemplate, 6, 9.5);
          }

          if (ver.hint) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(180, 100, 10);
            doc.text('Hint', margin + 4, y);
            y += 4.5;
            renderMarkdownBlockPDF(ver.hint, 6, 9.5);
          }

          if (ver.coachNote) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(14, 120, 80);
            doc.text('Coach Note', margin + 4, y);
            y += 4.5;
            renderMarkdownBlockPDF(ver.coachNote, 6, 9);
          }

          if (ver.footnote) {
            checkPageBreak(10);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(79, 70, 229);
            doc.text('Footnote', margin + 4, y);
            y += 4.5;
            renderMarkdownBlockPDF(ver.footnote, 6, 9);
          }
        });

        y += 4;
      });
    } else {
      doc.setFont('Helvetica', 'oblique');
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('No action steps compiled for this move.', margin, y);
      y += 8;
    }

    // 3. Progress Note
    if (compiled.progressNote) {
      checkPageBreak(14);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(17, 24, 39);
      doc.text(`Move ${compiled.moveNumber} Progress Note`, margin, y);
      y += 6;
      renderMarkdownBlockPDF(compiled.progressNote, 2, 10);
      y += 5;
    }

    // 4. Bridge Note
    if (compiled.bridgeNote) {
      checkPageBreak(14);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(126, 34, 206);
      doc.text(`Bridge Note (Move ${compiled.moveNumber} -> Move ${compiled.moveNumber + 1})`, margin, y);
      y += 6;
      renderMarkdownBlockPDF(compiled.bridgeNote, 2, 10);
      y += 5;
    }

    // 5. Completion Note
    if (compiled.completionNote) {
      checkPageBreak(14);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(14, 120, 80);
      doc.text('Completion Note (End of Sprint)', margin, y);
      y += 6;
      renderMarkdownBlockPDF(compiled.completionNote, 2, 10);
      y += 5;
    }

    // 6. Rise Report Setup (if configured)
    if (compiled.riseReportIntro || compiled.riseReportFramings.length > 0) {
      checkPageBreak(14);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(17, 24, 39);
      doc.text('Rise Report Framing', margin, y);
      y += 6;
      if (compiled.riseReportIntro) {
        renderMarkdownBlockPDF(compiled.riseReportIntro, 2, 9.5);
      }
      compiled.riseReportFramings.forEach((rf) => {
        renderMarkdownBlockPDF(`- Step ${rf.stepNumber}: ${rf.framing}`, 2, 9.5);
      });
      y += 4;
    }

    // 7. Submission Prompt (if set)
    if (compiled.submissionPrompt) {
      checkPageBreak(14);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(17, 24, 39);
      doc.text('Completion Proof Prompt', margin, y);
      y += 6;
      renderMarkdownBlockPDF(compiled.submissionPrompt, 2, 10);
      y += 4;
    }
  });

  doc.save(filename);
};

const renderMarkdownToHtml = (rawText: string): string => {
  if (!rawText.trim()) return '';
  const lines = rawText.split(/\r?\n/);
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
    if (inOl) {
      html += '</ol>';
      inOl = false;
    }
  };

  const formatInlineHtml = (text: string): string =>
    escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,!?;:]|$)/g, '$1<em>$2</em>')
      .replace(/(^|\s)_([^_\n]+)_(?=\s|[.,!?;:]|$)/g, '$1<em>$2</em>');

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      closeLists();
      html += '<p style="margin:4pt 0;"></p>';
      return;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      html += '<hr style="border:none;border-top:1px solid #E5E7EB;margin:8pt 0;" />';
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      closeLists();
      const size = headingMatch[1].length === 1 ? '13pt' : '11.5pt';
      html += `<h4 style="font-size:${size};font-weight:700;color:#111827;margin:8pt 0 4pt 0;">${formatInlineHtml(headingMatch[2])}</h4>`;
      return;
    }

    const bulletMatch = trimmed.match(/^([•\-\*\+↠→]|->|=>)\s+(.+)$/);
    if (bulletMatch) {
      if (inOl) {
        html += '</ol>';
        inOl = false;
      }
      if (!inUl) {
        html += '<ul style="margin:4pt 0 6pt 18pt;padding:0;color:#374151;font-size:10.5pt;line-height:1.5;">';
        inUl = true;
      }
      html += `<li style="margin-bottom:3pt;">${formatInlineHtml(bulletMatch[2])}</li>`;
      return;
    }

    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)$/);
    if (numMatch) {
      if (inUl) {
        html += '</ul>';
        inUl = false;
      }
      if (!inOl) {
        html += '<ol style="margin:4pt 0 6pt 18pt;padding:0;color:#374151;font-size:10.5pt;line-height:1.5;">';
        inOl = true;
      }
      html += `<li style="margin-bottom:3pt;">${formatInlineHtml(numMatch[2])}</li>`;
      return;
    }

    closeLists();
    if (trimmed.startsWith('> ')) {
      html += `<blockquote style="border-left:3pt solid #0E7850;padding-left:10pt;margin:6pt 0;color:#4B5563;font-style:italic;font-size:10.5pt;">${formatInlineHtml(trimmed.slice(2).trim())}</blockquote>`;
    } else {
      html += `<p style="margin:4pt 0;color:#374151;font-size:10.5pt;line-height:1.55;">${formatInlineHtml(trimmed)}</p>`;
    }
  });

  closeLists();
  return html;
};

const renderMovesToDOC = (
  sprint: Sprint,
  moves: DailyContent[],
  filename: string,
  isFullCurriculum: boolean
) => {
  const displayTitle = sprint.title || 'Sprint';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const sectionsHtml = moves
    .map((rawMove, idx) => {
      const compiled = extractCompiledMoveData(sprint, rawMove);

      const stepsHtml =
        compiled.actionSteps.length > 0
          ? compiled.actionSteps
              .map((step) => {
                const versHtml = step.versions
                  .map((ver) => {
                    const parts: string[] = [];
                    if (step.versions.length > 1) {
                      parts.push(
                        `<p style="margin:6pt 0 3pt 0;font-size:9.5pt;font-weight:700;color:#4F46E5;">Context Version ${ver.versionIndex + 1} (${escapeHtml(ver.inputTypeLabel)})</p>`
                      );
                    }
                    if (ver.prompt) {
                      parts.push(renderMarkdownToHtml(ver.prompt));
                    }
                    if (ver.pollOptions.length > 0) {
                      parts.push(
                        `<p style="margin:5pt 0 2pt 0;font-size:9.5pt;font-weight:700;color:#4B5563;">Poll Options:</p><ol style="margin:2pt 0 6pt 18pt;padding:0;font-size:10pt;color:#374151;">${ver.pollOptions
                          .map((o) => `<li style="margin-bottom:2pt;">${escapeHtml(o)}</li>`)
                          .join('')}</ol>`
                      );
                    }
                    if (ver.multiTextLabels.length > 0) {
                      parts.push(
                        `<p style="margin:5pt 0 2pt 0;font-size:9.5pt;font-weight:700;color:#4B5563;">Input Fields:</p><ul style="margin:2pt 0 6pt 18pt;padding:0;font-size:10pt;color:#374151;">${ver.multiTextLabels
                          .map((l) => `<li style="margin-bottom:2pt;">${escapeHtml(l)}</li>`)
                          .join('')}</ul>`
                      );
                    }
                    if (ver.fillTemplate) {
                      parts.push(
                        `<p style="margin:5pt 0 2pt 0;font-size:9.5pt;font-weight:700;color:#0E7850;">Pre-filled Template:</p>${renderMarkdownToHtml(ver.fillTemplate)}`
                      );
                    }
                    if (ver.hint) {
                      parts.push(
                        `<p style="margin:5pt 0 2pt 0;font-size:9.5pt;font-weight:700;color:#B4640A;">Hint:</p>${renderMarkdownToHtml(ver.hint)}`
                      );
                    }
                    if (ver.coachNote) {
                      parts.push(
                        `<p style="margin:5pt 0 2pt 0;font-size:9.5pt;font-weight:700;color:#0E7850;">Coach Note:</p>${renderMarkdownToHtml(ver.coachNote)}`
                      );
                    }
                    if (ver.footnote) {
                      parts.push(
                        `<p style="margin:5pt 0 2pt 0;font-size:9.5pt;font-weight:700;color:#4F46E5;">Footnote:</p>${renderMarkdownToHtml(ver.footnote)}`
                      );
                    }
                    return parts.join('');
                  })
                  .join('<hr style="border:none;border-top:1px dashed #E5E7EB;margin:8pt 0;" />');

                return `
                  <div style="margin-bottom:10pt;border:1px solid #E5E7EB;border-radius:6pt;">
                    <div style="background-color:#F6FAF8;padding:7pt 12pt;border-bottom:1px solid #E5E7EB;">
                      <strong style="color:#0E7850;font-size:10.5pt;">Action Step ${step.stepNumber}</strong>
                      ${
                        step.versions.length === 1
                          ? `<span style="float:right;color:#6B7280;font-size:9pt;">${escapeHtml(step.versions[0].inputTypeLabel)}</span>`
                          : ''
                      }
                    </div>
                    <div style="padding:8pt 12pt;">${versHtml}</div>
                  </div>
                `;
              })
              .join('')
          : '<p style="color:#9CA3AF;font-style:italic;font-size:10pt;">No action steps compiled for this move.</p>';

      return `
        ${isFullCurriculum && idx > 0 ? '<br clear="all" style="page-break-before:always" />' : ''}
        <div style="border-top:4pt solid #0E7850;padding-top:10pt;margin-bottom:14pt;border-bottom:1px solid #E5E7EB;padding-bottom:8pt;">
          <h1 style="margin:0 0 4pt 0;font-size:18pt;font-weight:700;color:#0E7850;">MOVE ${compiled.moveNumber} CURRICULUM</h1>
          <p style="margin:0;font-size:9.5pt;color:#6B7280;">Sprint: ${escapeHtml(displayTitle)} &bull; Move ${compiled.moveNumber} of ${compiled.totalMoves} &bull; ${escapeHtml(dateLabel)}</p>
        </div>

        <h2 style="font-size:13pt;font-weight:700;color:#111827;margin:10pt 0 5pt 0;">Move's Insight</h2>
        ${
          compiled.insightText
            ? renderMarkdownToHtml(compiled.insightText)
            : '<p style="color:#9CA3AF;font-style:italic;font-size:10pt;">No insight compiled for this move.</p>'
        }

        <h2 style="font-size:13pt;font-weight:700;color:#111827;margin:14pt 0 7pt 0;">Action Steps</h2>
        ${stepsHtml}

        ${
          compiled.progressNote
            ? `<h2 style="font-size:12.5pt;font-weight:700;color:#111827;margin:14pt 0 5pt 0;">Move ${compiled.moveNumber} Progress Note</h2>${renderMarkdownToHtml(compiled.progressNote)}`
            : ''
        }
        ${
          compiled.bridgeNote
            ? `<h2 style="font-size:12.5pt;font-weight:700;color:#7E22CE;margin:14pt 0 5pt 0;">Bridge Note (Move ${compiled.moveNumber} &rarr; Move ${compiled.moveNumber + 1})</h2>${renderMarkdownToHtml(compiled.bridgeNote)}`
            : ''
        }
        ${
          compiled.completionNote
            ? `<h2 style="font-size:12.5pt;font-weight:700;color:#0E7850;margin:14pt 0 5pt 0;">Completion Note (End of Sprint)</h2>${renderMarkdownToHtml(compiled.completionNote)}`
            : ''
        }
        ${
          compiled.riseReportIntro || compiled.riseReportFramings.length > 0
            ? `<h2 style="font-size:12.5pt;font-weight:700;color:#111827;margin:14pt 0 5pt 0;">Rise Report Framing</h2>${
                compiled.riseReportIntro ? renderMarkdownToHtml(compiled.riseReportIntro) : ''
              }${compiled.riseReportFramings
                .map(
                  (rf) =>
                    `<p style="margin:3pt 0;font-size:10pt;color:#374151;"><strong>Step ${rf.stepNumber}:</strong> ${escapeHtml(rf.framing)}</p>`
                )
                .join('')}`
            : ''
        }
        ${
          compiled.submissionPrompt
            ? `<h2 style="font-size:12.5pt;font-weight:700;color:#111827;margin:14pt 0 5pt 0;">Completion Proof Prompt</h2>${renderMarkdownToHtml(compiled.submissionPrompt)}`
            : ''
        }
      `;
    })
    .join('');

  const docHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(displayTitle)} - Curriculum</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family:Arial,Helvetica,sans-serif;color:#111827;margin:36pt;">
        ${sectionsHtml}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const generateMovePDF = (sprint: Sprint, moveContent: DailyContent) => {
  const moveNum = Number(moveContent?.day || 1);
  const filename = `${buildSprintSlug(sprint.title)}_move_${moveNum}.pdf`;
  renderMovesToPDF(sprint, [moveContent], filename, false);
};

export const generateMoveDOC = (sprint: Sprint, moveContent: DailyContent) => {
  const moveNum = Number(moveContent?.day || 1);
  const filename = `${buildSprintSlug(sprint.title)}_move_${moveNum}.doc`;
  renderMovesToDOC(sprint, [moveContent], filename, false);
};

export const generateSprintCurriculumPDF = (sprint: Sprint, orderedMoves: DailyContent[]) => {
  const filename = `${buildSprintSlug(sprint.title)}_full_curriculum.pdf`;
  renderMovesToPDF(sprint, orderedMoves, filename, true);
};

export const generateSprintCurriculumDOC = (sprint: Sprint, orderedMoves: DailyContent[]) => {
  const filename = `${buildSprintSlug(sprint.title)}_full_curriculum.doc`;
  renderMovesToDOC(sprint, orderedMoves, filename, true);
};

/**
 * Legacy alias updated to compile Move curriculum cleanly.
 */
export const generateDayPDF = (sprint: Sprint, dayContent: DailyContent) => {
  generateMovePDF(sprint, dayContent);
};

export interface ProgressReportSection {
  number: string;
  title: string;
  bodyLines: string[];
}

export interface ProgressReportExportOptions {
  sprintTitle: string;
  day: number;
  totalDays?: number;
  noteText: string;
  headerLines?: string[];
  sections?: ProgressReportSection[];
}

const sanitizeForPdf = (input: string): string =>
  input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')
    .trimEnd();

const buildReportFilenameBase = (sprintTitle: string): string => {
  const cleaned = (sprintTitle || 'sprint')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${cleaned || 'sprint'}_progress_report`;
};

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const generateProgressReportPDF = (options: ProgressReportExportOptions) => {
  const { sprintTitle, day, totalDays, noteText, headerLines = [], sections = [] } = options;
  const displayTitle = sanitizeForPdf(sprintTitle || 'Sprint') || 'Sprint';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 24;
  let pageNum = 1;

  const drawPageChrome = (currentPage: number) => {
    doc.setFillColor(14, 120, 80); // #0E7850
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(145, 145, 145);
    doc.text(`${displayTitle} - Progress report`, margin, pageHeight - 10);
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 14) {
      doc.addPage();
      pageNum += 1;
      drawPageChrome(pageNum);
      y = margin + 8;
    }
  };

  drawPageChrome(pageNum);

  // Header Block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(14, 120, 80);
  doc.text('PROGRESS REPORT', margin, y);
  y += 7;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39);
  const titleLines = doc.splitTextToSize(displayTitle, contentWidth);
  for (const line of titleLines) {
    checkPageBreak(8);
    doc.text(line, margin, y);
    y += 7.5;
  }
  y += 1;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(107, 114, 128);
  const moveText = totalDays ? `Move ${day} of ${totalDays}` : `Move ${day}`;
  doc.text(`${moveText}  |  ${dateLabel}`, margin, y);
  y += 7;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 9;

  if (sections.length > 0) {
    const cleanHeaderLines = headerLines.map((l) => sanitizeForPdf(l)).filter(Boolean);
    if (cleanHeaderLines.length > 0) {
      checkPageBreak(10);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      for (const hLine of cleanHeaderLines) {
        const wrapped = doc.splitTextToSize(hLine, contentWidth);
        for (const w of wrapped) {
          checkPageBreak(6);
          doc.text(w, margin, y);
          y += 6;
        }
      }
      y += 4;
    }

    sections.forEach((section) => {
      checkPageBreak(16);

      // Section header bar
      doc.setFillColor(246, 250, 248);
      doc.setDrawColor(224, 236, 230);
      doc.roundedRect(margin, y - 4.5, contentWidth, 8.5, 1.5, 1.5, 'FD');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(14, 120, 80);
      const numLabel = `${section.number}.`;
      doc.text(numLabel, margin + 3, y + 1);

      const numWidth = doc.getTextWidth(numLabel) + 3;
      doc.setTextColor(17, 24, 39);
      const secTitle = sanitizeForPdf(section.title);
      doc.text(secTitle, margin + 3 + numWidth, y + 1);
      y += 9;

      if (section.bodyLines.length > 0) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);

        section.bodyLines.forEach((rawLine) => {
          const trimmed = rawLine.trim();
          if (!trimmed) {
            y += 2.5;
            return;
          }

          const isBullet = /^[•\-*]\s+/.test(trimmed);
          const cleanBody = sanitizeForPdf(isBullet ? trimmed.replace(/^[•\-*]\s+/, '') : trimmed);
          if (!cleanBody) return;

          if (isBullet) {
            const wrapped = doc.splitTextToSize(cleanBody, contentWidth - 10);
            wrapped.forEach((line: string, lineIdx: number) => {
              checkPageBreak(5.2);
              if (lineIdx === 0) {
                doc.setFillColor(14, 120, 80);
                doc.circle(margin + 5, y - 1.1, 0.8, 'F');
              }
              doc.text(line, margin + 9, y);
              y += 5;
            });
            y += 1;
          } else {
            const wrapped = doc.splitTextToSize(cleanBody, contentWidth - 4);
            for (const line of wrapped) {
              checkPageBreak(5.2);
              doc.text(line, margin + 2, y);
              y += 5;
            }
            y += 1.5;
          }
        });
      } else {
        checkPageBreak(6);
        doc.setFont('Helvetica', 'oblique');
        doc.setFontSize(9.5);
        doc.setTextColor(156, 163, 175);
        doc.text('No items recorded', margin + 3, y);
        y += 5.5;
      }

      y += 5;
    });
  } else {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(55, 65, 81);
    const paragraphs = noteText.split(/\r?\n/);
    for (const para of paragraphs) {
      const cleanPara = sanitizeForPdf(para.trim());
      if (!cleanPara) {
        y += 3.5;
        continue;
      }
      const wrapped = doc.splitTextToSize(cleanPara, contentWidth);
      for (const line of wrapped) {
        checkPageBreak(5.5);
        doc.text(line, margin, y);
        y += 5.5;
      }
    }
  }

  doc.save(`${buildReportFilenameBase(sprintTitle)}.pdf`);
};

export const generateProgressReportDOC = (options: ProgressReportExportOptions) => {
  const { sprintTitle, day, totalDays, noteText, headerLines = [], sections = [] } = options;
  const displayTitle = sprintTitle || 'Sprint';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const moveText = totalDays ? `Move ${day} of ${totalDays}` : `Move ${day}`;

  let bodyHtml = '';

  if (sections.length > 0) {
    const cleanHeaderLines = headerLines.map((l) => l.trim()).filter(Boolean);
    if (cleanHeaderLines.length > 0) {
      bodyHtml += `<h2 style="font-size:15pt;font-weight:700;color:#111827;margin:14pt 0 10pt 0;">${cleanHeaderLines
        .map(escapeHtml)
        .join('<br/>')}</h2>`;
    }

    sections.forEach((section) => {
      let sectionBodyHtml = '';
      if (section.bodyLines.length > 0) {
        let listOpen = false;
        section.bodyLines.forEach((rawLine) => {
          const trimmed = rawLine.trim();
          if (!trimmed) {
            if (listOpen) {
              sectionBodyHtml += '</ul>';
              listOpen = false;
            }
            sectionBodyHtml += '<p style="margin:4pt 0;"></p>';
            return;
          }
          const isBullet = /^[•\-*]\s+/.test(trimmed);
          if (isBullet) {
            if (!listOpen) {
              sectionBodyHtml += '<ul style="margin:4pt 0 8pt 18pt;padding:0;color:#374151;font-size:10.5pt;line-height:1.5;">';
              listOpen = true;
            }
            const cleanText = trimmed.replace(/^[•\-*]\s+/, '');
            sectionBodyHtml += `<li style="margin-bottom:3pt;">${escapeHtml(cleanText)}</li>`;
          } else {
            if (listOpen) {
              sectionBodyHtml += '</ul>';
              listOpen = false;
            }
            sectionBodyHtml += `<p style="margin:4pt 0;color:#374151;font-size:10.5pt;line-height:1.5;">${escapeHtml(trimmed)}</p>`;
          }
        });
        if (listOpen) {
          sectionBodyHtml += '</ul>';
        }
      } else {
        sectionBodyHtml = '<p style="margin:4pt 0;color:#9CA3AF;font-style:italic;font-size:10pt;">No items recorded</p>';
      }

      bodyHtml += `
        <div style="margin-bottom:12pt;border:1px solid #E5E7EB;border-radius:6pt;overflow:hidden;">
          <div style="background-color:#F6FAF8;padding:8pt 12pt;border-bottom:1px solid #E5E7EB;">
            <span style="color:#0E7850;font-weight:700;font-size:11pt;margin-right:6pt;">${escapeHtml(section.number)}.</span>
            <span style="color:#111827;font-weight:700;font-size:11pt;">${escapeHtml(section.title)}</span>
          </div>
          <div style="padding:8pt 12pt;">
            ${sectionBodyHtml}
          </div>
        </div>
      `;
    });
  } else {
    const paragraphs = noteText.split(/\r?\n/).map((line) => {
      const trimmed = line.trim();
      return trimmed
        ? `<p style="margin:5pt 0;color:#374151;font-size:11pt;line-height:1.55;">${escapeHtml(trimmed)}</p>`
        : '<p style="margin:5pt 0;"></p>';
    });
    bodyHtml = paragraphs.join('');
  }

  const docHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(displayTitle)} - Progress report</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
      </head>
      <body style="font-family:Arial,Helvetica,sans-serif;color:#111827;margin:36pt;">
        <div style="border-top:4pt solid #0E7850;padding-top:12pt;margin-bottom:14pt;border-bottom:1px solid #E5E7EB;padding-bottom:10pt;">
          <p style="margin:0 0 4pt 0;font-size:9pt;font-weight:700;letter-spacing:1.2pt;color:#0E7850;text-transform:uppercase;">Progress Report</p>
          <h1 style="margin:0 0 4pt 0;font-size:19pt;font-weight:700;color:#111827;">${escapeHtml(displayTitle)}</h1>
          <p style="margin:0;font-size:9.5pt;color:#6B7280;">${escapeHtml(moveText)} &bull; ${escapeHtml(dateLabel)}</p>
        </div>
        ${bodyHtml}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', docHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${buildReportFilenameBase(displayTitle)}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

