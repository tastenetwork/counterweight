// Counterweight Assessment - Google Sheets edition.
// Paste this file and Index.html into Extensions > Apps Script of any Google Sheet,
// deploy as a Web App (execute as you, access: anyone with the link), and the sheet
// becomes the whole system: the web app serves the assessment, every result lands as
// a row, and completed candidate results are emailed to the leader from your own Gmail.

var RESULTS = "Results";
var PLAYBOOK = "Playbook";
var HEADERS = ["ID","Created","Kind","Stage","Name","Email","Video","Leader ID","Counterweight","Verdict","Starter","Finisher","Detail","Builder","Drive","Connect","Steady","Precise","Samples","Flags","Suggested probes","Five-year picture","Notes"];
var STAGE_LIST = ["1 video in","2 scored - review","3 interview invited","3 interviewed","4 test project out","5 score the finalist","6 sell the future","hired","passed"];
var AXES = ["starter","finisher","detail","builder"];
var AXIS_LABEL = {starter:"Starter",finisher:"Finisher",detail:"Detail",builder:"Builder"};

function doGet(e) {
  ensure_();
  var p = (e && e.parameter) || {};
  var t = HtmlService.createTemplateFromFile("Index");
  t.forJson = JSON.stringify(/^[0-9a-fA-F-]{10,40}$/.test(p["for"] || "") ? p["for"] : null);
  t.modeJson = JSON.stringify(["assess","leader","team"].indexOf(p.mode) >= 0 ? p.mode : null);
  t.urlJson = JSON.stringify(ScriptApp.getService().getUrl());
  return t.evaluate().setTitle("Counterweight Assessment")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function ensure_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(RESULTS);
  if (!sh) {
    sh = ss.insertSheet(RESULTS, 0);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(STAGE_LIST, true).setAllowInvalid(true).build();
    sh.getRange(2, 4, 999, 1).setDataValidation(rule);
  }
  if (!ss.getSheetByName(PLAYBOOK)) {
    var pb = ss.insertSheet(PLAYBOOK);
    var rows = [
      ["THE SIX STEPS - never skip a step, never reorder them"],
      ["1 VIDEO GATE: 3-minute video, five questions, before any call. Check it against the spec: 3 minutes max, all five, in order, link works. Spec violations are the filter working."],
      ["2 PROFILE ASSESSMENT: scored automatically against your calibration. A data point, not the decision."],
      ["3 LIVE INTERVIEW - one structured conversation. Listen for ownership language (I ran, I owned, I caught it) vs task language (I helped with). Capture their five-year picture for step 6. Questions:"],
      ["   - Describe a situation where you had full ownership of an executive's inbox. Not helped with it - owned it. What did that look like day to day?"],
      ["   - Tell me about a time you proactively solved a problem your boss did not know existed yet."],
      ["   - My calendar is my most protected asset. Tell me about a time you said no to someone who wanted your executive's time."],
      ["   - What does definition of done mean to you?"],
      ["   - If you notice a pattern in my workflow creating inefficiency, how do you approach that conversation with me?"],
      ["4 TEST PROJECT - non-negotiable, identical brief for every finalist, paid. Ambiguity on purpose: fourteen clarifying emails is a fail; reasonable assumptions flagged at the end is a pass. Briefs to adapt:"],
      ["   - Scheduling: a 45-minute meeting across your city, Madrid, and Los Angeles next week with three conflicting constraints. Deliver two slots, the assumptions made, and the draft invitation email."],
      ["   - Documents: reorganize a folder of ~25 mixed files to YYYY-MM-DD_project_type_v#, plus a note on what did not fit and what they decided."],
      ["   - Emails: three replies in your voice: a VIP wanting a meeting in a full week, a vendor you underpaid late, a cold pitch declined warmly."],
      ["   - Travel: a 2-day itinerary under budget with flight constraints, a hotel near the venue, one client dinner. Confirmation-ready, nothing purchased."],
      ["5 FINAL SCORECARD - score before you feel. 0-5 on: Known / Proven experience / Proven context / Proven scale / Proven problem set. NO 3s - a 3 is avoiding an opinion. 18 of 25 or you do not have your hire yet. Even if you like them. Especially if you like them."],
      ["6 SELL THE FUTURE - the moment one separates, stop evaluating and start selling: vision, upside, mission, connected to the five-year picture they gave you in step 3. A-players join missions, not job descriptions."],
      ["Built by Taste Network on the Buy Back Your Time hiring frameworks."]
    ];
    pb.getRange(1, 1, rows.length, 1).setValues(rows);
    pb.setColumnWidth(1, 900);
  }
}

function apiApply(d) {
  try {
    ensure_();
    d = d || {};
    var name = String(d.name || "").trim().slice(0, 120);
    var email = String(d.email || "").trim().slice(0, 254);
    var video = String(d.video_url || "").trim().slice(0, 500);
    if (!name) return { ok: false, error: "name is required" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "a valid email is required" };
    if (!/^https?:\/\/\S+\.\S+/.test(video)) return { ok: false, error: "a working video link is required" };
    var id = Utilities.getUuid();
    var leaderId = /^[0-9a-fA-F-]{10,40}$/.test(String(d.leader_id || "")) ? d.leader_id : "";
    sheet_().appendRow([id, new Date(), "candidate", "1 video in", name, email, video, leaderId, "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    return { ok: true, id: id };
  } catch (err) { return { ok: false, error: "store error" }; }
}

function apiSubmit(d) {
  try {
    ensure_();
    d = d || {};
    var axes = clean_(d.axes, AXES);
    if (!axes) return { ok: false, error: "bad axes" };
    var style = clean_(d.style, ["drive","connect","steady","precise"]) || { drive: 50, connect: 50, steady: 50, precise: 50 };
    var cog = d.cog && typeof d.cog.right === "number" ? { right: Math.round(d.cog.right), total: Math.round(d.cog.total || 6) } : null;
    var sh = sheet_();
    if (d.id) {
      var rowIdx = findRow_(sh, String(d.id));
      if (!rowIdx) return { ok: false, error: "unknown candidate" };
      var leaderId = sh.getRange(rowIdx, 8).getValue();
      var leader = leaderId ? rowToProfile_(sh, findRow_(sh, String(leaderId))) : latestLeader_(sh);
      var cw = leader ? counterweight_({ axes: axes, style: style, cog: cog }, leader) : null;
      var vals = [["2 scored - review"]];
      sh.getRange(rowIdx, 4, 1, 1).setValues(vals);
      sh.getRange(rowIdx, 9, 1, 15).setValues([[
        cw ? cw.score : "", cw ? cw.verdict : "needs leader calibration",
        axes.starter, axes.finisher, axes.detail, axes.builder,
        style.drive, style.connect, style.steady, style.precise,
        cog ? cog.right + "/" + cog.total : "",
        cw ? cw.flags.join(" | ") : "", cw ? cw.probes.join(" | ") : "", "", ""
      ]]);
      if (leader && leader.email) email_(sh, rowIdx, leader, cw, cog);
      return { ok: true, id: d.id };
    }
    if (d.kind !== "leader" && d.kind !== "team") return { ok: false, error: "bad kind" };
    var name = String(d.name || "").trim().slice(0, 120);
    if (!name) return { ok: false, error: "name is required" };
    var email = String(d.email || "").trim().slice(0, 254);
    var id = Utilities.getUuid();
    sh.appendRow([id, new Date(), d.kind, "2 scored - review", name, email, "", "",
      "", d.kind === "leader" ? "calibration" : "team profile",
      axes.starter, axes.finisher, axes.detail, axes.builder,
      style.drive, style.connect, style.steady, style.precise,
      cog ? cog.right + "/" + cog.total : "", "", "",
      "", Array.isArray(d.needs) ? "Off the plate first: " + d.needs.join(", ") : ""]);
    return { ok: true, id: id };
  } catch (err) { return { ok: false, error: "store error" }; }
}

function sheet_() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESULTS); }
function clean_(v, keys) {
  if (!v || typeof v !== "object") return null;
  var out = {};
  for (var i = 0; i < keys.length; i++) {
    var n = v[keys[i]];
    if (typeof n !== "number" || !(n >= 0 && n <= 100)) return null;
    out[keys[i]] = Math.round(n);
  }
  return out;
}
function findRow_(sh, id) {
  if (!id) return 0;
  var f = sh.getRange(1, 1, sh.getLastRow() || 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
function rowToProfile_(sh, rowIdx) {
  if (!rowIdx) return null;
  var r = sh.getRange(rowIdx, 1, 1, HEADERS.length).getValues()[0];
  if (r[2] !== "leader") return null;
  return { name: r[4], email: r[5],
    axes: { starter: Number(r[10]), finisher: Number(r[11]), detail: Number(r[12]), builder: Number(r[13]) },
    style: { drive: Number(r[14]), connect: Number(r[15]), steady: Number(r[16]), precise: Number(r[17]) } };
}
function latestLeader_(sh) {
  var last = sh.getLastRow();
  for (var i = last; i >= 2; i--) {
    if (sh.getRange(i, 3).getValue() === "leader") return rowToProfile_(sh, i);
  }
  return null;
}

function counterweight_(cand, leader) {
  var ca = cand.axes, la = leader.axes;
  var cog = cand.cog || { right: 0, total: 6 };
  var style = cand.style;
  var gaps = AXES.filter(function (a) { return la[a] < 45; });
  var gapAxes = gaps.length ? gaps : ["finisher", "detail"];
  var coverage = gapAxes.reduce(function (s, a) { return s + ca[a]; }, 0) / gapAxes.length;
  var peaks = AXES.filter(function (a) { return la[a] >= 70; });
  var collide = 1;
  if (peaks.length) {
    var pen = peaks.reduce(function (s, a) { return s + Math.min(1, Math.max(0, ca[a] - 60) / 40); }, 0) / peaks.length;
    collide = 1 - pen;
  }
  var score = Math.round(coverage * 0.5 + collide * 20 + (cog.right / cog.total) * 14 + Math.min(ca.finisher, 70) / 70 * 8 + Math.min(style.precise, 70) / 70 * 8);
  var flags = [];
  if (cog.right < 3) flags.push("Below the accuracy floor: " + cog.right + " of " + cog.total + " work samples");
  if (ca.finisher < 40) flags.push("Low Finisher (" + ca.finisher + "): the axis the role exists to cover");
  if ((style.steady + style.precise) / 2 < 40) flags.push("Low Steady and Precise: reliability risk");
  var verdict = score >= 78 ? "strong counterweight - advance" : score >= 60 ? "partial - probe the gaps live" : "not the counterweight";
  if (flags.length && score >= 78) verdict = "partial - probe the gaps live";
  var PROBE = {
    finisher: "Walk me through the last project you personally carried from 80 percent to shipped. What were the final 48 hours like?",
    detail: "Tell me about a time a small detail you caught, or missed, changed an outcome.",
    starter: "When nobody tells you what to do next, what happens? Give me a real week.",
    builder: "What is something you built end to end with your own hands, and what broke first?"
  };
  var probes = [];
  var weakest = gapAxes.slice().sort(function (a, b) { return ca[a] - ca[b]; })[0];
  if (weakest) probes.push(PROBE[weakest]);
  if (cog.right < 5) probes.push("Before advancing, give a short paid test task with written multi-step instructions and a deadline.");
  if (peaks.indexOf("starter") >= 0 && ca.starter > 60) probes.push("You both score high on Starter. Ask who closed the loops at their last job, by name.");
  return { score: score, verdict: verdict, flags: flags, probes: probes.slice(0, 3), gapAxes: gapAxes, coverage: Math.round(coverage) };
}

function email_(sh, rowIdx, leader, cw, cog) {
  try {
    var r = sh.getRange(rowIdx, 1, 1, HEADERS.length).getValues()[0];
    var lines = [
      "New completed assessment for the " + leader.name + " search.", "",
      "Candidate: " + r[4], "Email: " + (r[5] || "-"), "Video: " + (r[6] || "-"), ""
    ];
    if (cw) {
      lines.push("Counterweight score: " + cw.score + " / 100 - " + cw.verdict);
      lines.push("Covers your gap axes (" + cw.gapAxes.map(function (a) { return AXIS_LABEL[a]; }).join(", ") + ") at " + cw.coverage + "%");
    }
    lines.push("Instincts: Starter " + r[10] + " / Finisher " + r[11] + " / Detail " + r[12] + " / Builder " + r[13]);
    if (cog) lines.push("Work samples: " + cog.right + " of " + cog.total + " correct");
    if (cw && cw.flags.length) { lines.push("", "Flags:"); cw.flags.forEach(function (f) { lines.push("- " + f); }); }
    if (cw && cw.probes.length) { lines.push("", "Ask in the live interview:"); cw.probes.forEach(function (p) { lines.push("- " + p); }); }
    lines.push("", "Full pipeline: the Results tab of your sheet. A data point, not the decision.",
      "Watch the video against the spec (3 minutes, all five questions, in order) before inviting.");
    MailApp.sendEmail(leader.email, "Counterweight result: " + r[4] + (cw ? " - " + cw.score : ""), lines.join("\n"));
  } catch (err) { /* email must never break a submission */ }
}
