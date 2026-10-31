# Life Organizer

A private personal organizer that runs in your browser and can be added to your phone's home screen like an app.

- **Today**: what's due, today's habits and the next 7 days of plans at a glance, with a quick-add box.
- **Tasks**: due dates, priority and lists (Home, Work…), with filters for open, overdue and done.
- **Habits**: tick off each day and keep streaks.
- **Plans**: appointments, birthdays, trips, anything with a date and time.
- **Heads-up**: clashes between life and work are flagged automatically: life plans while you're away on a work trip, meetings during leave or on bank holidays, double-booked meetings, and life plans on working days that need cover. Plans with a category label (or "(work)" in the title) count as work. Dismiss a flag with **Got it**, or silence a recurring pairing with **Always fine**.
- **Notes**: searchable notes you can pin, saved as you type.
- **Settings**: light, dark or match-device appearance; back up to a file, restore on another device, or erase everything. The sun/moon button in the header (or at the foot of the side rail) switches theme in one tap.

## Your data stays on your device

Nothing you enter goes into this repository or any server. It's saved in the browser on each device. Use **Settings → Back up** to download a backup file, and **Restore from file** to load it on another phone or computer.

Never commit backup files to this repository. `.gitignore` blocks `life-organizer-backup*.json`, but files added through GitHub's "Add files via upload" skip that check.

## Install on a device

**iPhone / iPad**: open the site in Safari, then **Share → Add to Home Screen**, and open it from the new icon. Safari and the home-screen icon keep separate storage.

**Android / desktop**: open the site and choose **Install app** from the browser menu, or bookmark it.

## Files

Plain HTML, CSS and JavaScript with no build step. All files sit at the top level:
`index.html`, `app.js`, `styles.css`, `schibsted-grotesk.woff2` (self-hosted font), `manifest.webmanifest`, `logo.svg`, `favicon.svg`, `icon-192.png`, `icon-512.png`. Design notes: `PRODUCT.md`, `DESIGN.md`.

Run locally: `python3 -m http.server` and open http://localhost:8000.

Publish with **Settings → Pages → Deploy from a branch → main → /(root)**.

## Ideas for next steps

- Recurring tasks and plans (weekly bin day, monthly bills)
- Goals with milestones linked to tasks and habits
- Shopping and packing lists
- Offline support with a service worker
- Reminders or notifications
