# Diego Martinez Taboada — second version

A self-contained static website. This version now lives in `github/`; the
previous website is preserved in `../second_version/`.

## Open locally

Open `index.html` in a browser, or run this command from this folder:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then visit http://127.0.0.1:8765. There are no packages to install and no build step.
Google Fonts are optional: the site uses system fallbacks when offline.

## Edit

- `index.html`: biography, all 11 papers, education (with the 2020–2021 Sorbonne Erasmus exchange nested under the BSc), contact links, and Research notes.
- `styles.css`: colors, typography, and desktop/mobile layouts.
- `script.js`: the introduction that types each bullet once and leaves it visible; mobile navigation; current section highlighting.
- `background.js`: the shared neural/vector field. The same nodes gather into Spain in section 01 and Santiago's pilgrim shell in section 04, dispersing in other sections; each transition lasts 1.5 seconds and then stops rendering.
- `profile.jpg` and `CV.pdf`: copies of the files supplied in the original website.
- `assets/spain-network.svg`: static geographic network, used as the About me fallback without JavaScript or canvas support.
- `assets/math-network.js`: generated nodes, connections, and vector pairs for the animated background. Loaded locally without a server or network request.
- `assets/shell-network.js` and `assets/shell-network.svg`: the pilgrim shell's particle destination and matching static fallback.

All page content and links work without JavaScript. With reduced motion enabled,
the complete introductory list appears immediately. Screen readers receive the
complete phrases without character-by-character announcements. The background
also respects reduced motion, switching layouts immediately. It pauses while the
page is hidden and never runs a continuous animation loop between transitions.

## Research notes

This section is intentionally marked “Coming soon”: no research notes were
provided. To publish a note, create an HTML page in a `notes/` directory and add
a descriptive link in the `#notes` section of `index.html`. Remove the
`notes-placeholder` block when adding the first entry. For a short note, an
`article` directly inside the section also works.

## The Spain network

The diagram uses geographic coordinates from [Natural Earth, 1:50m countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson),
which is [public-domain map data](https://www.naturalearthdata.com/about/terms-of-use/).
The original Spain geometry is included in `data/spain.geojson`.
The mainland and Balearic Islands use the same projection. The Canary Islands
appear in a separate inset. Nodes trace the coastline and fill the interior;
nearby nodes form neural connections. Copper vector pairs share origins, with
arcs marking the angles between them. Across the other sections, these same
nodes and vector pairs form a scattered field. Entering About me assembles the
map in its reserved space; leaving disperses it again. On mobile, assembly waits
until that space comes into view below the biography.

Regenerate the asset deterministically (Node.js required only for this step):

```sh
node scripts/generate-map.mjs
```

## The pilgrim shell

Background has an open, divider-free education layout, with dates and locations
on the left and a Camino pilgrim's scallop-shell symbol on the right. The same
454 particles used for Spain assemble into its fan shape and radiating ribs
when this section is active. Angle pairs fade away as the shell forms, leaving
only its particle outline, in the same subtle slate color.
Mobile places the shell below the education entries and waits until its
reserved space is visible. Reduced motion switches shapes immediately; direct
section jumps and reversed scrolling blend from the current particle positions.

The original vector in `data/pilgrim-shell.svg` is
[St. James way shell.svg](https://commons.wikimedia.org/wiki/File:St._James_way_shell.svg)
by **Gambo7 / Spacejam2**, dedicated to the public domain. The generator places
the shell 90° clockwise from upright (fan facing right), omits the blue sign background, and samples its
curved contour. This decorative adaptation does not imply official affiliation
with the Camino waymark's owners; the source page also notes possible trademark
restrictions.

Regenerate the shell assets after regenerating Spain:

```sh
node scripts/generate-shell.mjs
```

## Saved cathedral version

The complete pre-shell website is saved outside this Git repository at
`../snapshots/cathedral-2026-09-15-bnjPLk/site/`, with restoration notes in its
parent directory. Its files were verified against the working site before
the shell changes. The snapshot contains no `.git` directory.

The inactive `assets/cathedral-network.js`, `assets/cathedral-network.svg`, and
`scripts/generate-cathedral.mjs` also remain here for reference, but are not
loaded by the current page. The saved site is the easiest way to revisit the
complete earlier design; restoring only the motif avoids losing later edits.

The measured outlines in `data/cathedral-contours.json` are adapted from
[Santiago.de.Compostela.Catedral.Noche.jpg](https://commons.wikimedia.org/wiki/File:Santiago.de.Compostela.Catedral.Noche.jpg)
by **Yearofthedragon**, licensed under [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/).
The photograph was cropped and segmented to obtain reference contours. The
generator now uses only the exterior, removes small irregularities, simplifies
the skyline and mirrors its left profile for a balanced schematic front view.
The source and processing details are included in the contour data, generated
JavaScript and SVG.

Regenerate the cathedral assets after regenerating Spain:

```sh
node scripts/generate-cathedral.mjs
```

Layout inspiration: [Soufiane Hayou’s website](https://www.soufianehayou.com/).
The layout, styling, geographic diagram, and animation code here are original;
the shell and archived cathedral contour use the credited sources above;
biographical and publication content comes from the supplied website.
