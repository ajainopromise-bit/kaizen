// KAIZEN reminder sender. Runs on GitHub every few minutes.
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const WINDOW = 120; // minutes after the reminder time that a late reminder may still be sent
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function localNow(tz) {
  let f;
  try { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }); }
  catch (e) { f = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }); }
  const p = {};
  f.formatToParts(new Date()).forEach(x => { p[x.type] = x.value; });
  return { date: p.year + '-' + p.month + '-' + p.day, min: Number(p.hour) * 60 + Number(p.minute), dow: DAYS.indexOf(p.weekday) };
}

(async () => {
  const users = await db.collection('users').get();
  let sent = 0;
  for (const u of users.docs) {
    const d = u.data();
    if (!d.habits || !d.habits.length) continue;
    const mref = u.ref.collection('meta').doc('push');
    const m = await mref.get();
    if (!m.exists) continue;
    const md = m.data();
    let tokens = md.tokens || [];
    if (!tokens.length) continue;
    const now = localNow(md.tz || 'UTC');
    const prev = md.sent || {};
    const next = {};
    Object.keys(prev).forEach(k => { if (prev[k] === now.date) next[k] = prev[k]; });
    for (const h of d.habits) {
      if (!tokens.length) break;
      if (!h.rem || h.paused || !h.days.includes(now.dow) || h.created > now.date) continue;
      if (next[h.id] === now.date) continue;
      if (d.done && d.done[h.id] && d.done[h.id][now.date]) continue;
      const parts = h.rem.split(':');
      const rm = Number(parts[0]) * 60 + Number(parts[1]);
      if (now.min < rm || now.min >= rm + WINDOW) continue;
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        data: { title: 'KAIZEN · ' + h.name, body: 'Time for your habit. Small steps count.', tag: 'kz-' + h.id + '-' + now.date },
        webpush: { headers: { Urgency: 'high', TTL: '3600' } }
      });
      const bad = [];
      res.responses.forEach((r, i) => {
        if (!r.success && r.error && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error.code)) bad.push(tokens[i]);
        else if (!r.success) console.log('send problem:', r.error && r.error.code);
      });
      if (bad.length) {
        await mref.update({ tokens: admin.firestore.FieldValue.arrayRemove(...bad) });
        tokens = tokens.filter(t => !bad.includes(t));
      }
      next[h.id] = now.date;
      sent++;
    }
    await mref.update({ sent: next });
  }
  console.log('Reminders sent:', sent);
})().catch(e => { console.error(e); process.exit(1); });
