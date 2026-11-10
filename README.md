# Benchwork

A free training site that takes people from zero to AI engineer: a placement, a dated plan at their hours,
15 courses with lessons and coding exercises that run in the browser, a question bank, three portfolio projects with
peer review, accountability partners, XP and streaks, and an AI tutor.

**Setting it up:** follow [SETUP.md](SETUP.md).

## How it fits together

| Part | Where | What it does |
|---|---|---|
| The app | `src/app/*.js`, built into `public/app.js` | Every screen: Today, Courses, Plan, Practice, Projects, Cohort, Log, Toolkit, Settings, Admin |
| Sign-in and data layer | `src/platform/`, built into `public/platform.js` | Email and password, Google, confirmation, password reset; a small document API over Supabase with live updates |
| Python and SQL in the browser | `public/runner.js`, `public/harness.txt` | Pyodide and sql.js in a Web Worker, with tests per exercise |
| Interview room | `src/app/03b-interview.js`, `api/interviewer.js`, `api/jobs.js`, `api/job-fetch.js` | Job advert decode, live job search, AI mock interviews (one question at a time, follow-ups), self-reflection, five-dimension scorecards, a STAR storybank |
| API | `api/*.js` (Vercel functions) | Tutor (Claude), data export and deletion, partner emails, owner emails, content loading, public certificates, unsubscribe |
| Scheduled emails | `api/cron/*.js` | Sunday progress email, streak-at-risk and come-back reminders |
| Database | `supabase/schema.sql` | Documents table with row-level security, profiles, certificates, tutor usage, email log |
| Course content | `content/seed`, `content/seedx` | Courses, lessons, exercises and question pools, bundled into `api/_content.js` |

## Who can do what

- **Members** read course content and the cohort board, and write only their own records. Their plan, code and
  progress live under `data/users/<id>/`, which nobody else can read, the site owner included.
- **The owner** (one account, set with `set_owner` in SQL) edits courses, sees members' emails, emails learners and
  sees tutor spend. The website has no way to grant admin.
- **Anyone** can open a certificate link someone has shared.

## Commands

```bash
npm run build     # builds public/ (reads SUPABASE_URL etc. from the environment)
npm run content   # rebuilds api/_content.js after editing content/
npm test          # access rules, API, sign-in and the full learner journey
```
