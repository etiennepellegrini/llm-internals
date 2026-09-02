# llm-internals

Three interactive explainers on how large language models work, from the matrix
arithmetic up to why an API bill is mostly cache reads.

Written for engineers: assumes linear algebra, assumes no machine learning. Every
ML term is defined where it first appears, and no mechanism is introduced before
the problem it solves.

**Live:** https://etiennepellegrini.github.io/llm-internals/

---

## Contents

| page | ~time | answers |
| --- | --- | --- |
| `transformers.html` | 17 min | How does a pile of matrices turn text into a prediction? |
| `llms.html` | 11 min | How does that become something you can hand a codebase to? |
| `cache.html` | 16 min | Why is my usage breakdown mostly cache reads, and what breaks it? |

They build on each other in that order, but any one works alone. Each has a TL;DR
at the top and a glossary at the bottom.

---

## Layout

```
.
├── index.html            landing page + routing table
├── transformers.html
├── llms.html
├── cache.html
├── .nojekyll             skip Jekyll; serve files as-is
└── assets/
    ├── site.css          ALL styling, for every page
    ├── site.js           banners, sidebar + TOC, scroll-spy, table wrapping
    ├── transformers.js   tokeniser, embedding lookup, attention, sampler
    ├── llms.js           training step, transcript replay
    └── cache.js          divergence slider, TTL simulator, cost calculator
```

No build step, no dependencies, no package manager. Edit a file, commit, push.

---

## Working on it

Open any `.html` directly in a browser — relative asset paths resolve fine over
`file://`. To match the served environment exactly:

```sh
python3 -m http.server 8000    # then http://localhost:8000
```

### Changing the layout width

One knob, at the top of `assets/site.css`:

```css
:root{
  --measure: 720px;    /* prose, figures, tables, code — everything */
  --side-w:  200px;    /* sidebar width on wide screens */
  --gutter:  20px;     /* page edge padding on narrow screens */
}
```

Everything in the content column derives from `--measure`, so all elements stay
the same width and captions align with the figures they caption. Change the one
value; don't add per-element overrides.

### Conventions

- **No inline styles.** Every `style=` attribute has been moved into `site.css`
  behind a class. Keep it that way — it's what makes the width knob work.
- **Script order matters.** `site.js` must load before the page script. It
  renders the section banners and builds the sidebar, which the page scripts
  assume has already happened. Reordering breaks things silently.
- **Sections are self-registering.** The sidebar table of contents is generated
  from each page's `.bannerwrap` headings. Add a section and it appears; no list
  to maintain.
- **Fonts** load from Google Fonts via `<link>` in each `<head>` — the only
  external dependency, and the only styling that isn't in `site.css`. Moving it
  to `@import` would serialise the request and delay text rendering. If the site
  needs to run on a locked-down network, vendor the two `.woff2` files into
  `assets/fonts/` and switch to `@font-face`.

---

## What's computed vs illustrative

Stated on the landing page too, but worth having here:

**Computed live and correct** — the attention arithmetic (dot products, scaling,
masking, softmax, weighted sum) on a hand-picked 4×4 toy; the sinusoidal
positional encoding; the sampling softmax under temperature and top-p; every
figure in the cache cost calculator and TTL simulator.

**Illustrative, and labelled as such in place** — the tokeniser is a heuristic,
not a learned BPE merge table; embedding-table values are seeded random numbers;
the multi-head attention patterns are hand-drawn to show what specialised heads
look like, not extracted from a trained model.

Prices and thresholds in `cache.html` were checked against
[Anthropic's prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
in **September 2026** and are the sort of thing that moves. Re-check before acting
on any number; the page links its sources.

---

## Deployment

GitHub Pages, **Settings → Pages → Source: Deploy from a branch**, `main` /
`(root)`. Static files served directly; no workflow in this repo.

### About the Node.js deprecation warning

The Actions tab shows runs called *pages build and deployment*, triggered by
`dynamic`, carrying a warning about `actions/upload-artifact@v4` running on
Node.js 20.

**This is not ours and there is nothing to fix.** Branch-based Pages deploys are
handled by a GitHub-managed workflow that does not live in this repo and cannot be
edited. The stale pins are GitHub's own. Node 20 is scheduled for removal from the
runners on 16 September 2026; if publishing breaks around then, that's the cause,
and it's a GitHub incident rather than a repo problem.

---

## Going further

- [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) —
  a live GPT-2 in the browser. The best follow-on to `transformers.html`: same
  concepts, real trained weights.
- [bbycroft.net/llm](https://bbycroft.net/llm) — 3D walkthrough of a working
  model, zoomable to individual multiplies.
- [Karpathy, Neural Networks: Zero to Hero](https://karpathy.ai/zero-to-hero.html)
  — builds a GPT from scratch on video.
- [Anthropic prompt caching reference](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
  — the authoritative source behind `cache.html`.

---

Built with Claude. Corrections and additions welcome — these are meant to be edited.
