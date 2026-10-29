# Angles Lab · Grade 9

An interactive, narrated learning section on angles: **74 screens** that follow `Angles_final_PPT_pages_1-74.pdf` page by page. They cover points, rays and lines, how an angle forms, angle types, complementary and supplementary angles, adjacent angles, linear pairs and their converse, intersecting lines, a two-part proof of the Vertically Opposite Angles theorem, applications, and a converse condition check. To run it, open `index.html` in a browser (Chrome, Edge, Firefox or Safari, desktop or tablet; phones in landscape). There is no build step.

- **Screens:** `js/screens/s1-foundation.js` … `s9-apply.js`, one file per mission phase. Screen *N* is page *N* of the PDF, and its first narration line is that page's text.
- **Engine:** `js/core/`. `scene.js` is the SVG geometry model: labels, arcs and hit areas are computed from the live rays every frame. `persist.js` holds tags and equations that carry from one screen to the next. `engine.js` runs each screen through its states. `audio.js` synthesises the effects, and `voice.js` plays the narration.
- **Continuity:** objects are addressed by id, so a screen that asks for an existing ray turns, moves or recolours it rather than redrawing it. Every screen also builds its full state itself, so BACK and lesson-map jumps always show the right figure.
- **Voice-over:** all 120 lines in `tools/vo_script.json` are voiced (`assets/vo/`, Ogg Opus plus a `.caf` copy for Safari). Words, highlights and geometry cues follow the clip's own playback position, and long lines show as two chunks. See [docs/VOICEOVER.md](docs/VOICEOVER.md) for how lines are made and built (`node tools/vo_build.mjs`).
- **Testing aids:** `index.html?s=17` opens screen 17, `?vo=0` turns the narration off, and `?speed=2` speeds up every timeline.
- **`.tmp/`** is a scratch folder for build and test runs. It is safe to delete.
