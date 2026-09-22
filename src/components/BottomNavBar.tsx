import React from 'react';
import { NavTab } from '../types';

interface BottomNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isLoggedIn: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab, isLoggedIn }) => {
  return (
    <nav className="md:hidden bg-[#FFFDF8]/95 backdrop-blur-2xl fixed bottom-0 left-0 w-full rounded-t-xl z-50 border-t border-[#E6DDC9] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] flex justify-around items-center h-20 px-2 pb-safe">
      {/* Blink */}
      <button
        onClick={() => isLoggedIn ? onSelectTab('blink') : onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all ${
          currentTab === 'blink'
            ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'text-slate-500 hover:text-slate-900'
        } ${!isLoggedIn ? 'opacity-60' : ''}`}
      >
        <span className="material-symbols-outlined text-xl mb-0.5">
          {!isLoggedIn ? 'lock' : 'visibility'}
        </span>
        <span className="font-mono-code text-[10px] uppercase tracking-wider">Blink</span>
      </button>

      {/* Sign */}
      <button
        onClick={() => isLoggedIn ? onSelectTab('sign') : onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all ${
          currentTab === 'sign'
            ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'text-slate-500 hover:text-slate-900'
        } ${!isLoggedIn ? 'opacity-60' : ''}`}
      >
        <span className="material-symbols-outlined text-xl mb-0.5">
          {!isLoggedIn ? 'lock' : 'front_hand'}
        </span>
        <span className="font-mono-code text-[10px] uppercase tracking-wider">Sign</span>
      </button>

      {/* Morse */}
      <button
        onClick={() => isLoggedIn ? onSelectTab('morse') : onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all ${
          currentTab === 'morse'
            ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'text-slate-500 hover:text-slate-900'
        } ${!isLoggedIn ? 'opacity-60' : ''}`}
      >
        <span className="material-symbols-outlined text-xl mb-0.5">
          {!isLoggedIn ? 'lock' : 'keyboard'}
        </span>
        <span className="font-mono-code text-[10px] uppercase tracking-wider">Morse</span>
      </button>

      {/* TTS */}
      <button
        onClick={() => isLoggedIn ? onSelectTab('tts') : onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all ${
          currentTab === 'tts'
            ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'text-slate-500 hover:text-slate-900'
        } ${!isLoggedIn ? 'opacity-60' : ''}`}
      >
        <span className="material-symbols-outlined text-xl mb-0.5">
          {!isLoggedIn ? 'lock' : 'record_voice_over'}
        </span>
        <span className="font-mono-code text-[10px] uppercase tracking-wider">TTS</span>
      </button>

      {/* Remote */}
      <button
        onClick={() => isLoggedIn ? onSelectTab('remote') : onSelectTab('dashboard')}
        className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all ${
          currentTab === 'remote'
            ? 'bg-indigo-600 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'text-slate-500 hover:text-slate-900'
        } ${!isLoggedIn ? 'opacity-60' : ''}`}
      >
        <span className="material-symbols-outlined text-xl mb-0.5">
          {!isLoggedIn ? 'lock' : 'devices'}
        </span>
        <span className="font-mono-code text-[10px] uppercase tracking-wider">Remote</span>
      </button>
    </nav>
  );
};
