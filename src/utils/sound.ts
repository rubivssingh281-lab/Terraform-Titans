// Web Audio API & Speech Synthesis Helpers

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playBeep(frequency = 750, duration = 0.1, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback not allowed or supported", e);
  }
}

export function playMorseTone(isDash: boolean) {
  playBeep(800, isDash ? 0.3 : 0.1, 'sine');
}

let sirenInterval: any = null;

export function toggleEmergencySiren(enable: boolean) {
  if (!enable) {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    return;
  }

  if (sirenInterval) return;

  let high = true;
  sirenInterval = setInterval(() => {
    playBeep(high ? 900 : 600, 0.25, 'sawtooth');
    high = !high;
  }, 300);
}

export function speakText(text: string, voiceName?: string, rate?: number, pitch = 1.0) {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel(); // Stop current speech

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Load custom speech rate from patient profile
  let speechRate = rate;
  if (speechRate === undefined) {
    const savedRate = localStorage.getItem('profile_tts_speed');
    speechRate = savedRate ? parseFloat(savedRate) : 1.0;
  }
  utterance.rate = speechRate;
  utterance.pitch = pitch;

  if (voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.name === voiceName || v.voiceURI === voiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
}
