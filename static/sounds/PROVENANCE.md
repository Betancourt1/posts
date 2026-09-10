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

For navigation and subcontrol: decode with FFmpeg, apply `equalizer=f=2000:t=q:w=1:g=-12` to float32,
then multiply sample `i` by `min(1, i/176) * min(1, (N-1-i)/353)`.
The bell EQ targets the reported harshness around 2 kHz; it replaces the previous
3 kHz low-pass filter. The envelope rounds the first 4 ms and last 8 ms.
Scale by the smaller of original RMS / processed RMS and 0.72 / processed peak;
round to PCM16. No pitch or duration changes are applied.

The peak ceiling limits navigation to approximately 1.7 dB below its original
RMS; subcontrol retains its original RMS.
The -12 dB EQ setting is before compensation. Measured energy in the 1.6–2.5 kHz
band falls approximately 10.5 and 10.1 dB respectively after compensation.
This is a targeted spectral change; it does not aim to suppress all treble.

### Default click: resonance adjustment with original texture

Start from the original default WAV at `8f0a3d5`. Apply FFmpeg
`equalizer=f=1750:t=q:w=1.5:g=-9` directly to the original float32 signal.
Use the same 176/353-sample fades and RMS compensation with a 0.72 peak ceiling
as above, then round to PCM16. No noise estimation or spectral subtraction is
applied. This restores the source texture previously affected by denoising.

### Default click: retain the accepted earlier release

Preserve samples 0–528 of the EQ-only intermediate exactly. For samples 529–1322,
multiply PCM by `cos((i - 529) / (1323 - 529) * pi / 2)^2`, then round to PCM16.
Set sample 1323 onward to zero. This preserves the accepted release envelope
from `986289a`, fading from approximately 12 ms to 30 ms; the file remains 75.5 ms.
Apply no additional normalization or EQ after the release envelope.

The final result is close to `986289a`: denoising primarily affected the tail
that the accepted release already removes. Removing denoising alone does not
restore the original frequency balance, since the 1.75 kHz EQ remains applied.
Overall RMS is about 1.38 dB below the original, within 0.01 dB of `986289a`.

| Site asset | RMS relative to original | SHA-256 |
| --- | --- | --- |
| `interaction-default.wav` | 0.853 | `3aade082f27831bf63f8774de888a12072ca0190c28a369298bf33b36c0c18de` |
| `interaction-navigation.wav` | 0.823 | `418dd176f32323dbf1dda1eb4f011621861cc1372fce178634cc16529078e89e` |
| `interaction-subcontrol.wav` | 1.000 | `7d9d2b0c6ee7e2be01442c7a59be57b95a1f332d6e44c8dbf7547662cbc61327` |

## Main button press and release

These two files are byte-for-byte copies selected by the site owner from
[Making Software](https://www.makingsoftware.com/chapters/rasterisation-and-anti-aliasing).
No EQ, denoising, gain normalization, or speed change was applied.

| Site asset | Source | SHA-256 |
| --- | --- | --- |
| `button-down.m4a` | https://www.makingsoftware.com/sound/button_down.m4a | `fc2ecbc443c9eacbe0dc45d5afd2344ce47af79aeee849290f9abdaa8cb7046d` |
| `button-up.m4a` | https://www.makingsoftware.com/sound/button_up.m4a | `c2f86b93aae7b55a802e3aee2da63d32a2e8f047fe0d4743292cb45a60e3bb2f` |

Retrieved 2026-09-09 from the browser's loaded audio responses. The upstream
reuse license has not been established; the MechvibesDX license above applies
only to the keyboard-derived WAV files, not these Making Software files.
