import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the 16 gesture classes
const GESTURE_CLASSES = [
  'HELLO', 'YES', 'NO', 'HELP', 'NEED WATER', 'THANK YOU', 'PLEASE', 'HOW ARE YOU',
  'GOOD', 'BAD', 'OK', 'STOP', 'SLEEP', 'BATHROOM', 'PAIN', 'FOOD'
];

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Helper to calculate Euclidean distance
function dist(p1: Landmark, p2: Landmark): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
}

// 3D vector rotation using Rodrigues' formula around a unit axis
function rotateVector(v: Landmark, axis: Landmark, angle: number): Landmark {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  // Cross product: axis x v
  const cross = {
    x: axis.y * v.z - axis.z * v.y,
    y: axis.z * v.x - axis.x * v.z,
    z: axis.x * v.y - axis.y * v.x
  };
  
  // Dot product: axis . v
  const dot = axis.x * v.x + axis.y * v.y + axis.z * v.z;
  
  return {
    x: v.x * cos + cross.x * sin + axis.x * dot * (1 - cos),
    y: v.y * cos + cross.y * sin + axis.y * dot * (1 - cos),
    z: v.z * cos + cross.z * sin + axis.z * dot * (1 - cos)
  };
}

// Rotate point around an axis passing through origin
function rotatePoint(p: Landmark, pitch: number, yaw: number, roll: number): Landmark {
  // Pitch (X-axis rotation)
  let cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  let y1 = p.y * cosP - p.z * sinP;
  let z1 = p.y * sinP + p.z * cosP;
  let x1 = p.x;

  // Yaw (Y-axis rotation)
  let cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  let x2 = x1 * cosY + z1 * sinY;
  let z2 = -x1 * sinY + z1 * cosY;
  let y2 = y1;

  // Roll (Z-axis rotation)
  let cosR = Math.cos(roll), sinR = Math.sin(roll);
  let x3 = x2 * cosR - y2 * sinR;
  let y3 = x2 * sinR + y2 * cosR;
  let z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

// Generates 21 hand landmarks based on kinematics and extension values
function generateHandSkeleton(fingerExtensions: {
  thumb: number; // 0 (closed) to 1 (extended)
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}, specialMod?: string): Landmark[] {
  const landmarks: Landmark[] = new Array(21);
  
  // 0. Wrist
  landmarks[0] = { x: 0.0, y: 0.0, z: 0.0 };
  
  // Define finger MCP joint locations (base of fingers) relative to wrist
  const mcpPoints = {
    thumb: { x: 0.06, y: -0.05, z: -0.02 },
    index: { x: 0.05, y: -0.15, z: -0.01 },
    middle: { x: 0.01, y: -0.16, z: -0.01 },
    ring: { x: -0.03, y: -0.15, z: -0.01 },
    pinky: { x: -0.07, y: -0.13, z: -0.02 }
  };
  
  // Base finger direction unit vectors pointing outwards
  let indexDir = { x: 0.1, y: -0.95, z: 0.0 };
  let middleDir = { x: 0.0, y: -1.0, z: 0.0 };
  let ringDir = { x: -0.1, y: -0.95, z: 0.0 };
  let pinkyDir = { x: -0.25, y: -0.9, z: 0.0 };
  
  // Special modifications for specific hand shapes
  if (specialMod === 'NO') {
    // Spread index & middle finger apart
    indexDir = { x: 0.25, y: -0.9, z: 0.0 };
    middleDir = { x: -0.15, y: -0.92, z: 0.0 };
  } else if (specialMod === 'SHAKA') {
    // Pinky extended extremely outward
    pinkyDir = { x: -0.6, y: -0.6, z: 0.0 };
  }
  
  // Normalize directions
  const normalize = (v: Landmark) => {
    const len = Math.hypot(v.x, v.y, v.z);
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  };
  
  const dIndex = normalize(indexDir);
  const dMiddle = normalize(middleDir);
  const dRing = normalize(ringDir);
  const dPinky = normalize(pinkyDir);
  
  // Segment lengths
  const lenIndex = [0.08, 0.06, 0.05];
  const lenMiddle = [0.09, 0.07, 0.05];
  const lenRing = [0.08, 0.06, 0.05];
  const lenPinky = [0.07, 0.05, 0.04];
  
  // Define standard finger bending function
  // extension goes 0 (fully closed/curled into palm) to 1 (fully straight)
  const computeFinger = (
    mcp: Landmark,
    dir: Landmark,
    lengths: number[],
    ext: number,
    baseIdx: number
  ) => {
    landmarks[baseIdx] = mcp;
    
    // Normal to palm (pointing out)
    const palmNormal = { x: 0.0, y: 0.0, z: -1.0 };
    // Lateral rotation axis (perpendicular to finger direction and palm normal)
    const rotAxis = {
      x: dir.y * palmNormal.z - dir.z * palmNormal.y,
      y: dir.z * palmNormal.x - dir.x * palmNormal.z,
      z: dir.x * palmNormal.y - dir.y * palmNormal.x
    };
    const lenRot = Math.hypot(rotAxis.x, rotAxis.y, rotAxis.z);
    const rAxis = { x: rotAxis.x / lenRot, y: rotAxis.y / lenRot, z: rotAxis.z / lenRot };
    
    // Joint bending angles based on curl
    // If ext is 1 (extended), curl is 0 (no bend). If ext is 0 (curled), curl is 1 (full bend).
    const curl = 1.0 - ext;
    const a1 = curl * (Math.PI * 0.45); // PIP bend
    const a2 = curl * (Math.PI * 0.50); // DIP bend
    const a3 = curl * (Math.PI * 0.40); // Tip bend
    
    // Calculate joints sequentially
    const v1 = rotateVector(dir, rAxis, a1);
    landmarks[baseIdx + 1] = {
      x: landmarks[baseIdx].x + v1.x * lengths[0],
      y: landmarks[baseIdx].y + v1.y * lengths[0],
      z: landmarks[baseIdx].z + v1.z * lengths[0]
    };
    
    const v2 = rotateVector(v1, rAxis, a2);
    landmarks[baseIdx + 2] = {
      x: landmarks[baseIdx + 1].x + v2.x * lengths[1],
      y: landmarks[baseIdx + 1].y + v2.y * lengths[1],
      z: landmarks[baseIdx + 1].z + v2.z * lengths[1]
    };
    
    const v3 = rotateVector(v2, rAxis, a3);
    landmarks[baseIdx + 3] = {
      x: landmarks[baseIdx + 2].x + v3.x * lengths[2],
      y: landmarks[baseIdx + 2].y + v3.y * lengths[2],
      z: landmarks[baseIdx + 2].z + v3.z * lengths[2]
    };
  };
  
  // 1. Compute fingers
  computeFinger(mcpPoints.index, dIndex, lenIndex, fingerExtensions.index, 5);
  computeFinger(mcpPoints.middle, dMiddle, lenMiddle, fingerExtensions.middle, 9);
  computeFinger(mcpPoints.ring, dRing, lenRing, fingerExtensions.ring, 13);
  computeFinger(mcpPoints.pinky, dPinky, lenPinky, fingerExtensions.pinky, 17);
  
  // 2. Compute Thumb (different kinematics)
  landmarks[1] = mcpPoints.thumb;
  // CMC to MCP
  landmarks[2] = {
    x: landmarks[1].x + 0.05,
    y: landmarks[1].y - 0.04,
    z: landmarks[1].z - 0.02
  };
  
  const thExt = fingerExtensions.thumb;
  if (specialMod === 'BATHROOM') {
    // Thumb extended sideways, horizontal
    landmarks[3] = { x: landmarks[2].x + 0.05, y: landmarks[2].y + 0.01, z: landmarks[2].z + 0.01 };
    landmarks[4] = { x: landmarks[3].x + 0.04, y: landmarks[3].y + 0.01, z: landmarks[3].z + 0.01 };
  } else if (thExt > 0.5) {
    // Extended out & up
    landmarks[3] = {
      x: landmarks[2].x + 0.05 * thExt,
      y: landmarks[2].y - 0.05 * thExt,
      z: landmarks[2].z - 0.02
    };
    landmarks[4] = {
      x: landmarks[3].x + 0.04 * thExt,
      y: landmarks[3].y - 0.05 * thExt,
      z: landmarks[3].z - 0.02
    };
  } else {
    // Folded/curled across palm (X is inward, Z is slightly outward)
    landmarks[3] = {
      x: landmarks[2].x - 0.03,
      y: landmarks[2].y - 0.01,
      z: landmarks[2].z - 0.03
    };
    landmarks[4] = {
      x: landmarks[3].x - 0.04,
      y: landmarks[3].y + 0.01,
      z: landmarks[3].z - 0.04
    };
  }
  
  // 3. Special modifications for touching/complex gestures
  if (specialMod === 'OK') {
    // Force Index Tip (8) and Thumb Tip (4) to touch
    const touchPoint = { x: 0.06, y: -0.16, z: -0.04 };
    landmarks[4] = touchPoint;
    landmarks[8] = touchPoint;
  }
  
  return landmarks;
}

// Generate base gestures coordinates
function getBaseGestureLandmarks(gesture: string): Landmark[] {
  switch (gesture) {
    case 'HELLO':
      return generateHandSkeleton({ thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 });
      
    case 'YES': // Fist
      return generateHandSkeleton({ thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 });
      
    case 'NO': // Peace sign
      return generateHandSkeleton({ thumb: 0, index: 1, middle: 1, ring: 0, pinky: 0 }, 'NO');
      
    case 'HELP': // Index up, thumb tucked
      return generateHandSkeleton({ thumb: 0, index: 1, middle: 0, ring: 0, pinky: 0 });
      
    case 'NEED WATER': // Shaka
      return generateHandSkeleton({ thumb: 1, index: 0, middle: 0, ring: 0, pinky: 1 }, 'SHAKA');
      
    case 'THANK YOU': // ILY sign
      return generateHandSkeleton({ thumb: 1, index: 1, middle: 0, ring: 0, pinky: 1 });
      
    case 'PLEASE': // Three fingers (index, middle, ring up)
      return generateHandSkeleton({ thumb: 0, index: 1, middle: 1, ring: 1, pinky: 0 });
      
    case 'HOW ARE YOU': // Horns (index & pinky)
      return generateHandSkeleton({ thumb: 0, index: 1, middle: 0, ring: 0, pinky: 1 });
      
    case 'GOOD': // Thumbs up (pointing straight up)
      {
        const skeleton = generateHandSkeleton({ thumb: 1, index: 0, middle: 0, ring: 0, pinky: 0 });
        // Rotate so thumb points up
        return skeleton.map(p => rotatePoint(p, 0, 0, Math.PI / 4)); // minor rotation
      }
      
    case 'BAD': // Thumbs down
      {
        const skeleton = generateHandSkeleton({ thumb: 1, index: 0, middle: 0, ring: 0, pinky: 0 });
        // Rotate 180 deg so thumb points down
        return skeleton.map(p => rotatePoint(p, 0, 0, Math.PI));
      }
      
    case 'OK':
      return generateHandSkeleton({ thumb: 0.8, index: 0.8, middle: 1, ring: 1, pinky: 1 }, 'OK');
      
    case 'STOP': // L-shape: Index up, thumb extended horizontally out sideways
      {
        const skeleton = generateHandSkeleton({ thumb: 1, index: 1, middle: 0, ring: 0, pinky: 0 });
        // Adjust thumb explicitly to point far right
        skeleton[3] = { x: skeleton[2].x + 0.07, y: skeleton[2].y, z: skeleton[2].z };
        skeleton[4] = { x: skeleton[3].x + 0.06, y: skeleton[3].y, z: skeleton[3].z };
        return skeleton;
      }
      
    case 'SLEEP': // Pinky up
      return generateHandSkeleton({ thumb: 0, index: 0, middle: 0, ring: 0, pinky: 1 });
      
    case 'BATHROOM': // Fist with thumb extended horizontally
      return generateHandSkeleton({ thumb: 1, index: 0, middle: 0, ring: 0, pinky: 0 }, 'BATHROOM');
      
    case 'PAIN': // Index & middle up together (touching)
      {
        const skeleton = generateHandSkeleton({ thumb: 0, index: 1, middle: 1, ring: 0, pinky: 0 });
        // Draw them closer together
        skeleton[8].x = 0.03;
        skeleton[12].x = 0.01;
        return skeleton;
      }
      
    case 'FOOD': // Curved cup shape
      return generateHandSkeleton({ thumb: 0.4, index: 0.4, middle: 0.4, ring: 0.4, pinky: 0.4 });
      
    default:
      return generateHandSkeleton({ thumb: 1, index: 1, middle: 1, ring: 1, pinky: 1 });
  }
}

// Generate data sample for a gesture class with data augmentation (tilt, scale, noise, roll)
function generateAugmentedSamples(gesture: string, count: number): number[][] {
  const baseLandmarks = getBaseGestureLandmarks(gesture);
  const samples: number[][] = [];
  
  for (let i = 0; i < count; i++) {
    // 1. Data augmentation angles
    // Roll (rotation around Z camera axis): full range [-180, 180] degrees
    const roll = (Math.random() - 0.5) * 2 * Math.PI;
    // Pitch (tilt forward/backward): [-35, 35] degrees
    const pitch = (Math.random() - 0.5) * (70 * Math.PI / 180);
    // Yaw (tilt left/right): [-35, 35] degrees
    const yaw = (Math.random() - 0.5) * (70 * Math.PI / 180);
    
    // Scale factor: [0.8, 1.25]
    const scale = 0.8 + Math.random() * 0.45;
    
    // Noise amplitude
    const noiseAmp = 0.015;
    
    // Apply transformations
    const transformed: Landmark[] = baseLandmarks.map(p => {
      // Rotate
      const r = rotatePoint(p, pitch, yaw, roll);
      
      // Scale & Add random noise
      return {
        x: r.x * scale + (Math.random() - 0.5) * noiseAmp,
        y: r.y * scale + (Math.random() - 0.5) * noiseAmp,
        z: r.z * scale + (Math.random() - 0.5) * noiseAmp
      };
    });
    
    // 2. Normalization
    // Shift wrist (landmark 0) to origin
    const wrist = transformed[0];
    const shifted = transformed.map(p => ({
      x: p.x - wrist.x,
      y: p.y - wrist.y,
      z: p.z - wrist.z
    }));
    
    // Find maximum distance from wrist to any joint
    let maxDist = 0.001;
    for (const p of shifted) {
      const d = Math.hypot(p.x, p.y, p.z);
      if (d > maxDist) maxDist = d;
    }
    
    // Divide by max distance to scale the hand skeleton to unit bounding box
    const normalized = shifted.map(p => ({
      x: p.x / maxDist,
      y: p.y / maxDist,
      z: p.z / maxDist
    }));
    
    // Flatten to 63-element array
    const flat: number[] = [];
    for (const p of normalized) {
      flat.push(p.x, p.y, p.z);
    }
    
    samples.push(flat);
  }
  
  return samples;
}

// ---------------- CUSTOM NEURAL NETWORK (MLP) IMPLEMENTATION ----------------
// 3-layer feedforward network: 63 inputs -> 64 hidden -> 32 hidden -> 16 outputs
class MultiLayerPerceptron {
  // Weights and Biases
  w1: number[][]; // 64 x 63
  b1: number[];   // 64
  w2: number[][]; // 32 x 64
  b2: number[];   // 32
  w3: number[][]; // 16 x 32
  b3: number[];   // 16

  constructor(inputDim: number, h1Dim: number, h2Dim: number, outputDim: number) {
    // Xavier/Glorot Initialization
    this.w1 = this.initWeights(h1Dim, inputDim);
    this.b1 = new Array(h1Dim).fill(0);
    
    this.w2 = this.initWeights(h2Dim, h1Dim);
    this.b2 = new Array(h2Dim).fill(0);
    
    this.w3 = this.initWeights(outputDim, h2Dim);
    this.b3 = new Array(outputDim).fill(0);
  }

  private initWeights(rows: number, cols: number): number[][] {
    const limit = Math.sqrt(6.0 / (rows + cols));
    const mat: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        row.push((Math.random() - 0.5) * 2 * limit);
      }
      mat.push(row);
    }
    return mat;
  }

  // Activations
  private relu(x: number): number {
    return Math.max(0, x);
  }

  private reluDerivative(x: number): number {
    return x > 0 ? 1 : 0;
  }

  private softmax(arr: number[]): number[] {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / (sum || 1e-10));
  }

  // Forward Pass
  forward(x: number[]): {
    h1_z: number[];
    h1_a: number[];
    h2_z: number[];
    h2_a: number[];
    out_z: number[];
    out_a: number[];
  } {
    // Layer 1
    const h1_z: number[] = [];
    for (let r = 0; r < this.w1.length; r++) {
      let sum = this.b1[r];
      for (let c = 0; c < x.length; c++) {
        sum += this.w1[r][c] * x[c];
      }
      h1_z.push(sum);
    }
    const h1_a = h1_z.map(val => this.relu(val));

    // Layer 2
    const h2_z: number[] = [];
    for (let r = 0; r < this.w2.length; r++) {
      let sum = this.b2[r];
      for (let c = 0; c < h1_a.length; c++) {
        sum += this.w2[r][c] * h1_a[c];
      }
      h2_z.push(sum);
    }
    const h2_a = h2_z.map(val => this.relu(val));

    // Layer 3 (Output)
    const out_z: number[] = [];
    for (let r = 0; r < this.w3.length; r++) {
      let sum = this.b3[r];
      for (let c = 0; c < h2_a.length; c++) {
        sum += this.w3[r][c] * h2_a[c];
      }
      out_z.push(sum);
    }
    const out_a = this.softmax(out_z);

    return { h1_z, h1_a, h2_z, h2_a, out_z, out_a };
  }

  // Train on a single batch
  trainStep(
    x: number[],
    yOneHot: number[],
    lr: number,
    // Momentum velocities
    v_w1: number[][], v_b1: number[],
    v_w2: number[][], v_b2: number[],
    v_w3: number[][], v_b3: number[],
    beta: number
  ) {
    const fwd = this.forward(x);
    
    // Backpropagation
    // Output Layer error: dZ3 = out_a - y
    const dZ3: number[] = [];
    for (let i = 0; i < fwd.out_a.length; i++) {
      dZ3.push(fwd.out_a[i] - yOneHot[i]);
    }
    
    // Layer 3 weight gradients: dW3 = dZ3 * h2_a^T, dB3 = dZ3
    const dW3: number[][] = [];
    for (let r = 0; r < this.w3.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w3[r].length; c++) {
        row.push(dZ3[r] * fwd.h2_a[c]);
      }
      dW3.push(row);
    }
    const dB3 = [...dZ3];

    // Layer 2 error: dZ2 = (W3^T * dZ3) * reluDerivative(h2_z)
    const dZ2: number[] = [];
    for (let c = 0; c < this.w3[0].length; c++) {
      let sum = 0;
      for (let r = 0; r < this.w3.length; r++) {
        sum += this.w3[r][c] * dZ3[r];
      }
      dZ2.push(sum * this.reluDerivative(fwd.h2_z[c]));
    }

    // Layer 2 weight gradients: dW2 = dZ2 * h1_a^T, dB2 = dZ2
    const dW2: number[][] = [];
    for (let r = 0; r < this.w2.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w2[r].length; c++) {
        row.push(dZ2[r] * fwd.h1_a[c]);
      }
      dW2.push(row);
    }
    const dB2 = [...dZ2];

    // Layer 1 error: dZ1 = (W2^T * dZ2) * reluDerivative(h1_z)
    const dZ1: number[] = [];
    for (let c = 0; c < this.w2[0].length; c++) {
      let sum = 0;
      for (let r = 0; r < this.w2.length; r++) {
        sum += this.w2[r][c] * dZ2[r];
      }
      dZ1.push(sum * this.reluDerivative(fwd.h1_z[c]));
    }

    // Layer 1 weight gradients: dW1 = dZ1 * x^T, dB1 = dZ1
    const dW1: number[][] = [];
    for (let r = 0; r < this.w1.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w1[r].length; c++) {
        row.push(dZ1[r] * x[c]);
      }
      dW1.push(row);
    }
    const dB1 = [...dZ1];

    // Update weights and biases with SGD + Momentum
    // Layer 3
    for (let r = 0; r < this.w3.length; r++) {
      for (let c = 0; c < this.w3[r].length; c++) {
        v_w3[r][c] = beta * v_w3[r][c] + (1 - beta) * dW3[r][c];
        this.w3[r][c] -= lr * v_w3[r][c];
      }
      v_b3[r] = beta * v_b3[r] + (1 - beta) * dB3[r];
      this.b3[r] -= lr * v_b3[r];
    }

    // Layer 2
    for (let r = 0; r < this.w2.length; r++) {
      for (let c = 0; c < this.w2[r].length; c++) {
        v_w2[r][c] = beta * v_w2[r][c] + (1 - beta) * dW2[r][c];
        this.w2[r][c] -= lr * v_w2[r][c];
      }
      v_b2[r] = beta * v_b2[r] + (1 - beta) * dB2[r];
      this.b2[r] -= lr * v_b2[r];
    }

    // Layer 1
    for (let r = 0; r < this.w1.length; r++) {
      for (let c = 0; c < this.w1[r].length; c++) {
        v_w1[r][c] = beta * v_w1[r][c] + (1 - beta) * dW1[r][c];
        this.w1[r][c] -= lr * v_w1[r][c];
      }
      v_b1[r] = beta * v_b1[r] + (1 - beta) * dB1[r];
      this.b1[r] -= lr * v_b1[r];
    }
  }

  // Calculate categorical cross entropy loss
  calculateLoss(output: number[], targetOneHot: number[]): number {
    let loss = 0;
    for (let i = 0; i < output.length; i++) {
      if (targetOneHot[i] === 1) {
        loss -= Math.log(Math.max(output[i], 1e-15));
      }
    }
    return loss;
  }
}

// Shuffle helper
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ---------------- MAIN DATA GENERATION AND TRAINING SCRIPT ----------------
function main() {
  console.log('🤖 STARTING CUSTOM GESTURE DATASET GENERATION & MODEL TRAINING...');
  
  // 1. Generate augmented dataset
  // We'll generate 300 augmented samples per gesture class
  const SAMPLES_PER_CLASS = 300;
  console.log(`📊 Generating ${SAMPLES_PER_CLASS} augmented samples per gesture for ${GESTURE_CLASSES.length} classes...`);
  
  interface DataItem {
    features: number[];
    classIndex: number;
    className: string;
  }
  
  let dataset: DataItem[] = [];
  
  for (let c = 0; c < GESTURE_CLASSES.length; c++) {
    const className = GESTURE_CLASSES[c];
    const samples = generateAugmentedSamples(className, SAMPLES_PER_CLASS);
    for (const sample of samples) {
      dataset.push({
        features: sample,
        classIndex: c,
        className: className
      });
    }
  }
  
  // Shuffle dataset
  dataset = shuffleArray(dataset);
  
  // 2. Train-Validation Split (85% Train, 15% Validation)
  const splitIdx = Math.floor(dataset.length * 0.85);
  const trainData = dataset.slice(0, splitIdx);
  const valData = dataset.slice(splitIdx);
  
  console.log(`📦 Dataset split: ${trainData.length} training samples, ${valData.length} validation samples.`);
  
  // 3. Initialize MLP
  const inputDim = 63; // 21 landmarks * 3 coordinates
  const h1Dim = 64;
  const h2Dim = 32;
  const outputDim = GESTURE_CLASSES.length; // 16
  
  const nn = new MultiLayerPerceptron(inputDim, h1Dim, h2Dim, outputDim);
  
  // Initialize velocity matrices/arrays for momentum
  const v_w1 = nn.w1.map(row => new Array(row.length).fill(0));
  const v_b1 = new Array(h1Dim).fill(0);
  const v_w2 = nn.w2.map(row => new Array(row.length).fill(0));
  const v_b2 = new Array(h2Dim).fill(0);
  const v_w3 = nn.w3.map(row => new Array(row.length).fill(0));
  const v_b3 = new Array(outputDim).fill(0);
  
  // Training parameters
  const EPOCHS = 150;
  let learningRate = 0.05;
  const momentum = 0.9;
  
  console.log(`🏋️ Training Neural Network for ${EPOCHS} epochs (learning rate: ${learningRate}, momentum: ${momentum})...`);
  
  let bestValAcc = 0;
  let bestWeights = {
    w1: JSON.parse(JSON.stringify(nn.w1)),
    b1: [...nn.b1],
    w2: JSON.parse(JSON.stringify(nn.w2)),
    b2: [...nn.b2],
    w3: JSON.parse(JSON.stringify(nn.w3)),
    b3: [...nn.b3]
  };

  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    // Shuffle train data each epoch
    const shuffledTrain = shuffleArray(trainData);
    
    // Train epoch
    let totalTrainLoss = 0;
    for (let i = 0; i < shuffledTrain.length; i++) {
      const item = shuffledTrain[i];
      
      // Construct target one-hot vector
      const yOneHot = new Array(outputDim).fill(0);
      yOneHot[item.classIndex] = 1;
      
      // Perform one backprop step
      nn.trainStep(
        item.features,
        yOneHot,
        learningRate,
        v_w1, v_b1,
        v_w2, v_b2,
        v_w3, v_b3,
        momentum
      );
      
      const out = nn.forward(item.features).out_a;
      totalTrainLoss += nn.calculateLoss(out, yOneHot);
    }
    
    const avgTrainLoss = totalTrainLoss / trainData.length;
    
    // Learning rate decay
    if (epoch === 60 || epoch === 110) {
      learningRate *= 0.3;
      console.log(`📉 Learning rate decayed to: ${learningRate}`);
    }
    
    // Evaluate on validation set
    let valCorrect = 0;
    let totalValLoss = 0;
    for (const item of valData) {
      const yOneHot = new Array(outputDim).fill(0);
      yOneHot[item.classIndex] = 1;
      
      const fwd = nn.forward(item.features);
      totalValLoss += nn.calculateLoss(fwd.out_a, yOneHot);
      
      // Find predicted class
      let maxProb = -1;
      let predIdx = -1;
      for (let p = 0; p < fwd.out_a.length; p++) {
        if (fwd.out_a[p] > maxProb) {
          maxProb = fwd.out_a[p];
          predIdx = p;
        }
      }
      
      if (predIdx === item.classIndex) {
        valCorrect++;
      }
    }
    
    const valAcc = (valCorrect / valData.length) * 100;
    const avgValLoss = totalValLoss / valData.length;
    
    if (valAcc > bestValAcc) {
      bestValAcc = valAcc;
      bestWeights = {
        w1: JSON.parse(JSON.stringify(nn.w1)),
        b1: [...nn.b1],
        w2: JSON.parse(JSON.stringify(nn.w2)),
        b2: [...nn.b2],
        w3: JSON.parse(JSON.stringify(nn.w3)),
        b3: [...nn.b3]
      };
    }
    
    if (epoch === 1 || epoch % 10 === 0 || epoch === EPOCHS) {
      console.log(`Epoch ${epoch.toString().padStart(3, ' ')}/${EPOCHS} | Train Loss: ${avgTrainLoss.toFixed(4)} | Val Loss: ${avgValLoss.toFixed(4)} | Val Accuracy: ${valAcc.toFixed(2)}%`);
    }
  }
  
  console.log(`🎉 TRAINING COMPLETE!`);
  console.log(`🏆 Best Validation Accuracy: ${bestValAcc.toFixed(2)}%`);
  
  // Apply best weights back to model
  nn.w1 = bestWeights.w1;
  nn.b1 = bestWeights.b1;
  nn.w2 = bestWeights.w2;
  nn.b2 = bestWeights.b2;
  nn.w3 = bestWeights.w3;
  nn.b3 = bestWeights.b3;
  
  // 4. Save trained weights to JSON file
  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const outFile = path.join(outDir, 'gesture_model_weights.json');
  const payload = {
    w1: nn.w1,
    b1: nn.b1,
    w2: nn.w2,
    b2: nn.b2,
    w3: nn.w3,
    b3: nn.b3,
    gestureClasses: GESTURE_CLASSES,
    accuracy: bestValAcc.toFixed(2),
    datasetSize: dataset.length,
    trainedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`💾 Model weights successfully saved to: ${outFile}`);
  console.log(`✨ Ready for local client-side deployment!`);
}

main();
