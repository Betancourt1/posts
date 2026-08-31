import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assets = {
  "interaction-default.wav": {
    hash: "b01df4c1c6df661838a5294dde6076364333db046b6157bcfa85ad19370a8511",
    samples: 3330,
  },
  "interaction-navigation.wav": {
    hash: "6d41881cdbabefe990afdc462bab64511841c13be99310f896b7800aea463af2",
    samples: 2845,
  },
  "interaction-subcontrol.wav": {
    hash: "28677e5e11d5ecc64348bac8d2a5b48ff2e37c1464a935ff019442c2a1cb5bf6",
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
