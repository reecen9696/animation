# Scatter logo animation

Two animations for the seven-dot Scatter mark, plus a loading-screen route to
see them in context.

- **Pulse** — a wave crossing the mark on the top-left → bottom-right diagonal.
- **Orbit** — the six outer dots bloom away from the core while the mark winds
  back, then it spins a full turn and everything pulls back in.
- **Cube** — a GameCube-boot-style tumble: the dots tuck into a tight cluster,
  the mark rolls end over end with a hop and a landing squash on each roll, then
  it snaps open into the logo.
- **Roll** — one continuous 240° spin with a wind-up: it rolls back slightly,
  drives forward picking up speed, overshoots, then settles.
- **Smear** — the roll, with the six outer dots squashing along their radius as
  the spin picks up, so each flattens in the direction it is travelling.
- **Drop** — the roll, with every dot morphing into a teardrop, fat end leading
  the direction of travel. The centre dot never spins: it just morphs in and out
  with its point held facing left.

## Run

```sh
node server.js            # http://localhost:4173
PORT=8080 node server.js
```

No dependencies — Node's stdlib only.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Index of the variants |
| `/test/:id` | Loading screen: app screenshot, 50% black scrim, mark centred on top |
| `/test` | Same, default preset |
| `/workbench` | The tuning workbench |
| `/public/*` | Static assets |

`:id` selects a preset when it names one — `pulse`, `breathe`, `snap`, `ripple`
(pulse), `bloom`, `snappy`, `wide`, `double` (orbit), or `tumble`, `hardware`,
`quick`, `heavy` (cube), or `roll`, `thud`, `skip`, `lap` (roll).
Any other value is treated as an opaque id — a game, session or round — and the
preset comes from `?preset=`:

```
/test/pulse
/test/round-8817?preset=snap
/test/pulse?min=0.9&travel=900&debug=1
```

On a loading screen: `1`–`8` switch preset, `d` toggles the timing readout,
`h` toggles the hint.

Orbit accepts `?mode=orbit` plus `push`, `spreadMul`, `windup`, `turns`,
`bloomMs`, `pushMs`, `spinMs`, `returnMs`, `orbitRest`.

Cube accepts `?mode=cube` plus `steps`, `stepMs`, `hop`, `squash`, `tuck`,
`tuckMs`, `snapMs`, `cubeRest`.

Roll accepts `?mode=roll` plus `rollCount`, `rollMs`, `rollBack`, `rollOver`,
`rollHold`. Smear takes the same, plus `flattenCircle` and `flattenOval`. Drop
takes the same, plus `dropAmt`, `dropStretch` and `liquid`.

### From the workbench

The workbench has a **Preview loading screen** button. It opens a separate window
showing the mark on the app behind the scrim, at ship size, using whatever is
currently dialled in — sliders and hand-tuned delays included.

The workbench keeps its state, so you can carry on tuning with the window open:
each change restyles the popup in place rather than reloading it, so the
animation never restarts. Clicking the button again brings the window forward
instead of opening a second one.

If the browser blocks the popup it falls back to a full-screen overlay in the
workbench itself, closed with escape.

Served by `server.js`, the preview window also links through to the real `/test`
route with the same parameters in the URL, including a `delays=` list so
hand-tuned offsets survive the trip.

Pulse query overrides: `min`, `dip`, `over`, `pulse`, `travel`, `rest`, `fade`,
plus `delays` (a `tl:0,top:69,…` list that wins over the computed wave) and
`lengths` (`tl:900,core:1270,…`, how long each dot moves for).

### Editing the wave timeline

Each bar spans one dot's move: **left edge = delay, width = length.**

| Gesture | Effect |
| --- | --- |
| Drag the bar | Moves it — delay changes, length held |
| Drag the right end | Stretches it — length changes, start held |
| Drag the left end | Restretches it — the right end stays pinned |
| Type in **delay** / **length** | Same, exactly |

Everything snaps to 10ms; the shortest a bar can get is 60ms. Moving the shared
**Pulse length** slider clears per-dot lengths and takes over again.

When lengths differ, each dot needs its own keyframes — the pulse window is a
different fraction of the cycle for each — so the generated CSS switches from one
shared `@keyframes` to seven. It switches back when they match again. The cycle
becomes `max(delay + length) + rest` rather than `maxDelay + pulse`.

### Saved looks

**Save** stores the current settings — mode, every slider, and any hand-tuned
delays — in `localStorage` under `scatter-pulse:saved:v1`. Saved looks appear as
chips; click one to restore it (including switching mode), or `×` to delete.
They survive a reload and stay in that browser only.

## Files

| File | Purpose |
| --- | --- |
| `anim.js` | The animation maths — curve, per-dot offsets, keyframe generation |
| `server.js` | Dev server and the `/test/:id` route |
| `build-artifact.js` | Bundles the loading screen into one self-contained HTML file |
| `scatter-pulse.html` | Tuning workbench (timeline editing, CSV export) |
| `loading-screen.html` | Built output — background inlined, no external requests |
| `public/background.jpg` | App screenshot used as the backdrop |
| `scatter-pulse-times.csv` | Per-dot delays at the default settings |
| `scatter-pulse-keyframes.csv` | Sampled scale curve |
| `scatter-pulse.json` | Full config plus per-dot timings |

`anim.js` is the single source of truth: the route and the standalone build
both render from it, so they cannot drift.

## How the roll works

One "go" is `rollCount` rolls of 120°, defaulting to **2 = 240°**. Because 120°
is the mark's own symmetry step, any multiple of it lands the logo back in its
correct orientation, so the loop closes without a snap.

The whole go is a single motion in two segments:

1. **Wind back** — smootherstep from 0° to −14°, easing to a stop. The only slow
   part before the drive.
2. **Release** — an `easeOutBack` that starts at *full speed* the instant it
   lets go and decelerates the whole way home, with the overshoot folded into
   that same deceleration rather than tacked on as a separate move.

| | Rotation |
| --- | --- |
| start | 0° |
| wound back | **−14°** |
| overshoot peak | **258°** |
| settles | **240°** |

The overshoot tension is solved from the requested angle — `4s³/(27(s+1)²) = o`
gives the `easeOutBack` parameter — so **Over-roll** in degrees is what you get.

## How the smear works

Same motion, but each outer dot is squashed along its **radius**, which keeps its
tangential length and takes height out of it — the direction it is travelling as
the mark turns. Per dot the transform is `rotate(θ) scale(1−k, 1) rotate(−θ)`
about the dot's own centre, where θ is its radial angle.

This suits the mark: the top dot is already a wide horizontal ellipse and the
lower two are tilted, so their long axes are **already tangential**. The squash
works with the existing shapes rather than against them.

`k` tracks the instantaneous angular speed, normalised to the peak, so the dots
are round at rest and flattest at the moment of the whip. The circles and the
ovals get separate amounts (**Circles — squash** / **Ovals — squash**) since they
start from different aspect ratios. The core dot never moves or squashes.

Verified: at rest both principal scales read 1.0000; at peak the major axis stays
at exactly 1.0000 while the minor drops to the configured floor.

## How the teardrop works

Every dot in the mark really *is* a 4-bezier ellipse — I recovered each one's
`cx, cy, rx, ry, ψ` from the original path anchors, and the four circles come out
at `r = 3.1704` with the three ovals at `rx 3.9125, ry 2.2588` rotated 0/60/120°.

That means each dot can be **regenerated exactly** and then blended toward a
teardrop built on the same command structure, which is what lets CSS interpolate
the `d` property smoothly. At rest the generated path is the original ellipse,
re-anchored — pixel for pixel the same mark.

The teardrop is built in the dot's own frame:

- The four anchors are placed at the ellipse parameter where the **tail**
  direction lies, plus 90° steps. Tail is `φ − 90°` — behind the travel of a
  clockwise spin — so the **fat end always leads**.
- **The core never spins, and it isn't a teardrop.** It is held still by a
  second animation, `rollTipInv`, that mirrors the mark's rotation — sampled at
  exactly the same times as `rollTip`, so CSS interpolates both as *angles* and
  they cancel at every instant, not just at keyframes. Verified across the fast
  part of the spin at times deliberately off the keyframe grid: net rotation
  `0.00000°` everywhere.

  This replaced an earlier approach that baked `180° − ψ(t)` into the path
  itself. That looked right frozen but **shimmered in motion**: the rotation
  reaches 29.7° between adjacent keyframes, and interpolating the *points*
  linearly across that pulls the shape in along a chord — a 3.34% radius dip
  mid-step, in and out, every frame. Rotating via `transform` avoids it because
  an angle interpolates as an angle.

  It also gets its own, much softer profile — `round = 1`, which makes the two
  tail handles exactly opposite so that end is **smooth rather than a cusp**, plus
  a bigger forward shift on the sides so the widest point sits toward the head.
  The result is an egg: broad at one end, tapering to a rounded narrow end,
  facing left. The outer dots stay at `round = 0.25` and keep their teardrops.

  On top of that the core **shrinks 16% overall** as it morphs and takes a further
  **20% off its height**, so during the spin it draws in and flattens rather than
  just changing shape.
- The tail anchor is pushed out, and its two handles are blended off the chord
  toward the perpendicular so the end **curves into** the point rather than
  spiking to a cusp. The sides shift forward so the widest part leads, and the
  body narrows across the travel axis as the morph deepens.
- Everything is then stretched along the travel axis and narrowed across it.

The tail, head bulge and width are all scaled so the drops stay clear of each
other at the default settings.

**Liquid lag.** The morph is driven by the spin's speed, but through a *trailing*
average of it (window = `liquid × 45%` of the spin). The shape answers just after
the motion rather than exactly with it, which is what reads as fluid rather than
mechanical.

**Settle after spin.** The rotation stops but the shape does not: it keeps easing
back for `settleMs` (200ms by default) on a smootherstep, so the dots are still
un-morphing after the mark has already come to rest. That overhang is what gives
it the slow-jello feel. Measured on the core: 59.9 × 59.9 at rest, 57.0 × 48.8 at
peak, still 58.8 × 59.6 fifty milliseconds *after* the spin has stopped, fully
round again at 1150ms.

## How the cube tumble is built

Four phases, at the default `tumble` preset (2060ms cycle):

| Phase | Span | What happens |
| --- | --- | --- |
| Tuck in | 0–240ms | Dots pull 62% of the way to the core, into one tight cluster |
| Tumble | 240–1020ms | Six rolls of 60°, each with a hop and a landing squash |
| Snap out | 1020–1440ms | Dots pop back out, slightly past their positions, and settle |
| Rest | 1440–2060ms | Still |

Three details do the work:

- **The roll easing is deliberately not symmetric.** A tumbling block tips
  slowly, accelerates as it passes over its edge, then stops dead. That is
  `t^1.9` — ease-in with a hard stop and *no* rotational overshoot. The velocity
  discontinuity at each landing is the point; a smooth ease would read as a
  glide, not a tumble.
- **The impact goes into a squash, not the rotation.** Each landing briefly
  scales the mark to `(1 + 0.6s, 1 − s)`, decaying over a third of a roll.
- **The transform order matters:** `translateY(hop) scale(sx, sy) rotate(deg)`.
  CSS applies these right to left, so the mark rotates in its own space but
  squashes against the world's vertical — the way something lands on a floor.
  Reversing those two would rotate the squash with the mark and lose the read.

Rotation ends at 360° rather than unwinding, so the loop restarts at an identical
angle.

## How the orbit is built

The six outer dots sit on a hexagon around the core, so their unit vectors out
from the centre are what the bloom animates along — the core itself never moves.
The mark rotates about the core (`transform-origin: 48.8224% 47.3376%`), not the
box centre.

**Distance from centre** sets how far the dots travel out; **Resting spread**
scales where they sit at rest (`1.5×` moves each dot out by half its own radius,
so the whole mark reads bigger without redrawing it).

Four phases, at the default `bloom` preset (2300ms cycle):

| Phase | Span | What happens |
| --- | --- | --- |
| Push out | 0–480ms | Dots travel 2.6 units out; mark winds back to −26° |
| Spin | 480–1380ms | Mark turns from −26° to 360°, dots held out |
| Pull in | 1380–1900ms | Dots return to centre |
| Rest | 1900–2300ms | Still |

The wind-back is anticipation: the mark loads up against the direction of travel
before the spin, which is what stops the turn reading as a jump. Rotation ends at
360° rather than returning to 0, so the loop restarts at a visually identical
angle instead of unwinding.

## How the pulse timing works

Each dot's centre is projected onto the top-left → bottom-right diagonal and
normalised across the mark; that fraction scales the wave travel time. Seven
dots land on seven different delays, so the mark reads as a travelling swell
rather than a set of blinks.

At the default preset (900ms pulse, 620ms travel, 500ms rest → 2020ms cycle):

| Dot | Offset | Delay |
| --- | --- | --- |
| Top left | 0.000 | 0ms |
| Top | 0.112 | 69ms |
| Lower left | 0.350 | 217ms |
| Core | 0.487 | 302ms |
| Top right | 0.618 | 383ms |
| Bottom | 0.844 | 523ms |
| Lower right | 1.000 | 620ms |

Pulse (900ms) is longer than travel (620ms), so every dot is still moving when
the next starts — the overlap is what makes it a wave.
