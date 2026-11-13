// Explicit, credentialed integration check. Creates two temporary verification
// lobbies, runs the real API flow, then removes only those test documents.
require('@next/env').loadEnvConfig(process.cwd());
const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
if (required.some(key => !process.env[key])) {
  console.error('Firebase verification needs the three server-only values in .env.local. See DEPLOYMENT.md. No credentials or billing settings were changed.');
  process.exit(1);
}
process.env.FLIPTHIS_FIREBASE_TEST = '1';
require('./test-lobbies.cjs');
