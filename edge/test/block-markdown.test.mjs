import assert from "node:assert/strict";
import test from "node:test";
import { blockAt, markdownBlocks, moveBlock, imageParts } from "../client/block-editor/markdown.js";

test("block ranges preserve nested Markdown, fences, footnotes and math", () => {
  const source = "\n# Heading\n\n- Parent\n  - Child\n\n> Quote\n> continued\n\n```python\n\nx = 1\n\n```\n\n$$\nx^2\n\ny^2\n$$\n\n[^note-1]: **Source**\n";
  const blocks = markdownBlocks(source);
  assert.deepEqual(blocks.map(b => b.type), ["ATXHeading1", "BulletList", "Blockquote", "FencedCode", "Math", "LinkReference"]);
  assert.equal(source.slice(blocks[1].from, blocks[1].to), "- Parent\n  - Child");
  assert.equal(source.slice(blocks[4].from, blocks[4].to), "$$\nx^2\n\ny^2\n$$");
  assert.equal(blockAt(source, source.indexOf("x =")).type, "FencedCode");
  assert.equal(blockAt(source, source.indexOf("\n\n") + 1).type, "Empty");
});

test("moving a block changes only two exact ranges and preserves CRLF separators", () => {
  const source = "  \r\nFirst paragraph.\r\n\r\n```js\r\nx();\r\n```\r\n\r\nLast.\r\n";
  const block = blockAt(source, source.indexOf("x();"));
  const move = moveBlock(source, block, -1);
  const updated = source.slice(0, move.from) + move.insert + source.slice(move.to);
  assert.equal(updated, "  \r\n```js\r\nx();\r\n```\r\n\r\nFirst paragraph.\r\n\r\nLast.\r\n");
  assert.equal(moveBlock(source, blockAt(source, source.indexOf("First")), -1), null);
});

test("image metadata supports angle URLs and captions", () => {
  assert.deepEqual(imageParts('![Alt](</uploads/my image.png> "Caption")'), { alt: "Alt", src: "/uploads/my image.png", caption: "Caption" });
  assert.equal(imageParts("Text ![Alt](/image.png) more"), null);
});
