#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'Snow-Cocoplus', 'docs');
const targetDir = path.join(repoRoot, 'docs');
const checkOnly = process.argv.includes('--check');

const pages = [
  { source: 'README.md', target: 'index.html', nav: 'Home', label: 'Documentation', active: 'index.html' },
  { source: 'getting-started.md', target: 'getting-started.html', nav: 'Getting Started', label: 'Start Here' },
  { source: 'data-context.md', target: 'data-context.html', nav: 'Data Context', label: 'Data Context' },
  { source: 'concepts.md', target: 'concepts.html', nav: 'Concepts', label: 'Core Concepts' },
  { source: 'architecture.md', target: 'architecture.html', nav: 'Architecture', label: "How It's Built" },
  { source: 'features.md', target: 'features.html', nav: 'Features', label: 'Feature Catalog' },
  { source: 'workflows.md', target: 'workflows.html', nav: 'Workflows', label: 'Workflow Guide' },
  { source: 'command-reference.md', target: 'command-reference.html', nav: 'Commands', label: 'Command Reference' },
  { source: 'principles.md', target: 'principles.html', nav: 'Principles', label: 'Design Principles' },
  { source: 'manifesto.md', target: 'manifesto.html', nav: 'Manifesto', label: 'Manifesto' },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(value) {
  return String(value).toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inlineMarkdown(value) {
  let out = escapeHtml(value);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function parseTable(lines, start) {
  const header = lines[start];
  const divider = lines[start + 1] || '';
  if (!header.includes('|') || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider)) {
    return null;
  }

  const rows = [];
  let index = start;
  while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
    rows.push(lines[index]);
    index += 1;
  }

  const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  const headings = cells(rows[0]);
  const bodyRows = rows.slice(2).map(cells);
  const thead = headings.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('');
  const tbody = bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('\n');

  return {
    html: `<div class="table-wrap"><table><thead><tr>${thead}</tr></thead><tbody>\n${tbody}\n</tbody></table></div>`,
    next: index,
  };
}

function renderBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let paragraph = [];
  let list = null;
  let blockquote = [];
  let code = null;

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }

  function flushList() {
    if (list) {
      html.push(`<${list.type}>\n${list.items.map((item) => `  <li>${inlineMarkdown(item)}</li>`).join('\n')}\n</${list.type}>`);
      list = null;
    }
  }

  function flushBlockquote() {
    if (blockquote.length) {
      html.push(`<blockquote><p>${inlineMarkdown(blockquote.join(' '))}</p></blockquote>`);
      blockquote = [];
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (code) {
      if (trimmed.startsWith('```')) {
        html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      flushParagraph(); flushList(); flushBlockquote();
      code = { lines: [] };
      continue;
    }

    const table = parseTable(lines, i);
    if (table) {
      flushParagraph(); flushList(); flushBlockquote();
      html.push(table.html);
      i = table.next - 1;
      continue;
    }

    if (!trimmed) {
      flushParagraph(); flushList(); flushBlockquote();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph(); flushList(); flushBlockquote();
      html.push('<hr>');
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList(); flushBlockquote();
      const level = Math.min(6, heading[1].length);
      const text = heading[2].replace(/\s+#+$/, '');
      const id = slugify(text);
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushParagraph(); flushList();
      blockquote.push(trimmed.replace(/^>\s?/, ''));
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph(); flushBlockquote();
      const type = unordered ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push((unordered || ordered)[1]);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph(); flushList(); flushBlockquote();
  if (code) {
    html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`);
  }
  return html.join('\n');
}

function extractTitleAndBody(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));
  const title = titleIndex >= 0 ? lines[titleIndex].replace(/^#\s+/, '').trim() : 'CocoPlus';
  const bodyLines = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;
  const firstParagraph = bodyLines.join('\n').split(/\n\s*\n/).find((block) => block.trim() && !/^---+$/.test(block.trim()));
  const subtitle = firstParagraph ? firstParagraph.trim().replace(/\s+/g, ' ') : '';
  return { title, subtitle, body: bodyLines.join('\n') };
}

function nav(activeTarget) {
  const links = pages.map((page) => {
    const active = page.target === activeTarget || page.active === activeTarget ? ' class="active"' : '';
    return `  <a href="${page.target}"${active}>${page.nav}</a>`;
  }).join('\n');
  return `<nav>
  <a href="index.html" class="brand">CocoPlus</a>
${links}
  <a href="https://github.com/Snowflake-Labs/cocoplus/" target="_blank" rel="noopener">Repo ↗</a>
</nav>`;
}

function pageHtml(page) {
  const markdown = fs.readFileSync(path.join(sourceDir, page.source), 'utf8');
  const { title, subtitle, body } = extractTitleAndBody(markdown);
  const rendered = renderBlocks(body);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — CocoPlus</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

${nav(page.target)}

<div class="page-header">
  <div class="label">${escapeHtml(page.label)}</div>
  <h1>${inlineMarkdown(title)}</h1>
  <p class="subtitle">${inlineMarkdown(subtitle)}</p>
</div>

<div class="content">
${rendered}
</div>

<footer>
  CocoPlus Documentation &nbsp;·&nbsp; <a href="index.html">Home</a>
</footer>

</body>
</html>
`;
}

const mismatches = [];
for (const page of pages) {
  const targetPath = path.join(targetDir, page.target);
  const expected = pageHtml(page);
  if (checkOnly) {
    const actual = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
    if (actual !== expected) mismatches.push(page.target);
  } else {
    fs.writeFileSync(targetPath, expected);
  }
}

if (checkOnly) {
  if (mismatches.length) {
    console.error(`Docs HTML out of sync: ${mismatches.join(', ')}`);
    process.exit(1);
  }
  console.log(`Docs HTML is in sync for ${pages.length} pages.`);
} else {
  console.log(`Synced ${pages.length} HTML docs pages from Snow-Cocoplus/docs.`);
}
