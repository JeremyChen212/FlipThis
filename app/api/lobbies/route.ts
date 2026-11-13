import { onlineReady, firebaseRooms } from '@/lib/server/firebaseRooms';
import { lobbyHttp } from '@/lib/server/lobbyHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() { return Response.json({ online: onlineReady() }, { headers: { 'Cache-Control': 'no-store' } }); }
export async function POST(request: Request) {
  if (!onlineReady()) return Response.json({ error: 'Online rooms are not configured yet. You can practice in local mode.' }, { status: 503 });
  try { return await lobbyHttp(firebaseRooms()).create(request); }
  catch { return Response.json({ error: 'Online room configuration needs attention. Please contact the host or practice locally.' }, { status: 503 }); }
}
