# Terraform-Titans

Members

1. Saksham Koutsa (CSE) - 2402900100261
2. Saksham Singh (CSE-DS) - 2402901540102
3. Shubh Bhardwaj (CSE-DS) - 2402901540115
4. Samridhi Patel (CSE) - 2402900100265



# EcholytiX — Assistive Communication AI

> *"No voice should go unheard."*

EcholytiX is a browser-based assistive communication platform for patients with limited
speech or mobility. It turns **eye blinks (Morse)**, **hand sign gestures**, and **manual
Morse taps** into spoken text in real time, using in-browser computer vision
(MediaPipe) and lightweight on-device classifiers — with an Express + SQLite backend
for patient profiles, phrase history, and caregiver alerts.

## Features

- **Blink-to-Morse** — real-time eye tracking (EAR + smoothing) that maps blinks/winks to Morse and speaks the result.
- **Sign Language** — MediaPipe hand tracking with a geometric finger-state gesture classifier and a live "which fingers are up" readout.
- **Morse Translator** — manual tap / Bluetooth-switch input with a tap-duration classifier.
- **Text-to-Speech**, **Emergency SOS**, and a **Remote** sender/receiver mode.
- Patient auth, profile calibration, and phrase history persisted in SQLite.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS 4, TypeScript |
| Vision | MediaPipe Tasks Vision (face + hand landmarkers, WASM) |
| Backend | Express 4, SQLite, server-sent events for remote mode |
| Tooling | tsx, esbuild, GitHub Actions CI, Docker |

## Run locally

**Prerequisites:** Node.js **>= 22.5**

```bash
npm install
npm run dev
```

The app serves on **http://localhost:3000** (set `PORT` to change it). Optional: copy
`.env.example` to `.env` and add an `API_KEY` / `GEMINI_API_KEY` to enable AI phrase
completion — the app runs fine without it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (Express API + Vite middleware) |
| `npm run lint` | Type-check the whole project (`tsc --noEmit`) |
| `npm run build` | Build the client and bundle the server to `dist/` |
| `npm start` | Run the production build (`node dist/server.cjs`) |

## Run with Docker

```bash
docker build -t echolytix .
docker run -p 3000:3000 echolytix
```

## Project structure

```
index.html            # entry HTML
src/
  App.tsx main.tsx     # app shell + entry
  index.css            # theme + design tokens (light cream + indigo)
  types.ts data.ts     # shared types + seed data
  components/          # feature modules (Blink, Sign, Morse, TTS, Dashboard, ...)
  utils/               # gesture classifier, morse, sound, remote helpers
  data/                # on-device model weights (JSON)
public/                # MediaPipe models (.task) + WASM runtime
server.ts database.ts  # Express API + SQLite layer
.github/workflows/     # CI pipeline
Dockerfile             # container build
```

## Team & contributing

This is a 4-person team project. Work is split into ownership areas — see
[CONTRIBUTING.md](CONTRIBUTING.md) and `DIVISION_OF_WORK.md` for who owns what and the
branch / pull-request workflow that keeps `main` runnable at all times.
