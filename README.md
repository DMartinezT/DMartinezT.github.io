# Diego Martinez Taboada — second version

A self-contained static website. The original `../github` folder is untouched.

## Open locally

Open `index.html` in a browser, or run this command from this folder:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then visit http://127.0.0.1:8765. There are no packages to install and no build step.
Google Fonts are optional: the site uses system fallbacks when offline.

## Edit

- `index.html`: biography, all 11 papers, education, contact links, and Research notes.
- `styles.css`: colors, typography, and desktop/mobile layouts.
- `script.js`: the introduction that types each bullet once and leaves it visible; mobile navigation; current section highlighting.
- `background.js`: the shared neural/vector field. The same nodes gather into Spain in section 01 and disperse when leaving; each transition lasts 1.5 seconds and then stops rendering.
- `profile.jpg` and `CV.pdf`: copies of the files supplied in the original website.
- `assets/spain-network.svg`: static geographic network, used as the About me fallback without JavaScript or canvas support.
- `assets/math-network.js`: generated nodes, connections, and vector pairs for the animated background. Loaded locally without a server or network request.

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

Layout inspiration: [Soufiane Hayou’s website](https://www.soufianehayou.com/).
The layout, styling, geographic diagram, and animation code here are original;
biographical and publication content comes from the supplied website.
