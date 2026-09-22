import React, { useState, useEffect } from 'react';
import { BlinkToText } from './BlinkToText';
import { SignLanguage } from './SignLanguage';
import { MorseTranslator } from './MorseTranslator';
import { TextToSpeech } from './TextToSpeech';
import { sendRemoteEvent } from '../utils/remote';
import { playBeep } from '../utils/sound';

interface RemoteSenderProps {
  code: string;
  onDisconnect: () => void;
}

type SenderSubMode = 'menu' | 'blink' | 'sign' | 'morse' | 'tts';

export const RemoteSender: React.FC<RemoteSenderProps> = ({ code, onDisconnect }) => {
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [isCodeValid, setIsCodeValid] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<SenderSubMode>('menu');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [sosSent, setSosSent] = useState<boolean>(false);

  // Validate the pairing code on mount
  useEffect(() => {
    let active = true;
    setIsValidating(true);
    setErrorMessage('');

    fetch(`/api/remote/session/validate?code=${code}`)
      .then((res) => {
        if (!res.ok) throw new Error('Pairing session code invalid or expired');
        return res.json();
      })
      .then((data) => {
        if (active) {
          if (data.success) {
            setIsCodeValid(true);
            setIsValidating(false);
            // Notify laptop receiver that we are connected!
            sendRemoteEvent(code, 'connected', true);
            playBeep(880, 0.15);
          } else {
            throw new Error('Pairing session code invalid or expired');
          }
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setIsCodeValid(false);
          setErrorMessage(err.message || 'Session validation failed');
          setIsValidating(false);
        }
      });

    return () => {
      active = false;
    };
  }, [code]);

  // Handle local remote phrase logging
  const handleDummyAddPhrase = (text: string) => {
    // Send it to laptop as phrase
    sendRemoteEvent(code, 'phrase', text);
  };

  const triggerEmergencySos = () => {
    setSosSent(true);
    playBeep(400, 0.3);
    setTimeout(() => playBeep(400, 0.3), 350);
    sendRemoteEvent(code, 'sos', 'SOS DISTRESS BEACON');
    setTimeout(() => setSosSent(false), 5000);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#F3EDDF] text-slate-900 flex items-center justify-center font-mono-code text-xs px-6">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-indigo-600 animate-spin">progress_activity</span>
          <span className="text-center tracking-wider">VALIDATING SECURE PAIRING CODE...</span>
        </div>
      </div>
    );
  }

  if (!isCodeValid) {
    return (
      <div className="min-h-screen bg-[#F3EDDF] text-slate-900 flex items-center justify-center p-6 font-mono-code text-xs">
        <div className="bg-[#FCFAF4] border border-[#E6DDC9] rounded-2xl p-6 flex flex-col items-center gap-4 text-center max-w-sm">
          <span className="material-symbols-outlined text-5xl text-rose-600">dangerous</span>
          <h1 className="text-sm font-bold text-slate-900 tracking-wider">CONNECTION CODE FAILED</h1>
          <p className="text-slate-500 leading-relaxed font-body">
            {errorMessage || 'The pairing code is invalid or has expired. Please refresh the receiver tab on your laptop and scan the new code.'}
          </p>
          <button
            onClick={onDisconnect}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 font-mono-code py-2.5 rounded-xl text-white font-bold transition-colors active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3EDDF] text-slate-900 flex flex-col antialiased">
      {/* Sticky Mobile Remote Header */}
      <header className="bg-[#FFFDF8]/95 border-b border-[#E6DDC9] sticky top-0 z-50 flex justify-between items-center px-4 h-14 w-full">
        <div className="flex items-center gap-2">
          {activeMode !== 'menu' && (
            <button
              onClick={() => {
                setActiveMode('menu');
                playBeep(650, 0.08);
              }}
              className="text-slate-500 hover:text-slate-900 active:scale-90 p-1 rounded-full bg-black/5 flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] text-indigo-600 font-mono-code font-bold uppercase tracking-widest leading-none">
              REMOTE DEVICE
            </span>
            <span className="text-[11px] text-slate-700 font-mono-code mt-0.5 leading-none">
              SESSION: {code}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            playBeep(450, 0.15);
            onDisconnect();
          }}
          className="border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-mono-code text-[11px] px-3 py-1.5 rounded-lg transition-all active:scale-95"
        >
          Disconnect
        </button>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {activeMode === 'menu' && (
          <main className="p-4 flex flex-col gap-6 max-w-md mx-auto w-full select-none animate-fade-in">
            {/* Intro Alert */}
            <div className="bg-[#FCFAF4] border border-[#E6DDC9] rounded-2xl p-4.5 flex gap-3.5 items-center">
              <span className="material-symbols-outlined text-indigo-600 text-3xl">sensors</span>
              <div className="flex-1">
                <h2 className="font-mono-code text-xs font-bold text-slate-800">PAIRING ACTIVE</h2>
                <p className="text-[11px] font-body text-slate-500 mt-0.5 leading-normal">
                  Select an input mode below. Your camera feed will open here, and all recognized text and voice beeps will be relayed to your laptop instantly.
                </p>
              </div>
            </div>

            {/* Input Selection Grid */}
            <div className="flex flex-col gap-3">
              <span className="font-mono-code text-[10px] text-indigo-600 uppercase tracking-widest pl-1">
                INPUT MODES
              </span>

              {/* Blink to Text */}
              <button
                onClick={() => {
                  setActiveMode('blink');
                  playBeep(650, 0.08);
                }}
                className="bg-[#FCFAF4] border border-[#E6DDC9] hover:border-indigo-500/50 p-4 rounded-2xl flex items-center justify-between text-left transition-colors active:bg-[#E6DDC9]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <span className="material-symbols-outlined text-2xl">visibility</span>
                  </div>
                  <div>
                    <h3 className="font-mono-code text-xs font-bold text-slate-800">EYE BLINK CAMERA</h3>
                    <p className="text-[11px] font-body text-slate-500 mt-0.5">Spell words using eye blinks</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
              </button>

              {/* Sign Language */}
              <button
                onClick={() => {
                  setActiveMode('sign');
                  playBeep(650, 0.08);
                }}
                className="bg-[#FCFAF4] border border-[#E6DDC9] hover:border-indigo-500/50 p-4 rounded-2xl flex items-center justify-between text-left transition-colors active:bg-[#E6DDC9]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-2xl">front_hand</span>
                  </div>
                  <div>
                    <h3 className="font-mono-code text-xs font-bold text-slate-800">SIGN LANGUAGE</h3>
                    <p className="text-[11px] font-body text-slate-500 mt-0.5">Use hand gestures and skeletons</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
              </button>

              {/* Morse Tapper */}
              <button
                onClick={() => {
                  setActiveMode('morse');
                  playBeep(650, 0.08);
                }}
                className="bg-[#FCFAF4] border border-[#E6DDC9] hover:border-indigo-500/50 p-4 rounded-2xl flex items-center justify-between text-left transition-colors active:bg-[#E6DDC9]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <span className="material-symbols-outlined text-2xl">keyboard</span>
                  </div>
                  <div>
                    <h3 className="font-mono-code text-xs font-bold text-slate-800">MORSE TRANSLATOR</h3>
                    <p className="text-[11px] font-body text-slate-500 mt-0.5">Tap or use camera Morse signals</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
              </button>

              {/* Direct TTS Keyboard */}
              <button
                onClick={() => {
                  setActiveMode('tts');
                  playBeep(650, 0.08);
                }}
                className="bg-[#FCFAF4] border border-[#E6DDC9] hover:border-indigo-500/50 p-4 rounded-2xl flex items-center justify-between text-left transition-colors active:bg-[#E6DDC9]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-2xl">record_voice_over</span>
                  </div>
                  <div>
                    <h3 className="font-mono-code text-xs font-bold text-slate-800">TEXT TO SPEECH KEYBOARD</h3>
                    <p className="text-[11px] font-body text-slate-500 mt-0.5">Type or click quick phrases to speak</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
              </button>
            </div>

            {/* Emergency SOS Card */}
            <div className="mt-4 border-t border-[#E6DDC9] pt-6 flex flex-col items-center">
              <button
                onClick={triggerEmergencySos}
                className={`w-full max-w-sm py-4.5 rounded-2xl flex items-center justify-center gap-2 border font-mono-code text-xs font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                  sosSent
                    ? 'bg-rose-600 text-white border-rose-500 animate-bounce'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-pulse'
                }`}
              >
                <span className="material-symbols-outlined text-lg">warning</span>
                {sosSent ? 'SOS BEACON DISPATCHED!' : 'TRIGGER EMERGENCY SOS'}
              </button>
            </div>
          </main>
        )}

        {/* Sub-modes Renders */}
        {activeMode === 'blink' && (
          <BlinkToText 
            onAddPhraseHistory={handleDummyAddPhrase} 
            remoteCode={code} 
          />
        )}

        {activeMode === 'sign' && (
          <SignLanguage 
            onAddPhraseHistory={handleDummyAddPhrase} 
            remoteCode={code} 
          />
        )}

        {activeMode === 'morse' && (
          <MorseTranslator 
            onAddPhraseHistory={handleDummyAddPhrase} 
            remoteCode={code} 
          />
        )}

        {activeMode === 'tts' && (
          <TextToSpeech 
            onAddPhraseHistory={handleDummyAddPhrase} 
            remoteCode={code} 
          />
        )}
      </div>
    </div>
  );
};
