# Interaction sound provenance

The interaction sounds are extracted from the bundled keyboard sound packs in
[MechvibesDX](https://github.com/hainguyents13/mechvibes-dx) at commit
`a13c4181feff1217399765f5b6be6f2c7392eeb3`.

Each original extraction is the first `KeyA` keydown interval from the pack's OGG audio
sprite. The interval was decoded at its source sample rate, mixed to mono by
averaging channels, peak-normalized to `0.72`, and encoded as signed PCM16 WAV
without resampling, pitch adjustment, or an added envelope.

| Original asset | Source pack and file | Interval | SHA-256 |
| --- | --- | --- | --- |
| `interaction-default.wav` | `cherrymx-red-abs/sound.ogg` | `27942–28017.5 ms` | `b01df4c1c6df661838a5294dde6076364333db046b6157bcfa85ad19370a8511` |
| `interaction-navigation.wav` | `eg-crystal-purple/purple.ogg` | `12061–12125.5 ms` | `6d41881cdbabefe990afdc462bab64511841c13be99310f896b7800aea463af2` |
| `interaction-subcontrol.wav` | `cherrymx-blue-abs/sound.ogg` | `24330–24428 ms` | `28677e5e11d5ecc64348bac8d2a5b48ff2e37c1464a935ff019442c2a1cb5bf6` |

See `LICENSE-MECHVIBESDX.txt` for the upstream MIT license.

## Remastered site assets

The deployed candidates are derived from the original WAVs in repository commit
`8f0a3d5`, preserving their sample count, sample rate, mono layout, and PCM16 format.
Playback uses unity gain; there is no additional runtime filter or envelope.

Processing: decode with FFmpeg, apply `lowpass=f=3000:p=2:w=0.707` to float32,
then multiply sample `i` by `min(1, i/176) * min(1, (N-1-i)/353)`.
This rounds the first 4 ms and last 8 ms. Scale the result by the smaller of
original RMS / processed RMS and 0.72 / processed peak; round to PCM16.
This restores body level after treble removal without exceeding the original
peak ceiling (apart from PCM rounding). No pitch or duration changes are applied.

| Site asset | RMS relative to original | SHA-256 |
| --- | --- | --- |
| `interaction-default.wav` | 0.932 | `f8f4e8acc5dcf1818d426d70099aa25f193855d93776b77aee1b35debcd155d2` |
| `interaction-navigation.wav` | 1.000 | `425eddbb18360e4b3940e3c0e126f20a0818df4d2d7ea31ccce66079d89b6c2f` |
| `interaction-subcontrol.wav` | 1.000 | `bf63c6e0ccaf734ef5949c678e2f593051c76d99a69af9dfe818ac289c12ea6d` |
