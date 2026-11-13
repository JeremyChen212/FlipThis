# FlipThis online setup — free tiers, no billing

Status: the room flow is implemented and tested locally. Publishing requires your Firebase project and personal Vercel account. Do not import/deploy the repository until the Firebase verification below passes.

## 1. Create the accounts

- Open https://console.firebase.google.com/ and create a Firebase project. Analytics can stay off. Keep the **Spark** plan; do not link a billing account or upgrade to Blaze.
- Open https://vercel.com/signup and sign in with GitHub. Use a **personal Hobby** account. Do not start a Pro trial or create a paid team.

Official plan references: [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## 2. Create Firestore and lock browser access

1. In your Firebase project, open **Build → Firestore Database → Create database**.
2. Choose **Standard edition**, a US location, and **Production mode**. Do not enable billing.
3. In Firestore's **Rules** tab, replace the contents with this project's `firestore.rules`, then publish those rules. They deny all browser access. The server uses the Admin SDK and checks private host/player identities before every operation.
4. The app uses the `lobbies` collection and reads documents by ID. No composite index is required. `firestore.indexes.json` also exempts lobby data from unnecessary automatic indexing; this can be applied with Firebase CLI later.

The original `rooms` collection is not used for online access. The classic demo uses browser storage.

## 3. Configure server credentials locally

1. Firebase **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**.
2. Save that JSON file outside the project folder. Do not send it in chat or commit it to GitHub.
3. Open the ignored `.env.local` file in the project (copy `.env.example` if it doesn't exist).
4. Set these three values from the downloaded JSON:

| Environment variable | JSON property |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` |
| `FIREBASE_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_PRIVATE_KEY` | `private_key` |

Quote the private key and preserve its escaped `\n` newlines, including the BEGIN/END lines. Never use a `NEXT_PUBLIC_` prefix for these values. The app does not need a Firebase web API key or a student authentication account.

Reference: [Firebase server SDK setup](https://firebase.google.com/docs/admin/setup).

## 4. Verify before publishing

Use Node 22 LTS (configured in `package.json` for hosting):

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run test:firebase
```

`test:firebase` explicitly runs the real HTTP flow against your configured Firestore: it creates two temporary test lobbies, tests 22 concurrent joins with a twenty-player cap, role isolation, saving, voting, comments, remixing and resetting, then removes only those test lobbies. It prints no credential values. Ordinary `npm test` runs offline without Firebase.

For the browser check, start `npm run dev` and run `npm run test:browser` in another terminal. The browser check uses fresh Chrome profiles and an isolated test-only API repository; it does not create cloud data. It exercises local practice and three separate online identities, invite links, chat, autosave/reload, voting, revealed feedback, remixing and resetting. Google Chrome must be installed (or configure Playwright's browser setup).

After the real Firebase test passes, start the local app with those credentials and run one short rehearsal across three browser profiles. `/api/lobbies` should return `{"online":true}`. Do not share `.env.local` or your private host session.

## 5. Publish on Vercel Hobby only after verification

1. Push the tested source to the existing GitHub repository on the intended deployment branch.
2. In your personal Vercel dashboard, **Add New → Project → Import Git Repository** for `JeremyChen212/FlipThis`. Framework: **Next.js**. Node: **22.x**. Install: `npm ci`. Build: `npm run build`.
3. Add the three server-only environment values from step 3 to Vercel. For the private key value in the dashboard, paste the full value with its actual newlines (the server also accepts escaped newlines).
4. Deploy on **Hobby**, without a trial, billing account, upgrade, custom paid domain, Firebase Hosting, Cloud Functions, or storage add-ons.
5. Open the HTTPS address, create a lobby, and share its six-character code or invite URL. Check that unauthenticated classmates can reach the landing page: Vercel Deployment Protection must not require classmates to sign into Vercel for the production address.
6. Test three separate devices: join, refresh/reconnect, exchange chat, submit, vote, reveal feedback, remix, and form a crew. Check that a player cannot open the host panel or issue a host-only API action.

Use Git import rather than a CLI source upload: the audio library is about 102 MiB, and Vercel documents a 100 MB Hobby CLI source-upload limit. Git-based import avoids that CLI upload path. If the provider reports a limit, stop and adjust packaging rather than enabling billing. [Vercel limits](https://vercel.com/docs/limits).

## How joining and reconnecting work

- A host creates a named lobby and receives a six-character code plus invite link.
- Up to twenty players get seats atomically. A twenty-first player gets a lobby-full message.
- Lobby IDs separate chat, sounds, beats, votes and crews. Rooms persist in Firestore across server restarts.
- Each host/player gets a random private token, kept in their browser. The server stores only its digest. Invite links contain the room code, never a host token.
- Returning on the same browser/device preserves the saved identity and seat, even in a full or started battle. Closing and reopening a tab works; clearing browser storage or switching devices loses that identity.
- New joins close when the host starts the battle. Existing members can reconnect in any phase.
- The host's reset preserves the lobby link and real player memberships, clears the finished battle, and reshuffles sounds. It drops demo players. Clearing a specific seat revokes its old token and frees the spot.
- Beat and remix drafts also save locally, retry interrupted saves, and are scoped to room, battle, seat and remix partner. A stale draft cannot overwrite the next battle.
- Online clients poll approximately every two seconds, with slower background polling and retry backoff. No WebSocket server is needed. Mutation requests are serialized and validated server-side.
- Local practice uses the same ownership/phase logic with browser storage and Web Locks. The original HOST/PLAYER1–PLAYER20 demo remains available under “Classic single-device demo.” Local practice works between tabs on the same browser/origin, not different devices.

## Free-tier limits

Firestore documents a free daily quota of 50,000 reads and 20,000 writes. A fifteen-minute session with twenty foreground players and a host polling every two seconds is roughly 9,450 polling reads, plus transaction reads and writes. Actual usage also depends on edits, chat, retries, rehearsal count and document size. Check Firebase's Usage tab between rehearsals. With billing disabled, stop or wait for quotas to reset rather than upgrading. [Firestore quotas](https://firebase.google.com/docs/firestore/quotas).

Vercel Hobby is intended for personal, non-commercial projects and enforces usage limits. Use it for this class prototype without enabling paid options. Neither these setup files nor any test enables billing. Delete test/course rooms from the Firebase console when no longer needed; no paid TTL feature is configured.
