/* ============================================================
   EcoPulse In-App Notification Sound Utility (Web Audio API)
   ============================================================ */

let audioCtx = null;
let isAudioUnlocked = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Unlock audio context on the first user interaction
export function unlockAudio() {
  if (isAudioUnlocked) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === "running") {
    isAudioUnlocked = true;
  }
}

if (typeof window !== "undefined") {
  const unlockEvents = ["click", "touchstart", "keydown"];
  const handleInteraction = () => {
    unlockAudio();
    unlockEvents.forEach((ev) => window.removeEventListener(ev, handleInteraction));
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, handleInteraction, { once: true, passive: true }));
}

/**
 * Plays a pleasant modern 2-tone melodic notification chime.
 * Tone 1: 587.33 Hz (D5) -> Tone 2: 880 Hz (A5)
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      return;
    }

    const now = ctx.currentTime;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.connect(ctx.destination);

    // Note 1 (D5 - 587.33Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2 (A5 - 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn("Unable to play in-app notification sound:", err);
  }
}
