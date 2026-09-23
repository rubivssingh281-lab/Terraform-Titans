import React, { useState, useEffect } from 'react';
import { TTS_PHRASE_CATEGORIES as FALLBACK_CATEGORIES } from '../data';
import { speakText } from '../utils/sound';
import completionModel from '../data/completion_model.json';
import { sendRemoteEvent } from '../utils/remote';

interface CategoryItem {
  id?: number;
  category: string;
  phrases: string[];
}

interface TextToSpeechProps {
  onAddPhraseHistory: (text: string, mode: 'TTS') => void;
  remoteCode?: string;
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({ onAddPhraseHistory, remoteCode }) => {
  const [textInput, setTextInput] = useState<string>('Hello, I am using Echolytix to communicate.');
  const [rate, setRate] = useState<number>(() => {
    const saved = localStorage.getItem('profile_tts_speed');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [pitch, setPitch] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK_CATEGORIES);

  // Manage custom categories and phrases states
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [activeAddPhraseCatId, setActiveAddPhraseCatId] = useState<number | null>(null);
  const [newPhraseText, setNewPhraseText] = useState<string>('');

  useEffect(() => {
    // Fetch phrase categories from backend SQLite database
    fetch('/api/categories')
      .then(res => res.ok ? res.json() : null)
      .then((data: CategoryItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(err => console.warn('Could not load categories from API:', err));

    const updateVoices = () => {
      if ('speechSynthesis' in window) {
        const vList = window.speechSynthesis.getVoices();
        setVoices(vList);
        if (vList.length > 0 && !selectedVoice) {
          const defaultV = vList.find(v => v.default || v.lang.startsWith('en')) || vList[0];
          setSelectedVoice(defaultV.name);
        }
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoice]);

  const handleSpeak = () => {
    if (!textInput.trim()) return;
    speakText(textInput, selectedVoice, rate, pitch);
    onAddPhraseHistory(`"${textInput}"`, 'TTS');
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'phrase', textInput);
      sendRemoteEvent(remoteCode, 'speak', textInput);
    }
  };

  const handleSelectQuickPhrase = (phrase: string) => {
    setTextInput(phrase);
    speakText(phrase, selectedVoice, rate, pitch);
    onAddPhraseHistory(`"${phrase}"`, 'TTS');
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'phrase', phrase);
      sendRemoteEvent(remoteCode, 'speak', phrase);
    }
  };

  const handleAiRefine = async () => {
    if (!textInput.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textInput,
          mode: 'tts',
          context: 'Refine phrase for clear spoken delivery'
        })
      });
      const data = await res.json();
      if (data.expanded) {
        setTextInput(data.expanded);
        if (remoteCode) {
          sendRemoteEvent(remoteCode, 'phrase', data.expanded);
          sendRemoteEvent(remoteCode, 'speak', data.expanded);
        }
      }
    } catch (e) {
      console.error("AI refine error:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      if (res.ok) {
        const added = await res.json();
        setCategories(prev => [...prev, added]);
        setNewCategoryName('');
        setIsAddingCategory(false);
        speakText("Category added");
      }
    } catch (err) {
      console.error("Failed to add category:", err);
    }
  };

  const handleAddPhrase = async (catId: number) => {
    if (!newPhraseText.trim()) return;
    try {
      const res = await fetch(`/api/categories/${catId}/phrases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newPhraseText.trim() })
      });
      if (res.ok) {
        setCategories(prev => prev.map(c => {
          if (c.id === catId) {
            return { ...c, phrases: [...c.phrases, newPhraseText.trim()] };
          }
          return c;
        }));
        setNewPhraseText('');
        setActiveAddPhraseCatId(null);
        speakText("Phrase added");
      }
    } catch (err) {
      console.error("Failed to add phrase:", err);
    }
  };

  return (
    <main className="p-4 md:p-6 max-w-[1280px] mx-auto w-full flex flex-col gap-5 pb-28 md:pb-12 animate-fade-in">
      {/* Header Section */}
      <div>
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-slate-900 mb-0.5">
          Text-to-Speech Communicator
        </h1>
        <p className="font-body text-slate-500 text-xs md:text-sm max-w-2xl">
          Type custom text or select pre-configured phrases to communicate naturally with realistic voice synthesis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Input & Controls (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-[#FCFAF4] rounded-2xl p-5 flex flex-col border border-[#E6DDC9] shadow-xl">
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-mono-code text-[10px] text-slate-500">Text Message Input</span>

              <button
                onClick={handleAiRefine}
                disabled={isAiLoading || !textInput}
                className="bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-600 text-[10px] font-mono-code px-3 py-1 rounded-lg border border-indigo-500/30 flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                {isAiLoading ? 'Refining...' : 'AI Polisher'}
              </button>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={4}
              placeholder="Type your message here..."
              className="w-full bg-[#F3EDDF] text-slate-900 p-3.5 rounded-xl border border-[#E6DDC9] focus:border-indigo-500 focus:outline-none font-mono-code text-sm resize-none"
            />

            <div className="mt-3.5 flex flex-wrap justify-between items-center gap-3">
              <button
                onClick={() => setTextInput('')}
                className="text-[10px] font-mono-code text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                Clear Box
              </button>

              <button
                onClick={handleSpeak}
                disabled={!textInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono-code font-bold text-xs px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">record_voice_over</span>
                Speak Message
              </button>
            </div>
          </div>

          {/* Voice Customization Controls */}
          <div className="bg-[#FCFAF4] rounded-2xl p-5 border border-[#E6DDC9] flex flex-col gap-4">
            <h3 className="font-display font-bold text-sm text-slate-900 border-b border-[#E6DDC9] pb-2">
              Voice Controls & Speech Rate
            </h3>

            {/* Voice Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono-code text-slate-500">Voice Selection</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-[#EFE8D8] text-slate-900 p-2 rounded-xl border border-[#E6DDC9] font-mono-code text-[11px] focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {voices.length > 0 ? (
                  voices.map((v, i) => (
                    <option key={i} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                ) : (
                  <option value="">Default System Natural Voice</option>
                )}
              </select>
            </div>

            {/* Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono-code">
                  <span className="text-slate-500">Speed Rate</span>
                  <span className="text-emerald-600 font-bold">{rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="accent-emerald-500 cursor-pointer h-1 bg-[#EFE8D8] rounded-lg appearance-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono-code">
                  <span className="text-slate-500">Pitch</span>
                  <span className="text-indigo-600 font-bold">{pitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="accent-indigo-500 cursor-pointer h-1 bg-[#EFE8D8] rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Local text predictive completion model HUD */}
          <div className="bg-[#FCFAF4] rounded-2xl p-5 border border-[#E6DDC9] flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E6DDC9] pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-indigo-600 animate-pulse">auto_awesome</span>
                <span className="text-xs font-extrabold text-slate-800 tracking-wide">Predictive Text Engine</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md px-1.5 py-0.5 font-mono-code text-[8px] font-bold">
                Local AI Active
              </span>
            </div>

            {/* Metrics HUD */}
            <div className="grid grid-cols-2 gap-3 text-center divide-x divide-[#E6DDC9] text-[10px] font-mono-code">
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-500">VOCABULARY</span>
                <span className="font-bold text-indigo-600">{Object.keys(completionModel.transitions).length} Words</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-500">CORPUS SIZE</span>
                <span className="font-bold text-indigo-600">{completionModel.corpus.length} Phrases</span>
              </div>
            </div>

            <div className="bg-[#F3EDDF] rounded-xl p-3 border border-[#E6DDC9] flex flex-col gap-1 text-[9px] font-mono-code text-slate-500">
              <div className="flex justify-between">
                <span>Model Method:</span>
                <span className="text-slate-800 font-bold">Bigram Transition Markov Model</span>
              </div>
              <div className="flex justify-between">
                <span>Last Trained:</span>
                <span className="text-slate-700">{new Date(completionModel.meta.trainedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Categorized Phrase Board (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-[#FCFAF4] rounded-2xl p-5 border border-[#E6DDC9] flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 border-b border-[#E6DDC9] pb-2">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-base">bookmarks</span>
                Phrase Board
              </h3>
              
              <button
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 text-[10px] font-mono-code px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[12px]">add</span>
                {isAddingCategory ? 'Cancel' : 'Add Category'}
              </button>
            </div>

            {/* Add Category Form */}
            {isAddingCategory && (
              <form onSubmit={handleAddCategory} className="mb-4 bg-[#F3EDDF] p-3 rounded-xl border border-[#E6DDC9] flex gap-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-grow bg-[#EFE8D8] border border-[#E6DDC9] rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono-code"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-semibold font-display transition-colors"
                >
                  Create
                </button>
              </form>
            )}

            {/* Categories & Phrases list (Scroll-clamped to fit viewport) */}
            <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1">
              {categories.map((cat, idx) => {
                const catId = cat.id || idx;
                const isAddingPhrase = activeAddPhraseCatId === catId;

                return (
                  <div key={idx} className="flex flex-col gap-1.5 bg-[#EFE8D8]/30 p-2.5 rounded-xl border border-[#E6DDC9]/40">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono-code text-indigo-600 font-bold uppercase tracking-wider">
                        {cat.category}
                      </span>
                      
                      <button
                        onClick={() => {
                          if (isAddingPhrase) {
                            setActiveAddPhraseCatId(null);
                          } else {
                            setActiveAddPhraseCatId(catId);
                          }
                        }}
                        className="text-[9px] font-mono-code text-slate-500 hover:text-emerald-600 flex items-center gap-0.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[10px]">add</span>
                        {isAddingPhrase ? 'cancel' : 'add phrase'}
                      </button>
                    </div>

                    {/* Add Phrase Form inside specific category */}
                    {isAddingPhrase && (
                      <div className="flex gap-1.5 mt-1 bg-[#F3EDDF] p-2 rounded-lg border border-[#E6DDC9]">
                        <input
                          type="text"
                          placeholder="Phrase content..."
                          value={newPhraseText}
                          onChange={(e) => setNewPhraseText(e.target.value)}
                          className="flex-grow bg-[#EFE8D8] border border-[#E6DDC9] rounded-md px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono-code"
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddPhrase(catId)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded-md text-[10px] font-semibold font-display transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 mt-1">
                      {cat.phrases && cat.phrases.length > 0 ? (
                        cat.phrases.map((phrase, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handleSelectQuickPhrase(phrase)}
                            className="text-left p-2.5 rounded-lg bg-[#EFE8D8] hover:bg-[#E6DDC9] text-xs font-body text-slate-800 hover:text-emerald-600 transition-all border border-[#E6DDC9] hover:border-indigo-500/30 flex items-center justify-between group"
                          >
                            <span className="truncate mr-2">{phrase}</span>
                            <span className="material-symbols-outlined text-[12px] text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0">
                              volume_up
                            </span>
                          </button>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono-code italic pl-1 py-1">
                          No phrases in this category.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
