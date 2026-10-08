import React from 'react';

// A clean, schematic hand illustration that shows exactly which fingers are
// extended (and the thumb pose) for a gesture. Because the glyphs are driven by
// the same finger-state signatures the classifier uses, the picture the user
// sees is the exact hand shape the camera is trained to recognise.

export type ThumbPose = 'up' | 'down' | 'side' | 'tuck';

export interface HandGlyphProps {
  fingers: { index: boolean; middle: boolean; ring: boolean; pinky: boolean };
  thumb?: ThumbPose;
  variant?: 'default' | 'ok' | 'claw';
  spread?: boolean;
  className?: string;
}

const SKIN = '#EBB78C';
const STROKE = '#C0855C';
const SW = 2;

type FingerName = 'index' | 'middle' | 'ring' | 'pinky';
const COLS: Record<FingerName, number> = { index: 37, middle: 49, ring: 61, pinky: 71 };
const EXT_TOP: Record<FingerName, number> = { index: 24, middle: 16, ring: 24, pinky: 34 };
const WIDTH: Record<FingerName, number> = { index: 10, middle: 10, ring: 10, pinky: 8.5 };
const BASE_Y = 70;
const FOLD_TOP = 56;

function Finger({ name, on, variant, spread }: { name: FingerName; on: boolean; variant: string; spread: boolean }) {
  const w = WIDTH[name];
  let top = on ? EXT_TOP[name] : FOLD_TOP;
  if (variant === 'claw') top = 38; // half-curled cup
  let dx = 0;
  if (spread && name === 'index') dx = -5;
  if (spread && name === 'middle') dx = 5;
  const x = COLS[name] - w / 2 + dx;
  return (
    <rect x={x} y={top} width={w} height={BASE_Y - top + 6} rx={w / 2} fill={SKIN} stroke={STROKE} strokeWidth={SW} />
  );
}

function Thumb({ pose }: { pose: ThumbPose }) {
  const len = pose === 'up' ? 40 : pose === 'tuck' ? 20 : 34;
  const angle = pose === 'up' ? -30 : pose === 'side' ? -78 : pose === 'down' ? -148 : -46;
  const w = 11;
  return (
    <rect
      x={30 - w / 2}
      y={96 - len}
      width={w}
      height={len}
      rx={w / 2}
      fill={SKIN}
      stroke={STROKE}
      strokeWidth={SW}
      transform={`rotate(${angle} 30 96)`}
    />
  );
}

export const HandGlyph: React.FC<HandGlyphProps> = ({
  fingers,
  thumb = 'tuck',
  variant = 'default',
  spread = false,
  className,
}) => {
  const names: FingerName[] = ['index', 'middle', 'ring', 'pinky'];
  return (
    <svg viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* fingers (drawn behind the palm) */}
      {variant !== 'ok' && names.map((n) => <Finger key={n} name={n} on={fingers[n]} variant={variant} spread={spread} />)}
      {variant === 'ok' && (
        <>
          {(['middle', 'ring', 'pinky'] as FingerName[]).map((n) => (
            <Finger key={n} name={n} on variant="default" spread={false} />
          ))}
        </>
      )}

      {/* palm */}
      <rect x="29" y="62" width="44" height="52" rx="17" fill={SKIN} stroke={STROKE} strokeWidth={SW} />

      {/* thumb (on top of the palm edge) */}
      <Thumb pose={thumb} />

      {/* OK sign: thumb + index form a ring */}
      {variant === 'ok' && (
        <circle cx="35" cy="42" r="13" fill="none" stroke={STROKE} strokeWidth={5} strokeLinecap="round" />
      )}
    </svg>
  );
};

// Gesture -> glyph configuration. Kept in sync with the classifier signatures
// in utils/gesture.ts and the cheat sheet in SignLanguage.tsx.
export const GESTURE_GLYPHS: Record<string, HandGlyphProps> = {
  HELLO:        { fingers: { index: true, middle: true, ring: true, pinky: true }, thumb: 'side' },
  YES:          { fingers: { index: false, middle: false, ring: false, pinky: false }, thumb: 'tuck' },
  NO:           { fingers: { index: true, middle: true, ring: false, pinky: false }, thumb: 'tuck', spread: true },
  HELP:         { fingers: { index: true, middle: false, ring: false, pinky: false }, thumb: 'tuck' },
  'NEED WATER': { fingers: { index: false, middle: false, ring: false, pinky: true }, thumb: 'side' },
  'THANK YOU':  { fingers: { index: true, middle: false, ring: false, pinky: true }, thumb: 'side' },
  PLEASE:       { fingers: { index: true, middle: true, ring: true, pinky: false }, thumb: 'tuck' },
  'HOW ARE YOU':{ fingers: { index: true, middle: false, ring: false, pinky: true }, thumb: 'tuck' },
  GOOD:         { fingers: { index: false, middle: false, ring: false, pinky: false }, thumb: 'up' },
  BAD:          { fingers: { index: false, middle: false, ring: false, pinky: false }, thumb: 'down' },
  OK:           { fingers: { index: false, middle: true, ring: true, pinky: true }, thumb: 'side', variant: 'ok' },
  STOP:         { fingers: { index: true, middle: false, ring: false, pinky: false }, thumb: 'side' },
  SLEEP:        { fingers: { index: false, middle: false, ring: false, pinky: true }, thumb: 'tuck' },
  BATHROOM:     { fingers: { index: false, middle: false, ring: false, pinky: false }, thumb: 'side' },
  PAIN:         { fingers: { index: true, middle: true, ring: false, pinky: false }, thumb: 'tuck', spread: false },
  FOOD:         { fingers: { index: true, middle: true, ring: true, pinky: true }, thumb: 'side', variant: 'claw' },
};
