import { onlineReady, firebaseRooms } from '@/lib/server/firebaseRooms';
import { lobbyHttp } from '@/lib/server/lobbyHttp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: Request, context: { params: Promise<{ code: string }> }) {
  if (!onlineReady()) return Response.json({ error: 'Online rooms are not configured yet.' }, { status: 503 });
  try { return await lobbyHttp(firebaseRooms()).room(request, (await context.params).code); }
  catch { return Response.json({ error: 'Online room configuration needs attention. Please contact the host.' }, { status: 503 }); }
}
export { handle as GET, handle as POST, handle as PATCH };
