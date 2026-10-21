# Build your own Counterweight hiring tool

You were given this document because you are hiring an EA or another key support hire. Drop this whole file into Claude (claude.ai or Claude Code) and say: **"Build this for me."** Ten minutes later you will have your own assessment tool and hiring process, running on your own Google account, with results emailed to you.

What you get:

- A private link you send applicants. It runs a 3-minute video gate, then a 13-minute working-style and work-sample assessment, before anyone touches your calendar.
- Every result lands as a row in a Google Sheet you own, scored against YOUR working profile. You are not looking for another you; you are looking for the person who finishes what you start.
- Each completed candidate is emailed to you automatically, with the score, the red flags, and the exact questions to ask in the live interview.
- The full six-step hiring process built in: video gate, assessment, structured interview, test project, final scorecard, sell the future.

What you need: a Google account. That is all.

---

## Instructions for Claude

You are setting up the Counterweight hiring system for this person, Google Sheets edition. Everything runs inside their own Google account; no other accounts or hosting are needed. Be their guide: do the steps your tools allow, and give exact click-paths for the steps only they can do (Google's script editor and deploy dialog require their clicks).

### 0. Which role are they hiring? Tailor before you build

The default build is for an executive assistant. Ask one question first: "Are you hiring an EA, or a different role? If different, paste the job description."

If they give a job description (director of communications, social media manager, operations, anything):

- **Keep unchanged:** the five video questions, Part one (the 12 instinct pairs), Part two (the 12 workstyle items), and all scoring. That is the counterweight engine and it is role-agnostic by design.
- **Regenerate from the job description:** the six Part three work samples and the four test project briefs. Each work sample keeps the exact same shape as the originals: multiple choice, four or five options, exactly one scored-correct answer, answerable in under a minute, and each one tests one of the six skills in the role's real context: catching a detail, triaging a Monday morning, following a precise instruction, sequencing dependent tasks, a scheduling constraint, and a judgment call under pressure. Each test project brief should simulate two to four hours of the role's real work, with deliberate ambiguity and a clear deliverable.
- **Present everything for approval before building.** Say: "Here are your six assessment questions and your four test project briefs, built from your job description. Does this all look good?" Show each question with its answer options and which answer scores correct. Only after they confirm, apply the changes: in `Index.html`, replace the entries of the `COG` array (keep the structure: `q`, `opts`, `ans` as the zero-based index of the correct option); in `Code.gs`, replace the four test-brief lines inside the Playbook rows. Then continue with the setup below.

If they are hiring an EA, skip this and build as-is.

### 1. Get the two source files

Fetch these from the public repository (curl, web fetch, or have the person open them in a browser and copy the raw contents):

- https://raw.githubusercontent.com/tastenetwork/counterweight/main/google-sheets-edition/Code.gs
- https://raw.githubusercontent.com/tastenetwork/counterweight/main/google-sheets-edition/Index.html

If you have a filesystem, save them locally so the person can copy from clean files.

### 2. Walk them through attaching the script (their clicks)

1. Create a new Google Sheet at sheets.new (any name; this becomes their hiring pipeline).
2. In the sheet: **Extensions > Apps Script**. Delete the starter code in the editor.
3. Paste the contents of `Code.gs` into the existing `Code.gs` file.
4. Click **+ next to Files > HTML**, name the new file exactly `Index` (capital I, no extension), and paste the contents of `Index.html` into it. Save both.

### 3. Deploy (their clicks)

1. In the Apps Script editor: **Deploy > New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
4. Google will ask for authorization and show a "Google hasn't verified this app" screen. This is normal for personal scripts: it is their own code, reading their own sheet, sending mail as them. Click **Advanced > Go to [project name] (unsafe)** and allow.
5. Copy the **Web app URL**. That URL is their assessment site.

### 4. Calibrate and get the candidate link

1. Have them open the Web app URL and choose **"I am the one hiring."**
2. The calibration takes 5 minutes. They must enter their email: candidate results are sent there.
3. The final screen shows **their candidate link** with a copy button. That link, not the bare web app URL, is what they send applicants.

### 5. Confirm it works and explain the system

- A test is fine: open their candidate link, submit any https link as the "video," answer the assessment, and confirm a row appears in the sheet's **Results** tab and an email arrives. Mark that test row "passed" in the Stage dropdown, or delete it.
- Show them around: the **Results** tab is the pipeline (the **Stage** column is a dropdown: video in, scored, interview invited, interviewed, test project out, score the finalist, sell the future, hired, passed). The **Playbook** tab holds the full process: the live interview questions, the test project briefs, and the final scorecard rules.
- Teach the three rules that make it work: never skip a step and never reorder them; the assessment score is a data point, not the decision; and on the final scorecard there are no 3s, and 18 of 25 or they do not have their hire yet.

### Troubleshooting

- Changed the script later? It is not live until **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**.
- No email arriving: confirm the leader calibration included an email, and check spam. Mail sends from their own Google account (consumer Gmail allows 100 emails a day, which is plenty).
- The sheet is the single source of truth. If they want a hosted website version with a web dashboard instead, that exists too: https://github.com/tastenetwork/counterweight (see SETUP.md, needs free GitHub and Supabase accounts).

---

Built by Brady Lowe / [Taste Network](https://tastenetwork.com) on the Buy Back Your Time hiring frameworks, for the NEXT10 community. The source is public at [github.com/tastenetwork/counterweight](https://github.com/tastenetwork/counterweight).
