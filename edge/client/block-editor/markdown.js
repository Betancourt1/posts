import { parser, GFM } from "@lezer/markdown";

const markdownParser = parser.configure(GFM);

// Ranges refer to the original source. Never serialize a parsed syntax tree.
export function markdownBlocks(source) {
  const blocks = [];
  let node = markdownParser.parse(source).topNode.firstChild;
  while (node) {
    blocks.push({ from: node.from, to: node.to, type: node.name });
    node = node.nextSibling;
  }
  // Display math can contain blank lines, which CommonMark treats as paragraphs.
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!/^\$\$\s*(?:\r?\n|$)/.test(source.slice(block.from, block.to))) continue;
    const closing = /(?:^|\n)\$\$[ \t\r]*(?=\n|$)/g;
    closing.lastIndex = block.from + 2;
    const match = closing.exec(source);
    if (!match) continue;
    const to = match.index + match[0].length;
    let count = 1;
    while (blocks[i + count]?.from < to) count++;
    blocks.splice(i, count, { from: block.from, to, type: "Math" });
  }
  return blocks;
}

export function blockAt(source, position) {
  const blocks = markdownBlocks(source);
  const block = blocks.find((entry) => entry.from <= position && position <= entry.to);
  if (block) return { ...block, index: blocks.indexOf(block), blocks };
  const from = position === 0 ? 0 : source.lastIndexOf("\n", position - 1) + 1;
  const end = source.indexOf("\n", position);
  return { from, to: end < 0 ? source.length : end, type: "Empty", index: -1, blocks };
}

export function moveBlock(source, block, direction) {
  const neighbor = block.blocks[block.index + direction];
  if (!neighbor || block.index < 0) return null;
  const first = direction < 0 ? neighbor : block;
  const last = direction < 0 ? block : neighbor;
  const gap = source.slice(first.to, last.from);
  const left = source.slice(first.from, first.to);
  const right = source.slice(last.from, last.to);
  return {
    from: first.from, to: last.to, insert: right + gap + left,
    anchor: direction < 0 ? first.from : first.from + right.length + gap.length,
  };
}

export function imageParts(source) {
  const match = source.match(/^!\[([^\]\n]*)\]\((<[^>\n]+>|[^\s)]+)(?:\s+"([^"\n]*)")?\)\s*$/);
  if (!match) return null;
  return { alt: match[1], src: match[2].replace(/^<|>$/g, ""), caption: match[3] || "" };
}
