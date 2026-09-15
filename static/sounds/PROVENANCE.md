# Interaction sound provenance

## Active press and release pair

The two M4A files were downloaded unchanged on 2026-09-15 from the
[Making Software reference](https://www.makingsoftware.com/chapters/drawing-curves)
explicitly selected for this site. The reference's button component uses the
following order despite the filenames:

| Phase | Source | Playback rate | SHA-256 |
| --- | --- | --- | --- |
| Press | `https://www.makingsoftware.com/sound/button_up.m4a` | 1 | `c2f86b93aae7b55a802e3aee2da63d32a2e8f047fe0d4743292cb45a60e3bb2f` |
| Release | `https://www.makingsoftware.com/sound/button_down.m4a` | 1.2 | `fc2ecbc443c9eacbe0dc45d5afd2344ce47af79aeee849290f9abdaa8cb7046d` |

Both use gain 0.1. The reference uses mouse down/up events without a minimum
delay. This implementation adds a 200 ms minimum between the audible starts;
it is a local timing choice, not a measured doubling of the reference.
Keyboard, touch, and interactions without a release event use the same pair.

Reference implementation inspected in
`/_next/static/chunks/app/chapters/%5B...slug%5D/layout-b9f7b1cd899b5641.js`,
modules 70109 (button) and 43224 (sound player).
No reuse license was identified for these two files; the MechvibesDX license
below applies only to the archived WAV files.

## Archived keyboard samples

These originals are retained for provenance and are no longer copied into the
production build.

The interaction sounds are extracted from the bundled keyboard sound packs in
[MechvibesDX](https://github.com/hainguyents13/mechvibes-dx) at commit
`a13c4181feff1217399765f5b6be6f2c7392eeb3`.

Each output is the first `KeyA` keydown interval from the pack's OGG audio
sprite. The interval was decoded at its source sample rate, mixed to mono by
averaging channels, peak-normalized to `0.72`, and encoded as signed PCM16 WAV
without resampling, pitch adjustment, or an added envelope.

| Site asset | Source pack and file | Interval | SHA-256 |
| --- | --- | --- | --- |
| `interaction-default.wav` | `cherrymx-red-abs/sound.ogg` | `27942–28017.5 ms` | `b01df4c1c6df661838a5294dde6076364333db046b6157bcfa85ad19370a8511` |
| `interaction-navigation.wav` | `eg-crystal-purple/purple.ogg` | `12061–12125.5 ms` | `6d41881cdbabefe990afdc462bab64511841c13be99310f896b7800aea463af2` |
| `interaction-subcontrol.wav` | `cherrymx-blue-abs/sound.ogg` | `24330–24428 ms` | `28677e5e11d5ecc64348bac8d2a5b48ff2e37c1464a935ff019442c2a1cb5bf6` |

See `LICENSE-MECHVIBESDX.txt` for the upstream MIT license.
