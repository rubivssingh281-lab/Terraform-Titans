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

## Cybersecurity & Threat Mitigation Architecture

EcholytiX adheres to OWASP ASVS, OWASP API Security Top 10, and NIST CSF 2.0 defense-in-depth principles:

1. **HTTP Defense-in-Depth & Content Security Policy (CSP)**:
   - Security headers enforced on all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=(self)`.
   - Strict Content Security Policy fine-tuned for client-side assistive AI: permits MediaPipe WASM runtime (`wasm-unsafe-eval`, `unsafe-eval`, `blob:`, Google Storage model weights) while strictly forbidding object embedding (`object-src 'none'`) and unauthorized frame ancestry (`frame-ancestors 'none'`).
   - Strict-Transport-Security (HSTS) with 1-year max age and subdomains enforced under TLS connections.
   - Technology fingerprinting disabled via `app.disable('x-powered-by')`.

2. **Adaptive Sliding-Window Rate Limiting (DoS & Credential-Stuffing Mitigation)**:
   - Tiered in-memory sliding-window limiters with automated memory pruning:
     - Authentication routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password`): 30 req / 15 min per IP.
     - Password recovery OTP route (`/api/auth/forgot-password`): 10 req / 15 min per IP.
     - Emergency distress beacon (`/api/emergency/sos`): 30 req / 1 min per IP.
     - Generative AI completion (`/api/ai/complete`): 60 req / 1 min per IP.
   - Compliant with RFC 6585 with standard `RateLimit-*` and `Retry-After` headers.

3. **Session Hardening & Cryptographic Hashing at Rest**:
   - Bearer session tokens are hashed at rest with SHA-256 (`crypto.createHash('sha256')`). Even in the event of persistent SQLite database disclosure, raw bearer tokens cannot be recovered or hijacked.
   - Automated TTL pruning routines (`purgeExpiredSessions()`, `purgeExpiredPasswordResets()`) run on boot and on 30-minute cycles to eliminate stale tokens and expired recovery OTPs.

4. **Input Sanitization, Bounds Checking & Payload Protection**:
   - Explicit JSON request body size limitation (`64kb`) prevents heap memory exhaustion attacks.
   - Centralized text sanitization neutralizes HTML/script tags and strips dangerous ASCII control characters before persisting user-generated phrases, profiles, or support messages.
   - Geographic coordinates in SOS emergency alerts enforce strict geometric bounds (`-90 <= lat <= 90`, `-180 <= lng <= 180`).

## Frontend Accessibility, Resilience & UX Architecture

EcholytiX adheres to WCAG 2.1 AA accessibility and progressive enhancement standards:

1. **Accessibility & Keyboard Navigation**:
   - **Skip Navigation**: Accessible "Skip to main content" link allows keyboard and screen reader users to bypass top headers directly to `#main-content`.
   - **ARIA Live Regions**: Dedicated `aria-live="polite"` status region announces navigation state, modal interactions, and network changes to screen readers without interrupting audio output.
   - **Hotkeys**: Global keyboard shortcuts (`Alt+1`..`6`, `Alt+D/B/S/M/T/R`, `Alt+E` for SOS, `Esc` to dismiss) accelerate tab switching for motor-impaired users with specialized switch access keyboards.

2. **Network Resilience & Feedback System**:
   - **Offline Detection**: Real-time network listener surfaces an alert banner when offline, reassuring patients that MediaPipe computer vision and speech synthesis operate purely on-device without internet access.
   - **Non-Blocking Toasts**: Accessible toast notification system replaces blocking browser alerts, delivering status feedback on profile saves, connection changes, and rate limits.

3. **Subsystem Error Recovery & High-Contrast Visual Aid**:
   - **Dignified Error Boundary**: Gracefully isolates component crashes, protects authentication state, offers single-click subsystem restart and diagnostic export.
   - **High-Contrast Theme**: Meets WCAG AAA 7:1 contrast ratios for patients with photophobia, cataracts, or low visual acuity, persisted in client storage.
