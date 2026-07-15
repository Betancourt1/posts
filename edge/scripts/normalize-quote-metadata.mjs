import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const edgeRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const quotesRoot = join(edgeRoot, "..", "content_es", "lit");
const write = process.argv.includes("--write");

const authorOverrides = {
  "202603050143.md": "Brigitte Vasallo",
};

const trailingAttributionLines = {
  "angelica-santa-olaya.md": 2,
};

function parseDocument(markdown) {
  const normalized = String(markdown || "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new TypeError("Missing front matter");

  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new TypeError("Unclosed front matter");

  return {
    frontMatterSource: normalized.slice(4, end).trim(),
    body: normalized.slice(end + 4).replace(/^\n/, ""),
  };
}

function quoteBlocks(body) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.startsWith(">"));
}

function cleanInlineMarkdown(value) {
  return String(value || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value) {
  return cleanInlineMarkdown(value).replace(/^Cita:\s*/i, "").trim();
}

function authorFromTitle(file, title) {
  if (authorOverrides[file]) return authorOverrides[file];
  if (/^Cita:/i.test(title)) return null;
  return cleanTitle(String(title).split(/\s+[—–]\s+/)[0]);
}

function authorFromAttribution(value) {
  return cleanInlineMarkdown(value)
    .replace(/^[—•-]+\s*/, "")
    .replace(/\s*-+\s*$/, "")
    .split(/\s+(?:en|de)\s+|[,;|([]/)[0]
    .trim();
}

function looksLikeAttribution(value, author) {
  const line = cleanInlineMarkdown(value);
  if (!line || line.length > 180) return false;
  if (/^[—•-]/.test(line)) return true;
  return Boolean(author && line.toLocaleLowerCase("es").includes(author.toLocaleLowerCase("es")));
}

function withoutOuterQuote(value) {
  const pairs = [["\"", "\""], ["“", "”"], ["«", "»"]];
  let text = cleanInlineMarkdown(value);

  for (const [open, close] of pairs) {
    if (text.startsWith(open) && text.endsWith(close)) {
      text = text.slice(open.length, -close.length).trim();
      break;
    }
    if (text.startsWith(open) && text.endsWith(`${close}.`)) {
      text = `${text.slice(open.length, -(close.length + 1)).trim()}.`;
      break;
    }
    if (text.startsWith(open) && text.endsWith(`.${close}`)) {
      text = `${text.slice(open.length, -(close.length + 1)).trim()}.`;
      break;
    }
  }

  return text;
}

function quoteRecord(file, block, frontMatter, existingQuote = {}) {
  const lines = block
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim())
    .filter(Boolean);

  if (lines[0] === "[!quote]") lines.shift();

  let author = existingQuote.author || authorFromTitle(file, frontMatter.title || "");
  const forcedTrailingLines = trailingAttributionLines[file] || 0;

  if (forcedTrailingLines > 0) {
    lines.splice(-forcedTrailingLines, forcedTrailingLines);
  } else if (looksLikeAttribution(lines.at(-1), author)) {
    if (!author) author = authorFromAttribution(lines.at(-1));
    lines.pop();
  }

  const quote = {
    text: withoutOuterQuote(lines.join(" ")),
    author: author || "Autor desconocido",
  };
  for (const field of ["source", "year", "page"]) {
    if (existingQuote[field]) quote[field] = existingQuote[field];
  }
  return quote;
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function serializeQuotes(quotes) {
  return [
    "quotes:",
    ...quotes.flatMap((quote) => {
      const lines = [
        `  - text: ${yamlString(quote.text)}`,
        `    author: ${yamlString(quote.author)}`,
      ];
      for (const field of ["source", "year", "page"]) {
        if (quote[field]) lines.push(`    ${field}: ${yamlString(quote[field])}`);
      }
      return lines;
    }),
  ].join("\n");
}

function upsertQuotes(markdown, quotes) {
  const { frontMatterSource, body } = parseDocument(markdown);
  const quoteYaml = serializeQuotes(quotes);
  const existingQuotes = /^quotes:\s*\n(?:[ \t]+.*\n?)*/m;
  let updatedFrontMatter;
  if (existingQuotes.test(frontMatterSource)) {
    updatedFrontMatter = frontMatterSource.replace(existingQuotes, `${quoteYaml}\n`);
  } else {
    const aliasIndex = frontMatterSource.search(/^aliases:/m);
    updatedFrontMatter = aliasIndex === -1
      ? `${frontMatterSource}\n${quoteYaml}`
      : `${frontMatterSource.slice(0, aliasIndex)}${quoteYaml}\n${frontMatterSource.slice(aliasIndex)}`;
  }

  return `---\n${updatedFrontMatter}\n---\n${body}`;
}

function validateQuotes(file, quotes, blocks) {
  const errors = [];
  if (!Array.isArray(quotes)) errors.push("missing quotes array");
  if (Array.isArray(quotes) && quotes.length !== blocks.length) {
    errors.push(`expected ${blocks.length} quotes, found ${quotes.length}`);
  }

  for (const [index, quote] of (quotes || []).entries()) {
    if (!quote?.text?.trim()) errors.push(`quote ${index + 1} has no text`);
    if (!quote?.author?.trim()) errors.push(`quote ${index + 1} has no author`);
    for (const field of ["source", "year", "page"]) {
      if (field in quote && (typeof quote[field] !== "string" || !quote[field].trim())) {
        errors.push(`quote ${index + 1} has an invalid ${field}`);
      }
    }
  }

  if (errors.length) throw new TypeError(`${file}: ${errors.join("; ")}`);
}

const files = (await readdir(quotesRoot))
  .filter((file) => file.endsWith(".md") && file !== "_index.md")
  .sort();

let changed = 0;
let quoteCount = 0;
let unknownAuthors = 0;

for (const file of files) {
  const path = join(quotesRoot, file);
  const markdown = await readFile(path, "utf8");
  const { frontMatterSource, body } = parseDocument(markdown);
  const frontMatter = YAML.parse(frontMatterSource) || {};
  const blocks = quoteBlocks(body);

  if (!blocks.length) throw new TypeError(`${file}: no blockquotes found`);

  const existingQuotes = Array.isArray(frontMatter.quotes) ? frontMatter.quotes : [];
  const completeQuotes = blocks.map((block, index) => quoteRecord(
    file,
    block,
    frontMatter,
    existingQuotes[index],
  ));
  const needsUpdate = completeQuotes.length !== existingQuotes.length
    || completeQuotes.some((quote, index) => quote.text !== existingQuotes[index]?.text);

  if (needsUpdate) {
    if (!write) throw new TypeError(`${file}: abbreviated or missing quote text; rerun with --write`);
    await writeFile(path, upsertQuotes(markdown, completeQuotes), "utf8");
    frontMatter.quotes = completeQuotes;
    changed += 1;
  }

  validateQuotes(file, frontMatter.quotes, blocks);
  quoteCount += frontMatter.quotes.length;
  unknownAuthors += frontMatter.quotes.filter((quote) => quote.author === "Autor desconocido").length;
}

console.log(`${write ? "Normalized" : "Validated"} ${files.length} quote files with ${quoteCount} quote records.`);
if (write) console.log(`Changed ${changed} files.`);
if (unknownAuthors) console.log(`${unknownAuthors} quote records still have an unknown author.`);
