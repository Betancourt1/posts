# Interaction sound provenance

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
