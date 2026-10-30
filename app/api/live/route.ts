import pg from 'pg';

// Server-sent events bridge for Postgres NOTIFY 'academy_content'. Each open tab holds
// one LISTEN connection; the client calls router.refresh() on every event, so a course
// committed by the loader shows up without a reload.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: 'cert-academy-live' });
  await client.connect();
  await client.query('LISTEN academy_content');

  const enc = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => { if (!closed) controller.enqueue(enc.encode(chunk)); };
      send('retry: 3000\n\n');
      client.on('notification', (n) => send(`event: content\ndata: ${n.payload ?? '{}'}\n\n`));
      // Keep proxies and the browser from idling the connection out.
      const ping = setInterval(() => send(': ping\n\n'), 25_000);
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        client.end().catch(() => {});
        try { controller.close(); } catch { /* already closed */ }
      };
      client.on('error', close);
      req.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
