# Autonomous E-Bus Model

Interactive 3D model of a 12 m autonomous (SAE Level 4) battery-electric city bus, for education.

> **Created by Claude (Anthropic)** — designed and coded with Claude AI.

## Features
- Exploded 3D view of 17 component groups with materials-science names and ~10-year cost trends (2016 / 2021 / 2026)
- Seating, luggage, wheelchair zone + ramp, emergency exits, fare validators, LED signs & speakers, OCC monitoring, fire suppression, sensor suite, LFP battery, charging
- Remaining-range (hours / km) calculator
- Charging-spacing calculator (depot CCS2 + terminal pantograph)
- Maintenance schedule and organisation structure
- Platform reuse for container tractors, ambulances, fresh-food, e-commerce and food & goods delivery vehicles
- Example cities and problems encountered
- Street simulation: traffic light + zebra crossing, elevated bridge, underpass tunnel, pantograph charging; weather modes (sun, rain, fog, night); V2X / OCC event log
- Export OBJ+MTL or GLB

## Run
Open `index.html` in a modern browser (needs internet for three.js and Google Fonts from CDN). For local serving:

```
npx serve .
```

## Notes
All costs are rough educational estimates (USD), not quotations. City examples are summaries — verify with official sources.

## Credits
Created by **Claude** (Anthropic). three.js © three.js authors (MIT).
