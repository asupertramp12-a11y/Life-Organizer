# Life Organizer

A private personal organizer that runs in your browser and can be added to your phone's home screen like an app.

- **The Hub**: Now / Next (what's on now, what's next, what's due, the most urgent heads-up), a quick to-do box, the week dial and the day's merged agenda with a now-line. Work meetings fold into one line unless they clash.
- **Calendar**: Month, Week (a lane per category) and a 14-day Agenda, colour-coded by who each plan is for: **Work** (blue: Outlook and anything labelled work), **Personal** (violet: just you: walks, haircuts, your own appointments), **Douglas** (green) and **Dorothea** (amber). Douglas's planner items follow their "who", Health app items go to Dorothea, and titles naming a child go to that child. **Sort categories** lists each family title once so you can assign it in one tap; any plan's sheet has **Who's it for?** too. Tap a category chip to show or hide it.
- **Thoughts**: to-dos and notes in one place. To-dos with a date appear in The Hub; notes save as you type.
- **Heads up**: clashes and preplanning, grouped by cause, each with a decision (who's covering, declined, done). Flags cover family plans while you're away, work during leave or on bank holidays, double-booked meetings, two things at once, deadlines and birthdays. Decisions can be undone from Sorted.
- **Settings**: light, dark or match-device appearance; back up to a file, restore on another device, or erase everything. The sun/moon button in the header (or at the foot of the side rail) switches theme in one tap.

## Linked apps

Life Organizer also shows activities from the family's other apps, when they're used in the same browser on the same device:

- **Douglas's planner** (XP Reward app): the Family Planner's activities. Life Organizer also checks the family planner online for this week and the next 7, using the family code the XP app saved on the device.
- **Dorothea's health** (Family Hub): appointments and deadlines.

- **Work calendar** (Outlook): publish your Outlook calendar (Outlook on the web → Settings → Calendar → Shared calendars → Publish a calendar), bookmark its ICS link, and open the bookmark to download `calendar.ics`. Then **Settings → Add from a file**. Each new file replaces the previous Outlook import, so moved and cancelled meetings update. Keep the ICS link private: anyone with it can read your calendar.

This works because all three apps are published under the same GitHub Pages address, so they can read each other's saved data in the browser. Linked activities are read live and never copied; edit them in their own app. Each link can be switched off in **Settings → Linked apps**.

## Your data stays on your device

Nothing you enter goes into this repository or any server. It's saved in the browser on each device. Use **Settings → Back up** to download a backup file, and **Restore from file** to load it on another phone or computer.

Never commit backup files to this repository. `.gitignore` blocks `life-organizer-backup*.json`, but files added through GitHub's "Add files via upload" skip that check.

## Install on a device

**iPhone / iPad**: open the site in Safari, then **Share → Add to Home Screen**, and open it from the new icon. Safari and the home-screen icon keep separate storage.

**Android / desktop**: open the site and choose **Install app** from the browser menu, or bookmark it.

## Files

Plain HTML, CSS and JavaScript with no build step. All files sit at the top level:
`index.html`, `app.js`, `styles.css`, `urbanist.woff2` (self-hosted font), `manifest.webmanifest`, `logo.svg`, `favicon.svg`, `icon-192.png`, `icon-512.png`. Design notes: `PRODUCT.md`, `DESIGN.md`.

Run locally: `python3 -m http.server` and open http://localhost:8000.

Publish with **Settings → Pages → Deploy from a branch → main → /(root)**.

## Ideas for next steps

- Recurring tasks and plans (weekly bin day, monthly bills)
- Goals with milestones linked to tasks and habits
- Shopping and packing lists
- Offline support with a service worker
- Reminders or notifications
