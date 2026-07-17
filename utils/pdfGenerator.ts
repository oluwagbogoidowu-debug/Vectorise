import { jsPDF } from 'jspdf';
import { Sprint, DailyContent } from '../types';

/**
 * Programmatically generates a highly polished, branded PDF for a specific day of a sprint.
 * Incorporates exact user-requested tags: Daily Content, Action Step, Hint, and Footnote.
 */
export const generateDayPDF = (sprint: Sprint, dayContent: DailyContent) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 25;

  const drawPageBackground = () => {
    // Branded top line accent
    doc.setFillColor(14, 120, 80); // Vectorise emerald green color (#0E7850)
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Page footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${sprint.title} — Day ${dayContent.day}/${sprint.duration}`, margin, pageHeight - 10);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      doc.addPage();
      drawPageBackground();
      y = margin + 15;
    }
  };

  // Initial background
  drawPageBackground();

  // Document Header Block
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(14, 120, 80);
  doc.text(`DAY ${dayContent.day} CURRICULUM`, margin, y);
  y += 8;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Sprint: ${sprint.title}`, margin, y);
  y += 4;
  doc.text(`Duration ID: Day ${dayContent.day} of ${sprint.duration}`, margin, y);
  y += 8;

  // Horizontal separator line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // 1. Daily Content Section
  checkPageBreak(12);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Daily Content", margin, y);
  y += 6;

  const lessonText = dayContent.lessonText || 'No daily content compiled for this day.';
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(70, 70, 70);

  const splitLesson = doc.splitTextToSize(lessonText, contentWidth);
  for (const line of splitLesson) {
    checkPageBreak(5.5);
    doc.text(line, margin, y);
    y += 5.5;
  }
  y += 10; // extra padding after daily content

  // 2. Action Steps Section
  const prompts = dayContent.taskPrompts || [dayContent.taskPrompt || ''];
  const activePrompts = prompts.map(p => p?.trim()).filter(Boolean);

  if (activePrompts.length > 0) {
    checkPageBreak(12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Action Steps", margin, y);
    y += 8;

    activePrompts.forEach((prompt, index) => {
      checkPageBreak(15);

      // Tag: Action Step
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(14, 120, 80);
      doc.text(`Action Step ${index + 1}`, margin, y);
      y += 5;

      // Content of action step
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      const splitPrompt = doc.splitTextToSize(prompt, contentWidth);
      for (const line of splitPrompt) {
        checkPageBreak(5.5);
        doc.text(line, margin, y);
        y += 5.5;
      }
      y += 4;

      // Tag: Hint (if present)
      const hint = dayContent.taskHints?.[index];
      if (hint && hint.trim()) {
        checkPageBreak(12);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(180, 100, 10); // Amber hint color
        doc.text("Hint", margin + 4, y);
        y += 4.5;

        doc.setFont('Helvetica', 'oblique');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 105, 115);
        const splitHint = doc.splitTextToSize(hint, contentWidth - 8);
        for (const line of splitHint) {
          checkPageBreak(5);
          doc.text(line, margin + 4, y);
          y += 5;
        }
        y += 4;
      }

      // Tag: Footnote (if present)
      const footnote = dayContent.taskFootnotes?.[index];
      if (footnote && footnote.trim()) {
        checkPageBreak(12);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229); // Indigo footnote color
        doc.text("Footnote", margin + 4, y);
        y += 4.5;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const splitFootnote = doc.splitTextToSize(footnote, contentWidth - 8);
        for (const line of splitFootnote) {
          checkPageBreak(5);
          doc.text(line, margin + 4, y);
          y += 5;
        }
        y += 4;
      }

      y += 6; // separator gap between step modules
    });
  } else {
    checkPageBreak(12);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(14, 120, 80);
    doc.text("Action Step 1", margin, y);
    y += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("No specific action step prompt is compiled for this day.", margin, y);
    y += 10;
  }

  // Download the compiled file
  const sanitizeTitle = sprint.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${sanitizeTitle}_day_${dayContent.day}.pdf`);
};
