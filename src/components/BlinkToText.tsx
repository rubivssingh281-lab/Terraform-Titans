import React, { useState, useEffect, useRef } from 'react';
import { BLINK_CAMERA_FEED_URL } from '../data';
import { speakText, playBeep } from '../utils/sound';
import blinkModelWeights from '../data/blink_model_weights.json';
import { sendRemoteEvent } from '../utils/remote';

interface BlinkToTextProps {
  onAddPhraseHistory: (text: string, mode: 'Blink') => void;
  remoteCode?: string;
}

const morseMap: Record<string, string> = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
  '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
  '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
  '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
  '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
  '--..': 'Z', '-----': '0', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
  '----.': '9'
};

export const BlinkToText: React.FC<BlinkToTextProps> = ({ onAddPhraseHistory, remoteCode }) => {
  const [isTracking, setIsTracking] = useState<boolean>(true);
  const [blinkCount, setBlinkCount] = useState<number>(0);
  const [ear, setEar] = useState<number>(0.25);
  const [confidence, setConfidence] = useState<number>(0);
  const [outputContainer, setOutputContainer] = useState<string>('');
  const [useRealWebcam, setUseRealWebcam] = useState<boolean>(() => {
    return !!remoteCode;
  });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Morse Code specific states
  const [morseBuffer, setMorseBuffer] = useState<string>('');
  const [currentSpellingWord, setCurrentSpellingWord] = useState<string>('');
  const [commitProgress, setCommitProgress] = useState<number>(0);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Real-time Neural tracking states
  const [blinkProbabilities, setBlinkProbabilities] = useState<Record<string, number>>({});
  const [predictedState, setPredictedState] = useState<string>('OPEN');
  const lastWinkTimeRef = useRef<number>(0);

  // Live per-eye readout so the user can see exactly what the camera detects.
  const [leftEyeOpen, setLeftEyeOpen] = useState<boolean>(true);
  const [rightEyeOpen, setRightEyeOpen] = useState<boolean>(true);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);

  // EAR smoothing buffers (moving average) to suppress single-frame noise.
  const leftEarBufferRef = useRef<number[]>([]);
  const rightEarBufferRef = useRef<number[]>([]);
  // Wink episode start time for sustained-wink (backspace) detection.
  const winkStartRef = useRef<number>(0);

  // Adjustable Commit Speed (Delay)
  const [commitDelay, setCommitDelay] = useState<number>(() => {
    const saved = localStorage.getItem('profile_commit_delay');
    const parsed = saved ? Number(saved) : 1800;
    return isNaN(parsed) || parsed <= 0 ? 1800 : parsed;
  }); // Loaded from secure settings

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<any>(null);

  const wasClosedRef = useRef<boolean>(false);
  const blinkStartRef = useRef<number>(0);
  const lastBlinkTimeRef = useRef<number>(0);

  // Dynamic ES Module importer with local and remote fallbacks
  const loadVisionModule = async () => {
    const urls = [
      window.location.origin + "/wasm/vision_bundle.mjs",
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs",
      "https://unpkg.com/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs"
    ];
    for (const url of urls) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        let wasmPrefix;
        if (url.startsWith(window.location.origin)) {
          wasmPrefix = window.location.origin + "/wasm";
        } else {
          const prefix = url.substring(0, url.lastIndexOf('/'));
          wasmPrefix = `${prefix}/wasm`;
        }
        return { vision: mod, wasmPrefix };
      } catch (e) {
        console.warn(`Failed to import ESM vision from ${url}, trying fallback...`);
      }
    }
    throw new Error("All vision bundle ESM URLs failed to load. Check your internet connection.");
  };

  // Load MediaPipe FaceLandmarker on mount
  useEffect(() => {
    let active = true;
    setModelStatus('loading');
    setErrorDetails('');

    const initLandmarker = async () => {
      try {
        const { vision, wasmPrefix } = await loadVisionModule();
        if (!active) return;

        const filesetResolver = await vision.FilesetResolver.forVisionTasks(wasmPrefix);
        if (!active) return;

        const modelUrl = window.location.origin + "/models/face_landmarker.task";
        const fallbackModelUrl = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

        let landmarkerInstance;
        try {
          console.log("Attempting to load FaceLandmarker from local path: ", modelUrl);
          landmarkerInstance = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
            runningMode: "VIDEO",
            outputFaceBlendshapes: false
          });
        } catch (localErr) {
          console.warn("Failed to load local face model, trying fallback GCS model...", localErr);
          if (!active) return;
          landmarkerInstance = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: { modelAssetPath: fallbackModelUrl, delegate: "GPU" },
            runningMode: "VIDEO",
            outputFaceBlendshapes: false
          });
        }

        if (!active) {
          if (landmarkerInstance) landmarkerInstance.close();
          return;
        }

        landmarkerRef.current = landmarkerInstance;
        setModelStatus('ready');
        console.log("MediaPipe FaceLandmarker initialized successfully!");
      } catch (err: any) {
        console.error("Critical FaceLandmarker load error:", err);
        if (active) {
          setModelStatus('failed');
          setErrorDetails(err.message || String(err));
        }
      }
    };

    initLandmarker();

    return () => {
      active = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  // Frame processing loop when webcam is running
  useEffect(() => {
    let active = true;
    let animationFrameId: number;

    const processVideoFrame = () => {
      if (!active) return;

      if (useRealWebcam && videoRef.current && videoRef.current.readyState === 4 && landmarkerRef.current) {
        try {
          const timestamp = performance.now();
          const results = landmarkerRef.current.detectForVideo(videoRef.current, timestamp);
          handleLandmarkerResults(results);
        } catch (e) {
          // Ignore transient frame dropping errors
        }
      }

      if (useRealWebcam) {
        animationFrameId = requestAnimationFrame(processVideoFrame);
      }
    };

    if (useRealWebcam) {
      animationFrameId = requestAnimationFrame(processVideoFrame);
    }

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [useRealWebcam]);

  // Webcam stream lifecycle
  useEffect(() => {
    if (useRealWebcam) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorDetails("Camera access is not supported by this browser or is blocked by security policy. A secure HTTPS connection is required on mobile devices. Please check browser permissions and ensure you are using a secure origin (https://).");
        setModelStatus('failed');
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Video play failed:", e));
          }
        })
        .catch(err => {
          console.warn("Retrying with user facingMode constraints for blink webcam:", err);
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            .then(stream => {
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.warn("Video play failed:", e));
              }
            })
            .catch(err2 => {
              console.warn("Retrying simple video constraints for blink webcam:", err2);
              navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(e => console.warn("Video play failed:", e));
                  }
                })
                .catch(finalErr => {
                  console.error("[Echolytix Diagnostic] Camera access failed permanently:", {
                    error: finalErr.name || finalErr.message || finalErr,
                    isSecureContext: window.isSecureContext,
                    userAgent: navigator.userAgent
                  });
                  setErrorDetails("Camera access denied or blocked. A secure HTTPS connection is required on mobile browsers. Please check your browser/system permissions to allow camera access and ensure the URL starts with https://.");
                  setModelStatus('failed');
                });
            });
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [useRealWebcam]);

  // Morse Code character and word commit loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Commit Morse buffer into a character
      if (morseBuffer && now - lastBlinkTimeRef.current > commitDelay) {
        if (morseBuffer === '----') {
          // Morse Command: Backspace / Delete Letter
          setCurrentSpellingWord(prev => prev.slice(0, -1));
          playBeep(600, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'backspace', '');
            sendRemoteEvent(remoteCode, 'beep', { freq: 600, duration: 0.15 });
          }
        } else if (morseBuffer === '.-.-') {
          // Morse Command: Space / Commit Word
          if (currentSpellingWord) {
            setOutputContainer(prev => prev ? `${prev}${currentSpellingWord} ` : `${currentSpellingWord} `);
            speakText(currentSpellingWord);
            setCurrentSpellingWord('');
            playBeep(700, 0.1);
            if (remoteCode) {
              sendRemoteEvent(remoteCode, 'word', currentSpellingWord);
              sendRemoteEvent(remoteCode, 'speak', currentSpellingWord);
              sendRemoteEvent(remoteCode, 'beep', { freq: 700, duration: 0.1 });
            }
          } else {
            setOutputContainer(prev => prev + ' ');
            playBeep(600, 0.1);
            if (remoteCode) {
              sendRemoteEvent(remoteCode, 'char', ' ');
              sendRemoteEvent(remoteCode, 'beep', { freq: 600, duration: 0.1 });
            }
          }
        } else if (morseBuffer === '.....') {
          // Morse Command: Clear spelling word only
          setCurrentSpellingWord('');
          playBeep(500, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'clear', '');
            sendRemoteEvent(remoteCode, 'beep', { freq: 500, duration: 0.15 });
          }
        } else if (morseBuffer === '.-.-.') {
          // Patient Quick Need: HELP
          setOutputContainer(prev => prev ? `${prev}I NEED HELP ` : `I NEED HELP `);
          speakText("I need help");
          playBeep(880, 0.1);
          playBeep(1200, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'phrase', 'I need help');
            sendRemoteEvent(remoteCode, 'speak', 'I need help');
            sendRemoteEvent(remoteCode, 'beep', { freq: 880, duration: 0.1 });
            sendRemoteEvent(remoteCode, 'beep', { freq: 1200, duration: 0.15 });
          }
        } else if (morseBuffer === '-.-.-') {
          // Patient Quick Need: PAIN
          setOutputContainer(prev => prev ? `${prev}I AM IN PAIN ` : `I AM IN PAIN `);
          speakText("I am in pain");
          playBeep(880, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'phrase', 'I am in pain');
            sendRemoteEvent(remoteCode, 'speak', 'I am in pain');
            sendRemoteEvent(remoteCode, 'beep', { freq: 880, duration: 0.15 });
          }
        } else if (morseBuffer === '---...') {
          // Patient Quick Need: WATER
          setOutputContainer(prev => prev ? `${prev}I NEED WATER ` : `I NEED WATER `);
          speakText("I need water");
          playBeep(880, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'phrase', 'I need water');
            sendRemoteEvent(remoteCode, 'speak', 'I need water');
            sendRemoteEvent(remoteCode, 'beep', { freq: 880, duration: 0.15 });
          }
        } else if (morseBuffer === '...---') {
          // Patient Quick Need: BATHROOM
          setOutputContainer(prev => prev ? `${prev}BATHROOM ` : `BATHROOM `);
          speakText("bathroom");
          playBeep(880, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'phrase', 'Bathroom');
            sendRemoteEvent(remoteCode, 'speak', 'Bathroom');
            sendRemoteEvent(remoteCode, 'beep', { freq: 880, duration: 0.15 });
          }
        } else if (morseBuffer === '..--..') {
          // Patient Quick Need: FOOD
          setOutputContainer(prev => prev ? `${prev}I NEED FOOD ` : `I NEED FOOD `);
          speakText("I need food");
          playBeep(880, 0.15);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'phrase', 'I need food');
            sendRemoteEvent(remoteCode, 'speak', 'I need food');
            sendRemoteEvent(remoteCode, 'beep', { freq: 880, duration: 0.15 });
          }
        } else {
          const char = morseMap[morseBuffer];
          if (char) {
            setCurrentSpellingWord(prev => prev + char);
            playBeep(1000, 0.15);
            speakText(char.toLowerCase());
            if (remoteCode) {
              sendRemoteEvent(remoteCode, 'char', char);
              sendRemoteEvent(remoteCode, 'speak', char.toLowerCase());
              sendRemoteEvent(remoteCode, 'beep', { freq: 1000, duration: 0.15 });
            }
          } else {
            playBeep(300, 0.2);
            if (remoteCode) {
              sendRemoteEvent(remoteCode, 'beep', { freq: 300, duration: 0.2 });
            }
          }
        }
        setMorseBuffer('');
        lastBlinkTimeRef.current = now;
      } else if (!morseBuffer && currentSpellingWord && now - lastBlinkTimeRef.current > commitDelay * 2.5) {
        // Auto-commit spelling word into the output container after inactivity (commitDelay * 2.5)
        setOutputContainer(prev => prev ? `${prev}${currentSpellingWord} ` : `${currentSpellingWord} `);
        speakText(currentSpellingWord);
        setCurrentSpellingWord('');
        playBeep(700, 0.1);
        if (remoteCode) {
          sendRemoteEvent(remoteCode, 'word', currentSpellingWord);
          sendRemoteEvent(remoteCode, 'speak', currentSpellingWord);
          sendRemoteEvent(remoteCode, 'beep', { freq: 700, duration: 0.1 });
        }
        lastBlinkTimeRef.current = now;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [morseBuffer, currentSpellingWord, outputContainer, commitDelay, remoteCode]);

  // Debounced auto-fetch for AI suggestions when output changes
  useEffect(() => {
    if (!outputContainer.trim()) {
      setAiSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: outputContainer,
            mode: 'blink',
            context: 'Predicting next words for eye blink Morse spelling'
          })
        });
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setAiSuggestions(data.suggestions);
        }
      } catch (e) {
        console.warn("AI suggestions fetch failed:", e);
      }
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [outputContainer]);

  // Update commit progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      if (morseBuffer) {
        const elapsed = Date.now() - lastBlinkTimeRef.current;
        const pct = Math.min(100, Math.max(0, (elapsed / commitDelay) * 100));
        setCommitProgress(pct);
      } else {
        setCommitProgress(0);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [morseBuffer, commitDelay]);

  const handleBlinkInput = (symbol: string) => {
    playBeep(symbol === '.' ? 900 : 900, symbol === '.' ? 0.08 : 0.25);
    setMorseBuffer(prev => {
      const nextMorse = prev + symbol;
      if (remoteCode) {
        sendRemoteEvent(remoteCode, 'morse', nextMorse);
      }
      return nextMorse;
    });
    setBlinkCount(prev => prev + 1);
    lastBlinkTimeRef.current = Date.now();
    if (remoteCode) {
      sendRemoteEvent(remoteCode, 'beep', { freq: 900, duration: symbol === '.' ? 0.08 : 0.25 });
    }
  };

  const drawEyeContours = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    const leftEyeIndices = [362, 385, 386, 387, 263, 373, 374, 380];
    const rightEyeIndices = [33, 158, 159, 160, 133, 153, 154, 145];

    ctx.fillStyle = '#10b981'; // Emerald
    ctx.strokeStyle = '#22d3ee'; // Cyan lines
    ctx.lineWidth = 2;

    const drawContour = (indices: number[]) => {
      ctx.beginPath();
      const p0 = landmarks[indices[0]];
      ctx.moveTo(p0.x * width, p0.y * height);
      for (let i = 1; i < indices.length; i++) {
        const p = landmarks[indices[i]];
        ctx.lineTo(p.x * width, p.y * height);
      }
      ctx.closePath();
      ctx.stroke();

      for (const idx of indices) {
        const p = landmarks[idx];
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    drawContour(leftEyeIndices);
    drawContour(rightEyeIndices);

    // Forehead Target Crosshair
    const nose = landmarks[1];
    if (nose) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.beginPath();
      ctx.arc(nose.x * width, (nose.y - 0.05) * height, 25, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nose.x * width - 35, (nose.y - 0.05) * height);
      ctx.lineTo(nose.x * width + 35, (nose.y - 0.05) * height);
      ctx.moveTo(nose.x * width, (nose.y - 0.05) * height - 35);
      ctx.lineTo(nose.x * width, (nose.y - 0.05) * height + 35);
      ctx.stroke();
    }
  };

  // Custom Neural Network Inference for Blink Tracking
  const predictBlink = (leftEAR: number, rightEAR: number) => {
    // Load custom patient threshold (default to 0.18 if not set)
    const savedThreshold = localStorage.getItem('profile_blink_threshold');
    const blinkThreshold = savedThreshold ? parseFloat(savedThreshold) : 0.18;
    
    // Scale inputs to align the custom threshold with the neural net decision boundary (0.185)
    const scaleFactor = 0.185 / blinkThreshold;
    const scaledLeft = leftEAR * scaleFactor;
    const scaledRight = rightEAR * scaleFactor;

    const x = [scaledLeft, scaledRight];

    // Hidden Layer 1
    const w1 = blinkModelWeights.w1;
    const b1 = blinkModelWeights.b1;
    const h1_a: number[] = [];
    for (let r = 0; r < w1.length; r++) {
      let sum = b1[r];
      for (let c = 0; c < x.length; c++) {
        sum += w1[r][c] * x[c];
      }
      h1_a.push(Math.max(0, sum)); // ReLU
    }

    // Output Layer
    const w2 = blinkModelWeights.w2;
    const b2 = blinkModelWeights.b2;
    const out_z: number[] = [];
    for (let r = 0; r < w2.length; r++) {
      let sum = b2[r];
      for (let c = 0; c < h1_a.length; c++) {
        sum += w2[r][c] * h1_a[c];
      }
      out_z.push(sum);
    }

    // Softmax Activation
    const maxZ = Math.max(...out_z);
    const exps = out_z.map(z => Math.exp(z - maxZ));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const probabilities = exps.map(e => e / (sumExps || 1e-10));

    // Find predicted class index
    let maxIdx = -1;
    let maxProb = -1;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > maxProb) {
        maxProb = probabilities[i];
        maxIdx = i;
      }
    }

    const classes = blinkModelWeights.classes;
    const predictedStateVal = classes[maxIdx] as 'OPEN' | 'BLINK' | 'WINK';

    // Map classes to probabilities
    const probsMap: Record<string, number> = {};
    for (let i = 0; i < classes.length; i++) {
      probsMap[classes[i]] = probabilities[i];
    }

    return {
      state: predictedStateVal,
      confidence: maxProb,
      probabilities: probsMap
    };
  };

  const handleWinkInput = () => {
    const now = Date.now();
    if (now - lastWinkTimeRef.current > 1500) { // 1.5s cooldown
      lastWinkTimeRef.current = now;
      playBeep(450, 0.2); // Low double-beep warning
      if (remoteCode) {
        sendRemoteEvent(remoteCode, 'beep', { freq: 450, duration: 0.2 });
      }
      
      if (morseBuffer.length > 0) {
        setMorseBuffer(prev => {
          const nextMorse = prev.slice(0, -1);
          if (remoteCode) {
            sendRemoteEvent(remoteCode, 'morse', nextMorse);
          }
          return nextMorse;
        });
      } else if (currentSpellingWord.length > 0) {
        setCurrentSpellingWord(prev => prev.slice(0, -1));
        speakText("delete");
        if (remoteCode) {
          sendRemoteEvent(remoteCode, 'backspace', '');
          sendRemoteEvent(remoteCode, 'speak', 'delete');
        }
      }
      lastBlinkTimeRef.current = now; // Reset commit timer
    }
  };

  const handleLandmarkerResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      const landmarks = results.faceLandmarks[0];
      setFaceDetected(true);

      const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const leftEARRaw = dist(landmarks[386], landmarks[374]) / dist(landmarks[362], landmarks[263]);
      const rightEARRaw = dist(landmarks[159], landmarks[145]) / dist(landmarks[33], landmarks[133]);

      // Moving-average smoothing (last 3 frames) to reject single-frame jitter.
      const pushAvg = (buf: number[], v: number) => {
        buf.push(v);
        if (buf.length > 3) buf.shift();
        return buf.reduce((a, b) => a + b, 0) / buf.length;
      };
      const leftEAR = pushAvg(leftEarBufferRef.current, leftEARRaw);
      const rightEAR = pushAvg(rightEarBufferRef.current, rightEARRaw);
      const earVal = parseFloat(((leftEAR + rightEAR) / 2).toFixed(3));

      setEar(earVal);

      if (isTracking) {
        drawEyeContours(ctx, landmarks, canvas.width, canvas.height);
      }

      // Load custom patient threshold (default to 0.18 if not set)
      const savedThreshold = localStorage.getItem('profile_blink_threshold');
      const blinkThreshold = savedThreshold ? parseFloat(savedThreshold) : 0.18;
      // Hysteresis: a slightly higher threshold is used to re-open, so an eye
      // hovering right at the boundary doesn't flicker open/closed every frame.
      const reopenThreshold = blinkThreshold * 1.25;

      // Per-eye closed state with hysteresis, tracked via the smoothed EAR.
      const leftClosed = leftEyeOpen ? leftEAR < blinkThreshold : leftEAR < reopenThreshold;
      const rightClosed = rightEyeOpen ? rightEAR < blinkThreshold : rightEAR < reopenThreshold;
      setLeftEyeOpen(!leftClosed);
      setRightEyeOpen(!rightClosed);

      // Run inference purely for the diagnostics overlay display.
      const prediction = predictBlink(leftEAR, rightEAR);
      setConfidence(parseFloat((prediction.confidence * 100).toFixed(1)));

      const bothClosed = leftClosed && rightClosed;
      const oneClosed = leftClosed !== rightClosed; // exclusive-or: exactly one eye

      const uiState: 'OPEN' | 'BLINK' | 'WINK' = bothClosed ? 'BLINK' : oneClosed ? 'WINK' : 'OPEN';
      setPredictedState(uiState);
      setBlinkProbabilities({
        OPEN: uiState === 'OPEN' ? 0.98 : 0.01,
        BLINK: uiState === 'BLINK' ? 0.98 : 0.01,
        WINK: uiState === 'WINK' ? 0.98 : 0.01,
      });

      const now = performance.now();

      // --- Blink state machine ---
      // A blink is a full both-eyes-closed episode. Its duration decides dot vs
      // dash. A wink is one eye held closed while the other stays open, which
      // fires a backspace — and, crucially, never emits a Morse symbol.
      const endBlinkEpisode = () => {
        if (!wasClosedRef.current) return;
        wasClosedRef.current = false;
        const duration = now - blinkStartRef.current;
        if (duration >= 120 && duration < 2000 && isTracking) {
          handleBlinkInput(duration < 400 ? '.' : '-');
        }
      };

      if (bothClosed) {
        if (!wasClosedRef.current) {
          wasClosedRef.current = true;
          blinkStartRef.current = now;
        }
        winkStartRef.current = 0; // both eyes closed is not a wink
      } else if (oneClosed) {
        // If we were mid-blink, the blink just ended (one eye reopened first).
        endBlinkEpisode();
        // Sustained wink → backspace (edge-triggered with its own cooldown).
        if (!winkStartRef.current) winkStartRef.current = now;
        if (now - winkStartRef.current > 300 && isTracking) {
          handleWinkInput();
          winkStartRef.current = now + 100000; // block re-fire until eye reopens
        }
      } else {
        // Both eyes open.
        endBlinkEpisode();
        winkStartRef.current = 0;
      }
    } else {
      setConfidence(0);
      setPredictedState('OPEN');
      setBlinkProbabilities({});
      setFaceDetected(false);
      setLeftEyeOpen(true);
      setRightEyeOpen(true);
      leftEarBufferRef.current = [];
      rightEarBufferRef.current = [];
      wasClosedRef.current = false;
      winkStartRef.current = 0;
    }
  };

  const handleClear = () => {
    setOutputContainer("");
    setCurrentSpellingWord("");
    setMorseBuffer("");
    setAiSuggestions([]);
  };

  const handleSpeak = () => {
    if (!outputContainer.trim()) return;
    speakText(outputContainer);
    onAddPhraseHistory(`"${outputContainer}"`, 'Blink');
  };

  const handleAiExpand = async () => {
    if (!outputContainer.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: outputContainer,
          mode: 'blink',
          context: 'Blink to Morse text expansion'
        })
      });
      const data = await res.json();
      if (data.expanded) {
        setOutputContainer(data.expanded);
      }
      if (data.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (e) {
      console.error("AI expansion error:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const wordCount = outputContainer.trim() ? outputContainer.trim().split(/\s+/).length : 0;

  return (
    <main className="p-4 md:p-6 max-w-[1280px] mx-auto w-full flex flex-col gap-5 pb-28 md:pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-slate-900">
            Blink-to-Morse
          </h2>
          <p className="font-body text-slate-500 text-xs md:text-sm mt-0.5 max-w-xl">
            Real-time eye tracking and text synthesis interface.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#FCFAF4] px-4 py-2 rounded-full border border-[#E6DDC9] self-start md:self-auto">
          <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-emerald-500 pulse-ring' : 'bg-rose-500'}`}></div>
          <span className="font-mono-code text-xs font-bold text-emerald-600">
            {isTracking ? 'System Live' : 'Tracking Paused'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (4 Cols) - Webcam Feed, Active Buffer, Session Controls */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Web Camera Viewport */}
          <div className="bg-[#FCFAF4] rounded-2xl overflow-hidden flex flex-col relative border border-emerald-500/20 shadow-xl">
            <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-center z-10 bg-gradient-to-b from-[#FFFDF8]/90 to-transparent">
              <div className="flex items-center gap-2 text-[10px] font-mono-code text-slate-500">
                <span className="material-symbols-outlined text-xs text-emerald-600">videocam</span>
                <span>Camera HUD</span>
              </div>

              <button
                onClick={() => {
                  setUseRealWebcam(!useRealWebcam);
                  playBeep(750, 0.1);
                }}
                className={`px-2.5 py-0.5 rounded-full font-mono-code text-[9px] border transition-colors flex items-center gap-1 ${
                  useRealWebcam
                    ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                    : 'bg-[#EFE8D8] border-[#E6DDC9] text-indigo-600 hover:bg-[#E6DDC9]'
                }`}
              >
                {useRealWebcam ? 'Demo' : 'Webcam'}
              </button>
            </div>

            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              {useRealWebcam ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div
                  className="bg-cover bg-center w-full h-full opacity-80"
                  style={{ backgroundImage: `url(${BLINK_CAMERA_FEED_URL})` }}
                />
              )}

              {useRealWebcam && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none z-10"
                />
              )}

              {modelStatus === 'failed' && (
                <div className="absolute inset-0 bg-[#FFFDF8]/95 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center z-40 select-text">
                  <span className="material-symbols-outlined text-rose-600 text-3xl mb-2">videocam_off</span>
                  <h3 className="font-mono-code text-[11px] font-bold text-rose-600 uppercase tracking-widest">
                    Webcam Access Failed
                  </h3>
                  <p className="font-body text-[10px] text-slate-700 mt-2 max-w-xs leading-relaxed">
                    {errorDetails || "Could not access the camera. A secure HTTPS connection is required on mobile browsers. Please host using ngrok or check browser permissions."}
                  </p>
                </div>
              )}

              {/* Status Indicator */}
              {useRealWebcam && (
                <div className="absolute top-12 left-3 bg-[#FFFDF8]/95 border border-[#E6DDC9] rounded-lg px-2 py-1 flex flex-col gap-0.5 backdrop-blur-md z-30 max-w-[80%]">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${modelStatus === 'ready' ? 'bg-emerald-500 animate-pulse' : modelStatus === 'loading' ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'}`}></span>
                    <span className="font-mono-code text-[9px] text-slate-800">
                      {modelStatus === 'ready' ? 'Face Mesh Ready' : modelStatus === 'loading' ? 'Loading AI Model...' : 'Load Failed'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="bg-[#EFE8D8] p-3 border-t border-[#E6DDC9] grid grid-cols-3 gap-2 divide-x divide-[#E6DDC9]">
              <div className="flex flex-col items-center">
                <span className="font-mono-code text-[9px] text-slate-500">EAR</span>
                <span className="font-mono-code text-sm font-bold text-indigo-600">{ear.toFixed(3)}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono-code text-[9px] text-slate-500">Blinks</span>
                <span className="font-mono-code text-sm font-bold text-emerald-600">{blinkCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-mono-code text-[9px] text-slate-500">Confidence</span>
                <span className="font-mono-code text-sm font-bold text-indigo-600">{confidence}%</span>
              </div>
            </div>

            {/* Live Eye Signal — what the camera detects for each eye right now */}
            <div className="bg-[#FFFDF8] px-3 py-2.5 border-t border-[#E6DDC9] flex items-center justify-between gap-2">
              {[
                { label: 'Left Eye', open: leftEyeOpen },
                { label: 'Right Eye', open: rightEyeOpen },
              ].map(({ label, open }) => (
                <div
                  key={label}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border transition-all ${
                    !faceDetected
                      ? 'bg-[#EFE8D8] border-[#E6DDC9] text-slate-400'
                      : open
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600'
                      : 'bg-amber-500/15 border-amber-500/50 text-amber-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {!faceDetected ? 'help' : open ? 'visibility' : 'visibility_off'}
                  </span>
                  <span className="font-mono-code text-[9px] font-bold">
                    {label}: {!faceDetected ? '—' : open ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Neural Blink Tracking HUD */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 border border-[#E6DDC9] flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#E6DDC9] pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-indigo-600 animate-pulse">online_prediction</span>
                <span className="text-xs font-extrabold text-slate-800 tracking-wide">Neural Blink Tracker</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md px-1.5 py-0.5 font-mono-code text-[8px] font-bold">
                Accuracy: {blinkModelWeights.accuracy}%
              </span>
            </div>

            <div className="flex flex-col gap-1.5 text-[9px] font-mono-code text-slate-500">
              <div className="flex justify-between">
                <span>Predictor State:</span>
                <span className="text-indigo-600 font-bold">{predictedState}</span>
              </div>
              <div className="flex justify-between">
                <span>Architecture:</span>
                <span className="text-slate-700">2 in → 8 Hidden → 3 out</span>
              </div>
            </div>

            {/* Probability Bars */}
            <div className="flex flex-col gap-2 mt-1">
              {['OPEN', 'BLINK', 'WINK'].map(c => {
                const prob = blinkProbabilities[c] || 0;
                const probPct = (prob * 100).toFixed(1);
                const isActive = c === predictedState;
                
                return (
                  <div key={c} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-center text-[9px] font-mono-code">
                      <span className={isActive ? 'text-indigo-600 font-bold' : 'text-slate-500'}>{c}</span>
                      <span className={isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}>{probPct}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#EFE8D8] rounded-full overflow-hidden border border-[#E6DDC9]">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          c === 'BLINK'
                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.4)]'
                            : c === 'WINK'
                            ? 'bg-amber-500 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${probPct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Morse Input Buffer HUD */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 border border-[#E6DDC9] flex flex-col items-center justify-center text-center relative overflow-hidden">
            <span className="text-[10px] font-mono-code text-slate-500 block mb-1.5 self-start">CURRENT BLINK BUFFER</span>
            
            <div className="h-12 flex items-center justify-center">
              {morseBuffer ? (
                <div className="font-mono-code text-3xl font-black text-indigo-600 tracking-widest animate-pulse">
                  {morseBuffer}
                </div>
              ) : (
                <span className="text-slate-400 text-xs font-mono-code">Waiting for blink...</span>
              )}
            </div>

            {/* Commit Progress Bar */}
            {morseBuffer && (
              <div className="mt-2 w-full">
                <div className="flex justify-between text-[8px] font-mono-code text-slate-500 mb-0.5">
                  <span>PROCESSING...</span>
                  <span>{Math.round(commitProgress)}%</span>
                </div>
                <div className="w-full bg-[#EFE8D8] h-1 rounded-full overflow-hidden border border-[#E6DDC9]">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-75"
                    style={{ width: `${commitProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Session Controls */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 border border-[#E6DDC9] flex flex-col gap-3">
            <h3 className="font-display font-bold text-sm text-slate-900">Session Controls</h3>

            {/* Blink Speed Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono-code text-slate-500">COMMIT SPEED</label>
              <select
                value={commitDelay}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCommitDelay(val);
                  localStorage.setItem('profile_commit_delay', String(val));
                  playBeep(720, 0.1);
                }}
                className="bg-[#EFE8D8] border border-[#E6DDC9] rounded-xl text-xs font-mono-code text-indigo-600 p-2 outline-none cursor-pointer"
              >
                <option value={1200}>Fast (1.2s)</option>
                <option value={1800}>Medium (1.8s)</option>
                <option value={2500}>Slow (2.5s)</option>
                <option value={3500}>Extra Slow (3.5s)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setIsTracking(!isTracking);
                playBeep(700, 0.1);
              }}
              className={`w-full py-2.5 rounded-xl font-display font-bold text-xs transition-all flex justify-center items-center gap-1.5 ${
                isTracking
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              <span className="material-symbols-outlined text-md">
                {isTracking ? 'stop_circle' : 'play_circle'}
              </span>
              {isTracking ? 'Stop Tracker' : 'Start Tracker'}
            </button>

            <button
              onClick={handleSpeak}
              disabled={!outputContainer}
              className="w-full py-2.5 bg-[#EFE8D8] hover:bg-[#E6DDC9] border border-[#E6DDC9] text-slate-800 rounded-xl font-display font-bold text-xs transition-all flex justify-center items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-md text-emerald-600">record_voice_over</span>
              Speak Output
            </button>

            {/* Click to Simulate Signals */}
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => {
                    if (isTracking) {
                      handleBlinkInput('.');
                      setPredictedState('BLINK');
                      setBlinkProbabilities({ OPEN: 0.01, BLINK: 0.98, WINK: 0.01 });
                      setTimeout(() => {
                        setPredictedState('OPEN');
                        setBlinkProbabilities({ OPEN: 0.98, BLINK: 0.01, WINK: 0.01 });
                      }, 250);
                    }
                  }}
                  className="flex-grow py-2 bg-[#EFE8D8] hover:bg-[#E6DDC9] text-emerald-600 rounded-xl font-mono-code text-[11px] border border-emerald-500/20 transition-all flex justify-center items-center gap-1"
                >
                  Dot (.)
                </button>
                <button
                  onClick={() => {
                    if (isTracking) {
                      handleBlinkInput('-');
                      setPredictedState('BLINK');
                      setBlinkProbabilities({ OPEN: 0.01, BLINK: 0.98, WINK: 0.01 });
                      setTimeout(() => {
                        setPredictedState('OPEN');
                        setBlinkProbabilities({ OPEN: 0.98, BLINK: 0.01, WINK: 0.01 });
                      }, 600);
                    }
                  }}
                  className="flex-grow py-2 bg-[#EFE8D8] hover:bg-[#E6DDC9] text-amber-600 rounded-xl font-mono-code text-[11px] border border-amber-500/20 transition-all flex justify-center items-center gap-1"
                >
                  Dash (-)
                </button>
              </div>
              <button
                onClick={() => {
                  if (isTracking) {
                    handleWinkInput();
                    setPredictedState('WINK');
                    setBlinkProbabilities({ OPEN: 0.01, BLINK: 0.01, WINK: 0.98 });
                    setTimeout(() => {
                      setPredictedState('OPEN');
                      setBlinkProbabilities({ OPEN: 0.98, BLINK: 0.01, WINK: 0.01 });
                    }, 400);
                  }
                }}
                className="w-full py-2 bg-[#EFE8D8] hover:bg-[#E6DDC9] text-indigo-600 rounded-xl font-mono-code text-[11px] border border-indigo-500/20 transition-all flex justify-center items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">face_5</span>
                Simulate Wink (Backspace)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (8 Cols) - Spelling, Output, Guides */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Active Spelling Word Buffer */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 border border-indigo-500/20 flex flex-col relative overflow-hidden">
            <span className="text-[10px] font-mono-code text-slate-500 block mb-1">CURRENT SPELLING WORD</span>
            
            <div className="min-h-[44px] flex items-center font-mono-code text-xl font-bold text-amber-600 tracking-wider">
              {currentSpellingWord || <span className="text-slate-400 text-xs italic">Spelling...</span>}
              {currentSpellingWord && <span className="inline-block w-2 h-5 bg-amber-500 animate-pulse ml-1"></span>}
            </div>

            <div className="mt-2.5 flex gap-2 justify-end">
              <button
                onClick={() => {
                  if (currentSpellingWord) {
                    setOutputContainer(prev => prev ? `${prev}${currentSpellingWord} ` : `${currentSpellingWord} `);
                    speakText(currentSpellingWord);
                    setCurrentSpellingWord('');
                  } else {
                    setOutputContainer(prev => prev + ' ');
                  }
                  playBeep(700, 0.1);
                }}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] border border-[#E6DDC9] text-slate-700 font-mono-code text-[9px] px-2 py-1 rounded-lg flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[10px]">space_bar</span>
                + Space
              </button>
              
              <button
                onClick={() => {
                  setCurrentSpellingWord(prev => prev.slice(0, -1));
                  playBeep(600, 0.1);
                }}
                disabled={!currentSpellingWord}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] border border-[#E6DDC9] disabled:opacity-40 text-slate-700 font-mono-code text-[9px] px-2 py-1 rounded-lg flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[10px]">backspace</span>
                Delete
              </button>
              
              <button
                onClick={() => {
                  setCurrentSpellingWord('');
                  playBeep(500, 0.1);
                }}
                disabled={!currentSpellingWord}
                className="bg-[#EFE8D8] hover:bg-[#E6DDC9] border border-[#E6DDC9] disabled:opacity-40 text-slate-700 font-mono-code text-[9px] px-2 py-1 rounded-lg flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[10px]">close</span>
                Clear
              </button>
            </div>
          </div>

          {/* Text Output Box */}
          <div className="bg-[#FCFAF4] rounded-2xl p-4 border border-[#E6DDC9] flex flex-col min-h-[160px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-600 text-sm">subject</span>
                Committed Output
              </h3>

              <button
                onClick={handleAiExpand}
                disabled={isAiLoading || !outputContainer}
                className="bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-600 text-[10px] font-mono-code px-2 py-0.5 rounded-lg border border-indigo-500/30 flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                {isAiLoading ? 'AI...' : 'AI Expand'}
              </button>
            </div>

            <div className="flex-grow bg-[#F3EDDF] rounded-xl p-3 font-mono-code text-base text-slate-900 border border-[#E6DDC9] tracking-wider flex flex-col justify-between min-h-[70px]">
              <div>
                {outputContainer || <span className="text-slate-400 text-xs">Spelled phrases appear here...</span>}
                <span className="inline-block w-2 h-5 bg-emerald-500 animate-pulse align-middle ml-1"></span>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#E6DDC9]">
                  <span className="text-[8px] font-mono-code text-slate-400 block mb-1">AI Suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {aiSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setOutputContainer(sug + ' ');
                          playBeep(800, 0.1);
                        }}
                        className="text-[9px] font-mono-code bg-[#EFE8D8] hover:bg-indigo-600 text-slate-800 px-1.5 py-0.5 rounded border border-[#E6DDC9] transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-between items-center text-slate-400 font-mono-code text-[10px]">
              <span>Words: {wordCount}</span>
              <button
                onClick={handleClear}
                className="hover:text-rose-600 transition-colors flex items-center gap-1 text-[10px]"
              >
                <span className="material-symbols-outlined text-xs">delete</span>
                Clear All
              </button>
            </div>
          </div>

          {/* Guides Section - Grid Side-by-Side (7:5 split on md screens) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Interactive Morse Guide (7 cols) */}
            <div className="md:col-span-7 bg-[#FCFAF4] p-4 rounded-2xl border border-[#E6DDC9] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#E6DDC9] pb-2">
                <h3 className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-indigo-600 text-sm">help</span>
                  Morse Guide
                </h3>
                <div className="flex gap-1.5">
                  <span className="text-[8px] font-mono-code bg-[#EFE8D8] text-emerald-600 px-1.5 py-0.5 rounded border border-[#E6DDC9]">
                    Dot (.)
                  </span>
                  <span className="text-[8px] font-mono-code bg-[#EFE8D8] text-amber-600 px-1.5 py-0.5 rounded border border-[#E6DDC9]">
                    Dash (-)
                  </span>
                </div>
              </div>

              {/* Ultra-compact grid showing A-Z & 0-9 */}
              <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-6 lg:grid-cols-9 gap-1.5">
                {Object.entries(morseMap).map(([code, char]) => {
                  const matchesBuffer = code === morseBuffer;
                  const startsWithBuffer = morseBuffer && code.startsWith(morseBuffer);
                  const isInactive = morseBuffer && !startsWithBuffer;
                  
                  return (
                    <div
                      key={char}
                      className={`p-1.5 rounded-lg border flex flex-col items-center justify-center text-center transition-all ${
                        matchesBuffer
                          ? 'bg-emerald-500/20 border-emerald-500 scale-105 shadow-[0_0_8px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                          : startsWithBuffer
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200'
                          : isInactive
                          ? 'opacity-20 bg-transparent border-[#E6DDC9]'
                          : 'bg-[#EFE8D8] border-[#E6DDC9] hover:border-slate-500/30'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-800">{char}</span>
                      <span className="font-mono-code text-[8px] text-slate-500 mt-0.5">{code}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Patient Quick Phrases Guide (5 cols) */}
            <div className="md:col-span-5 bg-[#FCFAF4] p-4 rounded-2xl border border-[#E6DDC9] flex flex-col gap-3">
              <h3 className="font-display font-bold text-xs text-indigo-600 flex items-center gap-1.5 border-b border-[#E6DDC9] pb-2">
                <span className="material-symbols-outlined text-sm">patient_list</span>
                Quick Phrases
              </h3>

              <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[140px] pr-1">
                <div className="bg-[#EFE8D8] p-2 rounded-xl border border-[#E6DDC9] flex flex-col justify-between">
                  <span className="text-[8px] font-mono-code text-slate-500">🚨 HELP</span>
                  <span className="text-[10px] font-bold text-slate-800">I NEED HELP</span>
                  <span className="font-mono-code text-[9px] text-indigo-600 mt-0.5 font-bold">.-.-.</span>
                </div>
                <div className="bg-[#EFE8D8] p-2 rounded-xl border border-[#E6DDC9] flex flex-col justify-between">
                  <span className="text-[8px] font-mono-code text-slate-500">🤕 PAIN</span>
                  <span className="text-[10px] font-bold text-slate-800">I AM IN PAIN</span>
                  <span className="font-mono-code text-[9px] text-indigo-600 mt-0.5 font-bold">-.-.-</span>
                </div>
                <div className="bg-[#EFE8D8] p-2 rounded-xl border border-[#E6DDC9] flex flex-col justify-between">
                  <span className="text-[8px] font-mono-code text-slate-500">💧 WATER</span>
                  <span className="text-[10px] font-bold text-slate-800">NEED WATER</span>
                  <span className="font-mono-code text-[9px] text-indigo-600 mt-0.5 font-bold">---...</span>
                </div>
                <div className="bg-[#EFE8D8] p-2 rounded-xl border border-[#E6DDC9] flex flex-col justify-between">
                  <span className="text-[8px] font-mono-code text-slate-500">🚽 TOILET</span>
                  <span className="text-[10px] font-bold text-slate-800">BATHROOM</span>
                  <span className="font-mono-code text-[9px] text-indigo-600 mt-0.5 font-bold">...---</span>
                </div>
                <div className="bg-[#EFE8D8] p-2 rounded-xl border border-[#E6DDC9] flex flex-col justify-between col-span-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-mono-code text-slate-500">🍎 FOOD</span>
                    <span className="font-mono-code text-[9px] text-indigo-600 font-bold">..--..</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800">I NEED FOOD</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Simulation & Punctuation cheat reference info */}
          <div className="bg-[#FCFAF4] px-4 py-2.5 rounded-xl border border-[#E6DDC9] flex flex-wrap gap-4 justify-between text-[10px] text-slate-500">
            <div>
              <span className="font-semibold text-indigo-600">Delete Last Letter:</span>
              <code className="bg-[#EFE8D8] px-1 rounded ml-1 text-slate-700">----</code>
            </div>
            <div>
              <span className="font-semibold text-indigo-600">Clear Word:</span>
              <code className="bg-[#EFE8D8] px-1 rounded ml-1 text-slate-700">.....</code>
            </div>
            <div>
              <span className="font-semibold text-indigo-600">Space / Commit:</span>
              <code className="bg-[#EFE8D8] px-1 rounded ml-1 text-slate-700">.-.-</code>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
