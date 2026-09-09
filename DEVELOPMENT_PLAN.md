# Portfolio development plan

Updated 9 September 2026. The aim is to make the portfolio useful when applying for software development projects. Choose improvements from real project briefs and keep the examples working and easy to review.

## Current delivery: HALO model workspace

Three.js project briefs repeatedly ask for GLB assets, orbit/zoom, product switching and responsive presentation. HALO currently demonstrates a procedural pendant; add a companion workspace at `#/halo/models` that works with supplied assets.

- Load a self-contained GLB from the visitor's computer, retaining its materials. Keep the file in the browser.
- Include original sample assets so the viewer is useful immediately, without asking a visitor to find a file.
- Fit different model sizes to the camera; provide orbit, zoom, reset and a PNG view download.
- Show useful asset information and clear loading/error states. Reject unsupported external-resource references and oversized files before loading.
- Link the viewer from HALO and the portfolio index. Preserve existing pendant configuration links.
- Update the HALO case note with the new behavior and source links.

The home page should help clients find product interfaces and interactive graphics quickly. Keep all existing projects, but group the index by the kind of work rather than leading with test terminology. New public copy focuses on development.

Delivery: build, check the changed interaction in a normal browser, and publish through the existing GitHub Pages workflow. Do not add a new benchmark or self-test project.

## Next priorities

1. **Registration and booking flow.** Add a complete, accessible form flow with validation, review, edit and submission states. This addresses the form and registration work seen on WordPress Jobs. Pick a real integration target before claiming a live booking or payment system.
2. **A small WordPress integration.** Build and document one installable plugin or block around a real requirement, with a running WordPress demonstration. This fills an actual gap in the portfolio; current React projects must not be presented as WordPress client work.
3. **Useful data interfaces.** Extend Current with configurable column mapping or a documented API adapter when a brief needs it. Prioritize a complete business workflow over another isolated graphics study.

Reorder these priorities when project replies arrive. Do not add speculative features just to increase the project count.

## Briefs informing the plan

- [React / Three.js product prototype](https://discourse.threejs.org/t/freelance-react-three-js-react-three-fiber-developer-phase-8-prototype/92521): three GLB products, rotation, zoom, switching and mobile layout. The discussion is closed; used here as a requirements reference, not an active lead.
- [Rak Design freelance role](https://rakdesign.com/vacancy/): interactive scenes, React, WebGL and maintainable collaboration.
- [Camp Shaw homepage and registration brief](https://jobs.wordpress.net/job/non-profit-website-homepage-and-registration-pages/): a practical registration flow and editable website.
- [Enfold site improvements](https://jobs.wordpress.net/job/enfold-css-help-neeed/): small, specific CMS features and frontend fixes.

Current delivery implemented on 9 September 2026: [HALO model workspace](https://luoy16002-svg.github.io/kai-works/#/halo/models). The home index now groups all eight projects by work type and links directly to the workspace. HALO and its case note also link to it.

The two bundled GLBs are original objects, generated from the committed source script. Sample switching, camera framing, PNG export and the narrow layout were checked in the regular browser. The build passes. The browser extension's automatic local file chooser requires file-URL access, so that interaction could not be completed with the current extension permissions; the local import path is implemented and uses the same loader as the samples.

Publish through the existing GitHub Pages workflow. The exact released revision and deployment status are tracked in the outreach ledger; source history is available in this repository.
