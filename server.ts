import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "node:crypto";
import os from "node:os";
import {
  initDatabase,
  getRecentPhrases,
  addRecentPhrase,
  deleteRecentPhrase,
  clearRecentPhrases,
  getQuickPhrases,
  addQuickPhrase,
  deleteQuickPhrase,
  getCategoriesWithPhrases,
  addCategory,
  addPhraseToCategory,
  getSettings,
  updateSetting,
  getPatientByEmail,
  updatePatientProfile,
  createSosAlert,
  getRecentSosAlerts,
  verifyPassword,
  hashPassword,
  createPatient,
  createSession,
  getSession,
  deleteSession,
  createPasswordReset,
  getPasswordReset,
  deletePasswordReset,
  updatePatientPassword,
  createSupportRequest,
  getSupportRequests
} from "./database.ts";
import completionModel from "./src/data/completion_model.json";

dotenv.config();

// Initialize Database schema & default data
initDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

// Log all incoming requests for diagnostics
app.use((req, res, next) => {
  console.log(`[Echolytix Request] ${req.method} ${req.url} - Headers: ${JSON.stringify({
    host: req.headers.host,
    origin: req.headers.origin,
    'x-forwarded-for': req.headers['x-forwarded-for']
  })}`);
  next();
});

// Enable CORS middleware for API routes when deployed separately from the frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ];
  
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
  }

  // Allow localhost origins, the configured production FRONTEND_URL, or any origin during development.
  const isAllowed = origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production");

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // Return restricted fallback origin if not allowed
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "http://localhost:3000");
  }
  
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// --- Authentication Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: "Session token is missing. Access unauthorized." });
    }
    
    const session = getSession(token) as any;
    if (!session) {
      return res.status(401).json({ error: "Invalid session token. Please log in again." });
    }
    
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      deleteSession(token);
      return res.status(401).json({ error: "Session has expired. Please log in again." });
    }
    
    // Attach patient data (without password) to the request object
    req.patient = session;
    next();
  } catch (err) {
    console.error("Token authentication failed:", err);
    return res.status(500).json({ error: "Internal authentication error" });
  }
};

// Initialize Gemini AI Client
const getGeminiClient = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("API_KEY / GEMINI_API_KEY is not set. AI features will fallback to local rules.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// ---------------- REST API ENDPOINTS ----------------

// --- Recent Phrases History ---
app.get("/api/phrases", (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const phrases = getRecentPhrases(limit);
    return res.json(phrases);
  } catch (err: any) {
    console.error("Error fetching phrases:", err);
    return res.status(500).json({ error: "Failed to fetch phrases" });
  }
});

app.post("/api/phrases", authenticateToken, (req, res) => {
  try {
    const { text, mode } = req.body;
    if (!text || !mode) {
      return res.status(400).json({ error: "Text and mode are required" });
    }
    const newPhrase = addRecentPhrase(text, mode);
    return res.status(201).json(newPhrase);
  } catch (err: any) {
    console.error("Error adding phrase:", err);
    return res.status(500).json({ error: "Failed to add phrase" });
  }
});

app.delete("/api/phrases/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    deleteRecentPhrase(id);
    return res.json({ success: true, message: `Phrase ${id} deleted` });
  } catch (err: any) {
    console.error("Error deleting phrase:", err);
    return res.status(500).json({ error: "Failed to delete phrase" });
  }
});

app.delete("/api/phrases", authenticateToken, (req, res) => {
  try {
    clearRecentPhrases();
    return res.json({ success: true, message: "All phrase history cleared" });
  } catch (err: any) {
    console.error("Error clearing phrases:", err);
    return res.status(500).json({ error: "Failed to clear phrases" });
  }
});

// --- Quick Morse & Assistive Phrases ---
app.get("/api/quick-phrases", (req, res) => {
  try {
    const phrases = getQuickPhrases();
    return res.json(phrases);
  } catch (err: any) {
    console.error("Error fetching quick phrases:", err);
    return res.status(500).json({ error: "Failed to fetch quick phrases" });
  }
});

app.post("/api/quick-phrases", (req, res) => {
  try {
    const { label, morse, category } = req.body;
    if (!label || !morse) {
      return res.status(400).json({ error: "Label and morse pattern are required" });
    }
    const newQuick = addQuickPhrase(label, morse, category);
    return res.status(201).json(newQuick);
  } catch (err: any) {
    console.error("Error adding quick phrase:", err);
    return res.status(500).json({ error: "Failed to add quick phrase" });
  }
});

app.delete("/api/quick-phrases/:id", (req, res) => {
  try {
    const { id } = req.params;
    deleteQuickPhrase(id);
    return res.json({ success: true, message: `Quick phrase ${id} deleted` });
  } catch (err: any) {
    console.error("Error deleting quick phrase:", err);
    return res.status(500).json({ error: "Failed to delete quick phrase" });
  }
});

// --- TTS Categories & Phrases ---
app.get("/api/categories", (req, res) => {
  try {
    const categories = getCategoriesWithPhrases();
    return res.json(categories);
  } catch (err: any) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/categories", (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const newCat = addCategory(name);
    return res.status(201).json(newCat);
  } catch (err: any) {
    console.error("Error adding category:", err);
    return res.status(500).json({ error: "Failed to add category" });
  }
});

app.post("/api/categories/:id/phrases", (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { text } = req.body;
    if (!text || isNaN(categoryId)) {
      return res.status(400).json({ error: "Valid category ID and phrase text are required" });
    }
    const result = addPhraseToCategory(categoryId, text);
    return res.status(201).json(result);
  } catch (err: any) {
    console.error("Error adding phrase to category:", err);
    return res.status(500).json({ error: "Failed to add phrase to category" });
  }
});

// --- User Settings ---
app.get("/api/settings", (req, res) => {
  try {
    const settings = getSettings();
    return res.json(settings);
  } catch (err: any) {
    console.error("Error fetching settings:", err);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put("/api/settings", authenticateToken, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: "Key and value are required" });
    }
    const updated = updateSetting(key, String(value));
    return res.json(updated);
  } catch (err: any) {
    console.error("Error updating setting:", err);
    return res.status(500).json({ error: "Failed to update setting" });
  }
});

// --- User Registration / Signup ---
app.post("/api/auth/register", (req, res) => {
  try {
    const {
      email,
      password,
      name,
      age,
      medical_id,
      caregiver_name,
      caregiver_phone,
      emergency_email
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and full name are required." });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Password strength check
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ error: "Password must contain at least one letter and one number." });
    }

    // Check duplicate email
    const existing = getPatientByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }

    // Hash password and store in SQLite
    const passwordHash = hashPassword(password);
    const patient = createPatient(
      email,
      passwordHash,
      name,
      age ? Number(age) : undefined,
      medical_id || "",
      caregiver_name || "",
      caregiver_phone || "",
      emergency_email || ""
    );

    return res.status(201).json(patient);
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Failed to register account." });
  }
});

// --- Patient Authentication / Login ---
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const patient = getPatientByEmail(email) as any;
    if (!patient) {
      return res.status(401).json({ error: "Invalid credentials. Incorrect email or password." });
    }

    // Secure verification
    const isCorrect = verifyPassword(password, patient.password);
    if (!isCorrect) {
      return res.status(401).json({ error: "Invalid credentials. Incorrect email or password." });
    }

    // Create session token (expires in 24 hours)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    createSession(patient.id, token, expiresAt);

    const { password: _, ...safePatient } = patient;
    return res.json({
      ...safePatient,
      sessionToken: token
    });
  } catch (err: any) {
    console.error("Error authenticating patient:", err);
    return res.status(500).json({ error: "Authentication failed." });
  }
});

// --- Fetch Logged-in Patient Profile (Me) ---
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  return res.json(req.patient);
});

// --- Logout and Destroy Session ---
app.post("/api/auth/logout", (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      deleteSession(token);
    }
    return res.json({ success: true, message: "Logged out successfully." });
  } catch (err: any) {
    console.error("Logout API request error:", err);
    return res.status(500).json({ error: "Logout failed." });
  }
});

// --- Forgot Password OTP Request ---
app.post("/api/auth/forgot-password", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const patient = getPatientByEmail(email);
    if (!patient) {
      return res.status(404).json({ error: "No patient account found with this email address." });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    createPasswordReset(email, otp, expiresAt);

    // Conspicuously log the OTP in server console
    console.log("\n✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️");
    console.log(`✉️ PASSWORD RESET OTP FOR ${email}: ${otp}`);
    console.log(`✉️ EXPIRES AT: ${new Date(expiresAt).toLocaleTimeString()}`);
    console.log("✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️✉️\n");

    return res.json({
      success: true,
      message: "Password reset OTP code generated and dispatched.",
      devOtp: otp // Returned directly to simplify verification and testing
    });
  } catch (err: any) {
    console.error("Forgot password request error:", err);
    return res.status(500).json({ error: "Failed to dispatch recovery code." });
  }
});

// --- Reset Password with OTP ---
app.post("/api/auth/reset-password", (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP verification code, and new password are required." });
    }

    const reset = getPasswordReset(email) as any;
    if (!reset || reset.token !== otp) {
      return res.status(400).json({ error: "Invalid OTP code. Please double check and try again." });
    }

    // Check expiry
    if (new Date(reset.expires_at) < new Date()) {
      deletePasswordReset(email);
      return res.status(400).json({ error: "OTP verification code has expired. Please request a new code." });
    }

    // Password validation check
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return res.status(400).json({ error: "New password must contain at least one letter and one number." });
    }

    const patient = getPatientByEmail(email) as any;
    if (!patient) {
      return res.status(404).json({ error: "Associated patient account not found." });
    }

    // Hash and update the password
    const hash = hashPassword(newPassword);
    updatePatientPassword(patient.id, hash);
    deletePasswordReset(email);

    return res.json({ success: true, message: "Password updated successfully. You can now log in." });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Failed to update security password." });
  }
});

// --- Save Patient Profile Details ---
app.post("/api/auth/profile", authenticateToken, (req, res) => {
  try {
    const {
      id,
      name,
      age,
      medical_id,
      caregiver_name,
      caregiver_phone,
      emergency_email,
      tts_speed,
      blink_threshold,
      commit_delay
    } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "Patient ID and Name are required." });
    }

    const updated = updatePatientProfile(
      Number(id),
      name,
      Number(age || 0),
      medical_id || "",
      caregiver_name || "",
      caregiver_phone || "",
      emergency_email || "",
      Number(tts_speed || 1.0),
      Number(blink_threshold || 0.18),
      Number(commit_delay || 1800)
    );

    const { password: _, ...safePatient } = updated as any;
    return res.json(safePatient);
  } catch (err: any) {
    console.error("Error saving patient profile:", err);
    return res.status(500).json({ error: "Failed to update profile settings." });
  }
});

// --- Caregiver Support & Feedback Form ---
app.post("/api/support", (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields (name, email, message) are required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    const request = createSupportRequest(name, email, message);
    return res.status(201).json(request);
  } catch (err: any) {
    console.error("Support feedback submission error:", err);
    return res.status(500).json({ error: "Failed to record support message." });
  }
});

app.get("/api/support", authenticateToken, (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const requests = getSupportRequests(limit);
    return res.json(requests);
  } catch (err: any) {
    console.error("Error fetching support requests:", err);
    return res.status(500).json({ error: "Failed to fetch support logs." });
  }
});

// --- SOS Emergency Distress Signal ---
app.post("/api/emergency/sos", (req, res) => {
  try {
    const { patientId, message, latitude, longitude } = req.body;
    
    // Conspicuously log distress beacon in server output
    console.log("\n🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.log(`🚨 EMERGENCY DISTRESS SIGNAL RECEIVED AT ${new Date().toLocaleTimeString()}`);
    console.log(`🚨 PATIENT ID: ${patientId || "GUEST"}`);
    console.log(`🚨 MESSAGE: "${message}"`);
    console.log(`🚨 POSITION: Latitude ${latitude || "Unknown"}, Longitude ${longitude || "Unknown"}`);
    console.log("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n");

    const result = createSosAlert(
      patientId ? Number(patientId) : null,
      message || "SOS Assistance Required",
      latitude ? Number(latitude) : 0,
      longitude ? Number(longitude) : 0
    );

    return res.status(201).json(result);
  } catch (err: any) {
    console.error("Error logging emergency SOS:", err);
    return res.status(500).json({ error: "Failed to dispatch SOS alert signal" });
  }
});

app.get("/api/emergency/sos", (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const alerts = getRecentSosAlerts(limit);
    return res.json(alerts);
  } catch (err: any) {
    console.error("Error fetching SOS logs:", err);
    return res.status(500).json({ error: "Failed to fetch distress log history" });
  }
});

// --- Remote Camera Pairing Session API ---

interface RemoteSession {
  code: string;
  createdAt: number;
  laptopRes?: any;
  deviceConnected: boolean;
}

const remoteSessions = new Map<string, RemoteSession>();

// Cleanup stale sessions every 10 minutes (remove after 2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of remoteSessions.entries()) {
    if (now - session.createdAt > 2 * 60 * 60 * 1000) {
      if (session.laptopRes) {
        try {
          session.laptopRes.end();
        } catch (e) {}
      }
      remoteSessions.delete(code);
    }
  }
}, 10 * 60 * 1000);

app.get("/api/remote/session/info", (req, res) => {
  try {
    const ips: string[] = [];
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    return res.json({ ips, port: PORT });
  } catch (err) {
    console.error("Error retrieving network info:", err);
    return res.status(500).json({ error: "Failed to retrieve network info" });
  }
});

app.post("/api/remote/session/create", (req, res) => {
  try {
    let code = "";
    // Keep generating until unique
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (remoteSessions.has(code));

    remoteSessions.set(code, {
      code,
      createdAt: Date.now(),
      deviceConnected: false
    });

    return res.json({ code });
  } catch (err) {
    console.error("Error creating remote pairing session:", err);
    return res.status(500).json({ error: "Failed to create remote pairing session" });
  }
});

app.get("/api/remote/session/validate", (req, res) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Missing pairing session code" });
    }

    const session = remoteSessions.get(code);
    if (!session) {
      return res.status(404).json({ error: "Pairing code invalid or expired" });
    }

    return res.json({ success: true, deviceConnected: session.deviceConnected });
  } catch (err) {
    console.error("Error validating remote session:", err);
    return res.status(500).json({ error: "Failed to validate session" });
  }
});

app.get("/api/remote/session/stream", (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing session code" });
  }

  const session = remoteSessions.get(code);
  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  session.laptopRes = res;

  // Send current connection status
  res.write(`data: ${JSON.stringify({ type: "status", connected: session.deviceConnected })}\n\n`);

  // Setup keep-alive ping
  const pingInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(pingInterval);
    if (session.laptopRes === res) {
      session.laptopRes = undefined;
    }
  });
});

app.post("/api/remote/session/send", (req, res) => {
  try {
    const { code, type, value } = req.body;
    if (!code || !type) {
      return res.status(400).json({ error: "Code and type are required" });
    }

    const session = remoteSessions.get(code);
    if (!session) {
      return res.status(404).json({ error: "Session not found or expired" });
    }

    if (type === "connected") {
      session.deviceConnected = true;
    }

    if (session.laptopRes) {
      session.laptopRes.write(`data: ${JSON.stringify({ type, value })}\n\n`);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error forwarding remote event:", err);
    return res.status(500).json({ error: "Failed to forward event to laptop" });
  }
});

// --- AI Smart Phrase Expansion / Completion ---
app.post("/api/ai/complete", async (req, res) => {
  try {
    const { text, mode, context } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text input" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Local NN/Transition Completion Model Fallback
      const cleanText = (str: string) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const cleaned = cleanText(text);
      
      // 1. Expand Phrase
      let expanded = text;
      const matchedPhrase = completionModel.corpus.find(p => p.clean.startsWith(cleaned) || p.clean.includes(cleaned));
      if (matchedPhrase) {
        expanded = matchedPhrase.original;
      } else {
        // Simple sentence casing
        expanded = text.charAt(0).toUpperCase() + text.slice(1);
        if (!expanded.endsWith('.') && !expanded.endsWith('?') && !expanded.endsWith('!')) {
          expanded += '.';
        }
      }

      // 2. Generate Suggestions
      const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
      let suggestions: string[] = [];
      
      if (tokens.length > 0) {
        const lastWord = tokens[tokens.length - 1];
        const transitions = (completionModel.transitions as Record<string, { word: string; prob: number }[]>)[lastWord];
        if (transitions && transitions.length > 0) {
          suggestions = transitions.slice(0, 3).map(t => t.word.toUpperCase());
        }
      }
      
      if (suggestions.length === 0) {
        // Fallback to starting words
        suggestions = completionModel.starts.slice(0, 3).map(s => s.word.toUpperCase());
      }

      return res.json({
        expanded,
        suggestions
      });
    }

    const prompt = `You are an AI assistant for Echolytix, a communication tool for individuals with speech/motor impairments.
The user provided this input text fragment via ${mode || "blink/gesture/morse"}: "${text}".
Context: ${context || "General assistance"}.

Provide:
1. "expanded": A clear, natural, polite 1-sentence phrasing suitable for Text-to-Speech speaking aloud.
2. "suggestions": An array of 3 short relevant phrase completions or next words they might want to say.

Return ONLY a valid JSON object matching this schema:
{
  "expanded": "string",
  "suggestions": ["string", "string", "string"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    const parsed = JSON.parse(resultText);

    return res.json({
      expanded: parsed.expanded || text,
      suggestions: parsed.suggestions || [text + " PLEASE", text + " THANK YOU"]
    });
  } catch (err: any) {
    console.error("Error in AI complete route:", err);
    return res.status(500).json({
      error: "AI completion failed",
      expanded: req.body.text || "",
      suggestions: []
    });
  }
});

// Start Express Server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Echolytix Server & Database running locally on http://localhost:${PORT}`);
    // Retrieve and log local Wi-Fi IP address
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`Access on your mobile device / local network: http://${net.address}:${PORT}`);
        }
      }
    }
  });
}

startServer();
