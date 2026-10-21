# Set up your own Counterweight

This repo gives you a complete EA hiring pipeline on free infrastructure you own: a public assessment site (video gate + working-style assessment), a database of every submission, a hiring dashboard, and optional emailed results. Nothing is shared with anyone else; your candidates' data lives in your own accounts.

The fastest way through this file: open it in Claude Code and say **"Set this up for me following SETUP.md."** Everything below is written so Claude can execute it, and so a person can follow it by hand.

## What you need

- A GitHub account (free)
- A Supabase account at supabase.com (free tier is plenty)
- About 15 minutes
- Optional, for emailed results: a Resend account at resend.com (free tier)

## Steps

### 1. Get your own copy of this repo

Fork this repository on GitHub (or create a new **public** repo and copy these files in). Public is required for free GitHub Pages. Clone it locally.

### 2. Create a Supabase project

In the Supabase dashboard, create a new project (any name, any region). Note the project ref: the short id in your project URL, like `abcdefghijklmnop` in `https://abcdefghijklmnop.supabase.co`.

### 3. Create the database schema

Run the SQL in `supabase/migrations/20261021000001_init.sql` against your project: paste it into the Supabase SQL Editor and run it, or use the Supabase CLI (`supabase db push`) or the Supabase MCP (`apply_migration`). It creates two tables with row-level security on and no public policies, so your public API keys can never touch the data.

### 4. Fill in the two placeholders

Open `supabase/functions/counterweight/index.ts` and replace:

- `REPLACE_WITH_YOUR_OWN_RANDOM_KEY` with a random string of 30 or more characters. This is your dashboard password. Generate one; do not reuse a password.
- `REPLACE_WITH_YOUR_GITHUB_PAGES_URL/` with your Pages URL including the trailing slash: `https://<your-github-username>.github.io/<repo-name>/`

### 5. Deploy the function

Deploy with JWT verification **off** (the function does its own auth; the public routes are meant to be public):

```
supabase functions deploy counterweight --no-verify-jwt --project-ref <your-ref>
```

Or deploy through the Supabase MCP (`deploy_edge_function` with `verify_jwt: false`).

### 6. Point the site at your function

Edit `config.js` (one line): set `window.CW_API` to `https://<your-ref>.supabase.co/functions/v1/counterweight`.

### 7. Go live on GitHub Pages

Commit everything and push, then push a branch named `gh-pages` with the same content:

```
git push origin main
git push origin main:gh-pages
```

Pushing `gh-pages` enables GitHub Pages automatically on a public repo. A minute or two later your site is live at `https://<your-github-username>.github.io/<repo-name>/`.

### 8. Configure and calibrate

- Open `https://<your-site>/dash.html?key=<your random key>` and, under Settings, set your calendar booking link (Calendly or similar) and a fallback email for results.
- On the main page, take the 5-minute leader calibration. Give your email there: candidate results get sent to it. The final screen gives you **your candidate link**; that is what you send applicants.

### 9. Optional: emailed results

Create a free account at resend.com, make an API key, and set it as a function secret:

```
supabase secrets set RESEND_API_KEY=<your key> --project-ref <your-ref>
```

Two Resend facts to know: until you verify a domain there, emails only deliver to the email address on your Resend account, and they send from `onboarding@resend.dev`. Verify your own domain in Resend to deliver to any leader's email and send from your own address (then set `from_email` through the dashboard settings action).

## Good to know

- **The repo is public.** The page source, assessment questions, interview questions, and test-project briefs are visible to anyone who looks. Candidates see the questions anyway; the live interview and test project are where pretenders fall out.
- **The dashboard key is a link password,** good against casual visitors, not a vault. Everything truly sensitive is server-side behind Supabase row-level security.
- Candidate flow: video link first (3 minutes, five questions), which unlocks the assessment; completed results are scored against **your** calibration and, with Resend set up, emailed to you.
- Built by [Taste Network](https://tastenetwork.com) on the Buy Back Your Time hiring frameworks. Use it well: never skip a step, never reorder them, and remember the score is a data point, not the decision.
