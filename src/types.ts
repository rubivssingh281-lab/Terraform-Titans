export type NavTab = 'dashboard' | 'blink' | 'sign' | 'morse' | 'tts' | 'remote';

export interface RecentPhrase {
  id: string;
  text: string;
  mode: 'Blink' | 'Sign' | 'Morse' | 'TTS';
  timestamp: string;
}

export interface QuickPhrase {
  id: string;
  label: string;
  morse: string;
  category?: string;
}

export interface BlinkStats {
  ear: number;
  blinkCount: number;
  confidence: number;
  isTracking: boolean;
}

export interface SignStats {
  confidence: number;
  fps: number;
  currentGesture: string;
  gestureMatchedTime: string;
  isOverlayActive: boolean;
  selectedModel: string;
}

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}
