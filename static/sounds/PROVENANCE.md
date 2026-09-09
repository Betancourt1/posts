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

### Default click: targeted resonance and light noise cleanup

Start again from the original default WAV at `8f0a3d5`. Estimate low-level tail
energy with a 256-sample Hann STFT, 64-sample hop, and 256 zeros padded at each end.
Use median power per bin from frames centered between 50 and 70 ms as the noise
estimate. This tail also includes natural key decay; it is not a noise-only recording.
For each frame use gain `sqrt(max(0.35^2, 1 - noisePower / max(framePower, 1e-20)))`.
Invert the FFT, overlap-add with a Hann window, divide by accumulated squared
window weights, and trim the padding to the original length.

Apply FFmpeg `equalizer=f=1750:t=q:w=1.5:g=-9` to the denoised float32 signal.
Use the same 176/353-sample fades and RMS compensation with a 0.72 peak ceiling
as above, then round to PCM16. This replaces the default's previous 2 kHz EQ.

Compared with the original, final 1.5–2 kHz energy is about 5.4 dB lower;
900–1,400 Hz body energy is only 0.4 dB lower. RMS over the final 50–75.5 ms is
4.8 dB lower, including reduced natural decay. Overall RMS is about 1.2 dB lower.

| Site asset | RMS relative to original | SHA-256 |
| --- | --- | --- |
| `interaction-default.wav` | 0.866 | `f95df100a6bbfa09946c7b6448257c42645a3bead6488f005efc181c62edfd2c` |
| `interaction-navigation.wav` | 0.823 | `418dd176f32323dbf1dda1eb4f011621861cc1372fce178634cc16529078e89e` |
| `interaction-subcontrol.wav` | 1.000 | `7d9d2b0c6ee7e2be01442c7a59be57b95a1f332d6e44c8dbf7547662cbc61327` |
