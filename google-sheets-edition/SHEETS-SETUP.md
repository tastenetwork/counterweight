# Counterweight on a Google Sheet — the 5-minute setup

This edition needs only a Google account. The spreadsheet becomes the whole system: it serves the assessment page, stores every result as a row, and emails completed candidate results to the hiring leader from your own Gmail. No Supabase, no GitHub, no hosting, no email service.

You can hand this file to Claude and say "walk me through it" — but it is genuinely five steps.

## Set it up

1. **Create a Google Sheet** (or open the template sheet you were given and do File > Make a copy — a copy carries the script with it, so copies skip step 2).
2. **Attach the script.** In the sheet: Extensions > Apps Script. Delete whatever is in the editor, then create two files matching the two in this folder:
   - `Code.gs` — paste the contents of `Code.gs`
   - `Index.html` — click + > HTML, name it exactly `Index`, paste the contents of `Index.html`
   Save.
3. **Deploy.** In the Apps Script editor: Deploy > New deployment > type: Web app. Set **Execute as: Me** and **Who has access: Anyone**. Click Deploy and authorize when Google asks (it is your own script writing to your own sheet and sending mail as you). Copy the Web app URL.
4. **Calibrate.** Open the Web app URL, choose "I am the one hiring," and take the 5-minute calibration. Give your email there: that is where candidate results get sent. The final screen gives you **your candidate link** — copy it.
5. **Send the candidate link to applicants.** That is the system running.

## What happens from there

- Every applicant hits the video gate first (3-minute video, five fixed questions), which unlocks the 13-minute assessment. Skipping or fumbling the video instructions is the filter working.
- Each completed assessment appears as a row in the **Results** tab, scored as a counterweight against your calibration, and lands in your inbox with the score, flags, and suggested interview questions.
- Run the rest of the hire from the sheet: the **Stage** column is a dropdown (video in → scored → interview → test project → scorecard → sell the future → hired/passed), and the **Playbook** tab holds the full six-step process, the interview questions, and the test project briefs.
- The score is a data point, not the decision. 18 of 25 on the final scorecard or you do not have your hire yet.

## Notes

- Emails send from your own Google account (daily quota applies: 100 on consumer Gmail, more on Workspace — plenty for hiring).
- If you update the script later, use Deploy > Manage deployments > edit > New version, or your changes will not be live.
- Want the full web dashboard, a prettier URL, and a real database instead? That is the main edition of this repo: see `SETUP.md` (free GitHub Pages + free Supabase, about 15 minutes).

Built by [Taste Network](https://tastenetwork.com).
