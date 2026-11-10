---
name: Applied AI Line
description: A members-only 22-week training plan from data analyst to applied AI engineer, set out like a marathon plan pinned to the fridge.
colors:
  infield-green: "#0f3d2e"
  rail-ink: "#e8f1ec"
  rail-muted: "#9fbcae"
  hi-vis-yellow: "#f2d50f"
  hi-vis-ink: "#141400"
  lane-blue: "#2f63c8"
  turf-green: "#1f8a52"
  track-red: "#c23a22"
  review-slate: "#55707d"
  pass-green: "#1f7a46"
  fail-red: "#a3182f"
  warn-amber: "#8a5b00"
  focus-blue: "#2f63c8"
  ground: "#f3f5f2"
  card: "#ffffff"
  sunk: "#e9ede8"
  lane-rule: "#d6ddd7"
  bib-black: "#111714"
  stand-grey: "#56625c"
typography:
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title-small:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.3
  lede:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.3
  numeral-display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "3.2rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 72"
  numeral-headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 72"
  numeral-cell:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
    fontVariation: "\"wdth\" 72"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "22px"
  2xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.infield-green}"
    textColor: "{colors.rail-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "42px"
  button-ink:
    backgroundColor: "{colors.bib-black}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "42px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bib-black}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "42px"
  button-ghost-hover:
    backgroundColor: "{colors.sunk}"
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "20px 22px"
  day-cell:
    backgroundColor: "{colors.card}"
    textColor: "{colors.bib-black}"
    rounded: "{rounded.lg}"
    padding: "12px 12px 14px"
    height: "118px"
  plan-cell:
    backgroundColor: "{colors.sunk}"
    rounded: "{rounded.sm}"
    height: "34px"
    width: "52px"
  tag:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.bib-black}"
    rounded: "{rounded.sm}"
    padding: "6px 9px"
  tag-this-week:
    backgroundColor: "{colors.hi-vis-yellow}"
    textColor: "{colors.hi-vis-ink}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  tag-done:
    backgroundColor: "{colors.bib-black}"
    textColor: "{colors.card}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.bib-black}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  quiz-option:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  nav-rail:
    backgroundColor: "{colors.infield-green}"
    textColor: "{colors.rail-muted}"
    width: "232px"
  toast:
    backgroundColor: "{colors.bib-black}"
    textColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "12px 18px"
---

# Design System: Applied AI Line

## Overview

**Creative North Star: "The Plan on the Fridge"**

Applied AI Line is a marathon training plan for a career change. Weeks run down the page, days run across, and every evening is a session the member fills in. The interface is the paper plan made live: a deep infield-green rail on the left, a cool white working ground ruled like lanes, bib-black ink for type and one strip of hi-vis yellow that says "you are here, now". Colour is spent on session types, the way a coach colours a plan: blue for learning, green for building, red for project sessions, slate for review and an empty dashed lane for rest.

Density is that of a working document rather than a dashboard. Pages lead with a plain heading and a lede, then go straight to the grid: the week row of seven day cells on Today, the full 22-week table on Plan, ruled lists and real tables everywhere else. Numbers are the heroes, set in condensed Archivo like the numerals on a race bib, and they carry the weight a progress ring would carry elsewhere. Surfaces are flat white cards on a faintly green ground, separated by 1px lane rules, never by shadow.

Motion is small and earned. Buttons give under the finger, and when a member logs an hour the cell for tonight fills from the bottom like a marker stroke. Nothing else moves on render.

**Key Characteristics:**
- Infield-green rail, cool white ground, bib-black ink, hi-vis yellow reserved for now.
- Four session colours do the categorising; status colours (pass, fail, warn) stay separate from them.
- Every number in condensed Archivo (72% width), bold and tabular.
- The week row and the plan table are the signature grids; cells fill bottom-up with the session colour.
- Flat surfaces with 1px rules; the only lifted object is the toast.
- One animated moment per action: the just-logged cell.

## Colors

A coach's plan in printed inks: one deep green for the frame, four lane colours for session types, and a single hi-vis yellow that only ever marks the present.

### Primary
- **Infield Green** (#0f3d2e): the navigation rail, the mobile top bar and the primary "go" button (Log 1 hour, Create my account, Start the placement). It frames every member page and is the colour of committing to the next step. Radios and form controls take it as their accent colour.
- **Rail Ink** (#e8f1ec) and **Rail Muted** (#9fbcae): active and resting text on the rail. The active nav item sits on Rail Ink at 14% over the green; hover is 7%.

### Secondary
- **Hi-Vis Yellow** (#f2d50f) with **Hi-Vis Ink** (#141400): the "now" marker. A 4px yellow ring around today's day cell, the 22% yellow wash on this week's row in the plan table, the "This week" tag in that row, the 3px ring on the current bar in the hours chart and its legend swatch. It does not change between light and dark themes.

### Tertiary
Session lanes. Each session type sets a local `--c` and every fill, swatch and legend chip reads from it.
- **Lane Blue** (#2f63c8): Learn sessions. Also the link colour, caret colour and the Fast track level tint.
- **Turf Green** (#1f8a52): Build sessions. Also lesson checkboxes, hit-target bars in the hours chart and cohort progress meters.
- **Track Red** (#c23a22): Project sessions.
- **Review Slate** (#55707d): Sunday review sessions.
- Rest days use no colour: a dashed lane rule on a transparent cell.

### Status
- **Pass Green** (#1f7a46): correct quiz answers, passing scores, Prove it and Free tags.
- **Fail Red** (#a3182f): wrong answers, failing scores, field errors and invalid borders.
- **Warn Amber** (#8a5b00): Behind plan, Paid cost tags and Review due.
- **Focus Blue** (#2f63c8): the 3px focus outline with 2px offset on every focusable element.

Tinted badges mix their status or lane colour at 14 to 18% into transparent for the background and use the full colour for text.

### Neutral
- **Ground** (#f3f5f2): the page, a cool white with a trace of infield green.
- **Card** (#ffffff): panels, day cells, inputs, quiz options and the plan table wrapper.
- **Sunk** (#e9ede8): table headers, empty plan cells, tags, skeletons, meter tracks and the method box.
- **Lane Rule** (#d6ddd7): every 1px divider and border; the dashed edge of rest cells.
- **Bib Black** (#111714): all body and heading type, the ink button, the Done tag and the toast.
- **Stand Grey** (#56625c): secondary text, hints, table headers and past unlogged day numbers.

### Dark theme
Dark follows `prefers-color-scheme` unless the root carries `data-theme="light"`, and `data-theme="dark"` forces it. Values: ground #0e1412, card #151d1a, sunk #1b2521, lane rule #28342f, bib-black ink becomes #e7eeea, stand grey #9aaaa3, rail #0a2a20, rail ink #e3efe8, rail muted #8aa99a. Lanes and status lift for contrast: learn and focus #78a0ff, build #4cc184, project #ff7a5c, review #93aab5, pass #5ccf8c, fail #ff8a96, warn #e6b04a. Hi-vis stays #f2d50f on #141400.

### Named Rules
**The Hi-Vis Rule.** Hi-vis yellow marks this week and today, nothing else. If a yellow element doesn't answer "where am I in time?", it's wrong. The brand mark's short third bar and the text-selection wash are the only standing exceptions.

**The Lane Colour Rule.** Session colours belong to session types. Learn is always blue, Build always green, Project always red, Review always slate; status uses its own pass, fail and warn inks and never borrows a lane.

## Typography

**Display Font:** Archivo (with Helvetica Neue, Arial, sans-serif)
**Body Font:** Archivo (with Helvetica Neue, Arial, sans-serif)
**Numerals:** Archivo condensed (font-stretch 72%), tabular figures

**Character:** one variable grotesque doing two jobs. At normal width it's plain, sturdy UI text; squeezed to 72% and set bold it becomes the race-bib numeral that carries hours, weeks, dates and scores. The face is self-hosted from `fonts/archivo.woff2` (weight 100 to 900, width 62% to 125%) and preloaded.

### Hierarchy
- **Display** (800, 3rem, 1.02, -0.03em): the welcome screen's single headline only; 2.1rem under 760px.
- **Headline** (800, 2rem, 1.1, -0.02em): page h1. Balanced wrap. 1.7rem under 760px.
- **Title** (750, 1.35rem, 1.2, -0.01em): section h2, 40px above and 12px below.
- **Title small** (700, 1.05rem, 1.3): panel h3.
- **Lede** (400, 1.1rem, 1.5, Stand Grey): the one-paragraph intro under each h1, capped at 62ch, pretty wrap.
- **Body** (400, 1rem, 1.55): running text; small text at .92rem and extra-small at .82rem.
- **Label** (700, .82rem): day names, session type under each day cell, plan table headers (.78rem), tags (.8rem). Sentence case, no tracking.
- **Numeral display** (700, 3.2rem, .95, condensed): the week total on Today.
- **Numeral headline** (800, 2.6rem, 1, condensed): "Week N of 22"; 2.1rem under 760px. The phase name beside it drops back to normal width at 1.1rem.
- **Numeral cell** (700, 2rem, 1, condensed): planned hours in a day cell; 1.4rem on mobile. Plan-table week numbers at 1.25rem, quiz score at 2.2rem, cohort rank at 1.4rem.

### Named Rules
**The Bib Numeral Rule.** Every number a member reads as data (hours, weeks, dates in cells, scores, ranks, percentages, totals) is set condensed at 72% width, weight 700 or heavier, with tabular figures and -0.01em tracking. Words beside a number go back to 100% width.

**The Sentence Case Rule.** Headings, labels, buttons and tags are sentence case. No uppercase tracked labels anywhere.

## Layout

The member shell is a two-column grid: a 232px infield-green rail, sticky at full viewport height, and a work area. The rail's green is painted by a background gradient on the shell so it runs the full page height. The main column pads 34px top, 40px sides, 88px bottom, and caps at 1120px. Signed-out screens (welcome, sign-up) drop the rail and centre the main column.

Rhythm runs on 4, 8, 12, 18, 22 and 40px. Panels sit 18px apart; sections open 40px below the previous block; the page head clears 22px before the grid.

- **Today:** heading row (week numeral left, race day right, bottom-aligned), the week row, then a 1.5fr / 1fr two-column grid: tonight's course on the left, the week total and facts on the right.
- **Week row:** seven equal columns, 8px gaps (4px under 760px).
- **Plan:** a real HTML table in a scrolling wrapper, minimum 820px wide, sticky header row; columns for week (96px), courses (250px), seven day cells (52px) and hours (84px).
- **Course:** 1.5fr / 1fr columns with a 28px gap: lessons, build, method and quiz on the left; outcomes and resources stacked on the right.
- **Placement and settings:** a single 680px column.

Breakpoints: at 1000px every two-column grid collapses to one and the sign-up form stops being sticky. At 760px the rail becomes a sticky top bar with the brand and a horizontally scrolling tab row (active tab underlined 3px in Rail Ink), main padding falls to 22px 16px 72px and day cells hide their date and logged-hours line.

## Elevation & Depth

Flat. Depth comes from tone and rules: Card white on the cool Ground, Sunk for recessed tracks and headers, and 1px Lane Rule borders. Nothing lifts on hover.

### Shadow Vocabulary
- **Toast** (`box-shadow: 0 6px 24px rgba(0,0,0,.18)`): the only true shadow, on the bottom-centre confirmation toast.
- **Today ring** (`border: 2px solid ink; box-shadow: 0 0 0 4px hi-vis`): a structural ring, not elevation.
- **Ghost border** (`box-shadow: inset 0 0 0 1.5px lane-rule`, ink on hover): how ghost buttons draw their edge without shifting layout.

### Named Rules
**The Flat Plan Rule.** Paper doesn't float. Separate with 1px rules and tonal steps; a drop shadow belongs only to something that arrives over the page and leaves again.

## Shapes

Gently rounded rectangles throughout, with radius scaling to the object: 4px for code and the focus outline, 5 to 6px for tags, badges and plan cells, 8px for buttons, inputs, quiz options and nav items, 10px for day cells, notices and inset boxes, 12px for panels, the plan wrapper and empty states. Borders are 1px for structure and 1.5px for interactive edges (inputs, options, ghost buttons). Dashed lines mean "nothing planned": rest days, empty states and the target line on the hours chart. Radios are custom 18px circles with a 2px edge and an 8px dot that scales in.

## Components

### Buttons
Firm and plain; they give slightly under the press.
- **Shape:** gently rounded (8px), 42px minimum height, 10px 16px padding, weight 700 at .95rem.
- **Go (primary):** Infield Green with Rail Ink text. Used for the next step: log, create, start, save, check answers.
- **Ink:** Bib Black with Card text, the default `.btn`.
- **Ghost:** transparent with a 1.5px inset Lane Rule edge; on hover the edge turns ink and the fill turns Sunk. Used for secondary routes (Open course, Retake the quiz, Previous and Next).
- **Hover:** fills mix 14 to 16% toward Card, only on hover-capable fine pointers.
- **Press:** `scale(.97)` over 160ms on the custom ease-out. Placement answer buttons press to `scale(.985)`.
- **Disabled:** 45% opacity, not-allowed cursor. **Busy:** 70% opacity with `aria-busy` and progress cursor.
- **Link button:** underlined Stand Grey text at .85rem for low-stakes actions such as Delete session.

### Tags
- **Phase tag:** Sunk background, ink text, 700 at .8rem, 6px radius; an optional 9px swatch in the lane colour.
- **Level badges:** Start here (Sunk), Fast track (Lane Blue tint), Prove it (Pass Green tint), Done (solid Bib Black), Behind plan (Warn Amber tint), This week (solid Hi-Vis).
- **Cost tags:** Free (pass tint), Plus (learn tint), Paid (warn tint), 5px radius at .74rem.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Card on Ground.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px Lane Rule.
- **Internal Padding:** 20px 22px.
- **Inset boxes:** the Build box takes Turf Green at 10% into Card; the method box and notices take Sunk; 10px radius, 16px 18px padding, no border.
- **Empty states:** 1.5px dashed Lane Rule, 24px padding, an ink h3 and a plain sentence on what to do next.

### Inputs / Fields
- **Style:** Card fill, 1.5px Lane Rule border, 8px radius, 44px minimum height, 10px 12px padding. Label above in 700 at .92rem; hint below at .82rem in Stand Grey.
- **Focus:** border turns Bib Black, plus the global 3px Focus Blue outline on keyboard focus.
- **Error:** border turns Fail Red with `aria-invalid`; the message sits below in Fail Red, 600 at .85rem.
- **Choice rows:** radio choices are full-width bordered rows (1.5px, 8px radius, 12px padding); the checked row's border turns ink.

### Navigation
- **Rail:** 232px, Infield Green, 22px 14px padding. Brand mark and wordmark (800, 1.05rem) at the top, nav items as 600-weight .95rem rows with a 26px line icon, 10px padding and 8px radius. Resting text Rail Muted; hover lifts to Rail Ink on a 7% wash; current page is Rail Ink at 750 on a 14% wash. The member's name and links sit at the bottom above a 14% rule.
- **Mobile:** the rail becomes a sticky top bar of the same green with a scrolling tab row; the current tab gets a 3px Rail Ink underline.

### Week Row (signature)
Seven day cells, Monday to Sunday. Each cell is Card with a 1px rule and 10px radius, minimum 118px tall: day name and date across the top in Label, planned hours in Numeral cell with a small "h", logged hours below, and the session type at the foot in its lane colour. Logged hours fill the cell from the bottom with the lane colour at 20%, scaled to logged over planned. Rest days are transparent with a dashed edge and read "Off". Today takes a 2px ink border and a 4px Hi-Vis ring. Past days with nothing logged dim their numeral to Stand Grey.

### Plan Table (signature)
The full route as a semantic table: one row per week, week number in condensed numerals over its start date, up to two course links, seven 52px day cells and an hours total ("6 / 15"). Each cell is a 34px Sunk block, 6px radius, filled bottom-up in solid lane colour. A full cell turns solid with its number in Card; a part-filled cell shows its number on a small Card chip. This week's row takes a 22% Hi-Vis wash and a This week tag; finished weeks dim their week number. Milestone rows (Start applying, Race day) span the table on Sunk in bold. A legend above shows the four lanes and the This week swatch.

### Quiz
Five questions per course, each separated by a 1px rule. Options are bordered rows (1.5px Lane Rule, 8px radius, 10px 12px padding) with a custom radio. Hover darkens the edge to Stand Grey; checked turns it ink. After checking, the correct option takes a Pass Green border on a 9% pass wash with a solid "Correct answer" mark, a wrong pick takes Fail Red on an 8% wash with "Your answer", radios lock and an explanation appears below in Stand Grey. The score sits in condensed numerals at 2.2rem in pass or fail colour.

### Hours Chart
Twelve weekly bars in ink, 4px top corners, maximum 34px wide; weeks that hit target turn Turf Green, the current week gets a 3px Hi-Vis ring, and a dashed ink target line at 50% opacity carries its value in condensed numerals.

### Motion
- **Easing:** `cubic-bezier(.23,1,.32,1)`, a strong ease-out, for anything that moves.
- **Press:** 160ms scale on buttons and placement options.
- **Fills:** 280ms scaleY on day-cell fills and plan cells; scaleX on meters.
- **Colour changes:** 150ms ease for hover and border shifts; 140ms for the radio dot.
- **Toast:** 220ms rise and fade in from 10px below; 140ms out.
- **The just-logged cell:** after a quick log, only today's cell animates, from its previous fill to the new one via `@starting-style`. Every other cell renders at rest.
- **Reduced motion:** fills jump with no transition, presses don't scale, skeletons stop pulsing and the toast only fades.

### Named Rules
**The One Stroke Rule.** One action, one moving thing. Logging animates the cell it filled; page renders, tab changes and data loads never animate the grid.

**The Meter Placement Rule.** A meter is a thin 10px bar on a Sunk track, inline in a row beside its number (placement domain scores, cohort progress). It is never a page's hero figure; hero figures are condensed numerals.

## Do's and Don'ts

### Do:
- **Do** set every data number in condensed Archivo (font-stretch 72%, 700+, tabular figures).
- **Do** colour by session type through the local `--c` variable: Learn #2f63c8, Build #1f8a52, Project #c23a22, Review #55707d.
- **Do** keep Hi-Vis Yellow (#f2d50f) for today and this week only.
- **Do** separate surfaces with 1px Lane Rule borders and tonal steps, not shadows.
- **Do** use Infield Green buttons for the evening's next step and ghost buttons for everything secondary.
- **Do** fill cells bottom-up in 280ms on the custom ease-out, and animate only the cell the member just logged.
- **Do** honour `prefers-reduced-motion`: no fill transitions, no press scale, no skeleton pulse.
- **Do** use real tables for tabular data and dashed edges for anything with nothing planned.

### Don't:
- **Don't** use hi-vis yellow for highlights, badges, warnings or "you" markers; it means now.
- **Don't** build a hero metric out of a progress ring, gauge or wide meter; the week total and week number are numerals.
- **Don't** add coloured side stripes (border-left or border-right accents) to cards, rows or callouts.
- **Don't** put eyebrows or kickers above headings; the heading and its lede say it.
- **Don't** use uppercase tracked labels or a second typeface for UI text.
- **Don't** lift cards with drop shadows or hover elevation.
- **Don't** animate cells, rows or charts on render or navigation.
