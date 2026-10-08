# EcholytiX — Machine Learning Guide

A complete, self-contained explanation of every ML piece in this project, **plus a
reusable recipe** so you can train the same kind of models on your own project.

Nothing here needs TensorFlow or PyTorch **at runtime**. The core idea:

> **Train a tiny neural network offline → export the weights as a small JSON file →
> run inference in the browser with a few lines of plain JavaScript.**

That keeps the app dependency-free, fast, and fully offline. The same pattern works
for almost any small classification problem (fixed-size numeric input → one of N labels).

---

## 1. What ML is in this project

| Component | Type | Input → Output | Where |
|---|---|---|---|
| **Blink classifier** | MLP `2 → 8 → 3` | `[leftEAR, rightEAR]` → `OPEN / BLINK / WINK` | `scripts/train_blink_model.ts` → `src/data/blink_model_weights.json` |
| **Morse tap classifier** | MLP `1 → 4 → 2` | `[press duration]` → `DOT / DASH` | `scripts/train_morse_model.ts` → `src/data/morse_model_weights.json` |
| **Gesture classifier (synthetic)** | MLP `63 → 64 → 32 → 16` | 21 hand landmarks → 16 signs | `scripts/generate_and_train.ts` → `src/data/gesture_model_weights.json` |
| **Gesture classifier (real data)** | PyTorch MLP (same shape) | WLASL videos → 16 signs | `scripts/train_wlasl.py` |
| **Phrase completion** | Bigram Markov chain | previous word → next word | `scripts/train_completion_model.ts` → `src/data/completion_model.json` |

Two of the *runtime* recognisers are **not** ML — they are deterministic rules that
turned out to be more reliable than the synthetic-data models (see §7):
- **Sign recognition** now runs a rule-based finger-geometry classifier (`src/utils/gesture.ts`).
- **Blink detection** now runs an adaptive EAR baseline (`src/components/BlinkToText.tsx`).

Understanding *why* is part of the lesson: **a model is only as good as its data.**

---

## 2. The core pattern (read this first)

Every neural model here is a **Multi-Layer Perceptron (MLP)** — the simplest useful
neural network. It is a stack of layers, each doing `output = activation(W·input + b)`.

```
input  ──►  [ Hidden layer(s): W·x + b, then ReLU ]  ──►  [ Output: W·h + b, then softmax ]  ──►  probabilities
```

- **W** (weights) and **b** (biases) are the numbers the network *learns*.
- **ReLU** (`max(0, x)`) adds non-linearity so the network can learn curved boundaries.
- **Softmax** turns the final numbers into probabilities that sum to 1.
- **argmax** of those probabilities = the predicted class.

Training = repeatedly showing examples and nudging W and b to make the right class
more probable (gradient descent + backpropagation).

---

## 3. Anatomy of a model (walk-through of the blink trainer)

`scripts/train_blink_model.ts` is the clearest example. It is ~370 lines of plain
TypeScript with **no ML library**. Here is every stage.

### 3.1 Data
Features are two numbers — the Eye Aspect Ratio (EAR) of each eye. Labels are the
class index (0=OPEN, 1=BLINK, 2=WINK). The data here is **synthetic**: it samples
realistic EAR values from normal distributions (open eyes ≈ 0.28, closed ≈ 0.09),
including edge cases like squints and partial closures.

```ts
// features: [leftEAR, rightEAR], classIdx: 0|1|2
{ features: [genOpen(), genClosed()], classIdx: 2 }  // one eye open, one closed = WINK
```

### 3.2 Architecture & weight init
```
2 inputs → 8 hidden (ReLU) → 3 outputs (softmax)
```
Weights start small and random using **Xavier/Glorot** initialisation, which keeps
signal from blowing up or vanishing:
```ts
const limit = Math.sqrt(6 / (rows + cols));
weight = (Math.random() - 0.5) * 2 * limit;   // uniform in [-limit, +limit]
```

### 3.3 Forward pass (prediction)
```ts
// Hidden layer:  z1 = W1·x + b1 ;  a1 = ReLU(z1)
// Output layer:  z2 = W2·a1 + b2 ;  y_hat = softmax(z2)
```
`softmax(z)[i] = exp(z[i]) / Σ exp(z[j])` (with a max-subtraction trick for numerical
stability).

### 3.4 Loss (how wrong we are)
**Categorical cross-entropy** — punishes low probability on the correct class:
```ts
loss = -log(y_hat[correctClass])
```

### 3.5 Backpropagation (the gradients)
Because softmax + cross-entropy are paired, the output gradient is beautifully simple:
```ts
dZ2 = y_hat - y_onehot                 // output error
dW2[r][c] = dZ2[r] * a1[c]             // how each output weight should change
dB2       = dZ2
dZ1[c]    = (Σ_r W2[r][c] * dZ2[r]) * reluDerivative(z1[c])   // push error back
dW1[r][c] = dZ1[r] * x[c]
dB1       = dZ1
```
`reluDerivative(z) = 1 if z > 0 else 0`.

### 3.6 Weight update (gradient descent + momentum)
Momentum smooths the updates so training is faster and steadier:
```ts
v = beta * v + (1 - beta) * grad        // beta = 0.9
W = W - learningRate * v                // learningRate starts at 0.08
```

### 3.7 Training loop
```
for each epoch (100 total):
    shuffle the training data
    for each sample:  forward → backprop → update
    every 40 & 80 epochs: learningRate *= 0.3   (learning-rate decay)
    evaluate on a 15% validation split
    keep the weights with the best validation accuracy   (early-checkpointing)
```

### 3.8 Export
The best weights are written to JSON:
```json
{ "w1": [[...]], "b1": [...], "w2": [[...]], "b2": [...],
  "classes": ["OPEN","BLINK","WINK"], "accuracy": "99.8", "trainedAt": "..." }
```

### 3.9 Inference in the app
The browser just re-implements the forward pass and reads the JSON — see
`predictBlink()` in `src/components/BlinkToText.tsx` and `predictTap()` in
`src/components/MorseTranslator.tsx`. Same matmul + ReLU + softmax, then `argmax`.

The **gesture** MLP (`63 → 64 → 32 → 16`) is the same recipe with one more hidden
layer and a normalisation step: hand landmarks are shifted so the wrist is the origin
and scaled so the largest distance is 1 (translation + scale invariance).

---

## 4. The bigram phrase-completion model

`scripts/train_completion_model.ts` is a different, even simpler idea — a **Markov
chain**. It counts, across a corpus of phrases, how often each word is followed by
each other word, converts counts to probabilities, and keeps the top 5 next-words per
word.

```
"I need water" , "I need help"  →  need: [ {water, 0.5}, {help, 0.5} ]
```
Exported to `completion_model.json` and used to suggest the next word as the user types.
No neural network — just counting. Great when you have text and want cheap suggestions.

---

## 5. Training on real data with PyTorch (`train_wlasl.py`)

`scripts/train_wlasl.py` is the "grown-up" version of the gesture trainer. It:
1. Reads real sign-language videos (WLASL dataset).
2. Uses **MediaPipe** to extract 21 hand landmarks per frame.
3. Normalises them exactly like the JS app (wrist → origin, max distance → 1).
4. Trains the **same MLP shape** in PyTorch with `CrossEntropyLoss`.
5. Exports weights as JSON **matching the app's schema**, so the browser inference code
   doesn't change at all.

This is the key trick: **you can train with any tool you like (PyTorch, TF, scikit-learn)
as long as you export the weights in the JSON layout the app expects.**

Run it after `pip install opencv-python mediapipe torch numpy` and downloading the
dataset with `scripts/download_wlasl_subset.py`.

---

## 6. How to run the trainers

```bash
# TypeScript trainers (no dataset needed — they generate synthetic data):
npx tsx scripts/train_blink_model.ts
npx tsx scripts/train_morse_model.ts
npx tsx scripts/generate_and_train.ts        # gesture MLP
npx tsx scripts/train_completion_model.ts    # bigram completion

# Python trainer (needs the WLASL dataset + pip installs):
python scripts/train_wlasl.py
```
Each writes/overwrites a JSON file in `src/data/`. Restart the dev server to pick it up.

---

## 7. The most important lesson: data quality beats model cleverness

The gesture MLP reports high accuracy — **on its synthetic training data**. But the
synthetic hands were generated by a kinematic formula, and real MediaPipe landmarks
don't match that distribution, so it generalised poorly to real hands. We replaced it
at runtime with a **rule-based finger-geometry classifier** (`src/utils/gesture.ts`)
that reads which fingers are extended — deterministic and far more reliable.

Likewise, blink detection moved from a **fixed EAR threshold** to an **adaptive
per-person baseline**, because a fixed number fails for people whose eyes are naturally
narrow (it calibrates to *your* open-eye value instead).

**Takeaways for your own project:**
- Prefer **real data** over synthetic whenever you can collect it.
- If a problem has clear rules (finger up/down, a ratio crossing a threshold), a
  **rule-based** solution is often more robust and easier to debug than a model.
- Always test on data the model has **never seen** (a held-out set), and ideally on the
  *real* deployment conditions, not just your training distribution.

---

## 8. Recipe: train an MLP classifier for YOUR project

Any problem that is "**fixed-size list of numbers → one of N categories**" fits this
recipe. Examples: sensor readings → activity, pose keypoints → exercise, spectrogram
frame → sound, mouse-movement features → gesture.

**Step 1 — Define the problem.**
- Decide your **classes** (e.g. `["walk", "run", "sit"]`).
- Decide your **features**: a fixed-length numeric vector (e.g. 6 accelerometer values).

**Step 2 — Get data.** Collect real examples `{ features, classIdx }`, or generate
synthetic ones. Aim for a few hundred to a few thousand per class, balanced across
classes. **Normalise** features to a similar range (e.g. divide by a max, or subtract
mean / divide by std) — models learn much better on scaled inputs.

**Step 3 — Copy a trainer.** Start from `scripts/train_blink_model.ts`. Change only:
- `CLASSES` → your class names.
- The data-generation / data-loading function → your `{ features, classIdx }` list.
- The network dimensions:
  ```ts
  this.w1 = this.initWeights(HIDDEN, INPUT_SIZE);   // e.g. (16, 6)
  this.w2 = this.initWeights(NUM_CLASSES, HIDDEN);  // e.g. (3, 16)
  ```
  (Add a `w3` layer like the gesture model if the task is harder.)

**Step 4 — Train & tune.** Run `npx tsx scripts/your_trainer.ts`. Watch validation
accuracy. If it underfits (low train accuracy) → bigger hidden layer or more epochs.
If it overfits (train ≫ val accuracy) → more data, smaller network, or stop earlier.

**Step 5 — Export & run.** The trainer writes `your_model.json`. In your app, load it
and run the same forward pass:
```ts
import model from './your_model.json';

function relu(x: number) { return Math.max(0, x); }
function softmax(z: number[]) {
  const m = Math.max(...z); const e = z.map(v => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s);
}
function predict(x: number[]) {
  const h = model.w1.map((row, r) => relu(row.reduce((s, w, c) => s + w * x[c], model.b1[r])));
  const o = model.w2.map((row, r) => row.reduce((s, w, c) => s + w * h[c], model.b2[r]));
  const p = softmax(o);
  let best = 0; p.forEach((v, i) => { if (v > p[best]) best = i; });
  return { label: model.classes[best], confidence: p[best], probabilities: p };
}
```

That's the whole loop. Train offline, ship a JSON, predict in ~15 lines.

---

## 9. Glossary

- **Feature** — one input number describing the example (e.g. an EAR value).
- **Label / class** — the correct answer category.
- **One-hot** — a label as a vector, e.g. class 2 of 3 → `[0, 0, 1]`.
- **Weight (W) / bias (b)** — the learned numbers of a layer.
- **Activation** — a non-linear function (ReLU, softmax) applied to a layer's output.
- **Forward pass** — computing the prediction from an input.
- **Loss** — a number measuring how wrong the prediction is (cross-entropy here).
- **Backpropagation** — computing how each weight contributed to the loss (the gradient).
- **Gradient descent** — nudging weights against the gradient to reduce loss.
- **Learning rate** — how big each nudge is.
- **Epoch** — one full pass over the training data.
- **Overfitting** — memorising training data instead of learning the general pattern
  (train accuracy high, validation accuracy low).
- **Validation set** — held-out data used to check real generalisation.
