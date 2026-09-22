import React from 'react';
import { NavTab } from '../types';
import { USER_AVATAR_URL } from '../data';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSos: () => void;
  isLoggedIn: boolean;
  patientName?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentTab, 
  onSelectTab, 
  onOpenSos,
  isLoggedIn,
  patientName
}) => {
  return (
    <header className="bg-[#FFFDF8]/90 backdrop-blur-xl border-b border-[#E6DDC9] sticky top-0 z-50 flex justify-between items-center px-4 md:px-8 h-16 w-full">
      {/* Brand & User Profile */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E6DDC9] hover:border-indigo-500 transition-colors">
          <img
            src={USER_AVATAR_URL}
            alt={isLoggedIn && patientName ? patientName : "Echolytix"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-indigo-600 text-xl">graphic_eq</span>
            <h1 className="font-display font-extrabold text-xl md:text-2xl text-slate-900 tracking-tight">
              ECHOLYTIX
            </h1>
          </div>
          <span className="text-[10px] text-slate-500 font-mono-code hidden sm:inline-block">
            {isLoggedIn && patientName ? `Patient Profile: ${patientName}` : "No Voice Should Go Unheard"}
          </span>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 lg:gap-2">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code font-semibold transition-all flex items-center gap-1.5 ${
            currentTab === 'dashboard'
              ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
        >
          <span className="material-symbols-outlined text-sm">home</span>
          Dashboard
        </button>
        <button
          onClick={() => isLoggedIn ? onSelectTab('blink') : onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code font-semibold transition-all flex items-center gap-1.5 ${
            currentTab === 'blink'
              ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          } ${!isLoggedIn ? 'opacity-60' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">
            {!isLoggedIn ? 'lock' : 'visibility'}
          </span>
          Blink
        </button>
        <button
          onClick={() => isLoggedIn ? onSelectTab('sign') : onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code font-semibold transition-all flex items-center gap-1.5 ${
            currentTab === 'sign'
              ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          } ${!isLoggedIn ? 'opacity-60' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">
            {!isLoggedIn ? 'lock' : 'front_hand'}
          </span>
          Sign
        </button>
        <button
          onClick={() => isLoggedIn ? onSelectTab('morse') : onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code font-semibold transition-all flex items-center gap-1.5 ${
            currentTab === 'morse'
              ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          } ${!isLoggedIn ? 'opacity-60' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">
            {!isLoggedIn ? 'lock' : 'keyboard'}
          </span>
          Morse
        </button>
        <button
          onClick={() => isLoggedIn ? onSelectTab('tts') : onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code font-semibold transition-all flex items-center gap-1.5 ${
            currentTab === 'tts'
              ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          } ${!isLoggedIn ? 'opacity-60' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">
            {!isLoggedIn ? 'lock' : 'record_voice_over'}
          </span>
          TTS
        </button>
        <button
          onClick={() => isLoggedIn ? onSelectTab('remote') : onSelectTab('dashboard')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono-code font-semibold transition-all flex items-center gap-1.5 ${
            currentTab === 'remote'
              ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          } ${!isLoggedIn ? 'opacity-60' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">
            {!isLoggedIn ? 'lock' : 'devices'}
          </span>
          Remote
        </button>
      </nav>

      {/* Emergency SOS Trigger */}
      <button
        onClick={isLoggedIn ? onOpenSos : () => onSelectTab('dashboard')}
        className={`bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 rounded-full px-4 py-1.5 font-mono-code text-xs font-bold tracking-widest flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(244,63,94,0.15)] ${
          !isLoggedIn ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <span className="material-symbols-outlined text-sm animate-pulse">
          {!isLoggedIn ? 'lock' : 'warning'}
        </span>
        SOS
      </button>
    </header>
  );
};
