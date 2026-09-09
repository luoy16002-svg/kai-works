# Portfolio development plan

Updated 9 September 2026. Improve the portfolio around real software development briefs, with working examples that are easy to review.

## Current delivery: Gather booking experience

[Gather](https://luoy16002-svg.github.io/kai-works/#/gather) fills the registration and form-flow gap identified in the previous plan. It is an independent frontend prototype with three fictional workshop concepts, original illustrations and responsive layouts.

Implemented:

- Select a workshop, date, timezone and group size, with visible availability and pricing.
- Validate contact details, review the choices and save a booking on the visitor's device.
- Retain drafts after reload, including the identity and revision of a booking being edited.
- Review, edit and cancel saved bookings. Capacity checks and updates share a local transaction, with duplicate and stale-edit handling.
- Export a booking as JSON or a clearly labelled demo calendar file.
- Add Gather to the homepage's product interfaces group, the frontend profile and a dedicated case note.

The interface labels the sample schedule and local storage. It sends no email, takes no payment and reserves no real workshop. A live integration needs a server and shared inventory; choose that integration from an actual brief.

Delivery checks: the build passes. In the regular browser, a two-person booking was saved, edited to another date, reloaded with its draft intact, updated under the original booking ID and cancelled. Its places returned to the local schedule. The 390 px layout was reviewed. Publish through the existing GitHub Pages workflow; released revisions are tracked in the outreach ledger. No new benchmark or self-test project was added.

## Previous delivery: HALO model workspace

[HALO model workspace](https://luoy16002-svg.github.io/kai-works/#/halo/models) is live. It loads original sample objects or a visitor's self-contained GLB, retains materials, fits the camera and exports PNG views. Existing pendant configuration links remain available.

The two sample GLBs are generated from the committed source script. Sample switching, camera framing, PNG export and narrow layout were checked in the regular browser. Automated local file selection could not be completed because the browser extension lacks file-URL access; the import interface is implemented and shares the sample loader.

## Next priorities

1. **A small WordPress integration.** Build one installable plugin or block around a practical registration or editorial requirement, with a running WordPress demonstration and clear setup instructions. Current React projects must not be presented as WordPress client work.
2. **A useful data workflow.** Add configurable column mapping or a documented API adapter to Current when a brief calls for it. Keep import, correction and export connected.
3. **A live booking integration, when a brief supports it.** Connect Gather to an appropriate backend with shared availability, server validation and delivery states. Agree the actual calendar, email or payment provider before adding one.

Reorder these priorities when replies arrive. Prefer improving a useful workflow to adding another unrelated project.

## Briefs informing the plan

- [Camp Shaw homepage and registration pages](https://jobs.wordpress.net/job/non-profit-website-homepage-and-registration-pages/): practical registration and editable website requirements.
- [Zolly mobile and tablet layouts](https://www.reddit.com/r/hiredev/comments/1v1gt5g/hire_frontend_developer_mobile_responsive_design/): responsive forms, spacing and overflow fixes in an existing React interface. A public project brief, not a client relationship.
- [Enfold site improvements](https://jobs.wordpress.net/job/enfold-css-help-neeed/): small CMS features and frontend fixes.
- [React / Three.js product prototype](https://discourse.threejs.org/t/freelance-react-three-js-react-three-fiber-developer-phase-8-prototype/92521): supplied GLB assets, product switching and mobile layout. The discussion is closed; it is a requirements reference.
- [Rak Design freelance role](https://rakdesign.com/vacancy/): interactive scenes, React and maintainable collaboration.
