# Setting up Benchwork

About 40 minutes, once. Everything here is free except the tutor, which costs a few pence per learner per week.
You'll create five accounts: GitHub (you have it), Supabase, Vercel, Anthropic and a Gmail account for sending email.

Keep a note open as you go: you'll collect keys in steps 1, 3, 4 and 5 and paste them all into Vercel in step 6.

---

## 1. Supabase: the database and sign-in

1. Go to [supabase.com](https://supabase.com), sign up with GitHub and click **New project**.
   - Name: `benchwork`. Region: **London (eu-west-2)**, so members' data stays in the UK.
   - Save the database password somewhere safe. You won't need it day to day.
2. When it's ready, open **SQL Editor > New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You should see "Success. No rows returned".
3. In a new query, make yourself the one admin (use the email you'll sign up with):
   ```sql
   select public.set_owner('you@example.com');
   ```
   This works whether you sign up before or after running it. Nobody else can become admin from the website.
4. Open **Project Settings > API** and copy three values into your note:
   - **Project URL** (this is `SUPABASE_URL`)
   - **anon public** key (`SUPABASE_ANON_KEY`)
   - **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`). This one is a master key: it only ever goes into Vercel, never into code or chat.

## 2. Vercel: put the site online

1. Create an empty private repository on GitHub called `benchwork` and push this code to it (Claude can do this for you).
2. Go to [vercel.com](https://vercel.com), sign up with GitHub, click **Add New > Project** and import `benchwork`.
3. Leave the build settings as they are (they come from `vercel.json`). Open **Environment Variables** and add for now:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from step 1
   - `CRON_SECRET`: any long random string, for example from [1password.com/password-generator](https://1password.com/password-generator)
4. Click **Deploy**. Your address will be something like `https://benchwork.vercel.app`. If that name is taken, Vercel adds a suffix; rename the project in **Settings > General** to get a cleaner one.
5. Add `SITE_URL` with that address (no slash at the end) and redeploy (**Deployments > ⋯ > Redeploy**).

## 3. Email: confirmations, password resets and progress emails

A free `vercel.app` address can't send email under its own name, so use a dedicated Gmail account for now. When you buy a domain, switch to Resend (see the end).

1. Create a new Gmail account, for example `benchwork.app@gmail.com`. Don't use your personal one: members will see this address.
2. Turn on 2-Step Verification for it: [myaccount.google.com/security](https://myaccount.google.com/security).
3. Create an app password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Name it `Benchwork` and copy the 16-letter password.
4. **Supabase** (for sign-up confirmations and password resets): **Authentication > Emails > SMTP Settings**, switch on **Enable custom SMTP** and fill in:
   - Sender email: your new Gmail address. Sender name: `Benchwork`
   - Host `smtp.gmail.com`, port `465`, username: the Gmail address, password: the app password
5. Still in **Authentication > Emails > Templates**, paste in the branded templates from [`supabase/email-templates`](supabase/email-templates): `confirm-signup.html` into **Confirm signup**, `reset-password.html` into **Reset password** and `change-email.html` into **Change email address**. Subjects: "Confirm your Benchwork email", "Reset your Benchwork password", "Confirm your new Benchwork email".
6. **Vercel** (for weekly emails, reminders and partner messages): add `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` (the Gmail address) and `SMTP_PASS` (the app password).

Gmail allows about 500 emails a day, which covers a few hundred members.

## 4. Supabase sign-in settings

1. **Authentication > URL Configuration**:
   - Site URL: your Vercel address
   - Redirect URLs: add `https://YOUR-ADDRESS.vercel.app/**` and `http://localhost:3000/**`
2. **Authentication > Providers > Email**: keep **Confirm email** on. Set the minimum password length to 8.
3. **Authentication > Rate Limits**: the defaults are fine.

## 5. Google sign-in

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project called `Benchwork`.
2. **APIs & Services > OAuth consent screen**: choose **External**, app name `Benchwork`, your support email, and add your Vercel address as the app domain. Publish the app (**Publish app**) so anyone can sign in, not just test users.
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**:
   - Type: **Web application**
   - Authorised JavaScript origins: your Vercel address
   - Authorised redirect URIs: `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (Supabase shows this exact address on its Google provider page)
4. Copy the client ID and secret into **Supabase > Authentication > Providers > Google**, switch it on and save.

## 6. The tutor and the last settings

1. Go to [console.anthropic.com](https://console.anthropic.com), add a payment method and create an API key. Set a monthly spend limit under **Limits** (£10 is plenty to start).
2. In Vercel add:
   - `ANTHROPIC_API_KEY`
   - `CONTACT_EMAIL`: the address shown on the privacy notice (the Gmail account is fine)
   - Optional: `TUTOR_DAILY_LIMIT` (questions per member per day, default 40) and `TUTOR_SITE_DAILY_LIMIT` (whole site, default 600), `INTERVIEW_DAILY_CALLS` (interviewer calls per member per day, default 30; a full mock interview uses about 8) and `INTERVIEW_SITE_DAILY_CALLS` (default 300). Also set a monthly spend limit in the Anthropic Console under Limits
3. Redeploy.

## 6b. Live job search (optional, free, 10 minutes)

The Interview room's "Find live AI jobs" works straight away with Remotive and Arbeitnow (remote and European roles). For proper UK coverage, add one or both of these free job-board APIs:

- **Adzuna**: sign up at [developer.adzuna.com](https://developer.adzuna.com), create an app and add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in Vercel.
- **Reed**: register at [reed.co.uk/developers](https://www.reed.co.uk/developers/jobseeker) and add `REED_API_KEY`.

Benchwork doesn't scrape LinkedIn or Indeed: both forbid it and block it. Members can still paste any advert, or a link to a company careers page, which Benchwork reads.

## 6c. Stop bots signing up (5 minutes, free)

Open sign-up means bots can try to create accounts and use up your tutor budget. Cloudflare Turnstile stops them without making people solve puzzles.

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free), open **Turnstile > Add widget**. Name it `Benchwork`, add your Vercel address as the domain, choose **Managed**.
2. Copy the **site key** into Vercel as `TURNSTILE_SITE_KEY`.
3. In **Supabase > Authentication > Attack Protection**, switch on **Captcha protection**, choose Turnstile and paste the **secret key**.
4. Redeploy. Sign-up, sign-in and password resets now check for bots; most people never see a box.

## 6d. Reminders and notifications (10 minutes, free)

Benchwork nags people who skip, Duolingo style. Each member picks how hard in Settings: Off, Gentle, Persistent or Relentless (new sign-ups start on Persistent). Persistent and Relentless send a phone or browser notification when one is switched on, otherwise an email, at most one a day. Nothing goes out between 9pm and 8am in the member's own time zone, nothing once they've logged a session that day, and it backs off to once a week after 14 quiet days.

1. **Notification keys.** On your computer run `npx web-push generate-vapid-keys`. Put the public key in Vercel as `VAPID_PUBLIC_KEY`, the private key as `VAPID_PRIVATE_KEY` (it's a secret: Vercel only, never in chat or the repo) and `mailto:` plus your email as `VAPID_SUBJECT`. Redeploy.
2. **The hourly check.** Vercel's free plan only runs scheduled jobs once a day, so GitHub runs this one. In your repo on GitHub open **Settings > Secrets and variables > Actions > New repository secret** and add `SITE_URL` (your `https://….vercel.app` address) and `CRON_SECRET` (the same value as in Vercel).
3. Open **Actions > Hourly reminders > Run workflow** once to check it: the log ends with something like `{"due":0,"pushed":0,"emailed":0,"failed":0}`.

GitHub pauses scheduled workflows in a repo with no commits for 60 days; it emails you first, and one click on **Enable workflow** restarts it. Without the keys, reminders still work by email. iPhone and iPad users must add Benchwork to their Home Screen before they can turn notifications on; Settings tells them how.

## 6e. Backups (5 minutes, free)

Supabase's free plan has no point-in-time backups, so Benchwork makes its own. Every Sunday evening it emails you an encrypted copy of the whole database; **Admin > Backups** downloads one any time.

1. Make up a long passphrase (16 characters or more, four random words works) and save it in your password manager. Without it the files can't be opened, by you or anyone else.
2. Put it in Vercel as `BACKUP_KEY` and redeploy. **Admin > System check** shows "Backups" in green.
3. Make a Google Drive folder called "Benchwork backups" and drop each Sunday's attachment in. Keep about three months' worth and delete older ones; the privacy notice says so.

**Restoring a backup.** On your computer, in the project folder, with the passphrase and the keys from Supabase > Project Settings > API (the service key stays on your computer, never in the repo or chat):

```
BACKUP_KEY='…' SUPABASE_URL='https://….supabase.co' SUPABASE_SERVICE_ROLE_KEY='…' node scripts/restore.mjs benchwork-backup-2026-11-15.bwbak
```

That checks the file and lists what's in it. Add `--write` to restore. Rows are put back over the live database, so anything deleted or damaged comes back and newer rows are kept. Sign-in accounts live in Supabase Auth, not in the backup: if you ever restore into a brand-new project, members sign up again with the same email and the script lists whose data was skipped. The restore script has been checked against encrypted files but not yet against a live Supabase project, so try it on a spare project first.

## 7. First visit

1. Open your site and sign up with the email you used in `set_owner`. Confirm it from your inbox.
2. You'll see "The course content isn't in the database yet". Click **Load the course content**. This takes a few seconds and happens once.
3. Finish your profile, and you're in. **Admin** appears in the top bar for you only.
4. Open **Admin > System check** and click **Run checks**. Every line should say Working (job search and captcha may say Optional). Click **Send me a test email**.
5. Do the launch checklist below, then share the address. Anyone can sign up.

## Launch checklist

Work through this once, in a private browser window, before sharing the link widely.

- [ ] **Sign up with a second email address** (not your owner one). The confirmation email arrives, the link opens Benchwork, and the welcome screen and tour appear.
- [ ] **Sign in with Google** in another private window.
- [ ] **Forgotten password**: the reset email arrives and the new password works.
- [ ] **Run one Python and one SQL exercise**, and ask the tutor a question.
- [ ] **Do one mock interview** end to end and check the scorecard reads sensibly.
- [ ] **Search live jobs** and read one advert from a careers page link.
- [ ] **Pair your two accounts as partners** and send a cheer: the email arrives at the other address.
- [ ] **Turn on notifications** in Settings > Reminders on your phone (add the site to your Home Screen first on an iPhone) and press **Send me a test**.
- [ ] **Spoken mock interview** in Chrome or Safari: the question is read out, the microphone opens and the report has a Delivery card.
- [ ] **Publish a portfolio** from Career > Portfolio and open the link in a private window.
- [ ] **Download a backup** from Admin > Backups and open it with `node scripts/restore.mjs <file>` (without `--write`).
- [ ] **Report something** from the second account; it shows in Admin > Reports.
- [ ] **Create a cohort** in Admin, open its invite link in a private window and sign up: the new member lands in that cohort.
- [ ] **Download my data** and **delete the test account** from Settings.
- [ ] **UK data protection**: check whether you need to pay the ICO data protection fee at [ico.org.uk/fee](https://ico.org.uk/for-organisations/data-protection-fee/self-assessment/) (a short self-assessment; most people running a site like this do need to pay it). Put your contact address in `CONTACT_EMAIL`.
- [ ] **Have someone read the privacy notice and terms** (`src/pages/`). I wrote them from a template for a free UK site; they aren't legal advice.
- [ ] **Read the courses**. The lessons and quizzes were written with AI help and the exercises are machine-checked, but a person who knows the field should read them. Members' "Report a problem" notes land in Admin > Reports, and the weekly link check opens a GitHub issue when a resource link breaks.

---

## Day to day

- **Problems**: Admin > Reports lists members' reports (people and content). You can remove a review, a shared project or partner messages, and suspend a member, which signs them out and hides them.
- **Errors**: crashes in members' browsers and in the server are listed in Admin > Errors, and you get an email for the first one each hour.

- **Change a course**: edit it in Admin > Content editor, or edit `content/` in the repo, run `npm run content`, push, then click **Reload all courses from the repo** in Admin.
- **Email a learner**: Admin > Members > Email.
- **Scheduled emails**: weekly progress goes out on Sundays at 18:00 UK time (19:00 in summer) and reminders run daily at 17:00 (18:00 in summer). See them under Vercel > Settings > Cron Jobs.
- **AI spend**: Admin shows an estimate for the last 30 days; the Anthropic console has the exact figure. A full mock interview (decode, five questions with follow-ups, scorecard) costs roughly 25p to 40p on the default model. To halve it, set `INTERVIEW_MODEL=claude-haiku-5-5`; the scoring gets less sharp.
- **Back-ups**: Supabase's free plan keeps daily back-ups for 7 days.

## How far the free setup goes

- **Email.** A Gmail account sends about 500 emails a day. Past roughly 100 active members, switch to Resend with your own domain (step 3 explains both).
- **Scheduled jobs.** The reminder and weekly jobs work through members eight at a time and stop after 45 seconds, inside Vercel's one-minute limit. Anyone not reached gets their reminder on the next hourly run. That comfortably covers a few thousand members.
- **Database.** Supabase's free plan gives 500 MB, enough for thousands of members. Free projects pause after a week with no activity; the hourly reminders job keeps yours awake.

## Moving to your own domain later

1. Buy a domain (for example `benchwork.co.uk`) and add it in **Vercel > Settings > Domains**. Update `SITE_URL` and the Supabase URL settings in step 4, and the Google origins in step 5.
2. Sign up at [resend.com](https://resend.com), verify the domain, create an API key, then:
   - Vercel: add `RESEND_API_KEY` and `EMAIL_FROM=Benchwork <hello@your-domain>`. Resend is used instead of Gmail as soon as the key exists.
   - Supabase SMTP: host `smtp.resend.com`, port `465`, user `resend`, password: the API key, sender `hello@your-domain`.

## Running it on your computer

```bash
npm install
cp .env.example .env.local   # fill in the values
npx vercel link && npx vercel env pull .env.local
npx vercel dev               # http://localhost:3000
```

## Tests

`npm test` checks the database access rules against real Postgres, every API route, the sign-in screens and the whole learner journey in a browser. They run on every push to GitHub.
