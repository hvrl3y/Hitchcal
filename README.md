# HitchCal

Rotation schedule, countdown to days off, and hitch pay for oilfield and other rotation workers.

**Try it:** https://hvrl3y.github.io/Hitchcal/

On a phone, open the link and choose "Add to Home Screen" to use it like an app. Everything you enter stays on your own device.

## What it does

- **Today:** live countdown to the end of your hitch (or the start of the next one), the next two weeks, and what's coming up
- **Calendar:** month, year and list views, day and night shifts, split first and last days, US federal holidays, notes
- **Pay:** day rate or hourly with overtime, per diem, mileage per hitch, paid travel days, bonuses, year-to-date
- **Crew:** follow up to five other schedules and see the days you're home together; share yours with a link
- **More:** certifications with expiry warnings, colors and themes, calendar export, backup and restore

## Feedback

This is a test release. Please report problems or ideas under the Issues tab, and say what phone and browser you were using.

## For developers

The site at the repository root is generated. Edit the files in `source/src/`, then run `python3 source/build.py` (needs Pillow) to rebuild `index.html`, the icons, the manifest and the service worker.
