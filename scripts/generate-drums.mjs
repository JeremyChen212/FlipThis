// Original synthesized one-shots. Deterministic, dependency-free, 44.1 kHz PCM.
// Regenerate with: npm run generate-drums
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 44100;
const directory = 'public/audio/drums';
mkdirSync(directory, { recursive: true });
const kits = {
  techno: { pitch: 48, sweep: 150, kickDecay: 0.19, snareTone: 190, snareDecay: 0.12, hatDecay: 0.045, clapDecay: 0.13, drive: 2.4 },
  breakbeat: { pitch: 58, sweep: 110, kickDecay: 0.11, snareTone: 210, snareDecay: 0.17, hatDecay: 0.07, clapDecay: 0.10, drive: 1.2 },
  garage: { pitch: 52, sweep: 180, kickDecay: 0.13, snareTone: 270, snareDecay: 0.08, hatDecay: 0.04, clapDecay: 0.09, drive: 1.0 },
  synthwave: { pitch: 50, sweep: 200, kickDecay: 0.18, snareTone: 175, snareDecay: 0.23, hatDecay: 0.095, clapDecay: 0.22, drive: 1.5 },
};

function wav(file, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SR, 24); buffer.writeUInt32LE(SR * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  let peak = 0.01;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(Math.round(samples[i] / peak * 0.82 * 32767), 44 + i * 2);
  writeFileSync(file, buffer);
}

let seed = 1234567;
function noise() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000 * 2 - 1; }
for (const [kit, p] of Object.entries(kits)) {
  for (const row of ['kick', 'snare', 'hat', 'clap']) {
    const duration = row === 'hat' ? 0.45 : 1;
    const samples = new Float32Array(Math.ceil(SR * duration));
    let phase = 0, low = 0, body = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / SR, n = noise();
      low += 0.22 * (n - low);
      const high = n - low;
      let sound;
      if (row === 'kick') {
        phase += 2 * Math.PI * (p.pitch + p.sweep * Math.exp(-t / 0.023)) / SR;
        sound = Math.tanh(p.drive * Math.sin(phase)) * Math.exp(-t / p.kickDecay) + high * 0.12 * Math.exp(-t / 0.009);
      } else if (row === 'snare') {
        body += 0.45 * (n - body);
        sound = 0.7 * body * Math.exp(-t / p.snareDecay) + 0.35 * Math.sin(2 * Math.PI * p.snareTone * t) * Math.exp(-t / 0.055);
        if (kit === 'synthwave' && t > 0.025 && t < 0.22) sound += 0.23 * n * (1 - t / 0.22);
      } else if (row === 'hat') {
        const metal = Math.sin(2 * Math.PI * 4130 * t) * Math.sin(2 * Math.PI * 5930 * t);
        sound = (0.7 * high + 0.25 * metal) * Math.exp(-t / p.hatDecay);
      } else {
        const burst = [0, 0.011, 0.023].reduce((sum, delay) => sum + (t >= delay ? Math.exp(-(t - delay) / 0.007) : 0), 0);
        sound = high * (burst * 0.7 + 0.5 * Math.exp(-t / p.clapDecay));
      }
      const attack = Math.min(1, t / 0.001);
      const release = Math.min(1, (duration - t) / 0.015);
      samples[i] = sound * attack * release;
    }
    wav(`${directory}/${kit}_${row}.wav`, samples);
  }
  console.log(`Generated ${kit}: kick, snare, hat, clap`);
}
