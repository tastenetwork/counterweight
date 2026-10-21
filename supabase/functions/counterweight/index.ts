// Counterweight Assessment — data API for the front end (GitHub Pages).
// v4: leader candidate-links (?for=<leader id>), and completed results are
// emailed to the leader (Resend; set the RESEND_API_KEY secret to enable).
// Routes:
//   GET  /                 302 -> the site
//   GET  /dash?key=        302 -> the site's dashboard (key passed through)
//   POST /apply            step 1 video gate: creates the candidate, unlocks the assessment
//   POST /submit           step 2 assessment results ({id,...} for candidates; full body for leader/team/import)
//   POST /action           key-protected pipeline actions: stage moves, notes, scorecard, settings, delete
//   GET  /api/results?key= all rows + settings as JSON
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DASH_KEY = "REPLACE_WITH_YOUR_OWN_RANDOM_KEY"; // your dashboard password: 30+ random characters
const TABLE = "cw_responses";
const SITE = "REPLACE_WITH_YOUR_GITHUB_PAGES_URL/"; // e.g. https://yourname.github.io/counterweight/

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { ...CORS, Location: to } });
}
function restHeaders(): HeadersInit {
  return { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };
}

type Row = Record<string, unknown>;
const AX = ["starter", "finisher", "detail", "builder"];
const AX_LABEL: Record<string, string> = { starter: "Starter", finisher: "Finisher", detail: "Detail", builder: "Builder" };
const ST = ["drive", "connect", "steady", "precise"];
const STAGES = ["assessment", "scored", "invited", "interviewed", "test_sent", "test_done", "offer", "hired", "passed"];
const SC_DIMS = ["known", "experience", "context", "scale", "problem"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function numMap(v: unknown, keys: string[]): Record<string, number> | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const k of keys) {
    const n = o[k];
    if (typeof n !== "number" || !isFinite(n) || n < 0 || n > 100) return null;
    out[k] = Math.round(n);
  }
  return out;
}
function cleanScores(b: Row): { axes?: Record<string, number>; style?: Record<string, number> | null; cog?: Record<string, number> | null; err?: string } {
  const axes = numMap(b.axes, AX);
  if (!axes) return { err: "bad axes" };
  const style = b.style == null ? null : numMap(b.style, ST);
  if (b.style != null && !style) return { err: "bad style" };
  let cog: Record<string, number> | null = null;
  if (b.cog != null) {
    const c = b.cog as Record<string, unknown>;
    if (typeof c.right !== "number" || typeof c.total !== "number" || c.right < 0 || c.right > 20 || c.total < 1 || c.total > 20) return { err: "bad cog" };
    cog = { right: Math.round(c.right), total: Math.round(c.total) };
  }
  return { axes, style, cog };
}
async function rest(path: string, init: RequestInit): Promise<Response> {
  return await fetch(SUPABASE_URL + "/rest/v1/" + path, init);
}
async function getSettings(): Promise<Row> {
  const r = await rest("cw_settings?id=eq.main&select=value", { headers: restHeaders() });
  if (!r.ok) return {};
  const rows = await r.json();
  return (rows[0] && rows[0].value) || {};
}

// The Counterweight Score, same math as the dashboard.
function counterweight(cand: Row, leader: Row) {
  const ca = cand.axes as Record<string, number>;
  const la = leader.axes as Record<string, number>;
  const cog = (cand.cog as Record<string, number>) || { right: 0, total: 6 };
  const style = (cand.style as Record<string, number>) || { drive: 50, connect: 50, steady: 50, precise: 50 };
  const lstyle = (leader.style as Record<string, number>) || null;
  const gaps = AX.filter((a) => la[a] < 45);
  const gapAxes = gaps.length ? gaps : ["finisher", "detail"];
  const coverage = gapAxes.reduce((s, a) => s + ca[a], 0) / gapAxes.length;
  const peaks = AX.filter((a) => la[a] >= 70);
  let collide = 1;
  if (peaks.length) {
    const pen = peaks.reduce((s, a) => s + Math.min(1, Math.max(0, ca[a] - 60) / 40), 0) / peaks.length;
    collide = 1 - pen;
  }
  const score = Math.round(coverage * 0.5 + collide * 20 + (cog.right / cog.total) * 14 + Math.min(ca.finisher, 70) / 70 * 8 + Math.min(style.precise, 70) / 70 * 8);
  const flags: string[] = [];
  if (cog.right < 3) flags.push("Below the accuracy floor: " + cog.right + " of " + cog.total + " on the work samples");
  if (ca.finisher < 40) flags.push("Low Finisher (" + ca.finisher + "): this is the axis the role exists to cover");
  if ((style.steady + style.precise) / 2 < 40) flags.push("Low Steady and Precise: reliability risk for an EA seat");
  let verdict = score >= 78 ? "strong counterweight - advance" : score >= 60 ? "partial - probe the gaps live" : "not the counterweight";
  if (flags.length && score >= 78) verdict = "partial - probe the gaps live";
  const probes: string[] = [];
  const weakest = [...gapAxes].sort((a, b) => ca[a] - ca[b])[0];
  const PROBE: Record<string, string> = {
    finisher: "Walk me through the last project you personally carried from 80 percent to shipped. What were the final 48 hours like?",
    detail: "Tell me about a time a small detail you caught, or missed, changed an outcome.",
    starter: "When nobody tells you what to do next, what happens? Give me a real week.",
    builder: "What is something you built end to end with your own hands, and what broke first?",
  };
  if (weakest) probes.push(PROBE[weakest]);
  if (cog.right < 5) probes.push("Before advancing, give a short paid test task with written multi-step instructions and a deadline.");
  if (peaks.includes("starter") && ca.starter > 60) probes.push("You both score high on Starter. Ask who closed the loops at their last job, by name.");
  if (lstyle && lstyle.drive >= 70 && style.drive >= 70) probes.push("Two strong drivers can collide. Ask about working for a forceful founder: what did they push back on, and how did it go?");
  return { score, verdict, flags, probes: probes.slice(0, 3), gapAxes, coverage: Math.round(coverage) };
}

// Email the completed result to the leader (or the fallback address). Never fails the submit.
async function sendResultEmail(cand: Row): Promise<void> {
  try {
    const KEY = Deno.env.get("RESEND_API_KEY");
    if (!KEY) return;
    const settings = await getSettings();
    let leader: Row | null = null;
    if (typeof cand.leader_id === "string" && UUID_RE.test(cand.leader_id)) {
      const r = await rest(TABLE + "?id=eq." + cand.leader_id + "&kind=eq.leader&select=*", { headers: restHeaders() });
      if (r.ok) { const rows = await r.json(); leader = rows[0] || null; }
    }
    if (!leader) {
      const r = await rest(TABLE + "?kind=eq.leader&select=*&order=created_at.desc&limit=1", { headers: restHeaders() });
      if (r.ok) { const rows = await r.json(); leader = rows[0] || null; }
    }
    if (!leader || !leader.axes) return;
    const dest = (typeof leader.email === "string" && leader.email) ? leader.email : (typeof settings.notify_email === "string" ? settings.notify_email : "");
    if (!dest) return;
    const cw = counterweight(cand, leader);
    const ca = cand.axes as Record<string, number>;
    const cog = (cand.cog as Record<string, number>) || { right: 0, total: 6 };
    const lines = [
      "New completed assessment for the " + (leader.name || "") + " search.",
      "",
      "Candidate: " + cand.name,
      "Email: " + (cand.email || "-"),
      "Video: " + (cand.video_url || "-"),
      "",
      "Counterweight score: " + cw.score + " / 100 - " + cw.verdict,
      "Covers your gap axes (" + cw.gapAxes.map((a) => AX_LABEL[a]).join(", ") + ") at " + cw.coverage + "%",
      "Instincts: " + AX.map((a) => AX_LABEL[a] + " " + ca[a]).join(" / "),
      "Work samples: " + cog.right + " of " + cog.total + " correct",
    ];
    if (cw.flags.length) lines.push("", "Flags:", ...cw.flags.map((f) => "- " + f));
    if (cw.probes.length) lines.push("", "Ask in the live interview:", ...cw.probes.map((p) => "- " + p));
    lines.push("", "A data point, not the decision. Watch the video against the spec (3 minutes, all five questions, in order) before inviting.", "", "- The Counterweight hiring system");
    const from = typeof settings.from_email === "string" && settings.from_email ? settings.from_email : "Counterweight <onboarding@resend.dev>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [dest], subject: "Counterweight result: " + cand.name + " - " + cw.score, text: lines.join("\n") }),
    });
  } catch (_e) { /* email must never break a submission */ }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const m = url.pathname.match(/counterweight(\/.*)?$/);
  const sub = (m && m[1]) || "/";

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (req.method === "GET" && (sub === "/" || sub === "")) return redirect(SITE);
  if (req.method === "GET" && sub === "/dash") {
    const k = url.searchParams.get("key");
    return redirect(SITE + "dash.html" + (k ? "?key=" + encodeURIComponent(k) : ""));
  }

  if (req.method === "POST" && (sub === "/apply" || sub === "/submit" || sub === "/action")) {
    if ((Number(req.headers.get("content-length")) || 0) > 25000) return json({ ok: false, error: "too large" }, 413);
    let b: Row;
    try { b = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

    if (sub === "/apply") {
      const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
      const email = typeof b.email === "string" ? b.email.trim().slice(0, 254) : "";
      const video = typeof b.video_url === "string" ? b.video_url.trim().slice(0, 500) : "";
      if (!name) return json({ ok: false, error: "name is required" }, 400);
      if (!EMAIL_RE.test(email)) return json({ ok: false, error: "a valid email is required" }, 400);
      if (!/^https?:\/\/\S+\.\S+/.test(video)) return json({ ok: false, error: "a working video link is required" }, 400);
      const leader_id = (typeof b.leader_id === "string" && UUID_RE.test(b.leader_id)) ? b.leader_id : null;
      const row = { name, email, kind: "candidate", video_url: video, leader_id, stage: "assessment", source: "web", user_agent: (req.headers.get("user-agent") || "").slice(0, 300) };
      const r = await rest(TABLE, { method: "POST", headers: { ...restHeaders(), Prefer: "return=representation" }, body: JSON.stringify(row) });
      if (!r.ok) return json({ ok: false, error: "store error" }, 502);
      const rows = await r.json();
      return json({ ok: true, id: rows[0]?.id ?? null }, 201);
    }

    if (sub === "/submit") {
      const sc = cleanScores(b);
      if (sc.err) return json({ ok: false, error: sc.err }, 400);
      if (typeof b.id === "string") {
        if (!UUID_RE.test(b.id)) return json({ ok: false, error: "bad id" }, 400);
        const patch = { axes: sc.axes, style: sc.style, cog: sc.cog, stage: "scored", updated_at: new Date().toISOString() };
        const r = await rest(TABLE + "?id=eq." + b.id + "&kind=eq.candidate", { method: "PATCH", headers: { ...restHeaders(), Prefer: "return=representation" }, body: JSON.stringify(patch) });
        if (!r.ok) return json({ ok: false, error: "store error" }, 502);
        const rows = await r.json();
        if (!rows.length) return json({ ok: false, error: "unknown candidate" }, 404);
        await sendResultEmail(rows[0]);
        return json({ ok: true, id: b.id }, 200);
      }
      const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
      if (!name) return json({ ok: false, error: "name is required" }, 400);
      const kind = b.kind;
      const isImport = b.source === "code-import";
      if (kind !== "leader" && kind !== "team" && !(kind === "candidate" && isImport)) return json({ ok: false, error: "bad kind" }, 400);
      let email: string | null = null;
      if (typeof b.email === "string" && b.email.trim()) {
        email = b.email.trim().slice(0, 254);
        if (!EMAIL_RE.test(email)) return json({ ok: false, error: "bad email" }, 400);
      }
      let needs: string[] | null = null;
      if (Array.isArray(b.needs)) needs = b.needs.slice(0, 6).map((x) => String(x).slice(0, 120));
      const video = typeof b.video_url === "string" ? b.video_url.trim().slice(0, 500) : null;
      const row = { name, email, kind, axes: sc.axes, style: sc.style, cog: sc.cog, needs, video_url: video, stage: "scored", source: isImport ? "code-import" : "web", user_agent: (req.headers.get("user-agent") || "").slice(0, 300) };
      const r = await rest(TABLE, { method: "POST", headers: { ...restHeaders(), Prefer: "return=representation" }, body: JSON.stringify(row) });
      if (!r.ok) return json({ ok: false, error: "store error" }, 502);
      const rows = await r.json();
      return json({ ok: true, id: rows[0]?.id ?? null }, 201);
    }

    if (sub === "/action") {
      if (b.key !== DASH_KEY) return json({ ok: false, error: "unauthorized" }, 401);
      if (b.settings && typeof b.settings === "object") {
        const s = b.settings as Record<string, unknown>;
        const cur = await getSettings();
        const next: Row = { ...cur };
        if (s.booking_url != null) {
          const v = String(s.booking_url).trim().slice(0, 500);
          if (v && !/^https?:\/\/\S+\.\S+/.test(v)) return json({ ok: false, error: "bad booking url" }, 400);
          next.booking_url = v;
        }
        if (s.notify_email != null) {
          const v = String(s.notify_email).trim().slice(0, 254);
          if (v && !EMAIL_RE.test(v)) return json({ ok: false, error: "bad notify email" }, 400);
          next.notify_email = v;
        }
        if (s.from_email != null) next.from_email = String(s.from_email).trim().slice(0, 300);
        const r = await rest("cw_settings", { method: "POST", headers: { ...restHeaders(), Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ id: "main", value: next, updated_at: new Date().toISOString() }) });
        if (!r.ok) return json({ ok: false, error: "store error" }, 502);
        return json({ ok: true });
      }
      if (typeof b.id !== "string" || !UUID_RE.test(b.id)) return json({ ok: false, error: "bad id" }, 400);
      if (b.del === true) {
        const r = await rest(TABLE + "?id=eq." + b.id, { method: "DELETE", headers: restHeaders() });
        if (!r.ok) return json({ ok: false, error: "store error" }, 502);
        return json({ ok: true });
      }
      const set = (b.set && typeof b.set === "object" ? b.set : {}) as Record<string, unknown>;
      const patch: Row = { updated_at: new Date().toISOString() };
      if (set.stage != null) {
        if (!STAGES.includes(String(set.stage))) return json({ ok: false, error: "bad stage" }, 400);
        patch.stage = set.stage;
      }
      if (set.five_year != null) patch.five_year = String(set.five_year).slice(0, 2000);
      if (set.notes != null) patch.notes = String(set.notes).slice(0, 4000);
      if (set.scorecard != null) {
        const sc = set.scorecard as Record<string, unknown>;
        const out: Record<string, number> = {};
        let total = 0;
        for (const d of SC_DIMS) {
          const v = sc[d];
          if (v !== 0 && v !== 1 && v !== 2 && v !== 4 && v !== 5) return json({ ok: false, error: "scorecard values must be 0, 1, 2, 4 or 5 - no 3s" }, 400);
          out[d] = v as number; total += v as number;
        }
        out.total = total;
        patch.scorecard = out;
        patch.stage = total >= 18 ? "offer" : "test_done";
      }
      const r = await rest(TABLE + "?id=eq." + b.id, { method: "PATCH", headers: { ...restHeaders(), Prefer: "return=representation" }, body: JSON.stringify(patch) });
      if (!r.ok) return json({ ok: false, error: "store error" }, 502);
      const rows = await r.json();
      if (!rows.length) return json({ ok: false, error: "unknown id" }, 404);
      return json({ ok: true, stage: rows[0].stage });
    }
  }

  if (req.method === "GET" && sub === "/api/results") {
    if (url.searchParams.get("key") !== DASH_KEY) return json({ ok: false, error: "unauthorized" }, 401);
    const r = await rest(TABLE + "?select=*&order=created_at.desc&limit=2000", { headers: restHeaders() });
    if (!r.ok) return json({ ok: false, error: "store error" }, 502);
    const rows = await r.json();
    const settings = await getSettings();
    return json({ ok: true, count: rows.length, rows, settings });
  }

  return json({ ok: false, error: "not found" }, 404);
});
