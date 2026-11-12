# FlipThis

A 4-player beat battle prototype for COGS 123. Everyone flips the same vocal chop with their own sample bank, votes blind, then finishes a taste-matched partner's beat (Flip Back) and decides privately whether to form a crew.

**Stack:** Next.js 15 (App Router, TypeScript) · Tone.js for audio · Firebase Firestore for the shared room · hosted on Vercel.

## How a session runs

| Who | Code | What they see |
|---|---|---|
| Player 1 | `PEACH` | Cloud bank: Greentea pad, Bell arp, 808, Vinyl |
| Player 2 | `SKY` | Keys bank: Rhodes, Pluck arp, Round bass, Riser |
| Player 3 | `MINT` | Strings bank: Choir pad, Guitar arp, Pulse bass, Reverse swell |
| Player 4 | `LILAC` | Synth bank: Saw pad, Lead, Slide bass, Downlifter |
| Facilitator | `HOST` | Host panel: moves everyone through the phases |

All players also share the battle sample (vocal chop, reversed, lo-fi) and can pick any of the 4 drum kits (Boom-bap, Trap, Lo-fi, House).

Phases (the host presses **Next** to move everyone): Lobby → Taste Drop → Flip → Vote → Reveal → Flip Back → Team Up → Crews.

The arrangement is **16 bars**, with independently editable loop placements and drum toggles in every bar. Scroll horizontally to reach all bars on smaller screens. Every source loop is **8 bars at 130 BPM in B minor** and follows the same progression (Bm · Bm · F#m7 · A · Bm · Bm · F# · A), so any loop from any bank fits with any other. Arrangement bars 1–8 use source bars 1–8; bars 9–16 use source bars 1–8 again. The drum sequencer keeps its 8-step pattern, repeated in each enabled bar.

If fewer than 4 people show up, the host can press **Fill empty seats with demo players**. Demo seats submit a beat, vote, flip and say yes to teaming up automatically.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Without Firebase keys the app runs in **local mode**: tabs in the same browser share one room. Open one tab with `HOST` and four tabs with the player codes to rehearse the whole flow on one laptop.

## Go live across laptops (Firebase, free)

1. Go to https://console.firebase.google.com → **Add project** (Analytics off is fine).
2. **Build → Firestore Database → Create database** → production mode → any region.
3. In **Rules**, paste the contents of `firestore.rules` and **Publish**.
4. **Project settings → General → Your apps → Web (`</>`)** → register an app. Copy `apiKey`, `authDomain`, `projectId`, `appId`.
5. Copy `.env.example` to `.env.local` and fill in those four values.

## Deploy on Vercel (free)

1. Push this folder to GitHub (e.g. `JeremyChen212/FlipThis`).
2. Go to https://vercel.com/new → import the repo → Framework: Next.js (auto-detected).
3. Under **Environment Variables**, add the four `NEXT_PUBLIC_FIREBASE_*` values (and optionally `NEXT_PUBLIC_SURVEY_URL`).
4. **Deploy**. Share the `*.vercel.app` link; players enter their seat code.

Optional settings: `NEXT_PUBLIC_ROOM_ID` (use a new value to start a fresh room), `NEXT_PUBLIC_HOST_CODE`, `NEXT_PUBLIC_SURVEY_URL` (shown on the final screen).

## Swapping in your own loops

All loop files live in `public/audio/loops/` and are listed in `lib/config.ts`. To use your own:

1. Put the originals in `loops-src/` and describe them in `loops-src/manifest.json` (`file`, target `id`, source `bpm`, `semitones` to shift into B minor).
2. `npm run prepare-loops` (needs ffmpeg with the rubberband filter). This time-stretches and pitch-shifts each file to exactly 8 bars at 130 BPM.
3. If you add or rename loops, update `BANKS` / `SHARED_LOOPS` in `lib/config.ts`.

Credits: the Greentea pad and the vocal chop are Looperman loops (converted to 130 BPM / B minor). All other loops and drum sounds were synthesized for this project.

## Tweaks

- Phase lengths, edit limit for Flip Back, minimum sample bars: `lib/config.ts`
- Seat codes and which bank each seat gets: `SLOTS` in `lib/config.ts`
- Look and feel: `app/globals.css`
