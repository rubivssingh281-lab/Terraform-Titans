import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLASSES = ['DOT', 'DASH'];

interface Sample {
  features: number[]; // [duration]
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

// Generate dataset
function generateDataset(samplesPerClass: number): Sample[] {
  const dataset: Sample[] = [];

  // 1. DOT (short tap)
  for (let i = 0; i < samplesPerClass; i++) {
    // Generate duration between 30 and 200 ms (mean 100, std 25)
    dataset.push({
      features: [clamp(randomNormal(100, 25), 30, 200)],
      classIdx: 0
    });
  }

  // 2. DASH (long tap)
  for (let i = 0; i < samplesPerClass; i++) {
    // Generate duration between 210 and 800 ms (mean 350, std 60)
    dataset.push({
      features: [clamp(randomNormal(350, 60), 210, 800)],
      classIdx: 1
    });
  }

  return dataset;
}

// Neural Network Class (MLP: 1 input -> 4 hidden -> 2 outputs)
class MorseNeuralNetwork {
  w1: number[][]; // 4 x 1
  b1: number[];   // 4
  w2: number[][]; // 2 x 4
  b2: number[];   // 2

  constructor() {
    this.w1 = this.initWeights(4, 1);
    this.b1 = new Array(4).fill(0);
    this.w2 = this.initWeights(2, 4);
    this.b2 = new Array(2).fill(0);
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

    // Output error: dZ2 = out_a - y
    const dZ2: number[] = [];
    for (let i = 0; i < fwd.out_a.length; i++) {
      dZ2.push(fwd.out_a[i] - yOneHot[i]);
    }

    // Layer 2 gradients
    const dW2: number[][] = [];
    for (let r = 0; r < this.w2.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w2[r].length; c++) {
        row.push(dZ2[r] * fwd.h_a[c]);
      }
      dW2.push(row);
    }
    const dB2 = [...dZ2];

    // Layer 1 error
    const dZ1: number[] = [];
    for (let c = 0; c < this.w2[0].length; c++) {
      let sum = 0;
      for (let r = 0; r < this.w2.length; r++) {
        sum += this.w2[r][c] * dZ2[r];
      }
      dZ1.push(sum * this.reluDerivative(fwd.h_z[c]));
    }

    // Layer 1 gradients
    const dW1: number[][] = [];
    for (let r = 0; r < this.w1.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.w1[r].length; c++) {
        row.push(dZ1[r] * x[c]);
      }
      dW1.push(row);
    }
    const dB1 = [...dZ1];

    // Update weights with momentum
    for (let r = 0; r < this.w2.length; r++) {
      for (let c = 0; c < this.w2[r].length; c++) {
        v_w2[r][c] = beta * v_w2[r][c] + (1 - beta) * dW2[r][c];
        this.w2[r][c] -= lr * v_w2[r][c];
      }
      v_b2[r] = beta * v_b2[r] + (1 - beta) * dB2[r];
      this.b2[r] -= lr * v_b2[r];
    }

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
  console.log('⚡ STARTING MORSE TAP SYSTEM DATASET GENERATION & MODEL TRAINING...');

  // 1. Generate dataset (1000 samples of dots, 1000 samples of dashes)
  const SAMPLES_PER_CLASS = 1000;
  console.log(`📊 Generating ${SAMPLES_PER_CLASS} samples per class for: ${CLASSES.join(', ')}...`);
  
  let dataset = generateDataset(SAMPLES_PER_CLASS);
  
  // Normalize durations between 0 and 1 for better network convergence
  // (divide by max duration of 800ms)
  const MAX_DURATION = 800.0;
  for (const item of dataset) {
    item.features[0] = item.features[0] / MAX_DURATION;
  }

  dataset = shuffleArray(dataset);

  // 2. Split (85% Train, 15% Val)
  const splitIdx = Math.floor(dataset.length * 0.85);
  const trainData = dataset.slice(0, splitIdx);
  const valData = dataset.slice(splitIdx);

  console.log(`📦 Dataset split: ${trainData.length} training samples, ${valData.length} validation samples.`);

  // 3. Train Neural Network
  const nn = new MorseNeuralNetwork();

  const v_w1 = nn.w1.map(row => new Array(row.length).fill(0));
  const v_b1 = new Array(4).fill(0);
  const v_w2 = nn.w2.map(row => new Array(row.length).fill(0));
  const v_b2 = new Array(2).fill(0);

  const EPOCHS = 100;
  let lr = 0.08;
  const beta = 0.9;
  const outputDim = 2;

  console.log(`🏋️ Training Morse Tap Neural Network for ${EPOCHS} epochs (learning rate: ${lr})...`);

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

    if (epoch === 40 || epoch === 80) {
      lr *= 0.3;
    }

    // Evaluate
    let valCorrect = 0;
    for (const item of valData) {
      const fwd = nn.forward(item.features);
      const predIdx = fwd.out_a[0] > fwd.out_a[1] ? 0 : 1;
      if (predIdx === item.classIdx) {
        valCorrect++;
      }
    }

    const valAcc = (valCorrect / valData.length) * 100;

    if (valAcc > bestValAcc) {
      bestValAcc = valAcc;
      bestWeights = {
        w1: JSON.parse(JSON.stringify(nn.w1)),
        b1: [...nn.b1],
        w2: JSON.parse(JSON.stringify(nn.w2)),
        b2: [...nn.b2]
      };
    }

    if (epoch === 1 || epoch % 20 === 0 || epoch === EPOCHS) {
      console.log(`Epoch ${epoch.toString().padStart(3, ' ')}/${EPOCHS} | Train Loss: ${avgTrainLoss.toFixed(5)} | Val Accuracy: ${valAcc.toFixed(2)}%`);
    }
  }

  console.log(`🎉 MORSE TAP MODEL TRAINING COMPLETE!`);
  console.log(`🏆 Best Validation Accuracy: ${bestValAcc.toFixed(2)}%`);

  // Apply best weights
  nn.w1 = bestWeights.w1;
  nn.b1 = bestWeights.b1;
  nn.w2 = bestWeights.w2;
  nn.b2 = bestWeights.b2;

  // 4. Save weights
  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'morse_model_weights.json');
  const payload = {
    w1: nn.w1,
    b1: nn.b1,
    w2: nn.w2,
    b2: nn.b2,
    maxDuration: MAX_DURATION,
    classes: CLASSES,
    accuracy: bestValAcc.toFixed(2),
    datasetSize: dataset.length,
    trainedAt: new Date().toISOString()
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`💾 Morse weights successfully saved to: ${outFile}`);
}

main();
