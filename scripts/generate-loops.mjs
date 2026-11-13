// Original, deterministic synthesis. No downloads, API keys, or audio dependencies.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const catalog = JSON.parse(readFileSync('lib/soundCatalog.json', 'utf8'));
const SR = 22050, BPM = 130, BAR = 240 / BPM, BEAT = 60 / BPM;
const LENGTH = Math.round(8 * BAR * SR);
const roots = [47, 47, 42, 45, 47, 47, 42, 45];
const peaks = {};
mkdirSync('public/audio/loops', { recursive: true });
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const chord = bar => [0, bar === 3 || bar === 6 || bar === 7 ? 4 : 3, 7];

function note(buffer, start, duration, midi, voice, variant, gain) {
  const first = Math.round(start * SR), length = Math.round(duration * SR);
  const f = hz(midi), brightness = 0.1 + variant * 0.018;
  for (let i = 0; i < length && first + i < LENGTH; i++) {
    const t = i / SR, phase = 2 * Math.PI * f * t;
    const attack = Math.min(1, t / (voice === 'pad' ? 0.09 : 0.006));
    const release = Math.min(1, (duration - t) / (voice === 'pad' ? 0.16 : 0.04));
    const decay = voice === 'pad' ? 0.8 + 0.2 * Math.sin(Math.PI * t / duration) : Math.exp(-t / (voice === 'bass' ? 0.18 + (variant % 8) * 0.025 : 0.2 + (variant % 4) * 0.13));
    let tone;
    if (voice === 'bell') tone = Math.sin(phase + (1.2 + brightness) * Math.sin(phase * 2) * Math.exp(-t * 5));
    else if (voice === 'pluck') tone = Math.sin(phase) + brightness * Math.sin(phase * 2) + 0.1 * Math.sin(phase * 3);
    else if (voice === 'bass') tone = Math.sin(phase) + (0.08 + (variant % 5) * 0.04) * Math.sin(phase * 2);
    else tone = 0.7 * Math.sin(phase) + 0.18 * Math.sin(phase * 1.003) + brightness * Math.sin(phase * 2) + 0.06 * Math.sin(phase * 3);
    buffer[first + i] += tone * attack * release * decay * gain;
  }
}

function render(index, lane, theme = false) {
  const buffer = new Float32Array(LENGTH);
  for (let bar = 0; bar < 8; bar++) {
    const root = roots[bar], tones = chord(bar), at = bar * BAR;
    if (lane === 'chords') {
      for (const semitone of tones) note(buffer, at, BAR, root + 12 + semitone, index % 3 === 0 ? 'pluck' : 'pad', index, 0.18);
      if (index % 2) note(buffer, at, BAR, root + 31, 'pad', index, 0.08);
    } else if (lane === 'bass') {
      const positions = index % 3 === 0 ? [0, 1.5, 3] : index % 3 === 1 ? [0, 2, 3.5] : [0, 1, 2.5];
      for (const step of positions) note(buffer, at + step * BEAT, Math.min(0.75 * BEAT, BAR - step * BEAT), root - 12, 'bass', index, 0.5);
    } else if (lane === 'melody' || theme) {
      const patterns = [[0, 1.5, 2.5], [0.5, 1, 2, 3.5], [0, 0.75, 2, 3], [0, 1, 1.5, 3], [0.5, 2, 2.75], [0, 1.5, 2, 3.5], [0.25, 1.25, 2.5, 3.25]];
      const positions = patterns[index % patterns.length];
      positions.forEach((step, n) => {
        const semitone = tones[(n + index + bar) % 3];
        note(buffer, at + step * BEAT, Math.min(BAR - step * BEAT, (theme ? 1.1 : 0.8) * BEAT), root + 24 + semitone + (index % 3 === 2 && n % 2 ? 12 : 0), index % 2 ? 'pluck' : 'bell', index, 0.4);
      });
      if (theme) note(buffer, at, BAR, root + 12, 'pad', index, 0.1);
    } else {
      // Soft harmonic swells remain in the same chord as every other lane.
      if (bar % 4 === 3 || (index % 2 && bar % 4 === 1)) {
        for (const semitone of tones) note(buffer, at, BAR, root + 24 + semitone, 'pad', index, 0.1);
        for (let i = Math.round(at * SR); i < Math.min(LENGTH, Math.round((at + BAR) * SR)); i++) buffer[i] *= ((i / SR - at) / BAR) ** (1 + index % 3);
      }
    }
  }
  return buffer;
}

function output(id, source) {
  const samples = new Float32Array(source);
  let peak = 0.01;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const file = Buffer.alloc(44 + LENGTH * 2);
  file.write('RIFF', 0); file.writeUInt32LE(file.length - 8, 4); file.write('WAVEfmt ', 8);
  file.writeUInt32LE(16, 16); file.writeUInt16LE(1, 20); file.writeUInt16LE(1, 22);
  file.writeUInt32LE(SR, 24); file.writeUInt32LE(SR * 2, 28); file.writeUInt16LE(2, 32); file.writeUInt16LE(16, 34);
  file.write('data', 36); file.writeUInt32LE(LENGTH * 2, 40);
  const waveform = Array(64).fill(0);
  for (let i = 0; i < LENGTH; i++) {
    const edge = Math.min(1, i / (SR * 0.005), (LENGTH - 1 - i) / (SR * 0.005));
    const value = samples[i] / peak * 0.75 * edge;
    file.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
    const bin = Math.min(63, Math.floor(i / LENGTH * 64));
    waveform[bin] = Math.max(waveform[bin], Math.abs(value) / 0.75);
  }
  peaks[id] = waveform.map(value => Number(value.toFixed(2)));
  writeFileSync(`public/audio/loops/${id}.wav`, file);
}

catalog.banks.forEach((bank, index) => {
  for (const lane of ['chords', 'melody', 'bass', 'fx']) output(`${bank.id}_${lane}`, render(index, lane));
  console.log(`Generated ${bank.label}: chords, melody, bass, FX`);
});
catalog.samples.forEach((sample, index) => {
  const original = render(index, 'sample', true);
  output(`${sample.id}_original`, original);
  const reversed = new Float32Array(LENGTH), lofi = new Float32Array(LENGTH);
  let filtered = 0, held = 0;
  for (let bar = 0; bar < 8; bar++) {
    const start = Math.round(bar * BAR * SR), end = Math.min(LENGTH, Math.round((bar + 1) * BAR * SR));
    for (let i = start; i < end; i++) reversed[i] = original[end - 1 - (i - start)];
  }
  for (let i = 0; i < LENGTH; i++) {
    if (i % 3 === 0) held = Math.round(original[i] * 48) / 48;
    filtered += 0.22 * (held - filtered); lofi[i] = filtered;
  }
  output(`${sample.id}_reverse`, reversed); output(`${sample.id}_lofi`, lofi);
  console.log(`Generated battle sample ${sample.label}: original, reversed, lo-fi`);
});
writeFileSync('lib/generatedPeaks.json', JSON.stringify(peaks) + '\n');
