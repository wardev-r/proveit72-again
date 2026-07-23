#!/usr/bin/env python3
"""The 72 ring — locked sonic signature.
440 + 480 Hz two-tone, 2.0s, 15ms attack, 550ms stretched release (x^1.7),
6 Hz tremolo, peak 0.5 (never clips). 48kHz mono. This exact ring is used in
every 72 video. Natural cadence in use: ring ... ~2.3s pause ... ring, then quiet.
Onsets get pinned to on-screen beats when synced to visuals; the sound never changes.
  python3 scripts/make-72-ring.py            -> brand/72-ring.wav (one ring)
  python3 scripts/make-72-ring.py 15 6.8 10.8 -> a 15s track ringing at those onsets
"""
import sys, numpy as np, wave
SR = 48000
def ring(length=2.0):
    t = np.arange(int(SR*length))/SR
    tone = (np.sin(2*np.pi*440*t) + np.sin(2*np.pi*480*t)) / 2.0
    env = np.ones_like(t); a = int(SR*0.015); r = int(SR*0.55)
    env[:a] = np.linspace(0,1,a); env[-r:] = np.linspace(1,0,r)**1.7
    trem = 0.90 + 0.10*np.sin(2*np.pi*6.0*t)
    return tone*env*trem*0.5                      # peak ~0.5, below clipping
def save(path, samples):
    w = wave.open(path,"w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(samples,-1,1)*32767).astype(np.int16).tobytes()); w.close()
if __name__ == "__main__":
    if len(sys.argv) >= 3:
        dur = float(sys.argv[1]); onsets = [float(x) for x in sys.argv[2:]]
        buf = np.zeros(int(SR*dur)); seg = ring()
        for on in onsets:
            s = int(SR*on); buf[s:s+len(seg)] += seg[:max(0,min(len(seg),len(buf)-s))]
        save("brand/72-ring-track.wav", buf); print("wrote brand/72-ring-track.wav")
    else:
        r = ring(); pad = np.concatenate([r, np.zeros(int(SR*0.4))])  # one ring + tail room
        save("brand/72-ring.wav", pad); print("wrote brand/72-ring.wav")
