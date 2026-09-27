# EcholytiX — Project Architecture

Full-stack assistive-communication web app. Single Node process (`server.ts`) serves the
Express API **and** the React client (Vite middleware in dev, static `dist/` in prod).
Computer vision runs entirely in the browser via MediaPipe (WASM + `.task` models).

## High-level layers

```
Browser (React 19 + Vite + Tailwind)
  ├─ Feature modules: Blink · Sign · Morse · TTS · Remote · Dashboard
  ├─ In-browser vision: MediaPipe face/hand landmarkers (public/wasm + public/models)
  └─ On-device classifiers: utils/gesture.ts + src/data/*.json weights
        │  fetch  /api/*
        ▼
Node server (server.ts, Express)
  ├─ Auth, phrases, settings, SOS, remote-session (SSE) routes
  └─ database.ts  →  SQLite (echolytix.db)
```

## Directory tree

```
Miniproject-main/
├── .github/workflows/ci.yml      # CI: install → type-check → build
├── .claude/launch.json           # local dev launch config
├── public/
│   ├── models/                   # MediaPipe .task models (face, hand)
│   │   ├── face_landmarker.task
│   │   └── hand_landmarker.task
│   └── wasm/                      # MediaPipe WASM runtime (SIMD + non-SIMD)
│       ├── vision_bundle.mjs
│       ├── vision_wasm_internal.js / .wasm
│       └── vision_wasm_nosimd_internal.js / .wasm
├── scripts/
│   ├── generate-redirects.js     # writes dist/_redirects for SPA hosting
│   ├── generate_and_train.ts     # synthetic gesture-data trainer
│   ├── train_blink_model.ts      # blink classifier trainer
│   ├── train_morse_model.ts      # tap-duration classifier trainer
│   ├── train_completion_model.ts # phrase-completion trainer
│   ├── train_wlasl.py            # sign-language dataset trainer
│   └── download_msasl_subset.py / download_wlasl_subset.py
├── src/
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # app shell: auth gate + tab routing
│   ├── index.css                 # theme + design tokens (light cream + indigo)
│   ├── types.ts                  # shared TS types
│   ├── data.ts                   # seed data / static content
│   ├── vite-env.d.ts             # Vite client type shim
│   ├── components/               # feature + UI modules
│   │   ├── AuthPortal.tsx        # login / register / reset
│   │   ├── Header.tsx            # top app bar + tabs
│   │   ├── BottomNavBar.tsx      # mobile bottom nav
│   │   ├── Dashboard.tsx         # profile, calibration, history
│   │   ├── BlinkToText.tsx       # eye-blink → Morse → text
│   │   ├── SignLanguage.tsx      # hand-gesture recognition
│   │   ├── MorseTranslator.tsx   # manual/tap Morse
│   │   ├── TextToSpeech.tsx      # phrase board + speech
│   │   ├── RemoteReceiver.tsx    # remote-session receiver
│   │   ├── RemoteSender.tsx      # remote-session sender (phone)
│   │   ├── SosModal.tsx          # emergency SOS
│   │   └── ErrorBoundary.tsx     # crash fallback
│   ├── utils/
│   │   ├── gesture.ts            # rule-based finger-geometry classifier
│   │   ├── morse.ts              # Morse code map + decode
│   │   ├── sound.ts              # beeps + speech synthesis
│   │   └── remote.ts             # remote-event helper
│   └── data/                     # on-device model weights (JSON)
│       ├── blink_model_weights.json
│       ├── morse_model_weights.json
│       ├── gesture_model_weights.json
│       ├── gesture_model_weights_simulated.json
│       └── completion_model.json
├── server.ts                     # Express API (auth, phrases, SOS, remote SSE, AI)
├── database.ts                   # SQLite schema + queries
├── index.html                    # HTML entry (fonts, root div)
├── vite.config.ts                # Vite + React + Tailwind config
├── tsconfig.json                 # TypeScript config
├── package.json / package-lock.json
├── Dockerfile / .dockerignore    # container build
├── netlify.toml / render.yaml    # deploy configs
├── .env.example                  # env template (API_KEY, etc.)
├── README.md                     # overview + run instructions
├── CONTRIBUTING.md               # team branch/PR workflow
├── DIVISION_OF_WORK.md           # part → member ownership map
└── metadata.json
```

### Not committed (generated / local, via .gitignore)
```
node_modules/          # installed dependencies
dist/                  # build output (client assets + server.cjs)
echolytix.db*          # local SQLite database + WAL/SHM
.env                   # real secrets
```

## Request/run flow
- **Dev:** `npm run dev` → `tsx server.ts` starts Express + Vite middleware on `:3000`.
- **Prod:** `npm run build` → Vite builds client to `dist/`, esbuild bundles `server.ts`
  → `dist/server.cjs`; `npm start` serves it.
- **Client → API:** components `fetch('/api/...')`; the same server answers.
- **Vision:** components lazy-load MediaPipe from `public/wasm`, run landmarkers on the
  webcam, and classify locally — no video leaves the browser.
```
