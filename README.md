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
| Reminders | `api/cron/*.js`, `api/_nudge.js`, `.github/workflows/nudge.yml` | Sunday progress email; Duolingo-style reminders at four strengths, by phone or browser notification or email, checked hourly in each member's time zone |
| Career | `src/app/03d-career.js` | Applications tracker with dates and calendar files, CV review, "tell me about yourself" pitch, real-interview debrief, comparing adverts |
| Community safety | `src/app/03c-trust.js`, `api/admin-moderate.js` | Cohorts and invite codes, report and block, notifications, the owner's reports queue, suspensions, errors and system check |
| Course editor | `src/app/03e-editor.js` | Form-based editing of courses, lessons, exercises and the quiz bank; exercises are run before saving |
| Library | `content/aefs/`, `src/app/03g-library.js`, `scripts/import-aefs.mjs` | 542 lessons with quizzes, 51 NumPy coding problems with their own checks, a 482-question interview bank, career specialisms, 78 project challenges and a glossary, imported from [AI Engineering from Scratch](https://github.com/rohitg00/ai-engineering-from-scratch) by Rohit Ghumare (MIT licence, notice kept in `content/aefs/LICENSE`). Refresh with `npm run library -- <path to a clone>` |
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
