# Showcase video

| File | Size | Use |
|---|---|---|
| `showcase-16x9.mp4` | 1920×1080, 36 s | Documentation, presentations, YouTube |
| `showcase-4x5.mp4` | 1080×1350, 36 s | LinkedIn and other social feeds (4:5 portrait fills the most screen in a feed) |
| `showcase-poster.png` | 1920×1080 | Still for the README and link previews |

Both videos are H.264 MP4, 30 fps, no audio, so they autoplay muted in feeds.

## What it shows

1. **Hook**: the project's modules and imports as unordered spaghetti.
2. **Analyze**: `pyanalyzer serve` parses every file.
3. **Mind map**: the same modules grow into a tree, and the path to `models/core.py` lights up.
4. **Architecture**: the tree folds into the package graph; import traffic flows along the edges and the package everything depends on (`models`) is called out.
5. **Code explorer**: the `CodeElement` class, its kinds of use, and which files use it most.
6. **Findings**: import cycles, complex and long functions, dead-code candidates, large classes.
7. **End card**: name, the four views, and how to start.

Everything shown comes from running the analyzer on its own source (`backend/pyanalyzer`). It is saved in `showcase/data.js`. The 10,100-files-in-6.9-s figure on the end card is the benchmark in the main README.

## Watching and editing

Open `showcase/index.html` in a browser to play it, with a seek bar. Add `?w=1080&h=1350` for the portrait cut. The animation is one canvas drawn as a function of time (`render(t)` in that file), and the scene timings are the `T` table at the top of the script.

## Rendering

```bash
node scripts/render_showcase.mjs                                # both MP4s and the poster
node scripts/render_showcase.mjs --stills 6,13.5,20 --out /tmp/s  # PNG stills at those seconds
```

This needs the frontend's dependencies (`make setup`), Google Chrome (its WebCodecs encodes H.264, which Playwright's bundled Chromium cannot), and a network connection to load `mp4-muxer` from jsDelivr. Each frame is drawn and encoded in turn, so the output is exact and does not depend on machine speed. Both cuts take about a minute.

To refresh the data after the code changes, serve the analyzer on its own source and save the API responses (`/api/tree`, `/api/graph?level=package&package_depth=2`, `/api/graph?level=module`, `/api/usages?id=class:models/core.py:CodeElement`, `/api/summary`, `/api/issues`) into `showcase/data.js`, trimmed to the fields it already has.
