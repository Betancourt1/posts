import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assets = {
  "interaction-default.wav": {
    hash: "f8f4e8acc5dcf1818d426d70099aa25f193855d93776b77aee1b35debcd155d2",
    originalRms: 0.09557853088152007,
    originalStep: 0.487335205078125,
    samples: 3330,
  },
  "interaction-navigation.wav": {
    hash: "425eddbb18360e4b3940e3c0e126f20a0818df4d2d7ea31ccce66079d89b6c2f",
    originalRms: 0.061325879484656745,
    originalStep: 0.6732177734375,
    samples: 2845,
  },
  "interaction-subcontrol.wav": {
    hash: "bf63c6e0ccaf734ef5949c678e2f593051c76d99a69af9dfe818ac289c12ea6d",
    originalRms: 0.043599676221479464,
    originalStep: 1.05096435546875,
    samples: 4322,
  },
};

test("interaction samples keep their audited hashes and PCM properties", async () => {
  for (const [name, expected] of Object.entries(assets)) {
    const data = await readFile(new URL(`../../static/sounds/${name}`, import.meta.url));
    assert.equal(createHash("sha256").update(data).digest("hex"), expected.hash);
    assert.equal(data.subarray(0, 4).toString(), "RIFF");
    assert.equal(data.subarray(8, 12).toString(), "WAVE");
    assert.equal(data.readUInt16LE(20), 1);
    assert.equal(data.readUInt16LE(22), 1);
    assert.equal(data.readUInt32LE(24), 44100);
    assert.equal(data.readUInt16LE(34), 16);
    assert.equal(data.readUInt32LE(40) / 2, expected.samples);
    const pcm = Array.from({ length: expected.samples }, (_, i) => data.readInt16LE(44 + i * 2) / 32768);
    const rms = Math.sqrt(pcm.reduce((sum, value) => sum + value * value, 0) / pcm.length);
    const maxStep = Math.max(...pcm.slice(1).map((value, i) => Math.abs(value - pcm[i])));
    // Preserve the original body level while removing abrupt transients.
    assert.ok(rms >= expected.originalRms * 0.92 && rms <= expected.originalRms * 1.01);
    assert.ok(maxStep < expected.originalStep * 0.4);
    assert.ok(Math.max(...pcm.map(Math.abs)) <= 0.721);
    assert.equal(pcm[0], 0);
    assert.equal(pcm.at(-1), 0);
  }
});

test("the edge build copies every sample and its attribution", async () => {
  const preparePublic = await readFile(new URL("../scripts/prepare-public.mjs", import.meta.url), "utf8");
  const license = await readFile(new URL("../../static/sounds/LICENSE-MECHVIBESDX.txt", import.meta.url), "utf8");
  const provenance = await readFile(new URL("../../static/sounds/PROVENANCE.md", import.meta.url), "utf8");

  for (const name of Object.keys(assets)) assert.match(preparePublic, new RegExp(`sounds/${name.replaceAll(".", "\\.")}`));
  assert.match(preparePublic, /sounds\/LICENSE-MECHVIBESDX\.txt/);
  assert.match(preparePublic, /sounds\/PROVENANCE\.md/);
  assert.match(license, /Copyright \(c\) 2026 Hải Nguyễn/);
  assert.match(license, /Permission is hereby granted, free of charge/);
  assert.match(provenance, /a13c4181feff1217399765f5b6be6f2c7392eeb3/);
  assert.match(provenance, /peak-normalized to `0\.72`/);
});
