import React from 'react';

export type FontScale = '100' | '115' | '130';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontScale: FontScale;
  onChangeFontScale: (scale: FontScale) => void;
}

const SHORTCUTS = [
  { keys: ['Alt', '1 / D'], description: 'Switch to Patient Dashboard' },
  { keys: ['Alt', '2 / B'], description: 'Switch to Blink-to-Text' },
  { keys: ['Alt', '3 / S'], description: 'Switch to Sign Language' },
  { keys: ['Alt', '4 / M'], description: 'Switch to Morse Translator' },
  { keys: ['Alt', '5 / T'], description: 'Switch to Text-to-Speech' },
  { keys: ['Alt', '6 / R'], description: 'Switch to Remote Receiver' },
  { keys: ['Alt', 'E'], description: 'Trigger Emergency SOS Dialog' },
  { keys: ['?'], description: 'Toggle Shortcuts & Display Guide' },
  { keys: ['Esc'], description: 'Close Active Dialog' },
];

const SCALE_OPTIONS: { value: FontScale; label: string; hint: string }[] = [
  { value: '100', label: 'Standard', hint: '100%' },
  { value: '115', label: 'Large', hint: '115%' },
  { value: '130', label: 'Extra Large', hint: '130%' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  fontScale,
  onChangeFontScale,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="bg-[#FCFAF4] border border-[#E6DDC9] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DDC9] bg-[#FFFDF8]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-indigo-600 text-xl">keyboard</span>
            <h2
              id="shortcuts-modal-title"
              className="font-display font-bold text-base text-slate-900"
            >
              Accessibility & Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close accessibility guide"
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto">
          {/* Display Font Scaling */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-code font-bold text-slate-600 uppercase tracking-wider">
                Display Text Size
              </span>
              <span className="text-[11px] font-mono-code text-indigo-600 font-semibold">
                {fontScale}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SCALE_OPTIONS.map((opt) => {
                const active = fontScale === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeFontScale(opt.value)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-mono-code transition-all flex flex-col items-center gap-0.5 ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm'
                        : 'bg-[#EFE8D8] text-slate-700 border-[#E6DDC9] hover:border-indigo-500/40'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keyboard Navigation Map */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono-code font-bold text-slate-600 uppercase tracking-wider mb-1">
              Quick Navigation Hotkeys
            </span>
            <div className="flex flex-col divide-y divide-[#E6DDC9] border border-[#E6DDC9] rounded-xl bg-[#FFFDF8] overflow-hidden">
              {SHORTCUTS.map((item) => (
                <div
                  key={item.description}
                  className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                >
                  <span className="text-slate-700 font-body">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-2 py-0.5 rounded-md bg-[#EFE8D8] border border-[#DED4BE] text-slate-800 font-mono-code text-[11px] font-semibold"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
