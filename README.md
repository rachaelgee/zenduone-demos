# ZenduONE sales kit

Static site: one self-contained HTML file per demo, deck and brochure. Deployed with Vercel (project zenduone-sales-kit on the ZenduitTeam account, moved from Rae-Design on 4 Nov 2026) at https://zenduone-sales-kit.vercel.app (the older zenduone-demos.vercel.app address still works).

- /shuttle — School & shuttle guided prototype
- /waste — Waste guided prototype
- /airport — Airport ground operations guided prototype
- /live-map — Live Map overview guided prototype (fleet manager)
- /fleet-safety — Fleet safety & coaching guided prototype (safety manager, driver; built by Astrid, with the live alert and two-way in-cab call merged in from the former driver-calling demo; /driver-safety redirects here)
- /maintenance — Maintenance guided prototype (driver, planner, technician; built by Astrid)
- /waste-simulation — Waste live simulation (presenter)

## Decks & brochures
- /deck/school-bus and /deck/shuttle — personalisable ZenBUS School Bus and Shuttle seller decks, built on the approved product decks from Featurebase (/deck/school-shuttle redirects to /deck/school-bus) (PDF, PowerPoint, Google Slides, Present). Libraries are self-hosted in /vendor.
- /deck/waste and /brochure/waste: personalisable (customer, logo, brand colours) Zenduit Waste deck (11 slides) and value-proposition brochure (4 pages: 3 from the value proposition plus a back page with the leak assessment, next step and contact; pages or flip book view), built from Larissa's Claude Design files
- /brochure/zenbus — ZenBUS flip-book brochure; sellers personalise it and copy a customer link (details travel after # so they stay out of server logs). page-flip is self-hosted in /vendor.

## Passcodes

Every demo, deck and brochure asks for its own passcode (`middleware.js`). The right code unlocks that item only, for 30 days in that browser. The home page and everything else need the internal "all" code, which opens every item.

The codes are not in this repo. They live in the Vercel project's environment variables:

- `SALES_KIT_PASSCODES`: JSON of item key to code (`shuttle`, `waste`, `waste-simulation`, `airport`, `live-map`, `fleet-safety`, `maintenance`, `deck-school-bus`, `deck-shuttle`, `deck-waste`, `brochure-zenbus`, `brochure-waste`, `all`).
- `SALES_KIT_SECRET`: signs the unlock cookies.

To change or revoke a code, edit `SALES_KIT_PASSCODES` in Vercel and redeploy. Anyone who used the old code is asked again.

