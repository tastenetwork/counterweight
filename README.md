# Counterweight Assessment

A complete EA hiring pipeline you can run yourself, free: a public candidate site (3-minute video gate, then a 13-minute working-style and work-sample assessment), a database of every submission, a stage-by-stage hiring dashboard, and results emailed to the hiring leader.

The idea that makes it different: candidates are not scored against an ideal. The hiring leader calibrates first (5 minutes, the same core questions), and every candidate is scored as a **counterweight** to that profile. A high quick-start, low follow-through founder does not need another self; they need the person who finishes what they start.

The full process it runs, in order, with no skipping and no reordering: video gate, profile assessment, structured live interview, identical test project, five-dimension scorecard (0 to 5, no 3s, 18 of 25 to advance), then sell the future.

## Files

- `index.html` — the candidate, leader, and team flows
- `dash.html` — the hiring pipeline dashboard (requires your access key)
- `config.js` — one line: the URL of your data API
- `supabase/` — the edge function source and database schema you deploy to your own free Supabase project

## Make your own — two editions

**Google Sheets edition (easiest, recommended for most people):** one Google Sheet runs everything — it serves the assessment, stores results as rows, and emails you each completed candidate from your own Gmail. Needs only a Google account, about 5 minutes. See **[google-sheets-edition/SHEETS-SETUP.md](google-sheets-edition/SHEETS-SETUP.md)**.

**Full web edition:** your own hosted site on free GitHub Pages with a free Supabase database and the stage-by-stage web dashboard. About 15 minutes; written so you can hand it to Claude Code and say "set this up for me." See **[SETUP.md](SETUP.md)**.

Either way, your data stays in your accounts. Nothing here phones home.

Built by [Taste Network](https://tastenetwork.com).
