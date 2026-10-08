// Rule-based hand-gesture classifier.
//
// The bundled neural net (gesture_model_weights.json) was trained purely on
// synthetically generated hand skeletons, so it generalises poorly to the real
// landmarks MediaPipe produces from a live camera. This module classifies the
// supported gestures directly from finger geometry, which is deterministic and
// far more reliable on real hands. It returns the same shape the old MLP did
// ({ gesture, confidence, probabilities }) plus the raw finger-state readout so
// the UI can show the user exactly what the camera is seeing in real time.

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export interface GesturePrediction {
  gesture: string;
  confidence: number; // 0..1
  probabilities: Record<string, number>;
  fingers: FingerStates;
  extendedCount: number;
}

// The 16 gestures the app understands (kept in sync with SignLanguage.tsx).
export const GESTURE_CLASSES = [
  'HELLO', 'YES', 'NO', 'HELP', 'NEED WATER', 'THANK YOU', 'PLEASE', 'HOW ARE YOU',
  'GOOD', 'BAD', 'OK', 'STOP', 'SLEEP', 'BATHROOM', 'PAIN', 'FOOD'
];

const dist = (a: Landmark, b: Landmark): number =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

const dist2d = (a: Landmark, b: Landmark): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

// MediaPipe hand landmark indices.
const WRIST = 0;
const THUMB_MCP = 2, THUMB_IP = 3, THUMB_TIP = 4;
const INDEX_MCP = 5, INDEX_PIP = 6, INDEX_TIP = 8;
const MIDDLE_MCP = 9, MIDDLE_PIP = 10, MIDDLE_TIP = 12;
const RING_MCP = 13, RING_PIP = 14, RING_TIP = 16;
const PINKY_MCP = 17, PINKY_PIP = 18, PINKY_TIP = 20;

/**
 * A non-thumb finger is "extended" when its tip is meaningfully farther from the
 * wrist than its PIP joint. This is orientation-independent, so it works whether
 * the hand points up, sideways or at the camera.
 */
function isFingerExtended(lm: Landmark[], tip: number, pip: number): boolean {
  return dist(lm[tip], lm[WRIST]) > dist(lm[pip], lm[WRIST]) * 1.08;
}

/** How confidently a finger is open/closed (positive = open), for scoring. */
function fingerMargin(lm: Landmark[], tip: number, pip: number): number {
  const ratio = dist(lm[tip], lm[WRIST]) / (dist(lm[pip], lm[WRIST]) || 1e-6);
  return ratio - 1.08;
}

/**
 * The thumb is "extended" when its tip juts out sideways, away from the pinky
 * knuckle, farther than its own IP joint does.
 */
function isThumbExtended(lm: Landmark[]): boolean {
  return dist(lm[THUMB_TIP], lm[PINKY_MCP]) > dist(lm[THUMB_IP], lm[PINKY_MCP]) * 1.05;
}

export function getFingerStates(lm: Landmark[]): FingerStates {
  return {
    thumb: isThumbExtended(lm),
    index: isFingerExtended(lm, INDEX_TIP, INDEX_PIP),
    middle: isFingerExtended(lm, MIDDLE_TIP, MIDDLE_PIP),
    ring: isFingerExtended(lm, RING_TIP, RING_PIP),
    pinky: isFingerExtended(lm, PINKY_TIP, PINKY_PIP),
  };
}

// Gesture signatures as [thumb, index, middle, ring, pinky] booleans (1/0).
// Thumb bit is weighted lower because thumb detection is the noisiest.
const SIGNATURES: Record<string, number[]> = {
  HELLO: [1, 1, 1, 1, 1],
  YES: [0, 0, 0, 0, 0],
  HELP: [0, 1, 0, 0, 0],
  STOP: [1, 1, 0, 0, 0],
  NO: [0, 1, 1, 0, 0],           // peace, fingers spread
  PAIN: [0, 1, 1, 0, 0],         // peace, fingers together
  PLEASE: [0, 1, 1, 1, 0],
  'HOW ARE YOU': [0, 1, 0, 0, 1],
  'THANK YOU': [1, 1, 0, 0, 1],
  'NEED WATER': [1, 0, 0, 0, 1],
  SLEEP: [0, 0, 0, 0, 1],
  GOOD: [1, 0, 0, 0, 0],
  BAD: [1, 0, 0, 0, 0],
  BATHROOM: [1, 0, 0, 0, 0],
};

function softmax(scores: Record<string, number>, temperature = 11): Record<string, number> {
  const entries = Object.entries(scores);
  const max = Math.max(...entries.map(([, v]) => v));
  const exps = entries.map(([k, v]) => [k, Math.exp((v - max) * temperature)] as const);
  const sum = exps.reduce((acc, [, v]) => acc + v, 0) || 1e-9;
  const out: Record<string, number> = {};
  for (const [k, v] of exps) out[k] = v / sum;
  return out;
}

/**
 * Classify a single hand's 21 landmarks into one of the supported gestures.
 */
export function classifyGesture(lm: Landmark[] | undefined | null): GesturePrediction {
  const empty: GesturePrediction = {
    gesture: 'None',
    confidence: 0,
    probabilities: {},
    fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    extendedCount: 0,
  };
  if (!lm || lm.length < 21) return empty;

  const fingers = getFingerStates(lm);
  const bits = [fingers.thumb, fingers.index, fingers.middle, fingers.ring, fingers.pinky].map(b => (b ? 1 : 0));
  const extendedCount = bits.reduce((a, b) => a + b, 0);

  // Hand scale used to make distance-based features resolution independent.
  const scale = dist(lm[WRIST], lm[MIDDLE_MCP]) || 1e-6;

  // Extra geometric features that disambiguate look-alike gestures.
  const indexMiddleSpread = dist2d(lm[INDEX_TIP], lm[MIDDLE_TIP]) / scale;
  const thumbIndexPinch = dist(lm[THUMB_TIP], lm[INDEX_TIP]) / scale;
  const thumbTipY = lm[THUMB_TIP].y;
  const wristY = lm[WRIST].y;
  const thumbVertical = (wristY - thumbTipY) / scale; // >0 thumb above wrist

  // Score every candidate gesture. The four fingers (index..pinky) are the
  // reliable signal; the thumb is noisier so it carries less weight. An *exact*
  // finger-pattern match earns a strong bonus, which makes a correctly performed
  // gesture win decisively — that is what drives confidence up past 80%.
  const scores: Record<string, number> = {};

  for (const g of GESTURE_CLASSES) {
    const sig = SIGNATURES[g];
    if (!sig) { scores[g] = 0; continue; }
    let fingerMatches = 0;
    for (let i = 1; i < 5; i++) if (bits[i] === sig[i]) fingerMatches++; // 0..4
    const thumbMatch = bits[0] === sig[0];
    let score = (fingerMatches / 4) * 0.85 + (thumbMatch ? 0.25 : 0);
    if (fingerMatches === 4) {
      score += 0.5;                 // exact finger pattern -> confident
      if (!thumbMatch) score -= 0.15;
    }
    scores[g] = score;
  }

  // --- Disambiguation bonuses/penalties ---

  // OK sign: thumb + index tips pinch into a circle, other three fingers out.
  const okShape = thumbIndexPinch < 0.45 && fingers.middle && fingers.ring && fingers.pinky;
  scores.OK = okShape ? 1.6 : 0.05;

  // NO (peace) vs PAIN (two fingers together): decide by index/middle spread.
  if (bits[1] === 1 && bits[2] === 1 && bits[3] === 0) {
    if (indexMiddleSpread > 0.55) { scores.NO += 0.35; scores.PAIN -= 0.25; }
    else { scores.PAIN += 0.35; scores.NO -= 0.25; }
  }

  // Thumb-only gestures (GOOD / BAD / BATHROOM) differ by thumb direction.
  if (extendedCount <= 1 && fingers.thumb && !fingers.index) {
    if (thumbVertical > 0.35) { scores.GOOD += 0.4; scores.BAD -= 0.3; scores.BATHROOM -= 0.1; }
    else if (thumbVertical < -0.35) { scores.BAD += 0.4; scores.GOOD -= 0.3; scores.BATHROOM -= 0.1; }
    else { scores.BATHROOM += 0.35; scores.GOOD -= 0.15; scores.BAD -= 0.15; }
  }

  // FOOD (claw / cupped hand): no finger fully extended, but not a tight fist
  // either — the fingertips sit partway between the PIPs and the wrist.
  const curls = [
    fingerMargin(lm, INDEX_TIP, INDEX_PIP),
    fingerMargin(lm, MIDDLE_TIP, MIDDLE_PIP),
    fingerMargin(lm, RING_TIP, RING_PIP),
    fingerMargin(lm, PINKY_TIP, PINKY_PIP),
  ];
  const clawLike = extendedCount === 0 && curls.every(c => c > -0.28 && c < 0.02);
  if (clawLike) {
    scores.FOOD = 1.6;
    scores.YES -= 0.6; // a cupped claw is not a tight fist
  } else {
    scores.FOOD = 0;
  }

  // Convert scores to probabilities and pick the winner.
  const probabilities = softmax(scores);
  let gesture = 'None';
  let confidence = 0;
  for (const [g, p] of Object.entries(probabilities)) {
    if (p > confidence) { confidence = p; gesture = g; }
  }

  // Guard against an all-open hand being read as anything but HELLO, and a
  // fully-closed fist being read as anything but YES.
  if (extendedCount === 5) { gesture = 'HELLO'; }

  return { gesture, confidence, probabilities, fingers, extendedCount };
}
