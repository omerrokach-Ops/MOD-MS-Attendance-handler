const { app } = require('@azure/functions');

// Node 18/20 has built-in fetch
app.http('redirect', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const url = new URL(request.url);
    let ticket = url.searchParams.get('ticket') || '';
    if (!ticket) {
      try { ticket = (await request.json())?.ticket || ''; } catch {}
    }

    if (!ticket) {
      return { status: 302, headers: { Location: process.env.TEAMS_FALLBACK_URL || '/404' } };
    }

    try {
      const res = await fetch(process.env.MAKE_ATTENDANCE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth': process.env.MAKE_SHARED_SECRET || ''
        },
        body: JSON.stringify({
          ticket,
          ip: request.headers.get('x-forwarded-for') || '',
          ua: request.headers.get('user-agent') || '',
          ts: new Date().toISOString()
        })
      });

      let data = {};
      try { data = await res.json(); } catch {}
      const redirectTo = data?.teams_link || process.env.TEAMS_FALLBACK_URL || '/404';
      return { status: 302, headers: { Location: redirectTo } };
    } catch (e) {
      context.log('redirect error', e?.message);
      return { status: 302, headers: { Location: process.env.TEAMS_FALLBACK_URL || '/404' } };
    }
  }
});
