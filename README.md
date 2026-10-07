# Terraform-Titans

Members

1. Saksham Koutsa (CSE) - 2402900100261
2. Saksham Singh (CSE-DS) - 2402901540102
3. Shubh Bhardwaj (CSE-DS) - 2402901540115
4. Samridhi Patel (CSE) - 2402900100265



<div align="center">
  <h1>EcholytiX</h1>
  <p><strong>Assistive Communication AI</strong></p>
  <p><em>"No voice should go unheard."</em></p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" />
    <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" />
    <img alt="Vite" src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" />
    <img alt="Express.js" src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB" />
    <img alt="SQLite" src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white" />
  </p>
</div>

---

## Comprehensive Overview

**EcholytiX** is a secure, browser-based assistive communication platform designed to restore a voice to individuals with severe speech or mobility impairments. By executing high-performance computer vision algorithms entirely in the browser, EcholytiX translates minimal physical inputs—such as eye blinks, hand gestures, and physical taps—into audible, spoken language in real time. 

Built with a commitment to **privacy and performance**, all visual processing is done via WebAssembly (WASM) locally on the client's device, ensuring that no camera feeds or images are ever transmitted to a remote server. The robust Express and SQLite backend solely manages user authentication, persistent personalization profiles, phrase history tracking, and remote caregiver alert routing.

---

## In-Depth Features

### Blink-to-Morse Engine
- **Core Technology**: Leverages MediaPipe Face Landmarker models to calculate Eye Aspect Ratio (EAR) at high frame rates. 
- **Operation**: Translates intentional, prolonged eye blinks into Morse code (Dots and Dashes). Includes built-in smoothing algorithms to ignore natural, involuntary blinking. Once a word is formed, it is instantly passed through the Text-to-Speech (TTS) synthesizer.

### Sign Language & Gesture Recognition
- **Core Technology**: Combines MediaPipe Hand Landmarker with a custom, rules-based geometric finger-state classifier.
- **Operation**: Analyzes 3D hand coordinates in real-time to determine explicit finger states ("which fingers are up"). These states are mapped against local lightweight JSON model weights to produce live sign language transcription.

### Manual Morse Translator
- **Core Technology**: Tap-duration heuristic classifier.
- **Operation**: Allows patients with limited motor control to use physical inputs, such as spacebars or external Bluetooth switches, mapping short and long physical presses to spoken words.

### Remote Mode & Emergency SOS
- **Core Technology**: Server-Sent Events (SSE) via Express.
- **Operation**: A built-in SOS system that triggers loud alarms and logs emergency events. The **Remote Mode** establishes an asymmetric communication bridge, allowing patients to type on a localized screen while caregivers receive messages remotely in real time on a mobile interface.

### Profile State & History Management
- **Core Technology**: RESTful API on Express 4 + SQLite.
- **Operation**: Maintains localized user accounts. Saves personalized calibration limits for blink sensitivity, logs past phrases for quicker communication, and stores application preferences safely.

---

## System Architecture & Technology Stack

EcholytiX utilizes a unified full-stack architecture running under a single Node process (`server.ts`). During development, Vite middleware seamlessly serves the React client; in production, an optimized static build is served by Express.

| Layer | Technologies | Responsibilities |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, Tailwind CSS 4, Vite 6 | State management, responsive UI, routing, and real-time visual feedback modules (Blink, Sign, Morse). |
| **Vision & AI** | MediaPipe Tasks Vision, WebAssembly (WASM) | Face and Hand landmark detection executed fully on-device. Eliminates latency and preserves privacy. |
| **Backend API** | Express 4, Node.js | Serves REST endpoints for authentication, handles Server-Sent Events (SSE) for remote sessions. |
| **Database** | SQLite3 | Persists `echolytix.db` with user profiles, authentication tokens, and phrase history. |
| **DevOps** | Docker, GitHub Actions, tsx | CI/CD pipelines, containerization for deployment, and robust build systems. |

---

## Installation & Local Setup

### System Prerequisites
- **Node.js**: Version `>= 22.5`
- **npm**: Version `>= 10.0`

### 1. Repository Setup

Clone the repository and install all required full-stack dependencies:
```bash
git clone https://github.com/your-org/EcholytiX.git
cd EcholytiX
npm install
```

### 2. Environment Configuration (Optional)
The application works fully out-of-the-box. However, you can enable AI-assisted phrase completion by copying the environment template:
```bash
cp .env.example .env
```
Inside `.env`, populate `API_KEY` or `GEMINI_API_KEY` with your credentials.

### 3. Running the Server

Start the integrated development server (Express API + Vite frontend):
```bash
npm run dev
```
> EcholytiX will be accessible at **http://localhost:3000**. The port can be adjusted by defining `PORT` in your `.env` file.

---

## Available Scripts

| Script Command | Detailed Action |
| :--- | :--- |
| `npm run dev` | Initializes `tsx server.ts`, wrapping Vite middleware inside Express for rapid, hot-reloading development on port 3000. |
| `npm run lint` | Executes strict TypeScript type-checking across the entire codebase (`tsc --noEmit`). |
| `npm run build` | Initiates a production sequence: Vite compiles React into `dist/`, and esbuild bundles the Node server to `dist/server.cjs`. |
| `npm start` | Executes the compiled production artifact (`node dist/server.cjs`). Intended for live hosting environments. |

---

## Docker Containerization

Deploying EcholytiX is streamlined using Docker. The included `Dockerfile` builds both the client and server into a slim image.

```bash
# Compile the unified EcholytiX Docker image
docker build -t echolytix .

# Boot the container on port 3000
docker run -p 3000:3000 echolytix
```

---

## Detailed Project Structure

```text
Miniproject-main/
├── .github/workflows/    # CI Pipeline (Type-checking and build verification)
├── public/               
│   ├── models/           # Pre-compiled MediaPipe .task models (face_landmarker, hand_landmarker)
│   └── wasm/             # MediaPipe WASM runtime binaries (SIMD + non-SIMD)
├── scripts/              # Independent tooling for ML model training and synthetic data generation
├── src/                  
│   ├── components/       # Core UI modules: AuthPortal, Dashboard, BlinkToText, RemoteSender, etc.
│   ├── utils/            # Core logic: gesture.ts (geometric rules), morse.ts (decoding), sound.ts
│   ├── data/             # Lightweight JSON weights for on-device ML classifiers
│   ├── App.tsx           # React Application Shell handling auth gating and tab routing
│   └── index.css         # Global theming and Tailwind design tokens
├── database.ts           # SQLite3 connection, schema definition, and query wrappers
├── server.ts             # Express application initialization and API route definitions
└── Dockerfile            # Containerization instructions
```

---

## Team, Contribution & Workflow

This project is the collaborative effort of a 4-person engineering team. To ensure rapid iteration without breaking the `main` branch, work is systematically divided into distinct ownership domains.

### Guidelines for Developers
- Code ownership and specific team responsibilities are mapped in `DIVISION_OF_WORK.md`.
- Pull request protocols, branch naming conventions, and review requirements are strictly outlined in [CONTRIBUTING.md](CONTRIBUTING.md).
- **All PRs must pass the GitHub Actions CI pipeline** (`npm run lint` && `npm run build`) before merging to ensure `main` is always a runnable release candidate.

---
<div align="center">
  <em>Designed and engineered with ❤️ by Terraform-Titans</em>
</div>
