import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLASSES = ['OPEN', 'BLINK', 'WINK'];

interface Sample {
  features: number[]; // [leftEAR, rightEAR]
  classIdx: number;
}

// Generate random value from normal distribution (Box-Muller transform)
function randomNormal(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

// Clamp helper
function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// Generate open eye EAR (with random squinting cases)
function genOpen(): number {
  const isSquinting = Math.random() < 0.25;
  const mean = isSquinting ? 0.22 : 0.28;
  const std = isSquinting ? 0.02 : 0.03;
  return clamp(randomNormal(mean, std), 0.15, 0.40);
}

// Generate closed eye EAR (with random partial closures)
function genClosed(): number {
  const isPartial = Math.random() < 0.25;
  const mean = isPartial ? 0.125 : 0.09;
  const std = isPartial ? 0.015 : 0.015;
  return clamp(randomNormal(mean, std), 0.03, 0.16);
}

// Generate dataset
function generateDataset(samplesPerClass: number): Sample[] {
  const dataset: Sample[] = [];

  // 1. OPEN (both eyes open)
  for (let i = 0; i < samplesPerClass; i++) {
    dataset.push({
      features: [genOpen(), genOpen()],
      classIdx: 0
    });
  }

  // 2. BLINK (both eyes closed)
  for (let i = 0; i < samplesPerClass; i++) {
    dataset.push({
      features: [genClosed(), genClosed()],
      classIdx: 1
    });
  }

  // 3. WINK (one eye closed, one open)
  for (let i = 0; i < samplesPerClass; i++) {
    const isLeftWink = Math.random() < 0.5;
    const left = isLeftWink ? genClosed() : genOpen();
    const right = isLeftWink ? genOpen() : genClosed();
    dataset.push({
      features: [left, right],
      classIdx: 2
    });
  }

  return dataset;
}

// Neural Network Class (MLP: 2 inputs -> 8 hidden -> 3 outputs)
class BlinkNeuralNetwork {
  w1: number[][]; // 8 x 2
  b1: number[];   // 8
  w2: number[][]; // 3 x 8
  b2: number[];   // 3

  constructor() {
    this.w1 = this.initWeights(8, 2);
    this.b1 = new Array(8).fill(0);
    this.w2 = this.initWeights(3, 8);
    this.b2 = new Array(3).fill(0);
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

  forward(x: number[]) {
    // Hidden Layer 1
    const h_z: number[] = [];
    for (let r = 0; r < this.w1.length; r++) {
      let sum = this.b1[r];
      for (let c = 0; c < x.length; c++) {
        sum += this.w1[r][c] * x[c];
      }
      h_z.push(sum);
    }
    const h_a = h_z.map(val => this.relu(val));

    // Output Layer
    const out_z: number[] = [];
    for (let r = 0; r < this.w2.length; r++) {
      let sum = this.b2[r];
      for (let c = 0; c < h_a.length; c++) {
        sum += this.w2[r][c] * h_a[c];
      }
      out_z.push(sum);
    }
    const out_a = this.softmax(out_z);

    return { h_z, h_a, out_z, out_a };
  }

  trainStep(
    x: number[],
    yOneHot: number[],
    lr: number,
    v_w1: number[][], v_b1: number[],
    v_w2: number[][], v_b2: number[],
    beta: number
  ) {
    const fwd = this.forward(x);

    // Output Layer error: dZ2 = out_a - y
    const dZ2: number[] = [];
    for (let i = 0; i < fwd.out_a.length; i++) {
      dZ2.push(fwd.out_a[i] - yOneHot[i]);
    }

    // Layer 2 gradients: dW2 = dZ2 * h_a^T, dB2 = dZ2
    const dW2: number[][] = [];
    for (let r = 0; r < this.w2.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w2[r].length; c++) {
        row.push(dZ2[r] * fwd.h_a[c]);
      }
      dW2.push(row);
    }
    const dB2 = [...dZ2];

    // Layer 1 error: dZ1 = (W2^T * dZ2) * reluDerivative(h_z)
    const dZ1: number[] = [];
    for (let c = 0; c < this.w2[0].length; c++) {
      let sum = 0;
      for (let r = 0; r < this.w2.length; r++) {
        sum += this.w2[r][c] * dZ2[r];
      }
      dZ1.push(sum * this.reluDerivative(fwd.h_z[c]));
    }

    // Layer 1 gradients: dW1 = dZ1 * x^T, dB1 = dZ1
    const dW1: number[][] = [];
    for (let r = 0; r < this.w1.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w1[r].length; c++) {
        row.push(dZ1[r] * x[c]);
      }
      dW1.push(row);
    }
    const dB1 = [...dZ1];

    // Update with momentum
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

function main() {
  console.log('👁️ STARTING BLINK SYSTEM DATASET GENERATION & MODEL TRAINING...');

  // 1. Generate augmented dataset
  const SAMPLES_PER_CLASS = 1000;
  console.log(`📊 Generating ${SAMPLES_PER_CLASS} samples per class for classes: ${CLASSES.join(', ')}...`);
  
  let dataset = generateDataset(SAMPLES_PER_CLASS);
  dataset = shuffleArray(dataset);

  // 2. Train-Validation Split (85% Train, 15% Validation)
  const splitIdx = Math.floor(dataset.length * 0.85);
  const trainData = dataset.slice(0, splitIdx);
  const valData = dataset.slice(splitIdx);

  console.log(`📦 Dataset split: ${trainData.length} training samples, ${valData.length} validation samples.`);

  // 3. Train Neural Network
  const nn = new BlinkNeuralNetwork();

  // Momentum velocities
  const v_w1 = nn.w1.map(row => new Array(row.length).fill(0));
  const v_b1 = new Array(8).fill(0);
  const v_w2 = nn.w2.map(row => new Array(row.length).fill(0));
  const v_b2 = new Array(3).fill(0);

  const EPOCHS = 100;
  let lr = 0.08;
  const beta = 0.9;
  const outputDim = 3;

  console.log(`🏋️ Training Blink Neural Network for ${EPOCHS} epochs (learning rate: ${lr})...`);

  let bestValAcc = 0;
  let bestWeights = {
    w1: JSON.parse(JSON.stringify(nn.w1)),
    b1: [...nn.b1],
    w2: JSON.parse(JSON.stringify(nn.w2)),
    b2: [...nn.b2]
  };

  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    const shuffledTrain = shuffleArray(trainData);
    let totalLoss = 0;

    for (const item of shuffledTrain) {
      const yOneHot = new Array(outputDim).fill(0);
      yOneHot[item.classIdx] = 1;

      nn.trainStep(item.features, yOneHot, lr, v_w1, v_b1, v_w2, v_b2, beta);
      
      const out = nn.forward(item.features).out_a;
      totalLoss += nn.calculateLoss(out, yOneHot);
    }

    const avgTrainLoss = totalLoss / trainData.length;

    // Decay learning rate
    if (epoch === 40 || epoch === 80) {
      lr *= 0.3;
    }

    // Evaluate on validation set
    let valCorrect = 0;
    let totalValLoss = 0;

    for (const item of valData) {
      const yOneHot = new Array(outputDim).fill(0);
      yOneHot[item.classIdx] = 1;

      const fwd = nn.forward(item.features);
      totalValLoss += nn.calculateLoss(fwd.out_a, yOneHot);

      let maxVal = -1;
      let predIdx = -1;
      for (let p = 0; p < fwd.out_a.length; p++) {
        if (fwd.out_a[p] > maxVal) {
          maxVal = fwd.out_a[p];
          predIdx = p;
        }
      }

      if (predIdx === item.classIdx) {
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
        b2: [...nn.b2]
      };
    }

    if (epoch === 1 || epoch % 10 === 0 || epoch === EPOCHS) {
      console.log(`Epoch ${epoch.toString().padStart(3, ' ')}/${EPOCHS} | Train Loss: ${avgTrainLoss.toFixed(5)} | Val Loss: ${avgValLoss.toFixed(5)} | Val Accuracy: ${valAcc.toFixed(2)}%`);
    }
  }

  console.log(`🎉 BLINK MODEL TRAINING COMPLETE!`);
  console.log(`🏆 Best Validation Accuracy: ${bestValAcc.toFixed(2)}%`);

  // Apply best weights
  nn.w1 = bestWeights.w1;
  nn.b1 = bestWeights.b1;
  nn.w2 = bestWeights.w2;
  nn.b2 = bestWeights.b2;

  // 4. Save trained weights to JSON file
  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'blink_model_weights.json');
  const payload = {
    w1: nn.w1,
    b1: nn.b1,
    w2: nn.w2,
    b2: nn.b2,
    classes: CLASSES,
    accuracy: bestValAcc.toFixed(2),
    datasetSize: dataset.length,
    trainedAt: new Date().toISOString()
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`💾 Blink model weights successfully saved to: ${outFile}`);
}

main();
