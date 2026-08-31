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
    /* Heights are fractions of the scene box, not of the die - so the die can
       be resized without the throw changing shape or climbing out of frame. */
    portal: { sink: 0.128, ms: 3200, floor: 0.86, die: 0.60, disc: 0.62, thin: 17,
              apex: 0.42, b1: 0.37, b2: 0.32, below: 0.70, turn: 720 }
  },
  /* The same throw with no way in or out: the floor is just a line the die
     drops past. Everything below it is clipped, so it leaves without a seam
     rather than sinking through anything. */
  chute: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec, frame 0",
    note: "The die bouncing and dropping straight through the floor, with no "
        + "disc opening for it.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" },
    dots: DECLUTTER, round: 74, freeze: 0,
    portal: { sink: 0.128, ms: 3200, floor: 0.86, die: 0.60, disc: 0, thin: 17,
              apex: 0.42, b1: 0.37, b2: 0.32, below: 0.70, turn: 720 }
  },
  /* The chute again - no disc, just a floor it drops past - carrying the pips
     exactly as delivered, at their own frame rate. Nothing in the file is
     retimed: the only question asked of it is which frame to show, and it is
     asked that only between one contact and the next, so a roll takes a whole
     bounce rather than the rise alone.
     On top of that the mark turns as a whole, the way `chute` does, at half
     its rate - a slow drift under the tumble rather than a second spin. */
  chutepips: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "The pips dropping through the floor, still in the air and rolling "
        + "only where they hit.",
    /* Exactly `pips` and nothing else - no declutter table, no retiming. The
       drawing has to be the one that already works; the only thing this look
       adds is when it is asked to draw. */
    recolor: { "#F3F3F3": "#FFFFFF" },
    hide: ["Sq"], freeze: 0,
    /* Thrown higher and held longer than the rest of the family, and for one
       reason: a roll has to finish inside a single bounce. Hang time goes with
       the square root of the height, so the heights buy the time and the cycle
       makes up the difference - 1127ms and 1355ms between contacts, which is
       a whole roll each without hurrying it. */
    portal: { sink: 0.263, ms: 4600, floor: 0.86, die: 0.60, disc: 0, thin: 17,
              apex: 0.60, b1: 0.54, b2: 0.47, below: 0.70, turn: 270,
              turnFromApex: true, impactRoll: true, rollEnd: 26, rollFrac: [0.77, 0.60] }
  },
  /* `chutepips` with the way in and out put back: the disc opens for it, shuts
     behind it, and opens again under the last bounce. Everything about the die
     - the drawing, the straight throw, the roll off each contact - is the same;
     only the floor is different. */
  portalpips: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "The pips coming up through a hole in the floor and dropping back "
        + "through it, rolling only where they hit.",
    recolor: { "#F3F3F3": "#FFFFFF" },
    hide: ["Sq"], freeze: 0,
    portal: { sink: 0.263, ms: 4600, floor: 0.86, die: 0.60, disc: 0.62, thin: 17,
              apex: 0.60, b1: 0.54, b2: 0.47, below: 0.70, turn: 270,
              turnFromApex: true, impactRoll: true, rollEnd: 26, rollFrac: [0.77, 0.60] }
  },
  /* `chutepips` with the die whole rather than only its dots. Same drawing as
     `dice` - body turned white, pips turned black, and nothing else touched,
     including the corner radius the file animates as it rolls - and the same
     handling: held still in the air, rolled off each contact. */
  chutedice: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "The whole die dropping through the floor, still in the air and "
        + "rolling only where it hits.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" },
    round: 100,
    freeze: 0,
    portal: { sink: 0.128, ms: 4600, floor: 0.86, die: 0.60, disc: 0, thin: 17,
              apex: 0.60, b1: 0.54, b2: 0.47, below: 0.70, turn: 270,
              turnEven: true, impactRoll: true, rollEnd: 26, rollFrac: [0.77, 0.60] }
  },
  /* chutedice grounded by a contact shadow: a soft pool of light fixed on the
     floor beneath the die, tight and bright at each landing, smaller and
     fainter the higher it flies, swallowed with the die as it drops out. Its
     keys sit on the same derived marks as the throw, so it tracks the height
     exactly rather than approximately. */
  chuteshadow: {
    file: "dice.json",
    source: "Scatter loading (black dice) v6.1 - 1 sec",
    note: "The whole die dropping through the floor, grounded by a soft "
        + "contact shadow that breathes with the bounce.",
    recolor: { "#000000": "#FFFFFF", "#F3F3F3": "#000000" },
    round: 100,
    freeze: 0,
    portal: { sink: 0.285, inkGap: 0.128, ms: 4600, floor: 0.86, die: 0.60, disc: 0, thin: 17,
              apex: 0.60, b1: 0.54, b2: 0.47, below: 0.70, turn: 270,
              turnEven: true, impactRoll: true, rollEnd: 26,
              rollFrac: [0.77, 0.60],
              shadow: { scale: 0.34, opacity: 0.92, far: 0.38, grey: 0.14,
                        width: 0.84, shrinkX: 0.78, shrinkY: 0.42 } }
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
/** A look that builds a scene around the mark rather than just moving it. */
const isScene = id => !!(CUSTOM[id] && CUSTOM[id].portal);

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

/**
 * Retime the file so one loop takes `ms`. Frame rate is the only thing that
 * moves - every keyframe keeps its frame number, so the roll is unchanged in
 * shape and only slower on the clock.
 */
function applyRollMs(d, ms) {
  const frames = (d.op || 0) - (d.ip || 0);
  if (frames > 0 && ms > 0) d.fr = +(frames / (ms / 1000)).toFixed(4);
}

/** The animation as the site should draw it: ready to hand to lottie. */
function data(id) {
  const d = raw(id);
  if (CUSTOM[id].recolor) applyRecolor(d, CUSTOM[id].recolor);
  if (CUSTOM[id].hide) applyHide(d, CUSTOM[id].hide);
  if (CUSTOM[id].dots) applyDots(d, CUSTOM[id].dots);
  if (CUSTOM[id].round !== undefined) applyRound(d, CUSTOM[id].round);
  if (CUSTOM[id].rollMs) applyRollMs(d, CUSTOM[id].rollMs);
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

/**
 * The scene a look needs around it, or null for one that is just a mark. The
 * mount keeps the class the player looks for, so the die inside is loaded and
 * parked exactly like any other still.
 */
function markup(id, cls = "") {
  if (!(CUSTOM[id] && CUSTOM[id].portal)) return null;
  /* Only the inner mount carries `lottie` - that is what the page hunts for
     to load a player, and the wrapper is not one. */
  const die = `<span class="scene-die"><span class="lottie" data-anim="${id}"></span></span>`;
  return `<div class="scene${cls ? " " + cls : ""}" data-scene="${id}">`
       /* The shadow sits under everything, so the die crosses over it. */
       + (CUSTOM[id].portal.shadow ? `<span class="scene-shade">${die}</span>` : "")
       + `<span class="scene-clip">${die}</span>`
       + (CUSTOM[id].portal.disc > 0 ? `<i class="scene-disc"></i>` : "")
       + `</div>`;
}

/** `{ id: frame }` for looks the page must park rather than play. */
const stills = () => Object.fromEntries(ids()
  .filter(id => CUSTOM[id].freeze !== undefined)
  .map(id => [id, CUSTOM[id].freeze]));

/**
 * When the die is where, as percentages of the cycle.
 *
 * Every mark is derived from the heights, never typed. Under one gravity a
 * segment's duration goes with the square root of the distance it covers, so
 * the six arcs share out the airborne time in that ratio - which is what makes
 * it read as one object losing a little energy per bounce rather than as
 * separate hops. Change a height and the timing follows on its own.
 *
 * The CSS reads these, and so does anything that needs to know when the die is
 * on the ground - which is the only way the two can be sure to agree.
 */
function portalMarks(p) {
  const HOLD = 6, TAIL = 8.1;
  const seg = [p.below + p.apex, p.apex, p.b1, p.b1, p.b2, p.b2 + p.below]
    .map(Math.sqrt);
  const span = (100 - HOLD - TAIL) / seg.reduce((a, b) => a + b, 0);
  const m = [];
  seg.reduce((t, u) => { const n = t + u * span; m.push(n); return n; }, HOLD);
  return { HOLD, TAIL, apexAt: m[0], land1: m[1], peak1: m[2],
           land2: m[3], peak2: m[4], gone: m[5] };
}

function portalCss(id, scope, suffix = "") {
  const p = CUSTOM[id] && CUSTOM[id].portal;
  if (!p) return null;
  const S = scope ? scope + " " : "";
  /* Exact quadratics, not approximations: a cubic bezier with control points
     at thirds reproduces t^2 precisely, so each segment IS a parabola - the
     same curve gravity draws - and rise meeting fall at an apex forms one
     smooth arc with no visible knee. */
  const FALL = "cubic-bezier(0.33333, 0, 0.66667, 0.33333)";   /* accelerating */
  const RISE = "cubic-bezier(0.33333, 0.66667, 0.66667, 1)";   /* decelerating */
  const SOFT = "cubic-bezier(.4,0,.2,1)";
  /* The die's transform is a percentage of its own box, so every height is
     converted out of scene units on the way in. */
  const h = v => (-v / p.die * 100).toFixed(1);
  const below = (p.below / p.die * 100).toFixed(1);

  const { HOLD, apexAt, land1, peak1, land2, peak2, gone } = portalMarks(p);
  const pc = v => v.toFixed(1) + "%";

  /* The disc has to be open at each crossing and shut in between, so its cues
     hang off the die's marks rather than off round numbers: open before the
     rise, shut once the die is well clear, open again while the second bounce
     is still up, shut once it has been swallowed. */
  const shutFrom = HOLD + (apexAt - HOLD) * 0.48;
  const shutBy   = HOLD + (apexAt - HOLD) * 0.74;
  const openFrom = peak2 + (gone - peak2) * 0.16;
  const openBy   = peak2 + (gone - peak2) * 0.40;

  const disc = p.disc > 0 ? `
${S}.scene[data-scene="${id}"] .scene-disc {
    position: absolute; left: 50%; top: ${(p.floor * 100).toFixed(1)}%;
    width: ${(p.disc * 100).toFixed(1)}%; aspect-ratio: ${p.thin || 12} / 1;
    margin-left: ${(-p.disc * 50).toFixed(1)}%;
    background: #fff; border-radius: 50%;
    transform: translateY(-50%) scale(0);
    animation: scDisc${suffix} ${p.ms}ms infinite both;
    will-change: transform;
  }

@keyframes scDisc${suffix} {
  0%, 1%    { transform: translateY(-50%) scale(0); animation-timing-function: ${SOFT} }
  ${pc(HOLD)}       { transform: translateY(-50%) scale(1) }
  ${pc(shutFrom)}   { transform: translateY(-50%) scale(1); animation-timing-function: ${SOFT} }
  ${pc(shutBy)}     { transform: translateY(-50%) scale(0) }
  ${pc(openFrom)}   { transform: translateY(-50%) scale(0); animation-timing-function: ${SOFT} }
  ${pc(openBy)}     { transform: translateY(-50%) scale(1) }
  ${pc(gone)}       { transform: translateY(-50%) scale(1); animation-timing-function: ${SOFT} }
  ${pc(Math.min(gone + 4, 99))}, 100% { transform: translateY(-50%) scale(0) }
}` : "";

  /* Spin is constant while airborne and only changes at a contact, so it is
     linear within each flight and steps down at each impact. `turn: 0` hands
     the tumble back to the file's own roll and takes CSS off it entirely. */
  const turn = p.turn > 0 ? `
${S}.scene[data-scene="${id}"] .scene-die svg {
    animation: scTurn${suffix} ${p.ms}ms linear infinite both;
    will-change: transform;
  }

@keyframes scTurn${suffix} {
${p.turnEven
  /* One rate, start to finish. Stepping the turn down at each contact is right
     for a die being knocked about, but spread over a whole cycle the last
     stretch ends up at a third the speed of the first and reads as the thing
     sticking rather than slowing. Two keyframes and a linear ease hold it to
     one speed the whole way. */
  ? `  0%, ${pc(HOLD)}   { transform: rotate(0deg) }`
  : p.turnFromApex
  /* Thrown straight: nothing turns on the way up, and the angle only starts to
     come off it once gravity has taken over at the top. */
  ? `  0%, ${pc(apexAt)}  { transform: rotate(0deg) }
  ${pc(land1)}      { transform: rotate(${(p.turn * 0.35).toFixed(0)}deg) }
  ${pc(land2)}      { transform: rotate(${(p.turn * 0.70).toFixed(0)}deg) }`
  : `  0%, ${pc(HOLD)}   { transform: rotate(0deg) }
  ${pc(land1)}      { transform: rotate(${(p.turn * 0.5).toFixed(0)}deg) }
  ${pc(land2)}      { transform: rotate(${(p.turn * 0.75).toFixed(0)}deg) }`}
  ${pc(gone)}, 100% { transform: rotate(${p.turn}deg) }
}` : "";

  /* `sink` beyond the ink gap pushes the die's artwork below the floor line
     at a landing; the clip has to follow it down by that overhang or it
     slices the bottom off the die at every contact. The entry and exit still
     swallow cleanly - the parked position is far deeper than the overhang. */
  const over = Math.max(0, (p.sink || 0) - (p.inkGap === undefined ? (p.sink || 0) : p.inkGap)) * p.die;
  const clipH = p.floor + 0.80 + over;
  return `${S}.scene[data-scene="${id}"] { position: relative; overflow: visible }
${S}.scene[data-scene="${id}"] .scene-clip {
    position: absolute; left: 0; right: 0; top: -80%;
    height: ${(clipH * 100).toFixed(1)}%;
    overflow: hidden; pointer-events: none;
    z-index: 1;                 /* the die always paints over its shadow */
  }
${(() => {
    const sh = p.shadow;
    if (!sh) return "";
    /* The die again, turned over about the floor line and squashed - so the
       bounce, the roll and the turn all come mirrored for free, the spin
       running the opposite way as a reflection's should. Flattened to one
       tone: brightness(0) floors every pixel to black, invert(grey) lifts it
       to the shadow tone, both leaving alpha alone, so body and pips read as
       one silhouette.

       On top of the mirror, the whole reflection breathes with the die's
       height: scaled about the floor point on the same derived marks and the
       same quadratic easings as the lift, so it is full size at each contact
       and pulls down toward the surface as the die climbs - distance said
       twice, once by the mirror and once by the scale. The floor crossings
       gate its opacity, which also keeps the parked die's mirror image (which
       the flip would otherwise place above the floor) from showing while
       nothing is on stage. */
    const riseCross = HOLD + (apexAt - HOLD) * (1 - Math.sqrt(1 - p.below / (p.below + p.apex)));
    const fallCross = peak2 + (gone - peak2) * Math.sqrt(p.b2 / (p.b2 + p.below));
    /* The two axes shrink at different rates: a shadow keeps most of its
       footprint as its caster rises but flattens toward the ground plane, so
       width falls a little and height falls a lot. Shrinking both equally
       kept it a miniature of the die; this keeps it a patch of ground. */
    /* `width` narrows the whole reflection; the die itself is untouched. */
    const kx = h => ((sh.width || 1) * (1 - (1 - sh.shrinkX) * h / p.apex)).toFixed(3);
    const ky = h => (sh.scale * (1 - (1 - sh.shrinkY) * h / p.apex)).toFixed(4);
    const T = h => `scale(${kx(h)}, -${ky(h)})`;
    /* Opacity thins with height the same way the size does: the further the
       die is from the ground, the less presence its shadow has. */
    const oAt = h => +(sh.opacity - (sh.opacity - (sh.far === undefined ? sh.opacity : sh.far)) * h / p.apex).toFixed(3);
    const K = (at, h, ease, op) => `  ${at.toFixed(1)}% { transform: ${T(h)}; opacity: ${op === undefined ? oAt(h) : op}`
      + (ease ? `; animation-timing-function: ${ease}` : "") + ` }`;
    return `${S}.scene[data-scene="${id}"] .scene-shade {
    position: absolute; left: 0; right: 0; top: -80%;
    height: ${(p.floor * 100 + 80).toFixed(1)}%;
    overflow: hidden; pointer-events: none;
    transform-origin: 50% 100%;
    transform: ${T(0)}; opacity: 0;
    filter: brightness(0) invert(${sh.grey});
    animation: scShade${suffix} ${p.ms}ms infinite both;
    will-change: transform, opacity;
  }

@keyframes scShade${suffix} {
  0%, ${(riseCross - 1.5).toFixed(1)}% { transform: ${T(0)}; opacity: 0 }
${K(riseCross, 0, RISE)}
${K(apexAt, p.apex, FALL)}
${K(land1, 0, RISE)}
${K(peak1, p.b1, FALL)}
${K(land2, 0, RISE)}
${K(peak2, p.b2, FALL)}
${K(Math.min(fallCross + 4.5, gone - 0.5), 0, null, 0)}
  100% { transform: ${T(0)}; opacity: 0 }
}
`;
  })()}${S}.scene[data-scene="${id}"] .scene-die {
    /* The file draws the die with padding, so its ink stops short of its own
       box - measured 12.8% short at the resting frame for the full die. Sunk
       by that, the artwork meets the floor rather than hovering a die-margin
       above whatever marks it: the shadow here, the disc on the portals. */
    position: absolute; left: 50%;
    bottom: ${(-((p.sink || 0) * p.die - over) / clipH * 100).toFixed(2)}%;
    width: ${(p.die * 100).toFixed(1)}%; aspect-ratio: 1;
    margin-left: ${(-p.die * 50).toFixed(1)}%;
    animation: scLift${suffix} ${p.ms}ms infinite both;
    will-change: transform;
  }
${S}.scene[data-scene="${id}"] .scene-die .lottie { width: 100%; height: 100% }
${S}.scene[data-scene="${id}"] .scene-die svg { display: block; width: 100%; height: 100% }
${disc}${turn}

/* Height. 0 rests on the floor line; positive is under it and clipped away. */
@keyframes scLift${suffix} {
  0%, ${pc(HOLD)}   { transform: translateY(${below}%); animation-timing-function: ${RISE} }
  ${pc(apexAt)}     { transform: translateY(${h(p.apex)}%); animation-timing-function: ${FALL} }
  ${pc(land1)}      { transform: translateY(0); animation-timing-function: ${RISE} }
  ${pc(peak1)}      { transform: translateY(${h(p.b1)}%); animation-timing-function: ${FALL} }
  ${pc(land2)}      { transform: translateY(0); animation-timing-function: ${RISE} }
  ${pc(peak2)}      { transform: translateY(${h(p.b2)}%); animation-timing-function: ${FALL} }
  ${pc(gone)}, 100% { transform: translateY(${below}%) }
}`;
}

/** Whichever motion a look carries, as CSS. */
const motionCss = (id, scope, suffix) => portalCss(id, scope, suffix);

/**
 * `{ id: { ms, windows: [[from, to], ...] } }` in cycle percentages, for looks
 * whose roll is driven by their landings. A window runs from the contact to
 * the top of the bounce it caused, so one whole roll fits between them.
 */
function rollSpec() {
  const out = {};
  for (const id of ids()) {
    const p = CUSTOM[id] && CUSTOM[id].portal;
    if (!p || !p.impactRoll) continue;
    const m = portalMarks(p);
    /* A window per contact. The roll takes `rollFrac` of the gap to the next
       one rather than all of it, so it finishes early and the rest of the
       bounce is spent sitting on the opening frame - which is the only moment
       the mark is legible as the mark. */
    /* The file stops moving before it runs out. Measured across its 31
       frames, the dots are back in the resting formation by frame 26 and the
       last six are identical to it - so mapping a window onto the whole span
       spends a fifth of every roll on a die that has already stopped, which is
       what reads as the spin failing rather than finishing. */
    const f = p.rollFrac === undefined ? 1 : p.rollFrac;
    const at = i => Array.isArray(f) ? (f[i] === undefined ? f[f.length - 1] : f[i]) : f;
    const win = (from, to, i) => [from, from + (to - from) * at(i)];
    out[id] = { ms: p.ms, frames: p.rollEnd,
                windows: [win(m.land1, m.land2, 0), win(m.land2, m.gone, 1)] };
  }
  return out;
}

/**
 * The script that plays an impact-rolled look, for a page to inline.
 *
 * It takes its time from the bounce's own CSS animation rather than from a
 * clock of its own. A timer started alongside would be right at first and
 * wrong later - the two would drift, and the roll would slide off the landing
 * it is meant to belong to. Reading `currentTime` off the running animation
 * means the tumble is pinned to the contact by construction, whenever the page
 * started and however long it has been open.
 *
 * `mounts()` is supplied by the page, because each one keeps its players
 * differently; it returns only the ones worth drawing.
 */
function driverJs(mountsExpr) {
  return `
  var ROLLS = ${JSON.stringify(rollSpec())};
  (function () {
    var ids = Object.keys(ROLLS);
    if (!ids.length) return;
    function frameFor(spec, pct) {
      for (var i = 0; i < spec.windows.length; i++) {
        var w = spec.windows[i];
        if (pct >= w[0] && pct <= w[1]) return (pct - w[0]) / (w[1] - w[0]);
      }
      return null;                       /* between contacts: held at rest */
    }
    function tick() {
      var list = ${mountsExpr};
      for (var i = 0; i < list.length; i++) {
        var el = list[i], a = el._anim;
        if (!a) continue;
        var spec = ROLLS[el.getAttribute("data-anim")];
        if (!spec) continue;
        /* the bounce's own clock, so the two cannot come apart */
        var die = el.closest(".scene-die");
        var css = die && die.getAnimations && die.getAnimations()[0];
        if (!css || css.currentTime == null) continue;
        var pct = ((css.currentTime % spec.ms) / spec.ms) * 100;
        var u = frameFor(spec, pct);
        /* The last frame is the first frame again - that is where the file
           loops - so the window is mapped onto the whole span rather than one
           short of it, and a roll ends on the formation it began with. */
        a.goToAndStop(u === null ? 0 : u * (spec.frames || a.totalFrames), true);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();`;
}

module.exports = { CUSTOM, ids, has, isScene, raw, data, cycleOf, meta, bundle,
                   portalCss, portalMarks, motionCss, markup,
                   stills, rollSpec, driverJs, DIR };
