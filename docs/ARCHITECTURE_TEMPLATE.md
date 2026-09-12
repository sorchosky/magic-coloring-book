# Architecture — <Project Name>

> One pass at project start, then edit only when a decision actually changes.
> If this drifts from what's actually in the repo, DECISIONS.md is where the
> drift gets recorded, not here.

## Stack

- **Framework:** React + Vite (default — note if this project deviates)
- **Deploy:** Vercel, connected to `main`
- **Styling:** <e.g. Tailwind, CSS modules>
- **State management:** <e.g. useState/useReducer, Zustand>
- **External APIs:** <e.g. Claude vision API — note cost model if paid>
- **Data/persistence:** <e.g. none, localStorage, Supabase>

## Data model

Core entities and their shape. Sketch this even for small apps — it's the
thing that saves a rewrite later.

## Key architectural decisions made up front

- Decision — reasoning — date
- Decision — reasoning — date

## Known constraints / things to watch

Performance ceilings, rate limits, browser support gaps, anything that will
bite later if forgotten now.

## Folder structure

Note any deviation from a standard Vite React app layout.
