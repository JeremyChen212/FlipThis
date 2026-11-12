#!/usr/bin/env node
// Convert your own loops to the project tempo and key so they fit every bank.
//
// 1. Put source files in loops-src/ and list them in loops-src/manifest.json:
//    [{ "file": "my_pad.wav", "id": "peach_greentea_pad", "bpm": 129.6, "semitones": 0 }]
//    "id" is the file name the app expects (see lib/config.ts).
//    "semitones" moves the pitch to B minor (e.g. +2 for A minor, -3 for D minor... check by ear).
// 2. npm run prepare-loops   (needs ffmpeg built with the rubberband filter)
//
// Each output is exactly 8 bars at the project BPM, so bar N of the
// arrangement always plays bar N of the loop.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BPM = 130;
const BARS = 8;
const SR = 44100;
const src = 'loops-src';
const out = 'public/audio/loops';
const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
const samples = Math.round(BARS * 4 * (60 / BPM) * SR);

for (const item of manifest) {
  const input = join(src, item.file);
  if (!existsSync(input)) { console.error(`missing ${input}`); continue; }
  const tempo = BPM / item.bpm;
  const pitch = Math.pow(2, (item.semitones || 0) / 12);
  const filter = `rubberband=tempo=${tempo.toFixed(6)}:pitch=${pitch.toFixed(6)}:pitchq=quality,aresample=${SR},apad=whole_len=${samples},atrim=end_sample=${samples}`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-af', filter, '-ac', '2', '-c:a', 'pcm_s16le', join(out, `${item.id}.wav`)], { stdio: 'inherit' });
  console.log(`✓ ${item.file} → ${item.id}.wav (${item.bpm} → ${BPM} BPM, ${item.semitones || 0} st)`);
}
