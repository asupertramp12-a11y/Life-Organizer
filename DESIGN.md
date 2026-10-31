---
name: Life Organizer
description: A private personal organiser finished like a precise household appliance.
colors:
  ground: "#ECEBE7"
  rail: "#E3E2DD"
  panel: "#FBFBF9"
  sunk: "#F3F2EF"
  ink: "#1C1D1F"
  ink-2: "#57585B"
  ink-3: "#67686B"
  tick: "#A9A9A6"
  ring: "#8A8A86"
  line: "#DEDCD6"
  line-2: "#CFCDC6"
  signal: "#E5531A"
  signal-ink: "#B8400F"
  signal-soft: "#FCE9E0"
  olive: "#66743A"
  late: "#B23B1E"
typography:
  display:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(26px, 6.2vw, 34px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.028em"
  headline:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"kern\""
  reading:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  numeral-dial:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  numeral-date:
    fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "\"tnum\""
rounded:
  ctl: "14px"
  panel: "26px"
  brand: "9px"
  pill: "999px"
  round: "50%"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.ctl}"
    padding: "0 18px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-ghost:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "0 18px"
    height: "46px"
  button-danger:
    backgroundColor: "{colors.late}"
    textColor: "#FFFFFF"
    rounded: "{rounded.ctl}"
    padding: "0 18px"
    height: "46px"
  key:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "46px"
  key-signal:
    backgroundColor: "{colors.signal}"
    textColor: "#FFFFFF"
    rounded: "{rounded.round}"
    size: "50px"
  key-signal-hover:
    backgroundColor: "{colors.signal-hover}"
  pill-button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "44px"
  pill-button-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    padding: "10px 14px"
    height: "46px"
  input-capture:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "50px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "24px 24px 16px"
  check:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.round}"
    size: "28px"
  check-done:
    backgroundColor: "{colors.olive}"
    textColor: "#FFFFFF"
  habit-key-on:
    backgroundColor: "{colors.olive}"
    textColor: "#FFFFFF"
    rounded: "{rounded.round}"
    size: "44px"
  tag:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
  dial-scale:
    backgroundColor: "{colors.sunk}"
    rounded: "{rounded.ctl}"
    height: "76px"
---

# Design System: Life Organizer

## Overview

**Creative North Star: "The Appliance Panel"**

Life Organizer is finished like a mid-century household appliance: a warm light-grey housing, white panels set into it with hairline edges and a soft drop beneath, graphite ink for everything that is read, and a single signal orange for the things that point at now. Every part has one job. Nothing on screen is decoration: the only "ornament" in the system is the tick scale of the week dial, and that is an instrument.

Density is calm rather than sparse. Rows are 56px tall with hairline dividers, panels pad at 16px on the cover screen and 24px once their container passes 640px, and type stays in a narrow range (13px labels to 34px page titles) so hierarchy is carried by weight, ink tone and placement rather than size jumps. Numbers are first-class: times sit in a fixed-width, left-aligned column so the column edge stays straight (Urbanist has proportional figures only).

The interface is light by commitment; a dark, moody look is out. The system rejects the category default of grey-on-white with a blue accent, and the cream-paper planner costume.

**Key Characteristics:**
- Warm grey housing, near-white panels, graphite ink; one orange signal, one olive for done.
- Round keys for single-press actions (add, check, habit day); 12px-cornered rectangles for text controls.
- Soft, low, layered shadows with a white inset top edge, like a moulded part catching light.
- One self-hosted geometric sans (Urbanist) at weights 300 to 700; times in fixed-width columns.
- The week dial: a Monday-to-Sunday tuning scale with an orange needle on the selected day.

## Structure and signals (Version 21)

- **Four tabs:** The Hub (Now / Next, the week dial and the day's merged agenda), Calendar (Month, Week with one lane per category, 14-day Agenda), Thoughts (to-dos and notes; dated to-dos appear in The Hub) and Heads up (clashes and preplanning). Settings sits under the gear in the header and the rail. Older addresses (#/today, #/plans, #/notes, #/tasks, #/habits) redirect.
- **Surfaces:** glass belongs to the frame (sky, Now / Next, tab bar, rail, chips, capture field). Panels that hold lists, the note editor and the sheet are solid `--panel` with a `--line` hairline.
- **Five categories by person:** Work (blue), Personal (violet, just the owner), Douglas (green), Dorothea (amber) and Amy (rose, `--c-amy`), matched in lightness so none dominates. Amy's plans raise soft Checks, not Clashes, when the owner is working or away.
- **One meaning per signal:** orange is "now" only: the now-line in today's agenda and today's date (`--signal-ink` disc in the month grid, white text, AA). Clash and Check are graphite tags with a small dot (brick for Clash, ring grey for Check). Graphite fill means "do" (add keys, primary buttons) or "you are here" (current navigation item). Selection is white with a graphite edge. Switches are graphite when on. Olive still means done only.
- **Work folds:** timed work meetings that aren't part of a clash collapse into one "At work · N meetings" line per day (a dashed chip in the week lanes, "Work · N" in the month grid). Tap to expand.
- **Heads up:** flags are grouped by cause (a trip; a recurring pairing), in This week, Next week and Later (collapsed). Each item takes a decision: I'll do it / Mum / Nanny / Move it for family cover; Declined / Moved / Keep for work; Done / On it for preplanning. Recurring groups offer "Same for all". Decisions and "Always fine" go to Sorted, where Undo puts them back. The tab badge counts clashes in the next 7 days. Counts always read "N clashes and M checks in the next 7 days".
- **Sheet:** tapping any plan or to-do opens a bottom sheet (centred from 600px): editable for your own items, read-only with its source for Outlook and the family apps. Deletes and decisions show an Undo toast.

## Glass layer (current look)

Added on top of the Braun system, same palette:

- **Sky:** the page top is a soft wash of the Work blue mixed into the warm ground, with blurred white cloud banks and a faint orange haze at the top right; it fades into the ground by mid-screen. Graphite in dark mode.
- **Glass:** panels, the editor, note cards, chips, the tab bar and the rail are translucent (`--glass`, `--glass-strong`) with a 22px backdrop blur, a bright 1px edge (`--glass-edge`) and a long soft shadow. 26px panel corners.
- **Type:** Urbanist, self-hosted (`urbanist.woff2`, 300–800). Headings at 500, large numerals at 300. Urbanist has no tabular figures; time columns are fixed-width and left-aligned so their edge stays straight.
- **Controls:** primary buttons and the round add key are graphite pills (`--ink`); secondary buttons and icon keys are white glass. The active navigation item is a graphite pill.
- **Week dial:** a fine tick strip, a graphite bar on the selected day and a graphite label above it giving that day's plan count.
- **Signal:** orange is kept for "now": today's date and the dial's today label.

## Colors

A near-neutral warm-grey body with exactly two chromatic voices: signal orange and olive.

### Primary
- **Signal Orange** (`signal`): The "now" and "act" colour. Fills the round add key, the dial needle and its bead, the dots of the selected day, the active tab underline, focus outlines, the text caret and link-hover underlines. Never fills a panel, never colours body text.
- **Signal Ink** (`signal-ink`): The text-safe deepening of the signal for orange words on light grounds: today's day name and the selected day number on the dial, hovered note titles.
- **Signal Wash** (`signal-soft`): Text selection only.

### Secondary
- **Done Olive** (`olive`): Completion and nothing else. Fills a ticked task check and a completed habit key, with white mark.

### Tertiary
- **Late Brick** (`late`): Overdue metadata text, the destructive button, and the delete control's hover. A warning, kept distinct from the signal by being darker and browner.

### Neutral
- **Housing Grey** (`ground`): The page body, the thing panels sit in. Also the browser theme colour.
- **Rail Grey** (`rail`): The navigation rail and the segmented-control trough; one step darker than the housing.
- **Panel White** (`panel`): Panels, inputs, keys, cards, the editor. Never pure white.
- **Recess** (`sunk`): Inset surfaces: the dial scale and tag fills.
- **Graphite** (`ink`): Primary text, the primary button, pressed pills, the toast.
- **Mid Graphite** (`ink-2`): Secondary text, metadata, field labels, unselected nav.
- **Quiet Graphite** (`ink-3`): Placeholders, timestamps, completed-task text, past days, inactive tab labels.
- **Tick Grey** (`tick`): Dial minor ticks and the strike-through on done tasks; also the input hover border. Decorative-weight only, never text.
- **Ring Grey** (`ring`): Outlines of empty checks and habit keys and quiet icons; 3.3:1 on panel, the floor for a control boundary.
- **Hairline** (`line`): Panel edges, row dividers, the rail and tab-bar edges.
- **Hairline Strong** (`line-2`): Input borders, pill outlines, link underlines.

### Dark theme
Light is the default. Settings → Appearance offers Light, Dark and Match device; a sun/moon key sits in the page header on the cover screen and at the foot of the rail when unfolded. The choice is stored per device (`lo:theme`) and applied before first paint.

Every colour token is a `light-dark()` pair in `:root`; `<html data-theme>` sets `color-scheme`, which picks the side. Dark is graphite housing, the black-calculator side of the same world, not a new palette: the signal stays orange and done stays olive.

| Token | Light | Dark |
|---|---|---|
| ground | #ECEBE7 | #141516 |
| rail | #E3E2DD | #1A1B1D |
| panel | #FBFBF9 | #202124 |
| sunk | #F3F2EF | #18191B |
| ink | #1C1D1F | #ECEBE7 |
| ink-2 | #57585B | #ABABA7 |
| ink-3 | #67686B | #8F8F8B |
| tick | #A9A9A6 | #55565A |
| ring | #8A8A86 | #75767A |
| line / line-2 | #DEDCD6 / #CFCDC6 | #2D2E31 / #3B3C40 |
| signal / signal-ink | #E5531A / #B8400F | #EE5D22 / #FF8E5E |
| olive | #66743A | #76863F |
| late | #B23B1E | #F2775A |
| on-ink (text on ink buttons) | #FFFFFF | #141516 |

Interaction tints (`ink-hover`, `signal-hover`, `danger`, `danger-hover`, `late-soft`, `hover-tint`, `rail-hover`) and shadow colours (`hl`, `shade`, `shade-soft`) are tokens too; no colour is written outside `:root`.

### Named Rules
**The One Signal Rule.** Orange marks where "now" is and the single primary action on a screen; it is never a decorative accent, a heading colour or a panel fill. If two orange things compete on one screen, one of them is wrong.

**The Olive Means Done Rule.** Olive appears only on completed state. Nothing else is green.

## Typography

**Display Font:** Urbanist (self-hosted `urbanist.woff2`, variable 300 to 800, preloaded; falls back to ui-sans-serif / system-ui)
**Body Font:** Urbanist
**Label/Mono Font:** none distinct; Urbanist has proportional figures only

**Character:** One precise, slightly mechanical grotesk does every job. Tight negative tracking on large sizes and tabular figures give it the feel of a printed control legend.

### Hierarchy
- **Display** (600, clamp 26px to 34px, 1.12, -0.028em): Page titles (the date on Today, "Plans", "Notes"). One per view.
- **Headline** (600, 24px, -0.02em): The note title in the editor.
- **Title** (600, 17px, -0.01em): Panel headings and the dial's date range.
- **Body** (400, 16px, 1.5): Row titles and running text; panel paragraphs cap at 64ch.
- **Reading** (400, 17px, 1.65): The note editor body, capped at 68ch.
- **Secondary** (400, 15px): The page subtitle line, empty states, primary button labels (600).
- **Label** (500, 13px): Field labels and row metadata; tags at 12px; dial day names at 12px with +0.02em; tab-bar labels at 11px.
- **Dial numeral** (500, 20px, -0.02em, tabular): Day numbers on the week dial.
- **Date numeral** (400, 30px, -0.035em, tabular): The large day number heading each "Coming up" group; the one place a big number is set light.

### Named Rules
**The Timetable Rule.** Every time sits in a fixed-width, left-aligned column so it aligns like a printed timetable.

**The Weight Not Size Rule.** Hierarchy steps by weight (400/500/600) and ink tone (ink, ink-2, ink-3) inside a narrow size range. Don't add sizes above 34px or new weights above 600.

## Layout

Mobile-first, fold-aware, built on a 4px-based spacing scale (`s1` 4px through `s7` 48px). Below 600px (the folded cover screen) the app is one column with a fixed, translucent bottom tab bar (panel at 92% with a 14px backdrop blur and a hairline top edge); main content reserves 96px at the bottom for it. From 600px a vertical rail replaces it: 88px wide with icon-over-label items, widening at 1100px to a 232px rail with icon-beside-label items and the wordmark. Main content is centred to a 1120px max width.

Inside the main area, layout responds to container width rather than viewport. At 640px container width, Today and Plans split into two columns (agenda side slightly wider, 1.12fr to 1fr; Plans is 1fr/1fr), the agenda panel becomes sticky at 32px from the top, forms go from two to three columns, and Notes becomes list (240px to 300px) plus editor. At 1000px, "Coming up" date groups gain a 150px date column.

Every view opens with the same page head: display title, a one-line secondary summary beneath, actions on the right. Capture sits directly under it: a pill-shaped input beside the round signal key, with optional details folding open below.

## Elevation & Depth

A hybrid of tonal layering and soft physical shadow. The housing (`ground`) is lowest, the rail and recesses sit a tone darker or lighter, and panels lift off the housing with a hairline border plus a low, warm shadow that carries a 1px white inset top highlight, like a moulded part catching light from above. Shadows are always soft and blurred, tinted with graphite (rgba 28,29,31), never hard or offset without blur. The dial scale is the one recessed surface: an inset shadow pushes it into the panel.

### Shadow Vocabulary
- **Panel** (`box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 1px 2px rgba(28,29,31,.05), 0 10px 28px -16px rgba(28,29,31,.22)`): Panels, the editor, the expanded capture form.
- **Key** (`box-shadow: 0 1px 0 rgba(255,255,255,.95) inset, 0 1px 1px rgba(28,29,31,.08), 0 3px 6px -3px rgba(28,29,31,.18)`): Raised controls: round keys, ghost buttons, the active rail item, the selected segment, habit keys.
- **Signal key** (`box-shadow: 0 1px 0 rgba(255,255,255,.3) inset, 0 4px 10px -4px rgba(229,83,26,.7)`): The orange add key only; its shadow takes the signal's colour.
- **Primary button** (`box-shadow: 0 1px 0 rgba(255,255,255,.12) inset, 0 3px 8px -4px rgba(28,29,31,.5)`): The graphite button.
- **Recess** (`box-shadow: 0 1px 2px rgba(28,29,31,.06) inset`): The dial scale; a fainter version on the capture input.
- **Toast** (`box-shadow: 0 10px 24px -10px rgba(28,29,31,.6)`): The floating confirmation pill.

### Named Rules
**The Moulded Part Rule.** Raised things get a white inset top edge plus a soft graphite drop; pressed things move down 1px (`translateY(1px)`), and round keys also shrink to 0.97. Nothing glows except the signal key.

## Shapes

Two families of form, used consistently. Single-press actions are circles: the add key (46px, 50px beside capture), small ghost keys (44px), task checks (28px with an invisible 46px hit area), habit day keys (44px), and the delete control (44px). Text-bearing controls are rectangles with gently rounded corners (12px, `ctl`): buttons, inputs, selects, rail items, day cells. Panels and the editor round at 18px (`panel`). Free-standing capture inputs, the notes search, pill buttons, tags, the "more" disclosure and the toast are full pills (999px). Nested corners stay concentric: the segmented trough rounds at 16px with 3px padding so its segments round at 13px.

Edges are hairlines (1px `line`), never heavier, except the 1.5px ring on empty checks. The only dashed edge is the empty-editor placeholder.

## Components

### Buttons
Firm, compact, and quiet until pressed.
- **Shape:** 12px corners, 46px tall, 0 18px padding; 15px 600 label; icon 18px leading.
- **Primary:** Graphite fill, white label; hover shifts to `ink-hover`; press moves down 1px.
- **Ghost:** Panel fill, graphite label, hairline border and key shadow.
- **Danger:** Late brick fill (hover #9A3017), used only for "Erase all data".
- **Pill button:** 44px pill, 13px 500, panel fill with strong hairline; pressed state is white with a 1.5px graphite edge (the "Pinned" toggle, selected segments). Graphite fill is reserved for the primary action and the current navigation item.
- **Link:** 14px 500 mid-graphite text with a hairline underline that turns signal orange on hover ("All notes", "All tasks").

### Round Keys (signature control)
Calculator-style circular keys for one-press actions.
- **Key:** 46px circle, panel fill, hairline border, key shadow; press scales to 0.97 and drops 1px.
- **Signal key:** Orange fill, white 22px plus icon at stroke 2; the primary add on every view, one per screen.
- **Ghost key:** Transparent; hover fills with 6% graphite. Used for week arrows, back and settings.

### Chips
- **Tag:** 12px 500 pill, recess fill, hairline border, mid-graphite text (list names). The high-priority tag keeps the fill but darkens text to graphite at 600 with a ring-grey border; emphasis by ink, never by colour.
- **Segmented filter:** Rail-grey trough, transparent segments; the selected segment lifts to panel fill with key shadow. Scrolls horizontally with a fade mask at the trailing edge.

### Cards / Containers
- **Corner Style:** 18px.
- **Background:** Panel white; the "quiet" variant is transparent with only a hairline (used for past plans).
- **Shadow Strategy:** Panel shadow (see Elevation).
- **Border:** 1px hairline.
- **Internal Padding:** 16px sides, 12px bottom; 24px sides, 16px bottom at container width 640px and up.
- **Note card:** In the notes index, a 14px-cornered panel-white card with a barely-there shadow; hover shows a strong hairline, the open note shows a graphite border.

### Inputs / Fields
- **Style:** Panel fill, 1px strong hairline, 12px corners, 46px tall, 10px 14px padding; selects draw their own chevron.
- **Hover / Focus:** Hover borders to tick grey; focus borders to graphite with a 3px 16% signal-orange halo. The caret is orange.
- **Capture input:** A 50px pill with a faint inset recess, always paired with the signal key to its right.
- **Field labels:** 13px 500 mid-graphite, above the control.

### Lists
- **Row:** At least 56px, 12px gap, hairline divider between rows (none above the first). Title at body size; metadata at 13px mid-graphite with overdue text in late brick.
- **Check:** 28px circle with a 1.5px ring; ticking fills it olive and strikes the title through in tick grey with the text dropping to quiet graphite.
- **Plan row:** A 64px tabular time column (14px 500) before the title.
- **Delete:** Hidden on hover-capable devices until the row is hovered or focused; turns brick on a pale brick wash.

### Navigation
- **Cover (below 600px):** Bottom tab bar, five items, 20px icon over an 11px 500 label in quiet graphite; the current item turns graphite with an 18px by 2px orange bar on the bar's top edge.
- **Rail (600px and up):** Rail-grey column; items are 12px-cornered, mid-graphite, hover to a 45% white wash; the current item lifts to panel fill with key shadow. Settings sits pinned to the rail's foot.
- **Icons:** Inline SVG line icons, 20px, stroke 1.75, round caps and joins, `currentColor`.

### Week Dial (signature component)
The week as a radio tuning scale. A recessed, 12px-cornered strip holds seven equal day cells, always Monday to Sunday. Minor ticks in tick grey run across the top; each day has a taller 1.5px major tick in mid-graphite. Below each tick: day name (12px 500), day number (20px tabular), and up to three 5px dots for that day's plans. An orange needle (2.5px stem, 7px bead with an orange glow) stands on the selected day and slides between days over 0.5s with the system ease. Today's name is set in signal ink; the selected day's number turns signal ink at 600 and its dots turn orange; past days drop to quiet graphite. Above the strip: the date range as a title and ghost-key arrows to move a week, with a "Today" pill appearing when off the current week. Choosing a day fades the agenda below it in.

### Toast
A graphite pill with white 14px 500 text, centred above the tab bar (24px from the bottom on wider screens), rising 8px into place.

### Motion
One ease, `cubic-bezier(.16, 1, .3, 1)`, for every movement: 0.12s presses, 0.15s to 0.2s colour changes, 0.25s to 0.35s reveals, 0.5s for the needle. Reduced motion collapses all of it.

## Do's and Don'ts

### Do:
- **Do** keep orange to "now" and the one primary add per screen: the needle, today's marks, the signal key, focus and caret.
- **Do** make single-press actions round keys and text actions 12px-cornered rectangles.
- **Do** set every time, date and count in tabular figures.
- **Do** give raised surfaces the white inset top edge plus a soft graphite drop, and pressed surfaces a 1px downward move.
- **Do** keep touch targets at 44px or larger, extending small visuals (the 28px check) with an invisible hit area.
- **Do** keep the week dial Monday to Sunday with the needle on the selected day.

### Don't:
- **Don't** introduce a dark theme or a dark, moody look; the interface is light by commitment.
- **Don't** add a second accent hue (no blue links, no coloured categories); tags differ by ink weight, not colour.
- **Don't** use olive for anything but completion, or orange for anything but now and the primary action.
- **Don't** use hard, unblurred offset shadows or heavy borders; edges are 1px hairlines.
- **Don't** use pure white (#FFFFFF) or pure black as surfaces; panels are `panel`, ink is `ink`.
- **Don't** add type sizes above 34px, weights above 600, or a second typeface.
