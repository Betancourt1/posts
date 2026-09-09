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

These local candidates are derived from the original WAVs in repository commit
`8f0a3d5`, preserving their sample count, sample rate, mono layout, and PCM16 format.
Playback uses unity gain; there is no additional runtime filter or envelope.

Processing: decode with FFmpeg, apply `equalizer=f=2000:t=q:w=1:g=-12` to float32,
then multiply sample `i` by `min(1, i/176) * min(1, (N-1-i)/353)`.
The bell EQ targets the reported harshness around 2 kHz; it replaces the previous
3 kHz low-pass filter. The envelope rounds the first 4 ms and last 8 ms.
Scale by the smaller of original RMS / processed RMS and 0.72 / processed peak;
round to PCM16. No pitch or duration changes are applied.

The peak ceiling limits RMS recovery: default and navigation are approximately
1.6 and 1.7 dB below their original RMS; subcontrol retains its original RMS.
The -12 dB EQ setting is before compensation. Measured energy in the 1.6–2.5 kHz
band falls approximately 6.0, 10.5, and 10.1 dB respectively after compensation.
This is a targeted spectral change; it does not aim to suppress all treble.

| Site asset | RMS relative to original | SHA-256 |
| --- | --- | --- |
| `interaction-default.wav` | 0.831 | `3f6a9aaab6a68285ea291f390b1a2cf6bf03f882b61eb7174e6a7f3bf3bf5250` |
| `interaction-navigation.wav` | 0.823 | `418dd176f32323dbf1dda1eb4f011621861cc1372fce178634cc16529078e89e` |
| `interaction-subcontrol.wav` | 1.000 | `7d9d2b0c6ee7e2be01442c7a59be57b95a1f332d6e44c8dbf7547662cbc61327` |
