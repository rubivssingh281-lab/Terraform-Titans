import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QUICK_MORSE_PHRASES as FALLBACK_QUICK_PHRASES } from '../data';
import { QuickPhrase } from '../types';
import { translateMorseSymbolToChar, MORSE_CODE_MAP } from '../utils/morse';
import { playMorseTone, speakText, playBeep } from '../utils/sound';
import morseModelWeights from '../data/morse_model_weights.json';
import { sendRemoteEvent } from '../utils/remote';

interface MorseTranslatorProps {
  onAddPhraseHistory: (text: string, mode: 'Morse') => void;
  remoteCode?: string;
}

export const MorseTranslator: React.FC<MorseTranslatorProps> = ({ onAddPhraseHistory, remoteCode }) => {
  const [inputMode, setInputMode] = useState<'tap' | 'camera'>('tap');
  const [currentSequence, setCurrentSequence] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [quickPhrases, setQuickPhrases] = useState<QuickPhrase[]>(FALLBACK_QUICK_PHRASES);
  const [rightTab, setRightTab] = useState<'guide' | 'library'>('guide');

  // Neural Tap states
  const [tapDuration, setTapDuration] = useState<number>(0);
  const [tapConfidence, setTapConfidence] = useState<number>(0);
  const [tapClass, setTapClass] = useState<string>('NONE');
  const [tapProbabilities, setTapProbabilities] = useState<Record<string, number>>({});

  const pressStartRef = useRef<number>(0);

  // Bluetooth Switch Custom Trigger Configuration
  const [triggerKey, setTriggerKey] = useState<string>(() => {
    return localStorage.getItem('echolytix_trigger_key') || ' ';
  });
  const [triggerCode, setTriggerCode] = useState<string>(() => {
    return localStorage.getItem('echolytix_trigger_code') || 'Space';
  });
  const [isMappingKey, setIsMappingKey] = useState<boolean>(false);

  // Fetch quick morse phrases from Database API on mount
  useEffect(() => {
    fetch('/api/quick-phrases')
      .then(res => res.ok ? res.json() : null)
      .then((data: QuickPhrase[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuickPhrases(data);
        }
      })
      .catch(err => console.warn('Using fallback quick phrases:', err));
  }, []);

  // Handle Tap Press Start
  const handlePressStart = (e: React.MouseEvent | React.TouchEvent | KeyboardEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    pressStartRef.current = Date.now();
    setIsPressing(true);
  };

  // Custom Neural Network Inference for Tapping
  const predictTap = (dur: number) => {
    const norm = Math.min(800, Math.max(0, dur)) / morseModelWeights.maxDuration;
    const x = [norm];

    // Hidden Layer 1
    const w1 = morseModelWeights.w1;
    const b1 = morseModelWeights.b1;
    const h1_a: number[] = [];
    for (let r = 0; r < w1.length; r++) {
      let sum = b1[r];
      for (let c = 0; c < x.length; c++) {
        sum += w1[r][c] * x[c];
      }
      h1_a.push(Math.max(0, sum)); // ReLU
    }

    // Output Layer
    const w2 = morseModelWeights.w2;
    const b2 = morseModelWeights.b2;
    const out_z: number[] = [];
    for (let r = 0; r < w2.length; r++) {
      let sum = b2[r];
      for (let c = 0; c < h1_a.length; c++) {
        sum += w2[r][c] * h1_a[c];
      }
      out_z.push(sum);
    }

    // Softmax
    const maxZ = Math.max(...out_z);
    const exps = out_z.map(z => Math.exp(z - maxZ));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probabilities = exps.map(e => e / (sumExps || 1e-10));

    const predictedClassIdx = probabilities[0] > probabilities[1] ? 0 : 1;
    const predictedClass = morseModelWeights.classes[predictedClassIdx];

    const probsMap = {
      DOT: probabilities[0],
      DASH: probabilities[1]
    };

    return {
      class: predictedClass,
      confidence: probabilities[predictedClassIdx],
      probabilities: probsMap
    };
  };

  // Handle Tap Press End
  const handlePressEnd = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) {
      e.preventDefault();
    }
    if (!pressStartRef.current) return;

    const duration = Date.now() - pressStartRef.current;
    pressStartRef.current = 0;
    setIsPressing(false);

    // Predict with Neural Network
    const prediction = predictTap(duration);
    const isDash = prediction.class === 'DASH';
    const symbol = isDash ? '—' : '·';
    
    setTapDuration(duration);
    setTapClass(prediction.class);
    setTapConfidence(prediction.confidence);
    setTapProbabilities(prediction.probabilities);

    playMorseTone(isDash);

    // Append symbol to current sequence
    setCurrentSequence(prev => {
      const newSeq = prev ? `${prev} ${symbol}` : symbol;
      return newSeq;
    });
  }, []);

  // Convert current Morse sequence to character
  const handleCommitSequence = useCallback(() => {
    if (!currentSequence.trim()) return;

    const char = translateMorseSymbolToChar(currentSequence);
    if (char && char !== '?') {
      setTranslatedText(prev => prev + char);
      speakText(char.toLowerCase()); // Speak the character name (e.g. "a", "b", "c") out loud!
      if (remoteCode) {
        sendRemoteEvent(remoteCode, 'char', char);
        sendRemoteEvent(remoteCode, 'speak', char.toLowerCase());
      }
    } else {
      playBeep(350, 0.2, 'triangle'); // Error feedback for invalid sequences
      if (remoteCode) {
        sendRemoteEvent(remoteCode, 'beep', { freq: 350, duration: 0.2 });
      }
    }
    setCurrentSequence('');
  }, [currentSequence, remoteCode]);

  // Stream current Morse sequence changes to the laptop
  useEffect(() => {
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'morse', currentSequence);
    }
  }, [currentSequence, remoteCode]);

  // Keyboard Event Handlers for spacebar/custom trigger tapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (isMappingKey) {
        e.preventDefault();
        const key = e.key;
        const code = e.code;
        setTriggerKey(key);
        setTriggerCode(code);
        localStorage.setItem('echolytix_trigger_key', key);
        localStorage.setItem('echolytix_trigger_code', code);
        setIsMappingKey(false);
        playBeep(900, 0.1);
        setTimeout(() => playBeep(1100, 0.1), 100);
        return;
      }

      const isTrigger = e.key === triggerKey || e.code === triggerCode;
      if (isTrigger) {
        e.preventDefault();
        if (isPressing) return;
        pressStartRef.current = Date.now();
        setIsPressing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const isTrigger = e.key === triggerKey || e.code === triggerCode;
      if (isTrigger && !isMappingKey) {
        e.preventDefault();
        handlePressEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPressing, handlePressEnd, isMappingKey, triggerKey, triggerCode]);

  // Auto-commit sequence if idle
  useEffect(() => {
    if (!currentSequence) return;

    const savedDelay = localStorage.getItem('profile_commit_delay');
    const parsed = savedDelay ? Number(savedDelay) : 1200;
    const delay = isNaN(parsed) || parsed <= 0 ? 1200 : parsed;
    const timer = setTimeout(() => {
      handleCommitSequence();
    }, delay);

    return () => clearTimeout(timer);
  }, [currentSequence, handleCommitSequence]);

  const handleBackspaceSymbol = () => {
    if (currentSequence.trim()) {
      const tokens = currentSequence.trim().split(' ');
      tokens.pop();
      setCurrentSequence(tokens.join(' '));
    } else if (translatedText) {
      setTranslatedText(prev => prev.slice(0, -1));
      if (remoteCode) {
        sendRemoteEvent(remoteCode, 'backspace', '');
      }
    }
  };

  const handleAddSpace = () => {
    setTranslatedText(prev => prev + ' ');
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'char', ' ');
    }
  };

  const handleDeleteLastLetter = () => {
    setTranslatedText(prev => {
      if (!prev) return '';
      if (remoteCode) {
        sendRemoteEvent(remoteCode, 'backspace', '');
      }
      return prev.slice(0, -1);
    });
  };

  const handleClearAll = () => {
    setCurrentSequence('');
    setTranslatedText('');
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'clear', '');
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!translatedText.trim()) return;
    speakText(translatedText);
    onAddPhraseHistory(`"${translatedText}"`, 'Morse');
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'phrase', translatedText);
      sendRemoteEvent(remoteCode, 'speak', translatedText);
    }
  };

  const handleInsertQuickPhrase = (phraseLabel: string, morse: string) => {
    setTranslatedText(prev => (prev ? `${prev} ${phraseLabel.toUpperCase()}` : phraseLabel.toUpperCase()));
    setCurrentSequence(morse);
    speakText(phraseLabel);
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'word', phraseLabel.toUpperCase());
      sendRemoteEvent(remoteCode, 'speak', phraseLabel);
    }
  };

  const wordCount = translatedText.trim() ? translatedText.trim().split(/\s+/).length : 0;
  const charCount = translatedText.length;

  return (
    <main className="p-4 md:p-6 max-w-[1280px] mx-auto w-full flex flex-col gap-5 pb-28 md:pb-12 animate-fade-in">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-slate-900 mb-0.5">
            Morse Translator
          </h1>
          <p className="font-body text-slate-500 text-xs md:text-sm max-w-xl">
            Translate manual taps or visual light signals into readable text in real-time.
          </p>
        </div>

        <div className="flex bg-[#EFE8D8] rounded-xl p-1 border border-[#E6DDC9] self-stretch md:self-auto">
          <button
            onClick={() => setInputMode('tap')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono-code text-xs flex items-center justify-center gap-1.5 transition-all ${
              inputMode === 'tap'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-500 hover:bg-[#E6DDC9]/50'
            }`}
          >
            <span className="material-symbols-outlined text-sm">touch_app</span>
            Manual Tap
          </button>
          <button
            onClick={() => setInputMode('camera')}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg font-mono-code text-xs flex items-center justify-center gap-1.5 transition-all ${
              inputMode === 'camera'
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-500 hover:bg-[#E6DDC9]/50'
            }`}
          >
            <span className="material-symbols-outlined text-sm">videocam</span>
            Camera Input
          </button>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Tap Input & Sequence (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Bluetooth switch mapping settings card */}
          {inputMode === 'tap' && (
            <div className="bg-[#FCFAF4] border border-[#E6DDC9] rounded-2xl p-4.5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <span className="material-symbols-outlined text-lg">bluetooth</span>
                </div>
                <div>
                  <h4 className="font-mono-code text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Bluetooth Switch Key
                  </h4>
                  <p className="text-[10px] font-body text-slate-500 mt-0.5">
                    Mapped Trigger Key: <span className="text-indigo-600 font-mono-code font-bold">{triggerKey === ' ' ? 'Spacebar' : triggerKey}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMappingKey(true);
                  playBeep(650, 0.1);
                }}
                className={`px-3.5 py-1.5 rounded-xl font-mono-code text-[10px] font-bold transition-all active:scale-95 ${
                  isMappingKey
                    ? 'bg-amber-600 text-white border border-amber-500/30 animate-pulse'
                    : 'bg-[#E6DDC9] hover:bg-[#DED4BE] text-slate-800 border border-[#DED4BE]/35'
                }`}
              >
                {isMappingKey ? 'Press switch key...' : 'Map Switch Key'}
              </button>
            </div>
          )}

          {/* Tap Pad */}
          <div
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={() => handlePressEnd()}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className={`bg-[#FCFAF4] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden select-none cursor-pointer border transition-all ${
              isPressing
                ? 'border-emerald-400 bg-emerald-500/10 scale-[0.99]'
                : 'border-[#E6DDC9] hover:border-emerald-400/40'
            }`}
          >
            <div className="w-20 h-20 rounded-full border-2 border-emerald-400/30 flex items-center justify-center mb-3.5 status-pulse transition-all">
              <span className={`material-symbols-outlined text-4xl ${isPressing ? 'text-white scale-110' : 'text-emerald-600'}`}>
                radio_button_checked
              </span>
            </div>

            <h3 className="font-display font-bold text-lg text-slate-900 mb-1 text-center">
              {isPressing ? 'Pressing...' : 'Tap to Input'}
            </h3>
            <p className="font-body text-[11px] text-slate-500 text-center max-w-md leading-normal">
              Short tap for <strong className="text-emerald-600">dot (·)</strong> • Long press for <strong className="text-emerald-600">dash (—)</strong>
            </p>
          </div>

        {/* Neural Tap Classifier HUD */}
        <div className="bg-[#FCFAF4] rounded-2xl p-4 border border-[#E6DDC9] flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#E6DDC9] pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-indigo-600 animate-pulse">speed</span>
              <span className="text-xs font-extrabold text-slate-800 tracking-wide">Neural Tap Classifier</span>
            </div>
            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md px-1.5 py-0.5 font-mono-code text-[8px] font-bold">
              Accuracy: {morseModelWeights.accuracy}%
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-[#E6DDC9]">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono-code text-slate-500">DURATION</span>
              <span className="font-mono-code text-xs font-bold text-slate-800">{tapDuration} ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono-code text-slate-500">CLASSIFIED</span>
              <span className={`font-mono-code text-xs font-bold ${tapClass === 'DOT' ? 'text-emerald-600' : tapClass === 'DASH' ? 'text-amber-600' : 'text-slate-400'}`}>
                {tapClass}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono-code text-slate-500">CONFIDENCE</span>
              <span className="font-mono-code text-xs font-bold text-indigo-600">
                {tapConfidence > 0 ? `${(tapConfidence * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Probability Bars */}
          <div className="flex flex-col gap-1.5 mt-1">
            {['DOT', 'DASH'].map(c => {
              const prob = tapProbabilities[c] || 0;
              const probPct = (prob * 100).toFixed(1);
              const isActive = c === tapClass;
              
              return (
                <div key={c} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[9px] font-mono-code">
                    <span className={isActive ? 'text-indigo-600 font-bold' : 'text-slate-500'}>{c}</span>
                    <span className={isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}>{probPct}%</span>
                  </div>
                  <div className="w-full h-1 bg-[#EFE8D8] rounded-full overflow-hidden border border-[#E6DDC9]">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        c === 'DOT'
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                          : 'bg-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                      }`}
                      style={{ width: `${probPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Current Sequence */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 flex flex-col border border-[#E6DDC9]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-mono-code text-[10px] text-slate-500">Current Sequence</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCommitSequence}
                  disabled={!currentSequence}
                  className="text-[10px] font-mono-code bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-600 px-2.5 py-0.5 rounded border border-indigo-500/30 transition-colors disabled:opacity-40"
                >
                  Convert Char
                </button>
                <button
                  onClick={handleBackspaceSymbol}
                  className="text-slate-500 hover:text-rose-600 transition-colors"
                  title="Backspace"
                >
                  <span className="material-symbols-outlined text-lg">backspace</span>
                </button>
              </div>
            </div>

            <div className="bg-[#F3EDDF] rounded-xl p-3 min-h-[54px] flex items-center border border-[#E6DDC9] justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono-code text-xl md:text-2xl text-emerald-600 tracking-[0.4em] font-bold">
                  {currentSequence || <span className="text-slate-400 tracking-normal text-xs font-normal">No signal...</span>}
                </span>
                {currentSequence && (
                  <span className="text-indigo-600 font-mono-code text-[10px] font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/25">
                    Preview: {translateMorseSymbolToChar(currentSequence)}
                  </span>
                )}
              </div>
              <span className="animate-pulse w-1.5 h-6 bg-emerald-500"></span>
            </div>
          </div>
        </div>

        {/* Right Column: Output & Library (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Translation Output */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 flex flex-col border border-[#E6DDC9]">
            <div className="flex justify-between items-center mb-2.5 border-b border-[#E6DDC9] pb-2.5">
              <span className="font-mono-code text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">translate</span>
                Live Translation
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-slate-500 hover:text-emerald-600 transition-colors p-0.5"
                  title="Copy Text"
                >
                  <span className="material-symbols-outlined text-base">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
                <button
                  onClick={handleSpeak}
                  disabled={!translatedText}
                  className="text-slate-500 hover:text-emerald-600 transition-colors p-0.5 disabled:opacity-40"
                  title="Speak Text"
                >
                  <span className="material-symbols-outlined text-base">volume_up</span>
                </button>
              </div>
            </div>

            <div className="bg-[#F3EDDF] p-3 rounded-xl border border-[#E6DDC9] min-h-[90px]">
              <p className="font-mono-code text-sm md:text-base text-slate-900 leading-relaxed break-all">
                {translatedText || <span className="text-slate-400">Translated text will appear here...</span>}
                <span className="animate-pulse text-emerald-600 ml-0.5">_</span>
              </p>
            </div>

            <div className="mt-3.5 flex justify-between items-center pt-3 border-t border-[#E6DDC9]">
              <div className="flex gap-3 font-mono-code text-[10px]">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500">Words</span>
                  <span className="text-xs font-bold text-indigo-600">{wordCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500">Chars</span>
                  <span className="text-xs font-bold text-indigo-600">{charCount}</span>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={handleAddSpace}
                  className="bg-[#EFE8D8] text-slate-800 px-2.5 py-1 rounded-lg font-mono-code text-[10px] hover:bg-[#E6DDC9] border border-[#E6DDC9] transition-colors"
                >
                  + Space
                </button>
                <button
                  onClick={handleDeleteLastLetter}
                  className="bg-[#EFE8D8] text-slate-800 px-2.5 py-1 rounded-lg font-mono-code text-[10px] hover:bg-[#E6DDC9] border border-[#E6DDC9] transition-colors"
                >
                  Delete Letter
                </button>
                <button
                  onClick={handleClearAll}
                  className="bg-[#EFE8D8] text-slate-800 px-2.5 py-1 rounded-lg font-mono-code text-[10px] hover:bg-[#E6DDC9] border border-[#E6DDC9] transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Library and Guide Panels */}
          <div className="bg-[#FCFAF4] rounded-2xl border border-[#E6DDC9] overflow-hidden flex flex-col flex-grow">
            {/* Tab Headers */}
            <div className="flex border-b border-[#E6DDC9] bg-[#FFFDF8]">
              <button
                onClick={() => setRightTab('guide')}
                className={`flex-1 py-2.5 text-xs font-mono-code font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  rightTab === 'guide'
                    ? 'border-indigo-500 text-indigo-600 bg-[#FCFAF4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#EFE8D8]/40'
                }`}
              >
                <span className="material-symbols-outlined text-sm">school</span>
                Tapping Guide
              </button>
              <button
                onClick={() => setRightTab('library')}
                className={`flex-1 py-2.5 text-xs font-mono-code font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                  rightTab === 'library'
                    ? 'border-indigo-500 text-indigo-600 bg-[#FCFAF4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-[#EFE8D8]/40'
                }`}
              >
                <span className="material-symbols-outlined text-sm">menu_book</span>
                Quick Phrases
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              {rightTab === 'guide' && (
                <div className="flex flex-col gap-3">
                  {/* Morse Code Alphabet Grid */}
                  <div>
                    <span className="font-mono-code text-[11px] text-slate-500 block mb-2">
                      Alphabet (A-Z)
                    </span>
                    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-9 gap-1.5 pr-1">
                      {Object.entries(MORSE_CODE_MAP)
                        .filter(([char]) => char >= 'A' && char <= 'Z')
                        .map(([char, code]) => {
                          const displayCode = code.replace(/\./g, '·').replace(/-/g, '—');
                          return (
                            <div
                              key={char}
                              className="bg-[#EFE8D8] border border-[#E6DDC9] flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-center text-slate-700"
                            >
                              <span className="font-display font-bold text-xs">{char}</span>
                              <span className="font-mono-code text-[8px] text-emerald-600 tracking-tighter mt-0.5">{displayCode}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {rightTab === 'library' && (
                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {quickPhrases.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#EFE8D8] border border-[#E6DDC9] text-left group"
                    >
                      <div className="flex flex-col flex-grow truncate mr-2">
                        <span className="font-display font-semibold text-xs text-slate-800 truncate">
                          {item.label}
                        </span>
                        <span className="font-mono-code text-[10px] text-emerald-600/80 tracking-widest truncate mt-0.5">
                          {item.morse}
                        </span>
                      </div>

                      <div className="flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleInsertQuickPhrase(item.label, item.morse)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono-code transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">send</span>
                          Send
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
