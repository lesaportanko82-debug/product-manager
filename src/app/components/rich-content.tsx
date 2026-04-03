import React from "react";
import { Table2, Quote, Info, ArrowRight } from "lucide-react";

// Generate a slug from heading text for anchor links
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^а-яa-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

// Extract headings from content for TOC
export function extractHeadings(content: string[]): { text: string; id: string; level: number }[] {
  const headings: { text: string; id: string; level: number }[] = [];
  for (const paragraph of content) {
    const cleaned = paragraph
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '')
      .trim();

    // === Case === (level 2)
    const caseMatch = cleaned.match(/^===\s*(.+?)\s*===$/);
    if (caseMatch) {
      headings.push({ text: caseMatch[1], id: slugify(caseMatch[1]), level: 2 });
      continue;
    }

    // --- Section --- (level 3)
    const sectionMatch = cleaned.match(/^---\s*(.+?)\s*---$/);
    if (sectionMatch) {
      headings.push({ text: sectionMatch[1], id: slugify(sectionMatch[1]), level: 3 });
      continue;
    }

    // Single-line section headers
    const lines = cleaned.split('\n');
    if (lines.length === 1) {
      const line = lines[0].trim();
      if (isSectionHeader(line) && line.length < 80) {
        headings.push({ text: line, id: slugify(line), level: 2 });
        continue;
      }
    }

    // Multi-line: detect inline headers
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        (trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.includes('.')) ||
        (isSectionHeader(trimmed) && trimmed.length < 60)
      ) {
        const headerText = trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed;
        headings.push({ text: headerText, id: slugify(headerText), level: 3 });
      }
    }
  }
  return headings;
}

// Parse and render rich content from course data paragraphs
function parseBoldAndItalic(text: string): React.ReactNode[] {
  // Handle **bold**, *italic*, `code`, «quotes», and auto-detect metrics
  const parts: React.ReactNode[] = [];
  // Regex: bold, italic, code, «quotes», and auto-detect metrics (percentages like 70-90%, 42%; money like $30; numbers with units)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|«(.+?)»|(?<![а-яА-Яa-zA-Z\d])(\d[\d.,]*\s*[-–]\s*\d[\d.,]*%|\d[\d.,]*[%+]|[$€₽]\d[\d.,]*(?:\/[а-яa-z]+)?)(?![а-яА-Яa-zA-Z\d]))/g;
  let lastIndex = 0;
  let match;

  const str = text;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(<code key={match.index} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-[0.8125rem] font-mono">{match[4]}</code>);
    } else if (match[5]) {
      parts.push(<span key={match.index} className="text-foreground">«{match[5]}»</span>);
    } else if (match[6]) {
      // Auto-detected metric/number — highlight with accent color
      parts.push(
        <span key={match.index} className="font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1 py-0.5 rounded-md text-[0.875rem]">
          {match[6]}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

function isTableContent(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;
  // Lines that look like table rows (| ... | ... |)
  const tableRowLines = lines.filter(l => isTableRow(l.trim()));
  const pipeLines = lines.filter(l => l.includes(' | ') || l.includes('\t'));
  return (tableRowLines.length >= 2 && tableRowLines.length >= lines.length * 0.5) ||
    (pipeLines.length >= 2 && pipeLines.length >= lines.length * 0.4);
}

// Detect a markdown table separator row like |---|---|---|
function isSeparatorRow(line: string): boolean {
  const cells = line.split('|').filter(c => c.trim());
  return cells.length >= 1 && cells.every(c => /^[\s\-:]+$/.test(c));
}

// Detect a markdown table row: starts and ends with |, or has multiple pipe-separated cells
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return (trimmed.startsWith('|') && trimmed.endsWith('|')) ||
    (trimmed.split('|').length >= 3 && trimmed.includes(' | '));
}

// Shared table renderer — accepts raw lines (strings), skips separator rows
function renderTableFromLines(tableLines: string[], title?: string): React.ReactNode {
  const dataLines = tableLines.filter(l => !isSeparatorRow(l.trim()));
  const rows = dataLines.map(line =>
    line.split(/\s*\|\s*/).map(c => c.trim()).filter(c => c)
  );
  if (rows.length === 0) return null;
  return (
    <div className="my-4">
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <Table2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold text-[0.875rem] text-foreground">{parseBoldAndItalic(title)}</span>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm shadow-black/[0.03]">
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="bg-teal-50/70 dark:bg-teal-900/20">
              {rows[0]?.map((cell, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-semibold text-teal-900/80 dark:text-teal-100/80 border-b border-teal-100/60 dark:border-teal-800/40 whitespace-nowrap">
                  {parseBoldAndItalic(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((row, ri) => (
              <tr key={ri} className={`transition-colors ${ri % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-800/60'} hover:bg-teal-50/30 dark:hover:bg-teal-900/10`}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-4 py-2.5 text-foreground/75 border-b border-border/20 ${ci === 0 ? 'font-medium text-foreground/85' : ''}`}>
                    {parseBoldAndItalic(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderTable(text: string): React.ReactNode {
  const lines = text.split('\n').filter(l => l.trim());
  const tableLines = lines.filter(l => isTableRow(l.trim()) || l.includes('|'));
  const headerLine = lines.find(l => !l.includes('|') && !l.includes('\t'));
  return renderTableFromLines(tableLines, headerLine) ?? <p className="leading-relaxed text-[0.9375rem]">{text}</p>;
}

function isNumberedList(lines: string[]): boolean {
  const numbered = lines.filter(l => /^\d+[\.\)]\s/.test(l.trim()));
  return numbered.length >= 2 && numbered.length >= lines.length * 0.3;
}

function isBulletList(lines: string[]): boolean {
  const bullets = lines.filter(l => /^[•\-–—]\s/.test(l.trim()));
  return bullets.length >= 2 && bullets.length >= lines.length * 0.3;
}

function isHeader(line: string): boolean {
  // Lines that look like headers: "Title:" or "=== Title ===" or all-caps short, or ending with newline patterns
  if (/^===\s*(.+?)\s*===\s*$/.test(line)) return true;
  if (/^[А-ЯA-Z][^.!?]*:$/.test(line.trim()) && line.trim().length < 80) return true;
  return false;
}

function isSectionHeader(line: string): boolean {
  // Detect section-level headers like "Agile (гибкая методология разработки)" or "Принципы Kanban"
  const trimmed = line.trim();
  if (/^===\s*(.+?)\s*===\s*$/.test(trimmed)) return true;
  if (/^[А-ЯA-Z][А-Яа-яA-Za-z\s\(\)\/\-—,]+$/.test(trimmed) && trimmed.length < 60 && !trimmed.includes('.')) return true;
  return false;
}

function renderQuote(text: string): React.ReactNode {
  return (
    <blockquote className="border-l-4 border-teal-300 dark:border-teal-600 bg-teal-50/40 dark:bg-teal-900/20 pl-4 pr-4 py-3 my-3 rounded-r-lg">
      <div className="flex items-start gap-2">
        <Quote className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <span className="text-[0.9375rem] italic text-teal-900/80 leading-relaxed">{parseBoldAndItalic(text)}</span>
      </div>
    </blockquote>
  );
}

function renderParagraphBlock(paragraph: string, index: number): React.ReactNode {
  // Check for === markers (case separators)
  const caseMatch = paragraph.match(/^===\s*(.+?)\s*===$/);
  if (caseMatch) {
    return (
      <div key={index} id={slugify(caseMatch[1])} className="flex items-center gap-3 mt-8 mb-4 py-3 px-4 bg-gradient-to-r from-slate-50/80 to-teal-50/40 dark:from-slate-800/80 dark:to-teal-900/30 rounded-xl border border-slate-100/60 dark:border-slate-700/60 scroll-mt-16">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <Info className="w-4 h-4 text-teal-600" />
        </div>
        <h3 className="text-teal-800 text-base font-semibold">{caseMatch[1]}</h3>
      </div>
    );
  }

  // Check for --- markers (section sub-headers / dividers)
  const sectionMatch = paragraph.match(/^---\s*(.+?)\s*---$/);
  if (sectionMatch) {
    return (
      <div key={index} id={slugify(sectionMatch[1])} className="flex items-center gap-3 mt-6 mb-2 scroll-mt-16">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-200/60 to-transparent" />
        <span className="text-xs font-semibold uppercase tracking-widest text-teal-600/70 whitespace-nowrap px-2">{sectionMatch[1]}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-200/60 to-transparent" />
      </div>
    );
  }

  const lines = paragraph.split('\n');

  // Check for table content
  if (isTableContent(paragraph)) {
    return <div key={index}>{renderTable(paragraph)}</div>;
  }

  // Single line content
  if (lines.length === 1) {
    const line = lines[0].trim();
    
    // Check if it's a standalone header
    if (isSectionHeader(line) && line.length < 80) {
      return (
        <h3 key={index} id={slugify(line)} className="text-lg font-semibold mt-6 mb-2 text-foreground border-b border-slate-100 dark:border-slate-700 pb-2 scroll-mt-16">
          {parseBoldAndItalic(line)}
        </h3>
      );
    }

    // Quote detection (starts with «)
    if (line.startsWith('«') || line.startsWith('"') || line.startsWith("'")) {
      return <div key={index}>{renderQuote(line)}</div>;
    }

    // Regular paragraph
    return (
      <p key={index} className="leading-relaxed text-[0.9375rem] text-slate-700 dark:text-slate-300">
        {parseBoldAndItalic(line)}
      </p>
    );
  }

  // Multi-line content
  const result: React.ReactNode[] = [];
  let currentBlock: { type: 'text' | 'bullet' | 'numbered' | 'header' | 'table'; lines: string[] } = { type: 'text', lines: [] };

  const flushBlock = () => {
    if (currentBlock.lines.length === 0) return;

    if (currentBlock.type === 'table') {
      const tableNode = renderTableFromLines(currentBlock.lines);
      if (tableNode) result.push(<div key={result.length}>{tableNode}</div>);
    } else if (currentBlock.type === 'numbered') {
      result.push(
        <ol key={result.length} className="space-y-2 my-3">
          {currentBlock.lines.map((line, li) => {
            const match = line.match(/^(\d+)[\.\)]\s*(.*)/);
            const content = match ? match[2] : line;
            const num = match ? match[1] : String(li + 1);
            return (
              <li key={li} className="flex items-start gap-3 text-[0.9375rem]">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5">
                  {num}
                </span>
                <span className="text-slate-600 dark:text-slate-300 leading-relaxed">{parseBoldAndItalic(content)}</span>
              </li>
            );
          })}
        </ol>
      );
    } else if (currentBlock.type === 'bullet') {
      result.push(
        <ul key={result.length} className="space-y-1.5 my-3">
          {currentBlock.lines.map((line, li) => {
            const content = line.replace(/^[•\-–—]\s*/, '');
            return (
              <li key={li} className="flex items-start gap-2.5 text-[0.9375rem]">
                <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-1.5" />
                <span className="text-slate-600 dark:text-slate-300 leading-relaxed">{parseBoldAndItalic(content)}</span>
              </li>
            );
          })}
        </ul>
      );
    } else if (currentBlock.type === 'header') {
      const hdrText = currentBlock.lines[0];
      const hdrSlug = slugify(hdrText);
      result.push(
        <h4 key={result.length} id={hdrSlug} className="text-base font-semibold mt-5 mb-1.5 text-foreground scroll-mt-16">
          {parseBoldAndItalic(hdrText)}
        </h4>
      );
    } else {
      // Regular text lines
      currentBlock.lines.forEach((line, li) => {
        if (line.trim()) {
          result.push(
            <p key={`${result.length}-${li}`} className="leading-relaxed text-[0.9375rem] text-slate-700 dark:text-slate-300">
              {parseBoldAndItalic(line)}
            </p>
          );
        }
      });
    }
    currentBlock = { type: 'text', lines: [] };
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBlock();
      continue;
    }

    // Check if table row (| col | col |) — must check before other detections
    if (isTableRow(trimmed)) {
      if (currentBlock.type !== 'table') {
        flushBlock();
        currentBlock.type = 'table';
      }
      currentBlock.lines.push(trimmed);
    }
    // Check if numbered
    else if (/^\d+[\.\)]\s/.test(trimmed)) {
      if (currentBlock.type !== 'numbered') {
        flushBlock();
        currentBlock.type = 'numbered';
      }
      currentBlock.lines.push(trimmed);
    }
    // Check if bullet
    else if (/^[•\-–—]\s/.test(trimmed)) {
      if (currentBlock.type !== 'bullet') {
        flushBlock();
        currentBlock.type = 'bullet';
      }
      currentBlock.lines.push(trimmed);
    }
    // Check if header-like (short line ending with colon, or section title pattern)
    else if (
      (trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.includes('.')) ||
      (isSectionHeader(trimmed) && trimmed.length < 60)
    ) {
      flushBlock();
      const headerText = trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed;
      currentBlock.type = 'header';
      currentBlock.lines.push(headerText);
      flushBlock();
    }
    // Quote-like
    else if ((trimmed.startsWith('«') && trimmed.endsWith('»')) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      flushBlock();
      result.push(<div key={result.length}>{renderQuote(trimmed)}</div>);
    }
    else {
      if (currentBlock.type !== 'text') {
        flushBlock();
      }
      currentBlock.lines.push(trimmed);
    }
  }
  flushBlock();

  return <div key={index} className="space-y-2">{result}</div>;
}

// Stats/infographic component for key metrics  
export function MetricCard({ label, value, color = "teal" }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    indigo: "bg-teal-50 border-teal-100 text-teal-600",
    green: "bg-green-50 border-green-100 text-green-700",
    blue: "bg-teal-50 border-teal-100 text-teal-700",
    teal: "bg-teal-50 border-teal-100 text-teal-600",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${colors[color] || colors.teal}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  );
}

// Clean content: fix double-escaped newlines and other artifacts
function cleanContent(text: string): string {
  return text
    .replace(/\\n/g, '\n')  // Fix literal \n to actual newlines
    .replace(/\\t/g, '\t')  // Fix literal \t to actual tabs
    .replace(/\\r/g, '')    // Remove literal \r
    .trim();
}

// Memoized — lesson content arrays are module-level constants, so reference equality
// holds between renders for the same lesson, making memo effective.
export const RichContent = React.memo(function RichContent({ content }: { content: string[] }) {
  return (
    <div className="space-y-4">
      {content.map((paragraph, i) => renderParagraphBlock(cleanContent(paragraph), i))}
    </div>
  );
});