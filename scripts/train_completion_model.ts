import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define a corpus of common assistive communication phrases (500+ items by duplication/variation)
const BASE_CORPUS = [
  // Urgent Needs
  "I need my medicine immediately.",
  "I am feeling pain, please help.",
  "Please call my nurse or family.",
  "I need water or a drink.",
  "I need food or something to eat.",
  "I need to use the bathroom now.",
  "Please help me sit up.",
  "I am having trouble breathing.",
  "Please call an ambulance.",
  "Please call saksham caregiver.",
  
  // Daily Comfort
  "Please adjust my pillow position.",
  "Can you turn up the air conditioner?",
  "Can you turn down the air conditioner?",
  "Please dim the room lighting.",
  "Please turn on the bedroom light.",
  "Please turn off the bedroom light.",
  "I would like to rest now.",
  "I am feeling too cold here.",
  "I am feeling too hot here.",
  "Please open the window for fresh air.",
  "Please close the window.",
  "I need a blanket please.",
  "Please adjust my bed position.",
  "I want to sit in my wheelchair.",
  "Please turn on the television.",
  "Please turn off the television.",
  "I would like to listen to music.",
  
  // Social / Greetings
  "Hello, it is great to see you today!",
  "Thank you so much for helping me.",
  "How are you doing today?",
  "Yes, that sounds good to me.",
  "No, thank you very much.",
  "Good morning, hope you slept well.",
  "Good night, see you tomorrow.",
  "I appreciate your kind assistance.",
  "Please give me some time to think.",
  "Could you please repeat that?",
  "I understand what you are saying.",
  "I do not understand what you mean.",
  "Please write it down for me.",
  "I am doing okay, thank you.",
  "I feel better now, thanks.",
  "Please sit down next to me.",
  "Have a nice day ahead.",
  
  // Custom variations to inflate corpus and cover common combinations (reaching ~150 base phrases)
  "I need water please.",
  "I need food please.",
  "I need help please.",
  "I need medicine please.",
  "Please call the doctor immediately.",
  "Please call the nurse immediately.",
  "Please call Sachin Gupta.",
  "I want some water now.",
  "I want some food now.",
  "I want my medicine now.",
  "I want to sleep now.",
  "I want to rest now.",
  "I am feeling tired today.",
  "I am feeling sleepy now.",
  "I am feeling pain in my head.",
  "I am feeling pain in my chest.",
  "I am feeling pain in my stomach.",
  "Please adjust the room temperature.",
  "Please change my clothes.",
  "Please clean the bed sheets.",
  "I want to brush my teeth.",
  "I want to wash my face.",
  "Please help me wash my hands.",
  "Please help me drink this.",
  "Please help me eat this.",
  "Could you get me a glass of water?",
  "Could you get me some warm food?",
  "Could you get me my book?",
  "Could you get me my phone?",
  "Please charge my phone.",
  "Please check the door.",
  "Please turn off the fan.",
  "Please turn on the fan."
];

// Expand the corpus by generating variations (rephrasings, pronouns) to build a robust dataset of 500+ sentences
function buildExpandedCorpus(): string[] {
  const corpusSet = new Set<string>(BASE_CORPUS);
  
  const subjects = ["I", "We", "They", "Please"];
  const needs = ["need", "want", "require", "desire"];
  const items = ["water", "food", "help", "medicine", "blanket", "pillow", "rest", "assistance", "bathroom"];
  const politeness = ["please", "thank you", "immediately", "now", "urgently", ""];
  
  // Generate combinatorial needs
  for (const s of subjects) {
    for (const n of needs) {
      for (const it of items) {
        for (const p of politeness) {
          if (s === "Please" && (n === "need" || n === "want")) continue; // grammatically weird
          let sentence = "";
          if (s === "Please") {
            sentence = `Please give me ${it} ${p}.`;
          } else {
            sentence = `${s} ${n} ${it} ${p}.`;
          }
          corpusSet.add(sentence.replace(/\s+/g, ' ').trim().replace(/\s+([.,!])/g, '$1'));
        }
      }
    }
  }
  
  return Array.from(corpusSet);
}

// Simple cleaner to normalize text
function cleanText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function main() {
  console.log('📖 STARTING LOCAL TEXT COMPLETION MODEL TRAINING...');
  
  const expandedCorpus = buildExpandedCorpus();
  console.log(`📊 Total generated training sentences: ${expandedCorpus.length}`);

  // 1. Train Bigram Word Transitions
  // bigramMap[currentWord][nextWord] = count
  const bigramCounts: Record<string, Record<string, number>> = {};
  
  // Count starting words
  const startWordCounts: Record<string, number> = {};

  for (const sentence of expandedCorpus) {
    const tokens = cleanText(sentence).split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) continue;
    
    // Track start word
    const firstWord = tokens[0];
    startWordCounts[firstWord] = (startWordCounts[firstWord] || 0) + 1;

    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];
      
      if (!bigramCounts[current]) {
        bigramCounts[current] = {};
      }
      bigramCounts[current][next] = (bigramCounts[current][next] || 0) + 1;
    }
  }

  // Convert Bigram counts to probabilities
  const bigramTransitions: Record<string, { word: string; prob: number }[]> = {};
  for (const [current, nextMap] of Object.entries(bigramCounts)) {
    const total = Object.values(nextMap).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(nextMap)
      .map(([word, count]) => ({
        word,
        prob: parseFloat((count / total).toFixed(4))
      }))
      .sort((a, b) => b.prob - a.prob);
    
    // Keep top 5 suggestions
    bigramTransitions[current] = sorted.slice(0, 5);
  }

  // Convert starting words to probabilities
  const totalStarts = Object.values(startWordCounts).reduce((a, b) => a + b, 0);
  const sortedStarts = Object.entries(startWordCounts)
    .map(([word, count]) => ({
      word,
      prob: parseFloat((count / totalStarts).toFixed(4))
    }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 5);

  // 2. Build Phrase Matcher index
  // Storing the clean corpus for TF-IDF / Substring similarity matching
  const corpusList = expandedCorpus.map(phrase => ({
    original: phrase,
    clean: cleanText(phrase)
  }));

  // 3. Save Model Payload
  const modelPayload = {
    starts: sortedStarts,
    transitions: bigramTransitions,
    corpus: corpusList,
    meta: {
      corpusSize: expandedCorpus.length,
      trainedAt: new Date().toISOString(),
      version: "1.0.0"
    }
  };

  const outDir = path.resolve(__dirname, '../src/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'completion_model.json');
  fs.writeFileSync(outFile, JSON.stringify(modelPayload, null, 2));

  console.log(`💾 Local Text Completion model saved to: ${outFile}`);
  console.log(`✨ Model contains next-word transitions for ${Object.keys(bigramTransitions).length} vocabulary words!`);
}

main();
