import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "deliverables", "产品体验说明-V1.md");
const outputPath = path.join(root, "deliverables", "产品体验说明-V1.html");
const source = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const slugify = (value) => value
  .toLowerCase()
  .replace(/[\s｜：:、，,。！？!?（）()“”‘’]/g, "-")
  .replace(/[^\p{Letter}\p{Number}-]/gu, "")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "") || "section";

function inline(value) {
  const tokens = [];
  let escaped = escapeHtml(value);
  escaped = escaped.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@TOKEN${tokens.length}@@`;
    tokens.push(`<code>${code}</code>`);
    return token;
  });
  escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const token = `@@TOKEN${tokens.length}@@`;
    tokens.push(`<img src="${src}" alt="${alt}" loading="lazy">`);
    return token;
  });
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/@@TOKEN(\d+)@@/g, (_, index) => tokens[Number(index)]);
  return escaped;
}

const lines = source.split("\n");
const html = [];
const toc = [];
let paragraph = [];
let listType = null;
let inCode = false;
let codeLanguage = "";
let codeLines = [];

function flushParagraph() {
  if (!paragraph.length) return;
  html.push(`<p>${inline(paragraph.join(" ").replace(/  $/, ""))}</p>`);
  paragraph = [];
}

function closeList() {
  if (!listType) return;
  html.push(`</${listType}>`);
  listType = null;
}

function openList(type) {
  if (listType === type) return;
  closeList();
  html.push(`<${type}>`);
  listType = type;
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];

  if (line.startsWith("```")) {
    flushParagraph();
    closeList();
    if (!inCode) {
      inCode = true;
      codeLanguage = line.slice(3).trim();
      codeLines = [];
    } else {
      html.push(`<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      inCode = false;
    }
    continue;
  }

  if (inCode) {
    codeLines.push(line);
    continue;
  }

  if (line.startsWith("|") && /^\|?\s*:?-{3,}/.test(lines[index + 1] ?? "")) {
    flushParagraph();
    closeList();
    const headers = splitTableRow(line);
    index += 2;
    const rows = [];
    while (index < lines.length && lines[index].trim().startsWith("|")) {
      rows.push(splitTableRow(lines[index]));
      index += 1;
    }
    index -= 1;
    html.push('<div class="table-wrap"><table><thead><tr>');
    headers.forEach((cell) => html.push(`<th>${inline(cell)}</th>`));
    html.push("</tr></thead><tbody>");
    rows.forEach((row) => {
      html.push("<tr>");
      row.forEach((cell, cellIndex) => html.push(`<td data-label="${escapeHtml(headers[cellIndex] ?? "")}">${inline(cell)}</td>`));
      html.push("</tr>");
    });
    html.push("</tbody></table></div>");
    continue;
  }

  const heading = line.match(/^(#{1,4})\s+(.+)$/);
  if (heading) {
    flushParagraph();
    closeList();
    const level = heading[1].length;
    const text = heading[2];
    const id = slugify(text);
    const numberedHeading = level === 2 ? text.match(/^(\d+)\.\s*(.+)$/) : null;
    if (numberedHeading) {
      const number = numberedHeading[1].padStart(2, "0");
      const title = numberedHeading[2];
      html.push(`<h2 id="${id}"><span class="num">${number}</span>${inline(title)}</h2>`);
      toc.push({ id, text: `${number}　${title.replace(/\*\*/g, "")}` });
    } else {
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      if (level === 2) toc.push({ id, text: text.replace(/\*\*/g, "") });
    }
    continue;
  }

  if (/^---+$/.test(line.trim())) {
    flushParagraph();
    closeList();
    html.push("<hr>");
    continue;
  }

  if (line.startsWith("> ")) {
    flushParagraph();
    closeList();
    const quote = [line.slice(2)];
    while ((lines[index + 1] ?? "").startsWith("> ")) quote.push(lines[++index].slice(2));
    html.push(`<blockquote>${quote.map((item) => `<p>${inline(item.replace(/  $/, ""))}</p>`).join("")}</blockquote>`);
    continue;
  }

  const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (image) {
    flushParagraph();
    closeList();
    html.push(`<figure><img src="${image[2]}" alt="${escapeHtml(image[1])}" loading="lazy"><figcaption>${escapeHtml(image[1])}</figcaption></figure>`);
    continue;
  }

  const checklist = line.match(/^- \[ \]\s+(.+)$/);
  if (checklist) {
    flushParagraph();
    openList("ul");
    html.push(`<li class="check"><span aria-hidden="true">□</span>${inline(checklist[1])}</li>`);
    continue;
  }

  const bullet = line.match(/^-\s+(.+)$/);
  if (bullet) {
    flushParagraph();
    openList("ul");
    html.push(`<li>${inline(bullet[1])}</li>`);
    continue;
  }

  const ordered = line.match(/^\d+\.\s+(.+)$/);
  if (ordered) {
    flushParagraph();
    openList("ol");
    html.push(`<li>${inline(ordered[1])}</li>`);
    continue;
  }

  if (!line.trim()) {
    flushParagraph();
    closeList();
    continue;
  }

  paragraph.push(line.trim());
}

flushParagraph();
closeList();

const tocHtml = toc.map(({ id, text }) => `<a href="#${id}">${escapeHtml(text)}</a>`).join("\n");
const contentBlocks = html.filter((block) => !block.startsWith("<h1"));
const introBlocks = [];
const sections = [];
let currentSection = null;

for (const block of contentBlocks) {
  if (block.startsWith("<h2")) {
    if (currentSection) sections.push(currentSection);
    currentSection = [block];
  } else if (currentSection) {
    currentSection.push(block);
  } else if (block !== "<hr>") {
    introBlocks.push(block);
  }
}

if (currentSection) sections.push(currentSection);
const sectionsHtml = sections.map((section) => `<section>${section.join("\n")}</section>`).join("\n");
const documentHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="AI 剧情灵伴如何进入观看过程并承接用户需要的产品体验说明。">
  <title>产品体验说明 V1｜AI 剧情灵伴</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#667085; --line:#d8dee9; --soft:#f6f8fb; --link:#245b9e; }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin:0; color:var(--ink); background:#fff; font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; }
    main { width:min(960px, calc(100% - 32px)); margin:0 auto; padding:48px 0 80px; }
    h1 { margin:0 0 24px; font-size:clamp(30px,5vw,44px); line-height:1.25; }
    h2 { margin:56px 0 16px; padding-top:8px; font-size:28px; line-height:1.35; border-top:1px solid var(--line); }
    h3 { margin:30px 0 10px; font-size:21px; line-height:1.45; }
    h4 { margin:24px 0 8px; font-size:17px; line-height:1.5; }
    p { margin:10px 0; }
    a { color:var(--link); text-underline-offset:3px; }
    nav { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px 20px; margin:28px 0 40px; padding:20px; background:var(--soft); border:1px solid var(--line); border-radius:8px; }
    nav strong { grid-column:1/-1; margin-bottom:4px; }
    nav a { text-decoration:none; }
    blockquote { margin:20px 0 34px; padding:14px 18px; color:#344054; background:var(--soft); border-left:4px solid #98a2b3; }
    blockquote p { margin:4px 0; }
    ul, ol { padding-left:24px; }
    li { margin:6px 0; }
    .check { list-style:none; margin-left:-22px; }
    .check span { display:inline-block; width:22px; color:var(--muted); }
    .table-wrap { overflow-x:auto; margin:18px 0 28px; }
    table { width:100%; min-width:660px; border-collapse:collapse; font-size:15px; }
    th, td { padding:11px 12px; text-align:left; vertical-align:top; border:1px solid var(--line); }
    th { background:var(--soft); font-weight:650; }
    figure { margin:22px 0 32px; }
    figure img { display:block; max-width:100%; height:auto; border:1px solid var(--line); border-radius:6px; }
    figcaption { margin-top:6px; color:var(--muted); font-size:14px; }
    pre { overflow:auto; padding:18px; color:#eef2f6; background:#111827; border-radius:7px; line-height:1.55; }
    code { font-family:"SFMono-Regular",Consolas,monospace; font-size:.92em; }
    :not(pre) > code { padding:2px 5px; background:var(--soft); border:1px solid var(--line); border-radius:4px; }
    hr { margin:42px 0; border:0; border-top:1px solid var(--line); }
    footer { margin-top:56px; padding-top:18px; color:var(--muted); border-top:1px solid var(--line); font-size:14px; }
    @media (max-width:680px) { main { padding-top:28px; } nav { grid-template-columns:1fr; } h2 { margin-top:42px; font-size:24px; } }
    @media print { nav { display:none; } main { width:100%; padding:0; } a { color:inherit; } h2 { break-after:avoid; } figure, table { break-inside:avoid; } }
  </style>
  <style>
    /* 与《评测与灰度方案 V1》共用的简洁文档视觉语言 */
    :root {
      --ink: #1f2329;
      --ink-2: #4e5969;
      --ink-3: #8f959e;
      --paper: #ffffff;
      --canvas: #ffffff;
      --line: #e5e6eb;
      --line-strong: #d0d3d8;
      --blue: #3370ff;
      --blue-deep: #245bdb;
      --blue-soft: #f2f6ff;
    }

    html { scroll-padding-top: 24px; }

    body {
      color: var(--ink);
      background: var(--canvas);
      font-size: 15px;
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; }

    .skip-link {
      position: fixed;
      left: 16px;
      top: 12px;
      z-index: 50;
      padding: 8px 12px;
      color: #fff;
      background: var(--blue-deep);
      border-radius: 8px;
      transform: translateY(-160%);
    }

    .skip-link:focus { transform: translateY(0); }

    .shell {
      display: grid;
      grid-template-columns: 176px minmax(0, 760px);
      justify-content: center;
      align-items: start;
      gap: 40px;
      padding: 36px 28px 72px;
    }

    .toc {
      position: sticky;
      top: 32px;
      display: block;
      max-height: calc(100vh - 64px);
      overflow: auto;
      margin: 0;
      padding: 4px 0 4px 16px;
      color: var(--ink-3);
      background: #fff;
      border: 0;
      border-left: 1px solid var(--line);
      border-radius: 0;
    }

    .toc strong {
      display: block;
      margin: 0 0 8px;
      color: var(--ink);
      font-size: 12px;
      font-weight: 600;
    }

    .toc a {
      display: block;
      padding: 4px 0;
      text-decoration: none;
      font-size: 12px;
      line-height: 1.45;
    }

    .toc a:hover,
    .toc a:focus-visible {
      color: var(--blue);
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .document { min-width: 0; background: var(--paper); }

    .cover {
      padding: 18px 0 32px;
      border-bottom: 1px solid var(--line);
    }

    .eyebrow {
      margin: 0 0 10px;
      color: var(--ink-3);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 36px;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }

    .cover-lead {
      max-width: 720px;
      margin: 14px 0 0;
      color: var(--ink-2);
      font-size: 16px;
      line-height: 1.75;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      margin-top: 18px;
      color: var(--ink-3);
      font-size: 12px;
    }

    .meta span:not(:last-child)::after {
      content: " · ";
      margin: 0 7px;
      color: var(--line-strong);
    }

    .content {
      width: auto;
      margin: 0;
      padding: 0;
    }

    .intro {
      padding: 28px 0 4px;
      border-bottom: 1px solid var(--line);
    }

    section {
      padding: 32px 0;
      border-bottom: 1px solid var(--line);
    }

    section:last-child { border-bottom: 0; }

    h2 {
      display: flex;
      align-items: baseline;
      gap: 9px;
      margin: 0 0 14px;
      padding: 0;
      font-size: 22px;
      line-height: 1.3;
      letter-spacing: -0.01em;
      border: 0;
    }

    h2 .num {
      flex: none;
      color: var(--ink-3);
      font-size: 12px;
      font-weight: 600;
    }

    h3 { margin: 22px 0 8px; font-size: 17px; line-height: 1.45; }
    h4 { margin: 20px 0 7px; font-size: 15px; line-height: 1.5; }
    p { margin: 10px 0; }
    p a, blockquote a { color: var(--blue); text-underline-offset: 3px; }

    blockquote {
      margin: 0 0 24px;
      padding: 12px 14px;
      color: var(--ink-2);
      background: var(--blue-soft);
      border: 0;
      border-left: 3px solid var(--blue);
      border-radius: 2px;
    }

    blockquote p { margin: 4px 0; }
    ul, ol { margin: 10px 0; padding-left: 1.25em; }
    li { margin: 6px 0; }
    li::marker { color: var(--ink-3); }
    strong { font-weight: 730; }
    .check { list-style: none; margin-left: -18px; }
    .check span { display: inline-block; width: 22px; color: var(--ink-3); }

    .table-wrap {
      margin: 14px 0 24px;
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 2px;
    }

    table {
      width: 100%;
      min-width: 660px;
      border-collapse: collapse;
      background: #fff;
      font-size: 13px;
      line-height: 1.55;
    }

    th,
    td {
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      border: 0;
      border-bottom: 1px solid var(--line);
    }

    th {
      color: var(--ink-2);
      background: #f7f8fa;
      font-size: 12px;
      font-weight: 800;
    }

    tr:last-child td { border-bottom: 0; }

    figure {
      margin: 18px 0 26px;
      padding: 10px;
      background: #f7f8fa;
      border: 1px solid var(--line);
      border-radius: 4px;
    }

    figure img {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      border: 1px solid #252b34;
      border-radius: 3px;
    }

    figcaption { margin: 8px 2px 0; color: var(--ink-3); font-size: 12px; }

    pre {
      margin: 16px 0 24px;
      padding: 16px 18px;
      color: #dfe8f5;
      background: #13243d;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.6;
    }

    :not(pre) > code { padding: 1px 4px; background: #f2f3f5; border: 1px solid var(--line); border-radius: 3px; }
    hr { margin: 36px 0; border-top-color: var(--line); }

    .footer {
      margin: 0;
      padding: 24px 0 12px;
      color: var(--ink-3);
      border-top: 1px solid var(--line);
      font-size: 12px;
    }

    @media (max-width: 980px) {
      .shell { grid-template-columns: minmax(0, 760px); }
      .toc { display: none; }
    }

    @media (max-width: 720px) {
      .shell { display: block; padding: 0 22px 48px; }
      .cover { padding: 32px 0 24px; }
      .content { padding: 0; }
      h1 { font-size: 30px; }
      .cover-lead { font-size: 15px; }
      h2 { margin-top: 0; font-size: 20px; }
      .table-wrap { overflow-x: auto; }
      table { min-width: 620px; }
      figure { margin-left: -8px; margin-right: -8px; padding: 7px; }
    }

    @media (max-width: 420px) {
      .shell { padding: 0 18px 40px; }
      .cover { padding: 28px 0 22px; }
      h1 { font-size: 28px; }
    }

    @media print {
      @page { size: A4; margin: 14mm; }
      body { font-size: 10.5pt; }
      .shell { display: block; padding: 0; }
      .toc { display: none; }
      .cover { padding: 28px 0 24px; }
      section { padding: 22px 0; }
      h1 { font-size: 34pt; }
      h2, h3, figure, pre, table { break-inside: avoid; }
      .table-wrap { overflow: visible; }
      table { font-size: 8.5pt; }
      th, td { padding: 8px; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  <div class="shell">
    <nav class="toc" aria-label="文档目录"><strong>目录</strong>${tocHtml}</nav>
    <article class="document">
      <header id="top" class="cover">
        <p class="eyebrow">Tencent AI Product Practice · Experience Specification</p>
        <h1>产品体验说明</h1>
        <p class="cover-lead">说明 AI 如何进入观看过程、承接不同理解需要，并明确产品、设计与研发共同保护的体验边界。</p>
        <div class="meta" aria-label="文档信息">
          <span>AI 剧情灵伴</span>
          <span>版本 V1.0</span>
          <span>2026-09-09</span>
          <span>体验规格 · 能力待验证</span>
        </div>
      </header>
      <main id="main" class="content">
        <div class="intro">${introBlocks.join("\n")}</div>
        ${sectionsHtml}
      </main>
      <footer class="footer">由《用户问题与产品定位说明 V2》和 AI 剧情灵伴交互 Demo 共同支撑。当前为体验规格，不代表真实接口能力或业务效果已经验证。</footer>
    </article>
  </div>
</body>
</html>`;

fs.writeFileSync(outputPath, documentHtml, "utf8");
console.log(outputPath);
