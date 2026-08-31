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
- **Dash** — the teardrop, but the mark travels: it rolls off to the right at
  speed like a thrown dice, hangs there a beat, then rolls slowly back to where
  it started. The only look that needs a box wider than the mark.
- **Bump** — ten looks that move the dots rather than only scaling them in
  place. `scatter` bursts them apart and snaps them home; `shockwave` pushes
  the ring out ahead of a compressing core; `cradle` runs a Newton's cradle
  down the vertical axis; `boil` never stops drifting; `escapement` ticks the
  ring round a seat at a time; `jelly` wobbles from a tap; `swap` weaves the
  two triads through each other in opposite directions; `equalizer` bobs them
  like level meters; `twinkle` dims them in a scattered order; `heartbeat`
  gives two thumps and a long rest.
- **Track** — the dash on a smaller mark, rolled further (600°, 5.24 widths),
  with a 4px line tucked into the bottom of it that stretches out behind as it
  rolls away and shrinks away as it slows. Outward leg only.

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
| `/gallery` | Every look side by side, five across, each with a way through to `/test` |
| `/workbench` | The tuning workbench |
| `/public/*` | Static assets |

`:id` selects a preset when it names one — `pulse`, `breathe`, `snap`, `ripple`,
`around`, `circuit`, `spoke`, `bounce` (pulse), `bloom`, `snappy`, `wide`, `double` (orbit), or `tumble`, `hardware`,
`quick`, `heavy` (cube), or `roll`, `thud`, `skip`, `lap` (roll), or `dash`,
`fling`, `amble`, `yoyo` (dash), or `track`, `streak` (track).
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

Dash accepts `?mode=dash` plus `rollCount`, `rollMs`, `rollBack`, `rollOver`,
`dashX`, `dashPause`, `dashBackMs`, `dashHold`, `coreBack` (how much shape the
centre dot keeps on the way home), `coreBackSquash` (how much of that is
thinning), `dashCentre` (0 anchors at the resting spot instead of centring the
sweep), and the teardrop's `dropAmt`, `dropStretch` and `liquid`. Add `trail`
(thickness in px, 0 for none), `trailLag` (how far behind the tail runs) and
`trailGap` (px from the mark's lowest ink, negative tucks it up into the mark) and
`trailRadius` and `trailShift` (% of the mark's width, along) for a line under it — `/test/dash?trail=4&trailLag=200` is `track`.

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

## How the dash works

The teardrop roll, carried. The mark rolls away to the right at speed, hangs
there a beat, then rolls slowly back to where it started.

| Phase | Span, at the `dash` preset | What happens |
| --- | --- | --- |
| Roll out | 0–1100ms | Winds back, drives right, over-rolls, settles |
| Hang | 1100–1240ms | Still, at the far end |
| Roll home | 1240–3340ms | Rolls back on a smootherstep — the whole way, slowly |
| Rest | 3340–3860ms | Still, home |

Five things make it work.

**One progress drives both.** Rotation and travel read from the same eased
value, so the mark cannot slide: at every instant `x / θ` is the same number.
And the distance is set so that number is the physical one — a disc of radius
`r` turning `θ` covers `θr`, and the mark's radius is half its width, so a full
360° turn should travel `6.28319 × 0.5 = 3.1416` widths. That is the default,
and it measures at **0.000% slip** against a true roll.

**The drops turn around by passing through round.** Coming home the mark spins
the other way, so the fat end has to lead the opposite end. Rather than switch
the shape at the turnaround, the morph is driven by the **signed** speed through
the same trailing average the teardrop already uses — so it crosses zero on its
own, and the dots are round at the instant the lead swaps. It costs nothing
because there is nothing to see.

That only works if both directions draw the same path at zero morph, and they
did not: reversing the tail puts it on the opposite anchor, so the two would
have interpolated *through* each other and collapsed the dot on the way. The
path builder now rotates its output order to match, and the two directions agree
byte for byte at rest — checked for all seven dots, on every preset.

**The core keeps a shape on the way home.** Coming back is slow, and the morph
is driven by speed, so on the return the drops go almost round — the outer dots
reach only 30% of their outbound depth, which is right: they are barely moving.
The centre dot is the exception. It is normalised against the **return's own**
peak rather than the drive's, so it reaches `coreBack` (45%) of a full morph on
the way home and reads as a shape rather than a circle. `coreBackSquash` then
scales back only the *thinning* — the tail and the lead stay at full depth, so
coming home it reads as a drop rather than as a squashed one.

Nothing about that is faked. The return's speed profile still rises and falls,
so the envelope is genuinely `0 → 1 → 0`: the core is round at the turnaround,
tapers through the middle of the journey, and is round again before it lands.
And because the tail direction follows the sign of the travel, it points **the
other way** on the way back — the fat end leads left instead of right.

| Centre dot | aspect | point |
| --- | --- | --- |
| home | 1.00 | — |
| rolling out | 1.80 | trails left |
| rolling home | 1.29 | trails right |

Measured off the live page, not the source: at `t = 3860ms` the path is
identical to `t = 0`, so the loop closes on the shape as well as the motion.

**It is centred on its motion, not on where it rests.** The mark only ever
travels one way, so anchoring it at home would put the entire animation to the
right of wherever it is placed — at ship size that is nearly 600px of drift off
centre. `dashOffset()` slides the whole thing back by half the sweep, so it
starts left of centre, crosses it, and comes back.

The offset centres the *ink*, not the element box: the core is the mark's
visual centre and it sits at 48.82% of the box, not 50%. Measured on the live
page, the swept band's midpoint lands **0.14px** from the middle of the screen.
`dashCentre=0` anchors it at home again.

Because it occupies four and a half times its own width, `/test` draws the dash
smaller than the looks that stay put — `clamp(76px, 8.8vw, 140px)` against the
usual `clamp(100px, 11.4vw, 180px)`.

**It needs a wider box, and says by how much.** `dashExtent()` returns the room
required in multiples of the mark's own width. Travel is the easy half; the
other half is that a spinning mark sweeps a disc, not its box, and the drops
grow tips as they morph — so the radius is measured off the generated paths
themselves, at every sampled instant. Anchors and control points bound a bézier,
so the furthest of those from the spin origin bounds the ink.

| | `dash` |
| --- | --- |
| turns | 360°, one whole turn |
| travels | 3.14 widths right |
| runs from | −1.67 to 1.70 widths, either side of centre |
| sweeps | 0.99 widths as it turns |
| **needs a box** | **4.36× the mark's width** |

Verified in the browser against the real ink — walking every path through its
screen CTM, rather than unioning axis-aligned boxes around rotated ellipses —
the bound holds with a couple of pixels of slack each side at ship size.
`/gallery` draws that box around it as a dashed outline, sized from the same
number.

A whole turn rather than 240° is not free: 120° is the mark's symmetry step, so
any multiple lands it back on its own orientation, but 360° is the first one
that also reads as *one full roll* rather than two-thirds of one.

The core is held upright by `dashRollInv`, the same trick the teardrop uses:
sampled on the identical grid, so CSS interpolates both as angles and they
cancel at every instant rather than only at the keyframes.

**Not in the workbench.** The dash lives in `anim.js`, so `/test`, `/gallery`
and the index all render it — but `scatter-pulse.html` keeps its own copy of the
maths and has no dash sliders yet. Tune it through the query string.

## How the trail works

`track` is the dash with a 4px line under it, rolled further on a smaller mark:
**five rolls, 600°, 5.24 widths of travel** over 1500ms, against the dash's three
rolls and 3.14. 600° is still a multiple of the mark's 120° symmetry step, so it
lands on its own orientation, and `θr` keeps the distance honest — **0.0002%
slip**. The whole run is 6.46× the mark's width, so `/test` draws it smaller
again: `clamp(58px, 6.6vw, 104px)`, which puts the sweep at 667px measured.

The line is the motion drawn out rather than a decoration laid over it:

- **The head is pinned to the mark's centre**, plus `trailShift` (−10%). Both ends
  read from `dashShift`, the same function that places the mark, so the line
  cannot drift off it.
- **The tail is where that centre was, `trailLag` ago (160ms).** So the line is
  long exactly when the mark is fast — it stretches to **2.24×** the mark's width
  at the peak of the roll — and collapses to nothing when it stops. Nothing decays
  it on a timer; it is short because the mark is slow.
- **There is none on the way home.** The line belongs to the outward roll.

The bar is one mark wide with its origin on its left edge, so `translateX(h)
scaleX(k)` lays it from `h` to `h + k`. Pinning the origin to the head keeps that
end under the mark, and `k` is clamped at 0 so the line only ever reaches back to
the left.

The line is 4px with 1px corners, solid under the mark and fading out to the
tail. Because `k` is never positive the bar always mirrors about its origin,
which carries the gradient with it — so `to right` runs head-to-tail no matter
which way round the bar sits, and one declaration covers it.

It fades to `rgba(255,255,255,0)`, not to `transparent`. `transparent` is
transparent *black*, so a white bar fading to it dims through grey on the way
out; dropping the alpha on the same colour keeps it clean.

### Why `trailShift` is a percentage

The head has to stay hidden behind the mark, and that is not a fixed number of
pixels — it is a fraction of the mark's width, and it moves as the mark turns.
The line sits near the bottom of the disc, where there is only ink where a dot
happens to be; between dots the rightmost ink at that height falls back toward
the centre. Probed at every angle across the cycle, it reaches only **7.9% left
of the core** at the worst rotation.

At a fixed +6px the head therefore poked out past the dots by up to **14px**, and
what showed at the end of the roll — when all that was left was the head — was a
stub sticking out past the bottom circle. At **−10% of the mark's width** it is
covered at every angle *and* at every size, which a pixel value could not be:
`/test` draws this mark at 104px and `/gallery` at 96px. Re-probed: **0 frames
out of 94** with any part of the line past the ink, worst case 2.1px inside it.

The clamp is not what removes it, though. The drive decelerates the whole way in,
so the tail closes on the head and the line has **already faded to nothing around
950ms** — before the mark stops at 1100ms, let alone turns round at 1240ms. It
goes out the way it came in, on the motion; the clamp only holds it at zero.

It sits **tucked into the mark**, not below it. `trailGap` is measured from the
lowest point the ink reaches — a constant, because the mark sweeps a disc as it
rolls. At `-6` the line's top edge sits **4.5px inside** that lowest point, so
the line runs out from under the logo rather than floating beneath it. Positive
values drop it back down to a floor line.

One gotcha worth recording: `calc(96.95% + -6px)` is a parse error — calc has no
unary minus after an operator — so the sign is emitted as the operator.

`scaleX` never touches the thickness, so the line is 4px at every instant and at
every mark size — verified in the browser, not just intended.

A trail needs a sibling to the mark, so `markSvg` wraps the two in a
`…-rig` span **only** when `trail` is set. Every other look still renders as a
bare `<svg>`, unchanged.

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

### Four waves that don't run down the diagonal

`around`, `circuit`, `spoke` and `bounce` keep the same curve and the same
`min`/`dip`/`over`/`pulse`/`rest` knobs; only *when* each dot fires changes.

**`around`** — a lap of the ring instead of a run across it. The preset carries
its own order, `top → tl → ll → bottom → lr → tr → core`: counter-clockwise from
the top, down the left, along the bottom, up the right, then down into the
centre. `travel` is the spread across the whole order, so at 840ms each dot is
140ms behind the last (640ms pulse, 420ms rest → 1900ms cycle).

**`circuit`** — the same lap, closed and left running. After the top right the
wave carries on to the top, dives into the core and comes back up to the top,
which is where the next lap starts:
`top → tl → ll → bottom → lr → tr → top → core →` straight into the next lap.

Because it never stops, `travel` is one whole lap *including the wrap back to
the start*, and the eight steps are spread evenly across it — at 1600ms that is
200ms a step, and the cycle is the lap: 1600ms, no rest.

| Step | Dot | Fires at |
| --- | --- | --- |
| 1 | Top | 0ms |
| 2 | Top left | 200ms |
| 3 | Lower left | 400ms |
| 4 | Bottom | 600ms |
| 5 | Lower right | 800ms |
| 6 | Top right | 1000ms |
| 7 | Top | 1200ms |
| 8 | Core | 1400ms |

Two things fall out of a wave that wraps. The **top fires twice a lap**, 400ms
apart at the crown, so its pulse is clipped to the gap it has — a dot that fires
twice in quick succession takes a shorter pulse rather than colliding with
itself. And the **core's pulse runs off the end** of the lap: it starts at
1400ms and wants 400ms, so its keyframes are split in two, finishing at the top
of the next lap. The animation opens on exactly the scale it closes on, so
there is no seam to see.

**`spoke`** — the same lap, but back to the middle between every dot:
`top → core → tl → core → ll → core → bottom → core → lr → core → tr → core →`
and round again. Twelve evenly spaced steps across a 2400ms lap, 200ms apart, so
the core beats six times to each ring dot's one. Its pulse is clipped to the
400ms it has between beats, and its last one wraps into the next lap the same
way `circuit`'s does.

**`bounce`** — the diagonal run out *and* back. The wave crosses top left to
bottom right, turns at the far corner, and comes home the way it came, so every
dot but the turning one pulses **twice** a cycle:

| Dot | Offset | Out | Home |
| --- | --- | --- | --- |
| Top left | 0.000 | 0ms | 1040ms |
| Top | 0.112 | 34ms | 1006ms |
| Lower left | 0.350 | 105ms | 935ms |
| Core | 0.487 | 146ms | 894ms |
| Top right | 0.618 | 185ms | 855ms |
| Bottom | 0.844 | 253ms | 787ms |
| Lower right | 1.000 | 300ms | — |

The turn is held until the far dot has finished (`travel + pulse`), so a dot's
two pulses can never overlap: the closer it sits to the corner, the tighter they
land, and the lower right dot's would-be second pulse falls exactly on the end of
its first, so it keeps the single pulse it makes at the turn.

There is no rest at the end: the cycle is 1480ms, which is the top left dot
getting home. A pulse ends at full size, so that dot has recovered the instant
the next wave leaves — and since the last dot home is also the first away, one
wave runs straight into the next. Add `?rest=` for a beat between them.

Two pulses cannot be said with one `animation-delay`, so `bounce` drops the
per-dot delay and gives each dot its own keyframes spanning the whole cycle,
holding at rest between its pulses. Everything else — the shared curve, the
`?min=` overrides, the debug readout — works the same.
