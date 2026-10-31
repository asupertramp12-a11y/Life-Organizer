# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One person (the owner) organising their own life. Primary device is a Google Pixel 10 Pro Fold, used on both the folded cover screen (phone width, ~410 CSS px) and the unfolded inner screen (near-square, ~840 CSS px wide), installed to the home screen. Also opened on a laptop.

## Product Purpose
A private personal organiser: capture and clear tasks, keep daily habits, track dated plans, and keep notes. Success is a single glance at Today telling the owner what matters now, and capture taking seconds.

## Positioning
Private by construction: no account, no server; everything lives in the browser on the device, moved between devices by backup file.

## Operating Context
Quick check-ins through the day on the cover screen; unfolded for looking across the week, reading and writing notes. Installed as a home-screen web app (standalone display).

## Capabilities and Constraints
- Sections: Today, Tasks, Habits, Plans (dated events), Notes, Settings (backup, restore, erase).
- Plain HTML/CSS/JS, no build step, all files at the repo root, deployed on GitHub Pages.
- Data in localStorage only; personal data must never be committed to the public repo.
- Priority surfaces: Plans and Notes, then the Today overview.

## Brand Commitments
- Name: Life Organizer.
- Light interface; a dark, moody look is explicitly unwanted.
- Desired feel (owner's words): slick, minimalistic and premium.

## Evidence on Hand
No real user content in the repo; demonstration data used in screenshots must be synthetic.

## Product Principles
- Glanceable first: Today answers "what now?" without scrolling on the cover screen.
- Capture in one step from wherever you are.
- Your data stays yours: local, exportable, erasable.
- Fold-aware: each posture gets a layout made for it, not a stretched phone view.

## Accessibility & Inclusion
WCAG AA contrast, 44px touch targets, visible keyboard focus, reduced-motion respected.
