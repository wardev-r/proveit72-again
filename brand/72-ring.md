# The 72 Ring — locked sonic signature

The sound of 72. One ring, used in every video. Do not redesign it — reuse it.

- **Tones:** 440 Hz + 480 Hz (the classic phone pair), summed and halved
- **Length:** 2.0 s per ring
- **Envelope:** 15 ms attack · **550 ms stretched release** (curve x^1.7) — the long tail is the signature
- **Movement:** 6 Hz tremolo, 10% depth (feels like a device ringing, not a flat tone)
- **Level:** peak 0.5 — safely below clipping
- **Format:** 48 kHz, mono, 16-bit

**Cadence in use:** ring … ~2.3 s pause … ring … then silence on the 72.
When rings are synced to on-screen beats (e.g. a QR reveal), pin the *onsets* to those
beats — never change the ring itself.

Reproduce: `python3 scripts/make-72-ring.py` → `brand/72-ring.wav`
Cadence track: `python3 scripts/make-72-ring.py 15 6.8 10.8` → `brand/72-ring-track.wav`
