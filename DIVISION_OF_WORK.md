# Division of Work

20 parts across 4 members (5 parts each). Fill in real names/GitHub usernames below.

## Member 1 — Frontend Core, Theme & Navigation  (`@_________`)
| Part | Files |
|---|---|
| P1 Repo scaffold & build config | `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `metadata.json`, `src/vite-env.d.ts` |
| P2 App shell & entry | `src/App.tsx`, `src/main.tsx` |
| P3 Global theme & design tokens | `src/index.css` |
| P4 Shared types & seed data | `src/types.ts`, `src/data.ts` |
| P16 Navigation | `src/components/Header.tsx`, `src/components/BottomNavBar.tsx` |

## Member 2 — Blink, Morse & Speech  (`@_________`)
| Part | Files |
|---|---|
| P5 Blink-to-Morse module | `src/components/BlinkToText.tsx` |
| P6 Morse translator module | `src/components/MorseTranslator.tsx` |
| P7 Morse & audio utils | `src/utils/morse.ts`, `src/utils/sound.ts` |
| P8 Blink/Morse model weights + trainers | `src/data/blink_model_weights.json`, `src/data/morse_model_weights.json`, `src/data/completion_model.json`, `scripts/train_blink_model.ts`, `scripts/train_morse_model.ts`, `scripts/train_completion_model.ts` |
| P19 TTS / SOS / ErrorBoundary | `src/components/TextToSpeech.tsx`, `src/components/SosModal.tsx`, `src/components/ErrorBoundary.tsx` |

## Member 3 — Sign Language, Gesture AI & Dashboard  (`@_________`)
| Part | Files |
|---|---|
| P9 Sign language module | `src/components/SignLanguage.tsx` |
| P10 Gesture classifier engine | `src/utils/gesture.ts` |
| P11 Gesture model + MediaPipe assets + trainers | `src/data/gesture_model_weights.json`, `src/data/gesture_model_weights_simulated.json`, `public/models/`, `public/wasm/`, `scripts/generate_and_train.ts`, `scripts/train_wlasl.py`, `scripts/download_msasl_subset.py`, `scripts/download_wlasl_subset.py` |
| P17 Dashboard | `src/components/Dashboard.tsx` |
| P18 Auth portal | `src/components/AuthPortal.tsx` |

## Member 4 — Backend, Realtime & DevOps  (`@_________`)
| Part | Files |
|---|---|
| P12 Express API server | `server.ts` |
| P13 SQLite database layer | `database.ts` |
| P14 Remote-session feature | `src/components/RemoteReceiver.tsx`, `src/components/RemoteSender.tsx`, `src/utils/remote.ts` |
| P15 Deployment config | `netlify.toml`, `render.yaml`, `scripts/generate-redirects.js`, `.env.example` |
| P20 DevOps pipeline | `.github/workflows/ci.yml`, `Dockerfile`, `.dockerignore`, `README.md`, `CONTRIBUTING.md` |

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch/PR workflow and merge order.
