/**
 * Custom looks: animations authored elsewhere and shipped as Lottie JSON,
 * rather than generated from anim.js.
 *
 * Everything else on this site is CSS keyframes computed from a config, so it
 * can be retimed, rescaled and recoloured from one place. These cannot: they
 * arrive finished. This module is the seam between the two - it reads the
 * files in custom/, reports their real length, and hands the pages a JSON
 * blob each. The pages play them with lottie (public/lottie.min.js).
 *
 * To add one: drop the .json in custom/ and add an entry to CUSTOM below.
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "custom");

/**
 * `dots` is a per-frame opacity per dot layer, which is how the die stops
 * reading as see-through - see the note above DECLUTTER below.
 *
 * `round` overrides the die body's corner radius. The body is a plain hexagon
 * with no tangents on its vertices - the curve comes from a Round Corners
 * modifier sitting after the path, whose radius the file animates 40 -> 80 ->
 * 40 as it rolls. Setting it pins that to one value.
 *
 * `freeze` names the one frame a look is held on. It is not done by trimming
 * the file - cutting it to `op: 1` leaves lottie looping frames 0 to 1, so the
 * drawing keeps interpolating a fraction of a frame and visibly shivers. The
 * page has to stop the clock instead: it loads a still with autoplay off and
 * parks it with goToAndStop. See `stills()`.
 *
 * `portal` builds a small scene around the still instead of just moving it:
 * a white disc on the floor that opens and shuts, and a die that comes up
 * through it, bounces, and drops back through. See `portalCss`.
 *
 * `jump` then throws that still in the air and turns it, as CSS on the mount:
 * up, one whole turn while airborne, down, landing on the orientation it left
 * on. The die is solid, so nothing squashes - only height and rotation.
 *
 * `recolor` maps a source colour to the one the site should draw instead, as
 * "#RRGGBB" keys. The stage here is black and the mark is white, so a file
 * authored for a light background has to be turned round or half of it
 * disappears into the background. `hide` drops whole layers by name prefix.
 * The files on disk are never touched - both happen on the way out, so the
 * original stays the reference and two looks can share one file.
 */
/**
 * Per-frame opacity for each of the die's dot layers, one value per frame.
 *
 * The file carries eight dot layers for a seven-dot mark, and draws all eight
 * at every frame. At rest two of them sit on the same spot so you count seven;
 * through the roll they drift apart and you count eight, which is what reads
 * as the far side showing through. There is nothing in the file to consult
 * about it - every null sits at z=0 and the body is four drawn outlines, so it
 * holds no depth and no faces.
 *
 * So this is measured rather than declared. Each dot was tracked across all 32
 * frames, and a dot's opacity falls as a higher-priority dot closes on it:
 * full at 1.15 combined radii apart, gone by 0.55, smoothstepped between.
 * Priority is layer order, which is fixed, so the choice can never flicker -
 * and because it is a distance rather than a switch, the dots fade rather than
 * blink. Re-derive or hand-adjust it in dice-lab.html.
 */
const DECLUTTER = {
    "01": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "02": [1, 1, 1, 0.911, 1, 1, 1, 1, 1, 0.999, 0.909, 0.994, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "03": [1, 1, 1, 1, 1, 1, 1, 1, 1, 0.607, 0.005, 0.574, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "04": [1, 1, 1, 1, 1, 0.988, 0, 0.932, 1, 1, 1, 1, 1, 1, 1, 0.988, 0.932, 0.899, 0.919, 0.969, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "05": [1, 1, 1, 1, 1, 1, 0.764, 1, 1, 1, 1, 0.896, 0, 0, 0.856, 0.522, 0.103, 0.01, 0.072, 0.361, 0.758, 0.99, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "06": [1, 1, 0.707, 0, 0.823, 0.007, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "07": [1, 1, 1, 0.962, 0.995, 1, 0.085, 0.721, 0, 0.034, 0.033, 0.828, 1, 1, 1, 0.936, 0.91, 0.944, 0.985, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "08": [0, 0, 0.497, 0.197, 0.525, 1, 1, 1, 1, 0.843, 0.842, 0.999, 1, 1, 0.467, 0.018, 0, 0.032, 0.289, 0.646, 0.773, 0.321, 0.026, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

const CUSTOM = {
  dice: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "A die tumbling end over end, landing square each time. Authored for "
        + "a light page - black body, white pips - so it is turned round here: "
        + "on black the body is white and the pips are the holes in it.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" }
  },
  /* The same file as `dice`, with the body taken out rather than turned
     round: the pips are all that is left, tumbling on their own. Dropping the
     Sq layers outright beats painting them black - nothing is drawn at all, so
     it holds up on any ground, not only this one. */
  pips: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "The die with its body removed: only the pips, in pure white, "
        + "tumbling in the same formation the mark already uses.",
    recolor: { "#F3F3F3": "#FFFFFF" },
    hide: ["Sq"]
  },
  /* The die with the crowding taken out: same roll, but a dot dims away as
     another closes on it and comes back as they part, so the face stays a
     clean seven all the way round instead of briefly showing eight. */
  solid: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "The die turned round for a black page, with each dot fading out as "
        + "another crowds it, so it never reads as see-through.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" },
    dots: DECLUTTER
  },
  /* The die's own roll is thrown away here - only frame 0 is kept, which is
     the flat mark. That still is then jumped and turned a whole revolution in
     the air, landing flat on the orientation it left on. It stays a solid
     object throughout: it moves and it turns, and nothing about it deforms. */
  jump: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec, frame 0",
    note: "The flat die, held still, thrown up and turned once round before "
        + "it lands back flat. No roll and no squash - it is a solid object.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" },
    dots: DECLUTTER,
    round: 74,
    freeze: 0,
    jump: { ms: 1400, lift: 42, turn: 360, up: 0.12, down: 0.88, mount: 0.72 }
  },
  /* A scene rather than a single moving mark. The disc on the floor is the
     way in and out: it opens, the die rises through it, it shuts behind it,
     the die drops and bounces twice, the disc opens again under it on the
     second bounce, and the die falls back through before it shuts. Everything
     below the floor line is clipped, so the disc really does read as a hole. */
  portal: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec, frame 0",
    note: "The flat die coming up through a hole in the floor, bouncing twice "
        + "and dropping back through it. The disc opens and shuts around it.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" },
    dots: DECLUTTER,
    round: 74,
    freeze: 0,
    portal: { ms: 4200, floor: 0.70, die: 0.40, disc: 0.88, lift: 150, turn: 720 }
  },
  ghost: {
    file: "ghost.json",
    source: "Scatter loading v5",
    note: "The same tumble, held much longer and drawn as a ghost: the body "
        + "sits at 21% and the pips fade in and out on their own clocks. "
        + "Authored for a dark page already, so it is shipped as it arrived.",
    recolor: null
  }
};

const ids = () => Object.keys(CUSTOM);
const has = id => Object.prototype.hasOwnProperty.call(CUSTOM, id);

/** The file as authored, parsed. */
function raw(id) {
  return JSON.parse(fs.readFileSync(path.join(DIR, CUSTOM[id].file), "utf8"));
}

const hex = rgb => "#" + rgb.slice(0, 3)
  .map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

/**
 * Walk every fill and stroke, swapping any colour the preset names. Alpha is
 * left alone: it is what gives `ghost` its shading, and a recolour has no
 * business flattening that.
 */
function applyRecolor(node, map) {
  if (Array.isArray(node)) { node.forEach(n => applyRecolor(n, map)); return; }
  if (!node || typeof node !== "object") return;
  const isPaint = node.ty === "fl" || node.ty === "st";
  if (isPaint && node.c && Array.isArray(node.c.k) && typeof node.c.k[0] === "number") {
    const to = map[hex(node.c.k)];
    if (to) node.c.k = rgbOf(to).concat(node.c.k.slice(3));
  }
  for (const k of Object.keys(node)) applyRecolor(node[k], map);
}

/**
 * Drop every layer whose name starts with one of `prefixes`, wherever it sits
 * - top level or inside a precomp. Removing the layer rather than zeroing its
 * opacity keeps it out of the render tree entirely.
 */
function applyHide(d, prefixes) {
  const drop = L => prefixes.some(pre => String(L.nm || "").startsWith(pre));
  if (Array.isArray(d.layers)) d.layers = d.layers.filter(L => !drop(L));
  for (const a of d.assets || []) {
    if (Array.isArray(a.layers)) a.layers = a.layers.filter(L => !drop(L));
  }
}

/**
 * Turn a per-frame opacity table into keyframes on each dot layer. One key per
 * frame, so whatever easing sits between two of them spans a thirtieth of a
 * second and cannot be seen; the shape of the fade is carried by the values.
 */
function applyDots(d, table) {
  const EASE = { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } };
  for (const a of d.assets || []) {
    for (const L of a.layers || []) {
      const m = /3D_Circle_(\d+)$/.exec(L.nm || "");
      if (!m || !table[m[1]]) continue;
      const o = L.ks && L.ks.o;
      if (!o) continue;
      const base = typeof o.k === "number" ? o.k : 100;
      const vals = table[m[1]];
      L.ks.o = {
        a: 1,
        k: vals.map((v, f) => {
          const key = { t: f, s: [Math.round(v * base * 100) / 100] };
          return f === vals.length - 1 ? key : Object.assign({}, EASE, key);
        }),
        ix: o.ix
      };
    }
  }
}

/**
 * Pin the Round Corners modifier to one radius, on every shape that has one.
 * The file animates it as the die rolls; a still has no roll to follow.
 */
function applyRound(d, radius) {
  const walk = n => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== "object") return;
    if (n.ty === "rd" && n.r) n.r = { a: 0, k: radius, ix: n.r.ix };
    for (const k of Object.keys(n)) walk(n[k]);
  };
  walk(d.assets || []);
  walk(d.layers || []);
}

/** The animation as the site should draw it: ready to hand to lottie. */
function data(id) {
  const d = raw(id);
  if (CUSTOM[id].recolor) applyRecolor(d, CUSTOM[id].recolor);
  if (CUSTOM[id].hide) applyHide(d, CUSTOM[id].hide);
  if (CUSTOM[id].dots) applyDots(d, CUSTOM[id].dots);
  if (CUSTOM[id].round !== undefined) applyRound(d, CUSTOM[id].round);
  return d;
}

/** How long one loop runs, in ms, read off the file rather than declared. */
function cycleOf(id) {
  const j = (CUSTOM[id] && (CUSTOM[id].jump || CUSTOM[id].portal));
  if (j) return j.ms;                    /* a still's length is its own arc */
  const d = raw(id);
  const fr = d.fr || 30;
  return Math.round(((d.op || 0) - (d.ip || 0)) / fr * 1000);
}

/** Everything a page needs to lay one out, without reading the file itself. */
const meta = id => ({
  id,
  cycle: cycleOf(id),
  source: CUSTOM[id].source,
  note: CUSTOM[id].note,
  recolored: !!CUSTOM[id].recolor
});

/** `{ dice: {...}, ghost: {...} }`, for inlining into a built page. */
const bundle = () => Object.fromEntries(ids().map(id => [id, data(id)]));

/**
 * The jump, as CSS on the mount.
 *
 * Height and turn want different easing - the throw slows into the top and
 * gathers on the way down, while the turn runs at one rate throughout - and a
 * single transform cannot ease its parts separately. So the height rides on
 * the mount and the turn on the SVG inside it, which is two elements and two
 * timing functions. Three keyframes each, eased, rather than a sampled
 * polyline: the curve is then the browser's to draw and is properly smooth.
 *
 * It sits still on the ground either side of the throw, which gives the loop a
 * beat instead of making it a continuous churn.
 */
function jumpCss(id, scope, suffix = "") {
  const j = CUSTOM[id] && CUSTOM[id].jump;
  if (!j) return null;
  const S = scope ? scope + " " : "";
  const pc = t => (t * 100).toFixed(2) + "%";
  /* leaving the ground fast and arriving slow, then the mirror of it */
  const UP = "cubic-bezier(.12,.62,.30,1)";
  const DOWN = "cubic-bezier(.70,0,.88,.38)";

  return `${S}.lottie[data-anim="${id}"] {
    animation: customLift${suffix} ${j.ms}ms infinite both;
    will-change: transform;
  }
${S}.lottie[data-anim="${id}"] svg {
    animation: customTurn${suffix} ${j.ms}ms linear infinite both;
    will-change: transform;
  }
@keyframes customLift${suffix} {
  0%, ${pc(j.up)} { transform: translateY(0); animation-timing-function: ${UP} }
  ${pc((j.up + j.down) / 2)} { transform: translateY(-${j.lift}%); animation-timing-function: ${DOWN} }
  ${pc(j.down)}, 100% { transform: translateY(0) }
}
@keyframes customTurn${suffix} {
  0%, ${pc(j.up)} { transform: rotate(0deg) }
  ${pc(j.down)}, 100% { transform: rotate(${j.turn}deg) }
}`;
}

/**
 * The scene a look needs around it, or null for one that is just a mark. The
 * mount keeps the class the player looks for, so the die inside is loaded and
 * parked exactly like any other still.
 */
function markup(id, cls = "") {
  if (!(CUSTOM[id] && CUSTOM[id].portal)) return null;
  /* Only the inner mount carries `lottie` - that is what the page hunts for
     to load a player, and the wrapper is not one. */
  return `<div class="scene${cls ? " " + cls : ""}" data-scene="${id}">`
       + `<span class="scene-clip">`
       +   `<span class="scene-die"><span class="lottie" data-anim="${id}"></span></span>`
       + `</span>`
       + `<i class="scene-disc"></i>`
       + `</div>`;
}

/** `{ id: frame }` for looks the page must park rather than play. */
const stills = () => Object.fromEntries(ids()
  .filter(id => CUSTOM[id].freeze !== undefined)
  .map(id => [id, CUSTOM[id].freeze]));

/**
 * The portal scene, as CSS.
 *
 * Three things run on the same clock: the die's height, its turn, and the
 * disc's opening. They are separate elements so each can carry its own easing
 * - the die falls on a gravity curve, the disc opens on a soft one, the turn
 * is even throughout. The clip is what sells it: its bottom edge is the floor
 * line, so a die pushed below that is not drawn at all, and the disc sits over
 * the seam so nothing can be caught crossing it.
 *
 * Heights are percentages of the die's own box, so the scene scales whole.
 */
function portalCss(id, scope, suffix = "") {
  const p = CUSTOM[id] && CUSTOM[id].portal;
  if (!p) return null;
  const S = scope ? scope + " " : "";
  const DOWN = "cubic-bezier(.6,0,.9,.4)";     /* gathering: a fall */
  const UP   = "cubic-bezier(.1,.7,.3,1)";     /* shedding speed: a rise */
  const SOFT = "cubic-bezier(.4,0,.2,1)";
  const below = p.lift;                        /* far enough under to be clipped */

  return `${S}.scene[data-scene="${id}"] { position: relative; overflow: visible }
${S}.scene[data-scene="${id}"] .scene-clip {
    position: absolute; left: 0; right: 0; top: -60%;
    height: ${(p.floor * 100 + 60).toFixed(1)}%;
    overflow: hidden; pointer-events: none;
  }
${S}.scene[data-scene="${id}"] .scene-die {
    position: absolute; left: 50%; bottom: 0;
    width: ${(p.die * 100).toFixed(1)}%; aspect-ratio: 1;
    margin-left: ${(-p.die * 50).toFixed(1)}%;
    animation: scLift${suffix} ${p.ms}ms infinite both;
    will-change: transform;
  }
${S}.scene[data-scene="${id}"] .scene-die .lottie { width: 100%; height: 100% }
${S}.scene[data-scene="${id}"] .scene-die svg {
    display: block; width: 100%; height: 100%;
    animation: scTurn${suffix} ${p.ms}ms linear infinite both;
    will-change: transform;
  }
${S}.scene[data-scene="${id}"] .scene-disc {
    position: absolute; left: 50%; top: ${(p.floor * 100).toFixed(1)}%;
    width: ${(p.disc * 100).toFixed(1)}%; aspect-ratio: 12 / 1;
    margin-left: ${(-p.disc * 50).toFixed(1)}%;
    background: #fff; border-radius: 50%;
    transform: translateY(-50%) scale(0);
    animation: scDisc${suffix} ${p.ms}ms infinite both;
    will-change: transform;
  }

/* Height. 0 rests on the floor line; positive is under it and clipped away.
   The two bounces are only a little shorter than the throw that starts it, so
   it keeps its energy rather than dying away over the cycle. */
@keyframes scLift${suffix} {
  0%, 6%     { transform: translateY(${below}%); animation-timing-function: ${UP} }
  26%        { transform: translateY(-96%); animation-timing-function: ${DOWN} }
  40%        { transform: translateY(0); animation-timing-function: ${UP} }
  50%        { transform: translateY(-84%); animation-timing-function: ${DOWN} }
  60%        { transform: translateY(0); animation-timing-function: ${UP} }
  70%        { transform: translateY(-74%); animation-timing-function: ${DOWN} }
  80%        { transform: translateY(0); animation-timing-function: ${DOWN} }
  90%, 100%  { transform: translateY(${below}%) }
}

/* One long turn while it is out, then held so it comes back up square. */
@keyframes scTurn${suffix} {
  0%, 6%    { transform: rotate(0deg) }
  80%       { transform: rotate(${p.turn}deg) }
  100%      { transform: rotate(${p.turn}deg) }
}

/* Open, shut behind it, open again under the second bounce, shut after. */
@keyframes scDisc${suffix} {
  0%       { transform: translateY(-50%) scale(0); animation-timing-function: ${SOFT} }
  5%       { transform: translateY(-50%) scale(1) }
  22%      { transform: translateY(-50%) scale(1); animation-timing-function: ${SOFT} }
  29%      { transform: translateY(-50%) scale(0) }
  60%      { transform: translateY(-50%) scale(0); animation-timing-function: ${SOFT} }
  66%      { transform: translateY(-50%) scale(1) }
  92%      { transform: translateY(-50%) scale(1); animation-timing-function: ${SOFT} }
  97%, 100%{ transform: translateY(-50%) scale(0) }
}`;
}

/** Whichever motion a look carries, as CSS. */
const motionCss = (id, scope, suffix) =>
  jumpCss(id, scope, suffix) || portalCss(id, scope, suffix);

/** How big to draw the mount: a look that jumps needs headroom above it. */
const mountScale = id => (CUSTOM[id] && CUSTOM[id].jump && CUSTOM[id].jump.mount) || 1;

module.exports = { CUSTOM, ids, has, raw, data, cycleOf, meta, bundle,
                   jumpCss, portalCss, motionCss, markup, mountScale, stills, DIR };
