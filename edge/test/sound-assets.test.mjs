import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assets = {
  "interaction-default.wav": {
    hash: "3f6a9aaab6a68285ea291f390b1a2cf6bf03f882b61eb7174e6a7f3bf3bf5250",
    originalRms: 0.09557853088152007,
    originalBandEnergy: 0.0037248588347876745,
    samples: 3330,
  },
  "interaction-navigation.wav": {
    hash: "418dd176f32323dbf1dda1eb4f011621861cc1372fce178634cc16529078e89e",
    originalRms: 0.061325879484656745,
    originalBandEnergy: 0.0005245053317135489,
    samples: 2845,
  },
  "interaction-subcontrol.wav": {
    hash: "7d9d2b0c6ee7e2be01442c7a59be57b95a1f332d6e44c8dbf7547662cbc61327",
    originalRms: 0.043599676221479464,
    originalBandEnergy: 0.00011553239748495518,
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
    // Measure energy around the reported harsh band, 1.6–2.5 kHz.
    let bandEnergy = 0;
    for (let k = Math.ceil(1600 * pcm.length / 44100); k <= Math.floor(2500 * pcm.length / 44100); k++) {
      let real = 0;
      let imaginary = 0;
      for (let i = 0; i < pcm.length; i++) {
        const phase = 2 * Math.PI * k * i / pcm.length;
        real += pcm[i] * Math.cos(phase);
        imaginary += pcm[i] * Math.sin(phase);
      }
      bandEnergy += 2 * (real * real + imaginary * imaginary) / (pcm.length * pcm.length);
    }
    // Keep body level within 2 dB of the original while respecting its peak ceiling.
    assert.ok(rms >= expected.originalRms * 0.8 && rms <= expected.originalRms * 1.01);
    assert.ok(bandEnergy < expected.originalBandEnergy * 0.3);
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
