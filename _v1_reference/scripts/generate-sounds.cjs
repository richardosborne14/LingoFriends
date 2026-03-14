/**
 * generate-sounds.cjs
 *
 * Generates synthesised WAV sound effects for LingoFriends.
 * No npm dependencies — uses only Node.js built-ins and simple PCM math.
 *
 * Sounds are kept short (<500ms each) and pleasant for kids:
 *   reward     — ba-ding! (two ascending tones)
 *   celebrate  — 4-note fanfare (lesson complete)
 *   penalty    — gentle low bonk (wrong answer, non-punishing)
 *   footstep   — soft click (garden movement)
 *   skip       — upward whoosh sweep
 *   tap        — short UI tap
 *   levelup    — extended ascending chime
 *   npcGreet   — friendly double chirp
 *
 * Run: node scripts/generate-sounds.cjs
 * Output: public/sounds/*.wav (also deletes the broken *.mp3 placeholders)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── WAV config ───────────────────────────────────────────────────────────────
const SAMPLE_RATE = 22050; // Hz  — half of CD quality, keeps files tiny
const CHANNELS    = 1;     // Mono
const BITS        = 16;    // Signed 16-bit PCM
const MAX_VAL     = 32767;

// ─── WAV serialiser ───────────────────────────────────────────────────────────

/**
 * Encode Float32Array samples (range ±MAX_VAL) into a WAV Buffer.
 * Standard PCM WAV — universally supported by Web Audio's decodeAudioData().
 *
 * @param {Float32Array} samples
 * @returns {Buffer}
 */
function createWAV(samples) {
  const dataSize = samples.length * 2; // 2 bytes per sample (16-bit)
  const buf      = Buffer.alloc(44 + dataSize);

  // RIFF chunk
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);          // File size - 8
  buf.write('WAVE', 8, 'ascii');

  // fmt sub-chunk
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);                    // Chunk size (always 16 for PCM)
  buf.writeUInt16LE(1, 20);                     // Audio format = PCM
  buf.writeUInt16LE(CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * CHANNELS * BITS / 8, 28); // Byte rate
  buf.writeUInt16LE(CHANNELS * BITS / 8, 32);  // Block align
  buf.writeUInt16LE(BITS, 34);

  // data sub-chunk
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-MAX_VAL, Math.min(MAX_VAL, Math.round(samples[i])));
    buf.writeInt16LE(clamped, 44 + i * 2);
  }

  return buf;
}

// ─── Synthesis helpers ────────────────────────────────────────────────────────

/**
 * Generate a single sine-wave tone with linear attack and decay envelopes.
 *
 * @param {number} freq       - Frequency in Hz
 * @param {number} duration   - Duration in seconds
 * @param {number} amplitude  - Peak amplitude (0–1)
 * @param {number} attack     - Attack time in seconds
 * @param {number} decay      - Decay time in seconds (fade-out at end)
 * @returns {Float32Array}
 */
function tone(freq, duration, amplitude = 0.7, attack = 0.01, decay = 0.1) {
  const n           = Math.round(SAMPLE_RATE * duration);
  const attackN     = Math.round(SAMPLE_RATE * attack);
  const decayN      = Math.round(SAMPLE_RATE * decay);
  const sustainEnd  = n - decayN;
  const samples     = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let env;
    if (i < attackN) {
      env = i / attackN;
    } else if (i > sustainEnd) {
      env = Math.max(0, 1 - (i - sustainEnd) / decayN);
    } else {
      env = 1;
    }
    samples[i] = Math.sin(2 * Math.PI * freq * t) * amplitude * env * MAX_VAL;
  }
  return samples;
}

/**
 * Generate a frequency-sweep (whoosh) tone.
 *
 * @param {number} freqStart - Starting frequency in Hz
 * @param {number} freqEnd   - Ending frequency in Hz
 * @param {number} duration  - Duration in seconds
 * @param {number} amplitude - Peak amplitude (0–1)
 * @returns {Float32Array}
 */
function sweep(freqStart, freqEnd, duration, amplitude = 0.6) {
  const n       = Math.round(SAMPLE_RATE * duration);
  const decayN  = Math.round(n * 0.3);
  const samples = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t       = i / SAMPLE_RATE;
    const prog    = i / n;
    const freq    = freqStart + (freqEnd - freqStart) * prog;
    const env     = i > n - decayN ? Math.max(0, 1 - (i - (n - decayN)) / decayN) : 1;
    samples[i]    = Math.sin(2 * Math.PI * freq * t) * amplitude * env * MAX_VAL;
  }
  return samples;
}

/**
 * Concatenate multiple Float32Array segments into one.
 *
 * @param {...Float32Array} arrays
 * @returns {Float32Array}
 */
function concat(...arrays) {
  const total  = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Float32Array(total);
  let offset   = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Generate silence (a gap between notes).
 *
 * @param {number} duration - Duration in seconds
 * @returns {Float32Array}
 */
function gap(duration) {
  return new Float32Array(Math.round(SAMPLE_RATE * duration));
}

// ─── Sound definitions ────────────────────────────────────────────────────────
//
// Each entry produces a Float32Array → WAV Buffer.
// Goal: pleasant, short, kid-friendly tones. No harsh frequencies above ~1500Hz.

/** @type {Record<string, Buffer>} */
const SOUNDS = {

  /**
   * reward — short ascending ba-ding! (correct answer)
   * Two tones: A5 → E6. Bright, positive, instant feedback.
   */
  reward: createWAV(concat(
    tone(880,  0.08, 0.70, 0.004, 0.07),  // A5
    gap(0.03),
    tone(1320, 0.22, 0.80, 0.004, 0.20),  // E6
  )),

  /**
   * celebrate — 4-note fanfare (lesson step complete)
   * C5 → E5 → G5 → C6. Recognisable ascending triumphant pattern.
   */
  celebrate: createWAV(concat(
    tone(523,  0.12, 0.70, 0.008, 0.10),  // C5
    gap(0.03),
    tone(659,  0.12, 0.70, 0.008, 0.10),  // E5
    gap(0.03),
    tone(784,  0.12, 0.70, 0.008, 0.10),  // G5
    gap(0.03),
    tone(1047, 0.45, 0.80, 0.008, 0.40),  // C6 — hold the last note
  )),

  /**
   * penalty — gentle low bonk (wrong answer, non-punishing)
   * Single low tone — soft enough not to feel like a punishment.
   * Kept at 200Hz so it doesn't sound alarming or harsh.
   */
  penalty: createWAV(
    tone(200, 0.30, 0.50, 0.005, 0.25),
  ),

  /**
   * footstep — soft single grass step (garden movement)
   * Short click-like tone at 300Hz — natural-sounding thump.
   */
  footstep: createWAV(
    tone(300, 0.08, 0.40, 0.003, 0.07),
  ),

  /**
   * skip — upward whoosh (skip / next)
   * Frequency sweep 300→900Hz — feels like flicking a card away.
   */
  skip: createWAV(
    sweep(300, 900, 0.22, 0.55),
  ),

  /**
   * tap — soft UI tap (button press)
   * Short high tone at 600Hz — gentle, responsive.
   */
  tap: createWAV(
    tone(600, 0.07, 0.40, 0.002, 0.06),
  ),

  /**
   * levelup — extended ascending chime (level complete / big achievement)
   * 4-note staircase with a longer held final note — more dramatic than reward.
   */
  levelup: createWAV(concat(
    tone(440, 0.10, 0.60, 0.008, 0.08),  // A4
    tone(550, 0.10, 0.60, 0.008, 0.08),  // C#5 (approx)
    tone(660, 0.10, 0.65, 0.008, 0.08),  // E5 (approx)
    tone(880, 0.55, 0.75, 0.008, 0.50),  // A5 — held
  )),

  /**
   * npcGreet — friendly double chirp (NPC greeting)
   * Two quick ascending blips — like a cartoon character saying "hey!".
   */
  npcGreet: createWAV(concat(
    tone(700,  0.07, 0.55, 0.004, 0.06),  // Low chirp
    gap(0.04),
    tone(1000, 0.12, 0.55, 0.004, 0.10),  // High chirp
  )),
};

// ─── Write files ──────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'sounds');

// Remove the broken .mp3 placeholders (except penalty.mp3 which is real)
const placeholders = ['reward', 'celebrate', 'footstep', 'skip', 'tap', 'levelup', 'npc-greet'];
for (const name of placeholders) {
  const mp3Path = path.join(outDir, `${name}.mp3`);
  if (fs.existsSync(mp3Path)) {
    const size = fs.statSync(mp3Path).size;
    if (size <= 200) {
      // Definitely a placeholder — remove it
      fs.unlinkSync(mp3Path);
      console.log(`Removed placeholder: ${name}.mp3 (${size} bytes)`);
    }
  }
}

// Write real WAV files
for (const [name, buffer] of Object.entries(SOUNDS)) {
  // npcGreet → npc-greet.wav (match existing naming convention)
  const filename  = name === 'npcGreet' ? 'npc-greet.wav' : `${name}.wav`;
  const filePath  = path.join(outDir, filename);
  fs.writeFileSync(filePath, buffer);
  const kb = (buffer.length / 1024).toFixed(1);
  console.log(`Generated: ${filename} (${kb} KB)`);
}

console.log('\nAll sounds generated. Run "ls -la public/sounds/" to verify.\n');
