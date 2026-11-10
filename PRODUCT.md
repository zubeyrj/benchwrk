# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A cohort of career-switchers that the owner (Z) runs and invites, starting anywhere from no coding experience at all to some Python or SQL, moving into applied AI (LLM) engineering while holding a full-time job. They use the portal on laptops in the evenings, during study sessions after work. The owner is also a member of the cohort.

## Product Purpose

A members-only learning portal that turns a 15-hour-a-week plan into a personal route to a first applied AI engineer role. Members rate how much they have used seven tools, then a placement quiz (only for areas they have used) sets their starting point; the portal gives a dated roadmap, courses with in-portal lessons, in-browser Python and SQL exercises, quizzes drawn from question banks, a practice mode, an AI tutor, projects with peer review, certificates, an hours log, points and a cohort board, plus an owner admin page with a content editor. Success means members stay consistent week to week, ship three deployed portfolio projects, pass AI-103 and reach interviews.

## Positioning

The route is personal (placement trims what each member already knows into Start here, Fast track or Prove it) and dated at the member's own weekly hours, while the cohort board keeps a small invited group moving together. It starts from zero: a Programming from zero course runs in the browser with nothing to install, and anyone who has already used a tool skips what they know.

## Operating Context

- Evening study at home after a working day; a weekly rhythm of four 2-hour evenings, a 5-hour Saturday block and a 2-hour Sunday review.
- Members read lessons, solve checked coding exercises, take five-question quizzes (80% pass mark, spaced review after 7 and 30 days), log hours against a weekly target and check the cohort board.
- Courses link out to free resources first, Coursera Plus where it saves time, and the AI-103 certification.
- Runs as a hosted Claude artifact: access by owner invite; sign-in identity comes from Claude.

## Capabilities and Constraints

- Account creation is required before any course, quiz, placement or roadmap is visible.
- Course content lives in the portal database, readable by invited members only and writable by the owner only.
- Per-member progress is private; the cohort board shares display name, progress, hours and current course only.
- Single-page HTML with vanilla JavaScript; no build step; external scripts only from approved CDNs; Google Fonts allowed.
- 15 courses (including Programming from zero, shown only to those who need it, and Machine learning foundations) across four phases (Foundations, Build, AI core, Ship and land), three portfolio projects, one certification course and one interview course.

## Brand Commitments

- Name: Benchwork (renamed from Applied AI Line in November 2026). Logo: a lowercase b whose bowl is a progress ring.
- Language: British English, no Oxford comma, no em dashes, plain and direct.

## Evidence on Hand

- Real course content, quiz questions, resource links and costs (verified November 2026).
- No testimonials, outcomes data or member results exist yet; none may be invented.

## Product Principles

1. Consistency over intensity: the interface should make the next small step obvious every evening.
2. Shipped work is the evidence: projects and builds outrank reading.
3. Honest progress: dates, hours and quiz scores reflect reality, never flattery.
4. Members first, privacy by default: share only what the cohort needs.

## Accessibility & Inclusion

Readable at evening light levels for long sessions; keyboard reachable; WCAG AA contrast; reduced-motion respected.

## Motivation and accountability

- XP and levels, weekly quests, a weekly streak with earned freezes, milestone moments and certificates; rewards mark real work (lessons read, exercises solved, quizzes passed, projects shared, reviews given).
- Accountability partners: two members pair, set a weekly commitment, see each other's hours against it and send cheers or nudges.
- Countdowns to the end of the current course and the whole route, projected from the member's last three weeks of logged hours.
