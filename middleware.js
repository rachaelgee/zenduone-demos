/*
 * Passcode gate for the ZenduONE sales kit.
 * Every demo, deck and brochure has its own passcode. The right code unlocks that item only, for 30 days.
 * Codes live in the project's Vercel environment variables, never in this file:
 *   SALES_KIT_PASSCODES  JSON, e.g. {"shuttle":"...","deck-waste":"..."}  ("all" = internal code that opens everything, including the home page)
 *   SALES_KIT_SECRET     random string used to sign the "unlocked" cookies
 * Changing a code locks out everyone who used the old one. Redeploy after changing a variable.
 */
export const config = {
  matcher: ['/((?!vendor/|img/|favicon\\.ico|favicon\\.svg|apple-touch-icon\\.png).*)'],
};

const DAYS = 30;

// item key -> [name shown on the passcode screen, every path that serves it]
const ITEMS = {
  'shuttle':          ['School & Shuttle demo', ['/shuttle', '/zenbus-shuttle-prototype']],
  'waste':            ['Waste demo', ['/waste', '/zenduwork-waste-prototype']],
  'waste-simulation': ['Waste live simulation', ['/waste-simulation', '/zenduwork-waste-simulation']],
  'airport':          ['Airport demo', ['/airport', '/zenduone-airport-prototype']],
  'live-map':         ['Live Map demo', ['/live-map', '/zenduone-live-map-prototype']],
  'fleet-safety':     ['Fleet safety demo', ['/fleet-safety', '/zenduone-fleet-safety-prototype', '/driver-safety', '/zenduone-driver-safety-prototype']],
  'maintenance':      ['Maintenance demo', ['/maintenance', '/zenduone-maintenance-prototype']],
  'deck-school-bus':  ['School Bus seller deck', ['/deck/school-bus', '/seller-deck-school-bus', '/deck/school-shuttle', '/seller-deck-school-shuttle']],
  'deck-shuttle':     ['Shuttle seller deck', ['/deck/shuttle', '/seller-deck-shuttle']],
  'deck-waste':       ['Waste seller deck', ['/deck/waste', '/seller-deck-waste']],
  'brochure-zenbus':  ['School Bus brochure', ['/brochure/zenbus', '/brochure-zenbus']],
  'brochure-waste':   ['Waste brochure', ['/brochure/waste', '/seller-brochure-waste']],
};

function itemFor(pathname) {
  let p = decodeURIComponent(pathname).toLowerCase().replace(/\/+$/, '').replace(/\.html$/, '');
  for (const [key, [, paths]] of Object.entries(ITEMS)) if (paths.includes(p)) return key;
  return 'all'; // the home page and anything else: internal code only
}

function codes() {
  try { return JSON.parse(process.env.SALES_KIT_PASSCODES || '{}'); } catch (e) { return {}; }
}

const enc = new TextEncoder();
async function sign(text) {
  const secret = process.env.SALES_KIT_SECRET || '';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
// the cookie is tied to the current code, so changing a code revokes every old cookie
async function token(key, code, exp) { return exp + '.' + await sign(key + '|' + exp + '|' + code); }
async function valid(key, code, value) {
  if (!code || !value) return false;
  const exp = Number(value.split('.')[0]);
  if (!exp || exp < Date.now()) return false;
  return same(value, await token(key, code, exp));
}
function cookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : '';
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const key = itemFor(url.pathname);
  const all = codes();
  if (!process.env.SALES_KIT_SECRET || !Object.keys(all).length) {
    return new Response('This page is not available right now.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const itemCode = key === 'all' ? '' : all[key];
  const allCode = all.all;

  // passcode submitted
  if (request.method === 'POST' && url.searchParams.has('__unlock')) {
    let code = '';
    // read the body as text: request.formData() isn't reliable in Vercel's middleware runtime
    try { code = String(new URLSearchParams(await request.text()).get('code') || '').trim(); } catch (e) {}
    const hit = (itemCode && same(code.toLowerCase(), String(itemCode).toLowerCase())) ? key
      : (allCode && same(code.toLowerCase(), String(allCode).toLowerCase())) ? 'all' : '';
    if (!hit) {
      await new Promise((r) => setTimeout(r, 900)); // slow down guessing
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    const exp = Date.now() + DAYS * 864e5;
    const value = await token(hit, hit === 'all' ? allCode : itemCode, exp);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'Set-Cookie': 'zk_' + hit + '=' + value + '; Path=/; Max-Age=' + DAYS * 86400 + '; HttpOnly; Secure; SameSite=Lax',
      },
    });
  }

  // already unlocked?
  if (itemCode && await valid(key, itemCode, cookie(request, 'zk_' + key))) return;
  if (allCode && await valid('all', allCode, cookie(request, 'zk_all'))) return;

  return new Response(gate(key === 'all' ? 'ZenduONE sales kit' : ITEMS[key][0]), {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

function gate(title) {
  const t = title.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${t}</title>
<link rel="icon" href="/favicon.ico?v=2" sizes="any"><link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<style>
:root{--ink:#011835;--muted:#5B6B80;--line:#DCE5F0;--blue:#136AB6;--bg:#F3F7FC;--err:#C01048}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{background:radial-gradient(1200px 600px at 50% -10%,#E3F0FB 0,var(--bg) 60%);color:var(--ink);font:16px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.card{width:100%;max-width:420px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:36px 32px 28px;box-shadow:0 24px 60px -24px rgba(1,24,53,.25)}
.logo{display:block;height:22px;width:auto;margin-bottom:28px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);margin:0 0 6px}
h1{font-size:24px;line-height:1.2;margin:0 0 8px;font-weight:650;letter-spacing:-.01em}
p.hint{margin:0 0 22px;color:var(--muted);font-size:15px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
.row{display:flex;gap:8px}
input{flex:1;min-width:0;height:46px;border:1.5px solid var(--line);border-radius:12px;padding:0 14px;font:inherit;color:var(--ink);background:#fff;outline:none}
input:focus{border-color:var(--blue);box-shadow:0 0 0 4px rgba(19,106,182,.15)}
button{height:46px;padding:0 20px;border:0;border-radius:12px;background:var(--blue);color:#fff;font:600 15px/1 inherit;font-family:inherit;cursor:pointer}
button:disabled{opacity:.6;cursor:default}
.err{min-height:22px;margin:10px 0 0;color:var(--err);font-size:14px}
.foot{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
</style></head><body>
<main class="card">
<img class="logo" src="/img/zenduone-logo.png" alt="ZenduONE">
<p class="eyebrow">Protected link</p>
<h1>${t}</h1>
<p class="hint">Enter the passcode you were given to open it.</p>
<form id="f" method="post" action="?__unlock=1">
<label for="code">Passcode</label>
<div class="row"><input id="code" name="code" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required autofocus><button id="b" type="submit">Open</button></div>
<p class="err" id="e" role="alert" aria-live="polite"></p>
</form>
<p class="foot">Don't have a passcode? Ask the person who shared this link with you.</p>
</main>
<script>
var f=document.getElementById('f'),b=document.getElementById('b'),e=document.getElementById('e'),i=document.getElementById('code');
f.addEventListener('submit',function(ev){ev.preventDefault();b.disabled=true;e.textContent='';
fetch(location.pathname+'?__unlock=1',{method:'POST',body:new URLSearchParams({code:i.value}),credentials:'same-origin'})
.then(function(r){if(r.ok){location.reload();return;}b.disabled=false;e.textContent='That passcode doesn\\u2019t match. Check it and try again.';i.select();})
.catch(function(){b.disabled=false;e.textContent='Something went wrong. Try again.';});});
</script></body></html>`;
}
