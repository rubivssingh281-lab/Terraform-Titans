export const MORSE_CODE_MAP: Record<string, string> = {
  'A': '.-',     'B': '-...',   'C': '-.-.',   'D': '-..',
  'E': '.',      'F': '..-.',   'G': '--.',    'H': '....',
  'I': '..',     'J': '.---',   'K': '-.-',    'L': '.-..',
  'M': '--',     'N': '-.',     'O': '---',    'P': '.--.',
  'Q': '--.-',   'R': '.-.',    'S': '...',    'T': '-',
  'U': '..-',    'V': '...-',   'W': '.--',    'X': '-..-',
  'Y': '-.--',   'Z': '--..',
  '1': '.----',  '2': '..---',  '3': '...--',  '4': '....-',  '5': '.....',
  '6': '-....',  '7': '--...',  '8': '---..',  '9': '----.',  '0': '-----',
  ' ': '/',      '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--'
};

export const REVERSE_MORSE_MAP: Record<string, string> = Object.entries(MORSE_CODE_MAP).reduce(
  (acc, [letter, morse]) => {
    acc[morse] = letter;
    return acc;
  },
  {} as Record<string, string>
);

export function translateMorseSymbolToChar(symbol: string): string {
  const normalized = symbol.trim().replace(/·/g, '.').replace(/—/g, '-').replace(/\s/g, '');
  return REVERSE_MORSE_MAP[normalized] || '?';
}

export function translateTextToMorse(text: string): string {
  return text
    .toUpperCase()
    .split('')
    .map(char => MORSE_CODE_MAP[char] ? MORSE_CODE_MAP[char].replace(/\./g, '·').replace(/-/g, '—') : '')
    .filter(Boolean)
    .join(' ');
}

export function translateMorseToText(morseSequence: string): string {
  if (!morseSequence.trim()) return '';
  
  // Split by words first (separated by ' / ' or ' | ')
  const words = morseSequence.split(/\s+[\/|]\s+/);
  
  return words
    .map(word => {
      // Split by letters (separated by 2 or more spaces)
      const letters = word.split(/\s{2,}/);
      return letters
        .map(letter => {
          const normalized = letter.trim().replace(/·/g, '.').replace(/—/g, '-').replace(/\s/g, '');
          return REVERSE_MORSE_MAP[normalized] || '?';
        })
        .join('');
    })
    .join(' ');
}
