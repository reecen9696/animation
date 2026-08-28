/**
 * Scatter mark pulse-wave generator.
 *
 * Single source of truth for the animation: the server route and the
 * standalone artifact build both render from here, so they cannot drift.
 * Mirrors the maths in scatter-pulse.html (the tuning workbench).
 */

/* Source paths, in the order they appear in the original Group.svg. */
const DOTS = [
  { key: "bottom", name: "Bottom",      d: "M12.2056 24.1124C13.9565 24.1124 15.376 22.693 15.376 20.9421C15.376 19.1911 13.9565 17.7717 12.2056 17.7717C10.4547 17.7717 9.03525 19.1911 9.03525 20.9421C9.03525 22.693 10.4547 24.1124 12.2056 24.1124Z" },
  { key: "core",   name: "Core",        d: "M12.2056 15.0048C13.9565 15.0048 15.376 13.5854 15.376 11.8344C15.376 10.0835 13.9565 8.66406 12.2056 8.66406C10.4547 8.66406 9.03525 10.0835 9.03525 11.8344C9.03525 13.5854 10.4547 15.0048 12.2056 15.0048Z" },
  { key: "tr",     name: "Top right",   d: "M20.0952 10.455C21.8461 10.455 23.2655 9.03555 23.2655 7.28461C23.2655 5.53367 21.8461 4.11426 20.0952 4.11426C18.3443 4.11426 16.9248 5.53367 16.9248 7.28461C16.9248 9.03555 18.3443 10.455 20.0952 10.455Z" },
  { key: "tl",     name: "Top left",    d: "M4.3241 10.455C6.07504 10.455 7.49446 9.03555 7.49446 7.28461C7.49446 5.53367 6.07504 4.11426 4.3241 4.11426C2.57316 4.11426 1.15375 5.53367 1.15375 7.28461C1.15375 9.03555 2.57316 10.455 4.3241 10.455Z" },
  { key: "top",    name: "Top",         d: "M12.2056 4.51755C14.3664 4.51755 16.1181 3.50626 16.1181 2.25878C16.1181 1.01129 14.3664 0 12.2056 0C10.0448 0 8.29309 1.01129 8.29309 2.25878C8.29309 3.50626 10.0448 4.51755 12.2056 4.51755Z" },
  { key: "lr",     name: "Lower right", d: "M22.4617 17.7541C23.5421 15.8828 23.5421 13.8602 22.4618 13.2364C21.3815 12.6127 19.6299 13.624 18.5495 15.4953C17.469 17.3666 17.469 19.3892 18.5493 20.0129C19.6296 20.6367 21.3812 19.6254 22.4617 17.7541Z" },
  { key: "ll",     name: "Lower left",  d: "M5.86862 20.0126C6.94895 19.3888 6.94888 17.3662 5.86846 15.4949C4.78805 13.6237 3.03642 12.6123 1.9561 13.2361C0.875776 13.8598 0.875848 15.8824 1.95626 17.7537C3.03668 19.625 4.7883 20.6363 5.86862 20.0126Z" }
];

/* Geometric centre of each dot inside the 25x25 viewBox. */
const CENTERS = {
  bottom: [12.2056, 20.9421], core: [12.2056, 11.8344], tr: [20.0952, 7.28461],
  tl: [4.3241, 7.28461], top: [12.2056, 2.25878], lr: [20.5056, 16.6247], ll: [3.9120, 16.6244]
};

/* The order `around` fires in: a counter-clockwise lap of the ring starting at
   the top, then down into the core. */
const RING = ["top", "tl", "ll", "bottom", "lr", "tr", "core"];

/* `circuit` runs the same lap but closes it: back up to the top, down into the
   core and up to the top again, which is where the next lap starts. The top
   fires twice a lap, so the order repeats a key — and the lap runs straight
   into the next one, with no rest between them. */
const CIRCUIT = ["top", "tl", "ll", "bottom", "lr", "tr", "top", "core"];

/* `spoke` takes the same lap but goes back to the middle between every dot, so
   the core beats six times to the ring's one each. */
const SPOKE = RING.slice(0, 6).flatMap(k => [k, "core"]);

const PRESETS = {
  pulse:   { min: 0.84, dip: 0.45, over: 0.020, pulse: 900,  travel: 620,  rest: 500, fade: 0 },
  breathe: { min: 0.90, dip: 0.50, over: 0.000, pulse: 1500, travel: 1000, rest: 800, fade: 0 },
  snap:    { min: 0.76, dip: 0.30, over: 0.050, pulse: 520,  travel: 380,  rest: 500, fade: 0 },
  ripple:  { min: 0.86, dip: 0.42, over: 0.030, pulse: 760,  travel: 1240, rest: 180, fade: 0.18 },
  /* A lap of the ring rather than a run down the diagonal: `travel` is the
     spread across the whole order, so each dot is 1/6th of it behind the last. */
  around:  { min: 0.82, dip: 0.42, over: 0.030, pulse: 640,  travel: 840,  rest: 420, fade: 0,
             wave: RING },
  /* Snap, run out and back: the wave crosses to the bottom right, turns there
     and comes home the way it came, so most dots pulse twice a cycle. No rest:
     the last dot home is the first away, and a pulse ends at full size, so the
     next wave leaves the moment this one has recovered. */
  bounce:  { min: 0.76, dip: 0.30, over: 0.050, pulse: 440,  travel: 300,  rest: 0, fade: 0,
             bounce: true },
  /* The lap, closed and left running: `travel` is one whole lap, the eight
     steps are evenly spaced across it, and it wraps straight into the next. */
  circuit: { min: 0.80, dip: 0.40, over: 0.030, pulse: 400,  travel: 1600, rest: 0, fade: 0,
             wave: CIRCUIT, seamless: true },
  /* Out to a dot and back to the middle, twelve steps round the ring. */
  spoke:   { min: 0.80, dip: 0.40, over: 0.030, pulse: 420,  travel: 2400, rest: 0, fade: 0,
             wave: SPOKE, seamless: true }
};

/* Orbit: the outer dots bloom away from the core, the whole mark winds back,
   spins a full turn, then everything pulls back in. */
const ORBIT_PRESETS = {
  bloom:  { mode:"orbit", push:2.6, windup:26, turns:1, pushMs:420, spinMs:900,  returnMs:520, orbitRest:400, bloomMs:60 },
  snappy: { mode:"orbit", push:2.0, windup:34, turns:1, pushMs:260, spinMs:620,  returnMs:340, orbitRest:380, bloomMs:30 },
  wide:   { mode:"orbit", push:4.2, windup:18, turns:1, pushMs:560, spinMs:1100, returnMs:640, orbitRest:520, bloomMs:110 },
  double: { mode:"orbit", push:3.0, windup:30, turns:2, pushMs:420, spinMs:1500, returnMs:520, orbitRest:400, bloomMs:60 }
};

/* Cube: squeeze into a tight cluster, tumble end over end with a hop and a
   landing squash on each roll, then pop open into the mark. */
const CUBE_PRESETS = {
  tumble:   { mode:"cube", steps:6, stepMs:130, hop:1.5, squash:0.16, tuck:0.62, tuckMs:240, snapMs:420, cubeRest:620 },
  hardware: { mode:"cube", steps:4, stepMs:190, hop:2.4, squash:0.22, tuck:0.70, tuckMs:300, snapMs:520, cubeRest:700 },
  quick:    { mode:"cube", steps:6, stepMs:85,  hop:1.0, squash:0.12, tuck:0.50, tuckMs:160, snapMs:300, cubeRest:420 },
  heavy:    { mode:"cube", steps:6, stepMs:170, hop:2.0, squash:0.28, tuck:0.75, tuckMs:300, snapMs:560, cubeRest:760 }
};

/* Roll: the mark is a hexagon standing on a corner. It hangs at each corner,
   falls onto the next flat side, and momentum carries it up to the next. */
const ROLL_PRESETS = {
  roll: { mode:"roll", rollCount:2, rollMs:900,  rollBack:14, rollOver:18, rollHold:400 },
  thud: { mode:"roll", rollCount:2, rollMs:1300, rollBack:22, rollOver:12, rollHold:700 },
  skip: { mode:"roll", rollCount:2, rollMs:620,  rollBack:9,  rollOver:26, rollHold:300 },
  lap:  { mode:"roll", rollCount:3, rollMs:1100, rollBack:16, rollOver:18, rollHold:500 }
};

/* Smear is the roll with the outer dots squashed along their radius as the
   spin picks up, so each flattens in the direction it is travelling. */
const SMEAR_PRESETS = {
  smear: { mode:"smear", rollCount:2, rollMs:900,  rollBack:14, rollOver:18, rollHold:400,
           flattenCircle:0.34, flattenOval:0.26 },
  soft:  { mode:"smear", rollCount:2, rollMs:1200, rollBack:10, rollOver:14, rollHold:600,
           flattenCircle:0.20, flattenOval:0.14 },
  hard:  { mode:"smear", rollCount:2, rollMs:600,  rollBack:20, rollOver:24, rollHold:300,
           flattenCircle:0.52, flattenOval:0.42 },
  drift: { mode:"smear", rollCount:3, rollMs:1400, rollBack:12, rollOver:14, rollHold:700,
           flattenCircle:0.28, flattenOval:0.20 }
};

/* Drop morphs each dot from its own ellipse into a teardrop whose fat end
   leads the direction of travel, driven by the spin's speed. */
const DROP_PRESETS = {
  drop:  { mode:"drop", rollCount:2, rollMs:900,  rollBack:14, rollOver:18, rollHold:400,
           dropAmt:0.65, dropStretch:0.15, liquid:0.60, settleMs:200 },
  comet: { mode:"drop", rollCount:2, rollMs:700,  rollBack:10, rollOver:22, rollHold:300,
           dropAmt:0.85, dropStretch:0.24, liquid:0.35, settleMs:140 },
  blob:  { mode:"drop", rollCount:2, rollMs:1300, rollBack:18, rollOver:14, rollHold:600,
           dropAmt:0.45, dropStretch:0.08, liquid:0.85, settleMs:420 },
  ink:   { mode:"drop", rollCount:3, rollMs:1500, rollBack:12, rollOver:16, rollHold:700,
           dropAmt:0.75, dropStretch:0.20, liquid:0.70, settleMs:320 }
};

const DEFAULT_PRESET = "pulse";
const SAMPLES = 60;
const SPIN_ORIGIN = "48.8224% 47.3376%";   /* the core dot inside the 25x25 box */

/** Distance from the core out to each dot, in viewBox units. */
const RADIUS = (() => {
  const c = CENTERS.core, out = {};
  for (const k of Object.keys(CENTERS)) {
    out[k] = Math.hypot(CENTERS[k][0] - c[0], CENTERS[k][1] - c[1]);
  }
  return out;
})();

/** Unit vector from the core out to each dot; the six outer dots form a hexagon. */
const RADIAL = (() => {
  const c = CENTERS.core, out = {};
  for (const k of Object.keys(CENTERS)) {
    const dx = CENTERS[k][0] - c[0], dy = CENTERS[k][1] - c[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    out[k] = len < 0.001 ? [0, 0] : [dx / len, dy / len];
  }
  return out;
})();

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smoother = t => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

/** Scale at t in [0,1] across one dot's pulse window. */
function curve(t, c) {
  if (t <= 0 || t >= 1) return 1;
  const { min, dip, over } = c;
  if (over > 0.001) {
    const back = dip + (1 - dip) * 0.58;
    if (t <= dip)  return 1 + (min - 1) * smoother(t / dip);
    if (t <= back) return min + (1 + over - min) * smoother((t - dip) / (back - dip));
    return (1 + over) + (-over) * smoother((t - back) / (1 - back));
  }
  if (t <= dip) return 1 + (min - 1) * smoother(t / dip);
  return min + (1 - min) * smoother((t - dip) / (1 - dip));
}

function opacityAt(scale, c) {
  if (!c.fade) return 1;
  const span = 1 - c.min;
  if (span < 0.001) return 1;
  return 1 - c.fade * clamp((1 - scale) / span, 0, 1);
}

/**
 * Normalised position of every dot along the top-left -> bottom-right
 * diagonal. 0 = first to move, 1 = last.
 */
function offsets() {
  const raw = {};
  let lo = Infinity, hi = -Infinity;
  for (const k of Object.keys(CENTERS)) {
    const [x, y] = CENTERS[k];
    raw[k] = (x + y) / Math.SQRT2;
    if (raw[k] < lo) lo = raw[k];
    if (raw[k] > hi) hi = raw[k];
  }
  const span = (hi - lo) || 1;
  const out = {};
  for (const k of Object.keys(raw)) out[k] = (raw[k] - lo) / span;
  return out;
}

/**
 * Where each dot sits in the wave: 0 fires first, 1 last. Down the diagonal by
 * default, or spread evenly across `c.wave` when a look names its own order.
 */
function waveOffsets(c) {
  if (!Array.isArray(c.wave)) return offsets();
  const order = c.wave.filter(k => CENTERS[k]);
  const span = (order.length - 1) || 1;
  const out = {};
  for (const k of Object.keys(CENTERS)) {
    const i = order.indexOf(k);
    out[k] = i < 0 ? 0 : i / span;
  }
  return out;
}

/** A seamless wave repeats: `travel` is one whole lap, wrap included. */
const isSeamless = c => Array.isArray(c.wave) && c.seamless;

function timing(c) {
  const off = waveOffsets(c);
  /* Each dot may move for its own span; the shared pulse length is the default. */
  const lengths = {};
  for (const k of Object.keys(CENTERS)) {
    lengths[k] = c.lengths && Number.isFinite(c.lengths[k])
      ? clamp(Math.round(c.lengths[k]), MIN_LEN, 6000) : c.pulse;
  }
  /* When a dot pulses more than once a cycle it carries a start per pulse. */
  const starts = {};
  let cycle = null;
  if (isSeamless(c)) {
    /* The lap runs into the next one, so the step is `travel` over every step
       in the order, not over the gaps between them, and the cycle is the lap. */
    const order = c.wave.filter(k => CENTERS[k]);
    const step = c.travel / order.length;
    for (const k of Object.keys(CENTERS)) starts[k] = [];
    order.forEach((k, i) => starts[k].push(Math.round(i * step)));
    cycle = Math.round(c.travel) + c.rest;
    /* A dot that fires twice in quick succession takes a shorter pulse, so its
       two moves stay separate however wide the shared pulse is. */
    for (const k of Object.keys(CENTERS)) {
      const gaps = starts[k].map((s, i, all) =>
        (i + 1 < all.length ? all[i + 1] : all[0] + cycle) - s);
      const room = gaps.length ? Math.min(...gaps) : cycle;
      lengths[k] = Math.max(Math.min(lengths[k], room), MIN_LEN);
    }
  } else {
    for (const k of Object.keys(CENTERS)) {
      if (c.delays) {
        // Explicit delays (hand-tuned in the workbench) win over the computed wave.
        starts[k] = [Number.isFinite(c.delays[k]) ? clamp(Math.round(c.delays[k]), 0, 6000) : 0];
      } else {
        const out = Math.round(off[k] * c.travel);
        starts[k] = [out];
        if (c.bounce) {
          /* The wave turns once the far dot has finished, so a dot's two pulses
             can never overlap: the closer it is to the turn, the tighter they sit. */
          const back = Math.round(c.travel + c.pulse + (1 - off[k]) * c.travel);
          if (back > out + lengths[k]) starts[k].push(back);
        }
      }
    }
    const end = Math.max(...Object.keys(starts).map(
      k => starts[k][starts[k].length - 1] + lengths[k]));
    cycle = end + c.rest;
  }
  const delays = {};
  for (const k of Object.keys(starts)) delays[k] = starts[k].length ? starts[k][0] : 0;
  const maxDelay = Math.max(...Object.values(delays));
  return { offsets: off, starts, delays, lengths, maxDelay, cycle };
}

/** True when any dot pulses more than once in a cycle. */
const wavePulsesTwice = c => Object.values(timing(c).starts).some(a => a.length > 1);

const MIN_LEN = 60;
const lengthsVary = c => {
  if (!c.lengths) return false;
  const { lengths } = timing(c);
  return Object.keys(lengths).some(k => lengths[k] !== c.pulse);
};

/** Parse "tl:900,top:640,..." into a length map, or null. */
function parseLengths(str) {
  if (!str) return null;
  const out = {};
  let seen = 0;
  for (const part of String(str).split(",")) {
    const [k, v] = part.split(":");
    if (k && CENTERS[k.trim()] && Number.isFinite(parseFloat(v))) {
      out[k.trim()] = clamp(Math.round(parseFloat(v)), MIN_LEN, 6000);
      seen++;
    }
  }
  return seen ? out : null;
}

/** Parse "tl:0,top:69,ll:217,..." into a delay map, or null. */
function parseDelays(str) {
  if (!str) return null;
  const out = {};
  let seen = 0;
  for (const part of String(str).split(",")) {
    const [k, v] = part.split(":");
    if (k && CENTERS[k.trim()] && Number.isFinite(parseFloat(v))) {
      out[k.trim()] = clamp(Math.round(parseFloat(v)), 0, 6000);
      seen++;
    }
  }
  return seen ? out : null;
}

/* ----------------------------------------------------------------- roll */

/* One "go" turns the mark a whole number of times, so it always lands back on
   its own orientation. Winds back, drives through, overshoots, settles. */
const ROLL_STEP = 120;                      /* one roll, the mark's symmetry step */
const goDeg = c => (c.rollCount || 1) * ROLL_STEP;

/* Three ovals sit at 0/120/240 and three circles at 60/180/300, so the two
   families can be flattened by different amounts. */
const SHAPE = { top:"oval", lr:"oval", ll:"oval",
                tr:"circle", tl:"circle", bottom:"circle", core:"circle" };
const flattenFor = (key, c) => SHAPE[key] === "oval" ? c.flattenOval : c.flattenCircle;

function rollPhases(c) {
  return { spinMs: c.rollMs, cycle: c.rollMs + c.rollHold };
}

function backTension(o) {
  /* solve 4s^3 / (27(s+1)^2) = o for the easeOutBack tension */
  if (o <= 0.00001) return 0;
  let lo = 0, hi = 12;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (4 * Math.pow(mid, 3) / (27 * Math.pow(mid + 1, 2)) < o) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
const easeOutBack = (t, s) => {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/* Wind back gently, then release: the drive starts at full speed and
   decelerates all the way home, overshoot folded into that deceleration. */
function rollEaseAt(t, c) {
  const span = goDeg(c) || 360;
  const b = c.rollBack / span;
  const A = b > 0.000001 ? 0.18 : 0;             /* release point */
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  if (t < A) return -b * smoother(t / A);        /* eases to rest, wound back */
  const o = (c.rollOver / span) / (1 + b);
  return -b + (1 + b) * easeOutBack((t - A) / (1 - A), backTension(o));
}

function rollRotation(tm, c) {
  if (tm <= 0) return 0;
  if (tm >= c.rollMs) return goDeg(c);
  return goDeg(c) * rollEaseAt(tm / c.rollMs, c);
}

/* Small h: the release is a deliberate velocity jump, so a wide window would
   average across it and understate the peak. */
function rollSpeedAt(tm, c) {
  const h = 0.4;
  return Math.abs(rollRotation(tm + h, c) - rollRotation(tm - h, c)) / (2 * h);
}
function rollPeakSpeed(c) {
  let m = 0;
  for (let i = 0; i <= 400; i++) m = Math.max(m, rollSpeedAt((i / 400) * c.rollMs, c));
  return m || 1;
}

/* Each dot really is a 4-bezier ellipse, so it can be regenerated exactly and
   then blended toward a teardrop with the same command structure - which is
   what lets CSS interpolate the `d` property smoothly. */
const ELLIPSE = {
  bottom:{cx:12.2056,cy:20.9421,rx:3.1704,ry:3.1704,psi:0},
  core:  {cx:12.2056,cy:11.8344,rx:3.1704,ry:3.1704,psi:0},
  tr:    {cx:20.0952,cy:7.2846, rx:3.1704,ry:3.1704,psi:0},
  tl:    {cx:4.3241, cy:7.2846, rx:3.1704,ry:3.1704,psi:0},
  top:   {cx:12.2056,cy:2.2588, rx:3.9125,ry:2.2588,psi:0},
  lr:    {cx:20.5056,cy:16.6247,rx:3.9125,ry:2.2588,psi:120},
  ll:    {cx:3.9124, cy:16.6243,rx:3.9125,ry:2.2588,psi:60}
};
const KAPPA = 0.5522847498;
const RAD = Math.PI / 180;

/* Travel is phi + 90 for a clockwise spin, so the tail trails at phi - 90.
   The core does not orbit; its point is held facing left instead. */
const TAIL_DEG = (() => {
  const out = {};
  for (const k of Object.keys(ELLIPSE)) {
    const dx = ELLIPSE[k].cx - ELLIPSE.core.cx, dy = ELLIPSE[k].cy - ELLIPSE.core.cy;
    out[k] = (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6)
      ? 180 : Math.atan2(dy, dx) * 180 / Math.PI - 90;
  }
  return out;
})();

/* The outer dots read as teardrops; the core is softened into an egg. */
const ROUND = 0.25, HLEN = 0.42, TIP_OUT = 0.45, SIDE_OUT = 0.14, NARROW = 0.20;
const CORE_ROUND = 1.0, CORE_HLEN = 0.44, CORE_TIP_OUT = 0.24, CORE_SIDE_OUT = 0.30,
      CORE_NARROW = 0.55;
/* the core also draws in and flattens further as it morphs */
const CORE_SHRINK = 0.16, CORE_SHORT = 0.20;

/* shift rotates which anchor the path starts on. Reversing the travel puts the
   tail on the opposite anchor, so the emitted order has to rotate with it - or
   the two directions would interpolate through each other at the turnaround. */
function dropPath(key, m, stretch, tailOverride, shift = 0, squash = 1) {
  const E = ELLIPSE[key];
  const isCore = key === "core";
  const round = isCore ? CORE_ROUND : ROUND;
  const hlen  = isCore ? CORE_HLEN  : HLEN;
  const tipOut = isCore ? CORE_TIP_OUT : TIP_OUT;
  const sideOut = isCore ? CORE_SIDE_OUT : SIDE_OUT;
  const narrow = isCore ? CORE_NARROW : NARROW;
  /* how far the proportions go, as opposed to how far the silhouette goes */
  const ms = m * squash;
  const shrink = isCore ? 1 - CORE_SHRINK * ms : 1;
  const shortF = isCore ? 1 - CORE_SHORT * ms : 1;
  const tailVal = typeof tailOverride === "number" ? tailOverride : TAIL_DEG[key];
  const psi = E.psi * RAD, beta = tailVal * RAD;
  const u = [Math.cos(psi), Math.sin(psi)], v = [-Math.sin(psi), Math.cos(psi)];
  const bp = beta - psi;
  /* parameter of the point that lies in the tail direction */
  const t0 = Math.atan2(E.rx * Math.sin(bp), E.ry * Math.cos(bp));
  const C = [E.cx, E.cy], H = Math.PI / 2;

  const P = t => [C[0] + E.rx*Math.cos(t)*u[0] + E.ry*Math.sin(t)*v[0],
                  C[1] + E.rx*Math.cos(t)*u[1] + E.ry*Math.sin(t)*v[1]];
  const D = t => [-E.rx*Math.sin(t)*u[0] + E.ry*Math.cos(t)*v[0],
                  -E.rx*Math.sin(t)*u[1] + E.ry*Math.cos(t)*v[1]];
  const ts = [t0, t0 + H, t0 + Math.PI, t0 + 3*H];
  const A = ts.map(P), Dv = ts.map(D);

  const add = (a,b) => [a[0]+b[0], a[1]+b[1]];
  const sub2 = (a,b) => [a[0]-b[0], a[1]-b[1]];
  const mul = (a,sc) => [a[0]*sc, a[1]*sc];
  const lerp2 = (a,b,t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];

  const tailDir = [Math.cos(beta), Math.sin(beta)], fwd = mul(tailDir, -1);
  const r0 = Math.hypot(A[0][0]-C[0], A[0][1]-C[1]);
  const r2 = Math.hypot(A[2][0]-C[0], A[2][1]-C[1]);

  const tip  = add(C, mul(tailDir, r0 * (1 + m * tipOut)));
  const head = add(C, mul(fwd,     r2 * (1 + m * 0.02)));
  const s1   = add(A[1], mul(fwd, m * sideOut * r0));
  const s3   = add(A[3], mul(fwd, m * sideOut * r0));
  const an = [tip, s1, head, s3];

  const c1 = an.map((p,i) => add(an[i], mul(Dv[i],  KAPPA)));
  const c2 = an.map((p,i) => add(an[i], mul(Dv[i], -KAPPA)));

  /* Round the tail rather than spike it: each tip handle is blended off the
     chord toward the perpendicular, so the end curves into the point. */
  const norm = v => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0]/L, v[1]/L]; };
  const perp = [-tailDir[1], tailDir[0]];
  const tipHandle = sideAnchor => {
    const chord = sub2(sideAnchor, tip);
    const len = Math.hypot(chord[0], chord[1]);
    const dir = norm(chord);
    const sgn = (chord[0]*perp[0] + chord[1]*perp[1]) >= 0 ? 1 : -1;
    const blend = norm([dir[0]*(1-round) + perp[0]*sgn*round,
                        dir[1]*(1-round) + perp[1]*sgn*round]);
    return add(tip, mul(blend, len * hlen));
  };
  c1[0] = lerp2(add(A[0], mul(Dv[0],  KAPPA)), tipHandle(s1), m);
  c2[0] = lerp2(add(A[0], mul(Dv[0], -KAPPA)), tipHandle(s3), m);

  /* stretch along travel, narrow across it */
  const side = [-fwd[1], fwd[0]];
  const st = p => {
    const d = sub2(p, C);
    const al = d[0]*fwd[0] + d[1]*fwd[1], ac = d[0]*side[0] + d[1]*side[1];
    const a2 = al * (1 + stretch * ms) * shrink;
    const c3 = ac * (1 - narrow * ms) * shortF * shrink;
    return [C[0] + fwd[0]*a2 + side[0]*c3, C[1] + fwd[1]*a2 + side[1]*c3];
  };

  const n = x => { const v = x.toFixed(3); return v === "-0.000" ? "0.000" : v; };
  const roll = a => a.map((_, i) => a[(i + shift) % 4]);
  const AA = roll(an).map(st), C1 = roll(c1).map(st), C2 = roll(c2).map(st);
  let d = `M${n(AA[0][0])} ${n(AA[0][1])}`;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    d += `C${n(C1[i][0])} ${n(C1[i][1])} ${n(C2[j][0])} ${n(C2[j][1])} ${n(AA[j][0])} ${n(AA[j][1])}`;
  }
  return d + "Z";
}

/* Trailing average of the speed, so the shape answers just after the motion
   rather than exactly with it - that lag is what reads as liquid. */
function liquidSpeed(tm, peak, c) {
  const w = c.liquid * 0.45 * c.rollMs;
  if (w < 1) return rollSpeedAt(tm, c) / peak;
  const n = 13;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += rollSpeedAt(Math.max(0, tm - (i / (n - 1)) * w), c);
  return (sum / n) / peak;
}

/* The spin stops, the shape does not: it keeps easing back for settleMs
   afterwards, which is what gives it the slow-jello feel. */
function morphAt(tm, peak, c) {
  if (tm <= c.rollMs) return liquidSpeed(tm, peak, c);
  const endM = liquidSpeed(c.rollMs, peak, c);
  if (!(c.settleMs > 0)) return 0;
  const s = Math.min(1, (tm - c.rollMs) / c.settleMs);
  return endM * (1 - smoother(s));
}

function dropKeyframes(c, suffix = "") {
  const q = rollPhases(c), peak = rollPeakSpeed(c);
  /* sample through the settle too, or the tail-off would be one linear step */
  const extra = ramp(c.rollMs, Math.min(q.cycle, c.rollMs + c.settleMs), 12);
  const seen = new Set(), times = [];
  for (const t of rollSampleTimes(c).concat(extra).sort((a, b) => a - b)) {
    const tm = Math.min(t, q.cycle), k = tm.toFixed(2);
    if (!seen.has(k)) { seen.add(k); times.push(tm); }
  }
  const out = [rollKeyframes(c, suffix)];
  for (const d of DOTS) {
    const rows = times.map(tm => {
      const f = morphAt(tm, peak, c);
      return `  ${(tm / q.cycle * 100).toFixed(3)}% { d: path("`
        + dropPath(d.key, c.dropAmt * f, c.dropStretch) + `") }`;
    });
    out.push(`@keyframes drop_${d.key}${suffix} {\n${rows.join("\n")}\n}`);
  }
  out.push(rollKeyframesInv(c, suffix));
  return out.join("\n\n");
}

/** Direction of each dot's radius in the mark's frame; null for the core. */
const RADIAL_DEG = (() => {
  const c = CENTERS.core, out = {};
  for (const k of Object.keys(CENTERS)) {
    const dx = CENTERS[k][0] - c[0], dy = CENTERS[k][1] - c[1];
    out[k] = (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6)
      ? null : Math.atan2(dy, dx) * 180 / Math.PI;
  }
  return out;
})();

function rollSampleTimes(c) {
  const q = rollPhases(c);
  const release = (c.rollBack > 0.000001 ? 0.18 : 0) * c.rollMs;
  let times = [];
  for (let i = 0; i <= 90; i++) times.push((i / 90) * c.rollMs);
  /* the peak sits in a narrow window just after the release */
  times = times.concat(ramp(release, release + 0.12 * c.rollMs, 10));
  times.push(q.cycle);

  const seen = new Set(), uniq = [];
  for (const t of times.sort((a, b) => a - b)) {
    const tm = Math.min(t, q.cycle), k = tm.toFixed(2);
    if (!seen.has(k)) { seen.add(k); uniq.push(tm); }
  }
  return uniq;
}

function rollKeyframes(c, suffix = "") {
  const q = rollPhases(c);
  const rows = rollSampleTimes(c).map(tm =>
    `  ${(tm / q.cycle * 100).toFixed(3)}% { transform: `
    + `rotate(${rollRotation(tm, c).toFixed(3)}deg) }`);
  return `@keyframes rollTip${suffix} {\n${rows.join("\n")}\n}`;
}

/* The core is held still by a transform that mirrors the mark's rotation.
   Using the same sample times as rollTip means CSS interpolates both as angles
   and they cancel exactly - baking the rotation into the path instead makes the
   shape interpolate along chords and visibly shimmer. */
function rollKeyframesInv(c, suffix = "") {
  const q = rollPhases(c);
  const rows = rollSampleTimes(c).map(tm =>
    `  ${(tm / q.cycle * 100).toFixed(3)}% { transform: `
    + `rotate(${(-rollRotation(tm, c)).toFixed(3)}deg) }`);
  return `@keyframes rollTipInv${suffix} {\n${rows.join("\n")}\n}`;
}

/** The outer dots squash along their radius in step with the spin's speed. */
function smearKeyframes(c, suffix = "") {
  const q = rollPhases(c), peak = rollPeakSpeed(c);
  const times = rollSampleTimes(c);
  const out = [rollKeyframes(c, suffix)];
  for (const d of DOTS) {
    const ang = RADIAL_DEG[d.key];
    if (ang === null) continue;                  /* core stays put */
    const rows = times.map(tm => {
      const k = tm > c.rollMs ? 0 : flattenFor(d.key, c) * (rollSpeedAt(tm, c) / peak);
      return `  ${(tm / q.cycle * 100).toFixed(3)}% { transform: rotate(${ang.toFixed(3)}deg) `
        + `scale(${(1 - k).toFixed(4)}, 1) rotate(${(-ang).toFixed(3)}deg) }`;
    });
    out.push(`@keyframes smear_${d.key}${suffix} {\n${rows.join("\n")}\n}`);
  }
  return out.join("\n\n");
}

/* ----------------------------------------------------------------- dash */

/* The teardrop, but the mark travels. It rolls away to the right at speed,
   hangs there a beat, then rolls slowly back to where it started.
 *
 * Rotation and travel are driven by ONE eased progress, which is what makes it
 * roll rather than slide. Distance is set to match: a disc of radius r turning
 * theta covers theta*r, and the mark's radius is half its width, so a 240 deg
 * go should travel 4.18879 * 0.5 = 2.09 widths. That is the default.
 *
 * The return runs backwards, so the drops have to lead with the other end. The
 * morph is driven by the SIGNED speed through a trailing average: it crosses
 * zero on its own at the turnaround, and the dots are round at that instant, so
 * the flip costs nothing. */
const DASH_PRESETS = {
  dash:  { mode:"dash", rollCount:3, rollMs:1100, rollBack:12, rollOver:14, dashX:3.1416,
           dashPause:140, dashBackMs:2100, dashHold:520,
           dropAmt:0.95, dropStretch:0.20, liquid:0.60, coreBack:0.45, coreBackSquash:0.45, dashCentre:1 },
  fling: { mode:"dash", rollCount:3, rollMs:560, rollBack:16, rollOver:20, dashX:3.1416,
           dashPause:180, dashBackMs:1900, dashHold:520,
           dropAmt:0.80, dropStretch:0.22, liquid:0.45, coreBack:0.35, coreBackSquash:0.45, dashCentre:1 },
  amble: { mode:"dash", rollCount:2, rollMs:820, rollBack:8,  rollOver:10, dashX:2.0944,
           dashPause:220, dashBackMs:2200, dashHold:640,
           dropAmt:0.50, dropStretch:0.10, liquid:0.80, coreBack:0.55, coreBackSquash:0.5, dashCentre:1 },
  yoyo:  { mode:"dash", rollCount:2, rollMs:520, rollBack:18, rollOver:22, dashX:2.0944,
           dashPause:90,  dashBackMs:900,  dashHold:420,
           dropAmt:0.70, dropStretch:0.18, liquid:0.50, coreBack:0.30, coreBackSquash:0.45, dashCentre:1 }
};

function dashPhases(c) {
  const outEnd = c.rollMs;
  const pauseEnd = outEnd + c.dashPause;
  const backEnd = pauseEnd + c.dashBackMs;
  return { outEnd, pauseEnd, backEnd, cycle: backEnd + c.dashHold };
}

/** 0 = home, 1 = all the way out. Both the turn and the travel read from this. */
function dashProgress(tm, c) {
  const q = dashPhases(c);
  if (tm <= 0) return 0;
  if (tm < q.outEnd) return rollEaseAt(tm / c.rollMs, c);   /* wind back, drive, settle */
  if (tm < q.pauseEnd) return 1;
  if (tm < q.backEnd) return 1 - smoother((tm - q.pauseEnd) / c.dashBackMs);
  return 0;
}

const dashRotation = (tm, c) => goDeg(c) * dashProgress(tm, c);

/** Distance from home, in mark widths, so it scales with the drawn size. */
const dashTravel = (tm, c) => c.dashX * dashProgress(tm, c);

/**
 * The mark only ever travels one way, so anchoring it at home would put the
 * whole animation to the right of wherever it is placed. This slides it back by
 * half the sweep, which centres the motion instead of its resting position:
 * it starts left of centre, crosses it, and comes back. `dashCentre` 0 anchors
 * at home again.
 */
function dashOffset(c) {
  if (!(c.dashCentre > 0)) return 0;
  const q = dashPhases(c);
  let lo = 0, hi = 0;
  for (let i = 0; i <= 600; i++) {
    const x = dashTravel((i / 600) * q.cycle, c);
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  /* the core is the mark's visual centre, and it is not the box's centre */
  return c.dashCentre * ((lo + hi) / 2 + (ELLIPSE.core.cx / 25 - 0.5));
}

/** Where the mark is actually drawn. Pass `off` to avoid re-solving it. */
const dashShift = (tm, c, off) => dashTravel(tm, c) - (off === undefined ? dashOffset(c) : off);

/* Signed, unlike the roll's: the sign is what tells the drops which way round
   to point. Small h because the release is a deliberate velocity jump. */
function dashSpeedAt(tm, c) {
  const h = 0.4;
  return (dashRotation(tm + h, c) - dashRotation(tm - h, c)) / (2 * h);
}

function dashPeakSpeed(c) {
  const q = dashPhases(c);
  let m = 0;
  for (let i = 0; i <= 600; i++) m = Math.max(m, Math.abs(dashSpeedAt((i / 600) * q.cycle, c)));
  return m || 1;
}

/* Trailing average of the signed speed: the shape answers just after the
   motion, and swaps ends by passing through round rather than by switching. */
function dashMorphAt(tm, peak, c) {
  const w = c.liquid * 0.45 * c.rollMs;
  if (w < 1) return dashSpeedAt(tm, c) / peak;
  const n = 13;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += dashSpeedAt(Math.max(0, tm - (i / (n - 1)) * w), c);
  return (sum / n) / peak;
}

/**
 * Peak of the morph driver during the roll home, on its own scale.
 *
 * Coming home is slow, so speed alone leaves everything nearly round. The core
 * is normalised against this instead of against the drive's peak, which is what
 * lets it hold a shape on the way back without any of it being faked: the
 * return's own speed profile rises and falls, so the envelope is still 0 -> 1
 * -> 0 and the core is round at both ends.
 */
function dashBackPeak(c, peak) {
  const q = dashPhases(c);
  let m = 0;
  for (let i = 0; i <= 300; i++) {
    const tm = q.pauseEnd + (i / 300) * (q.cycle - q.pauseEnd);
    m = Math.max(m, Math.abs(dashMorphAt(tm, peak, c)));
  }
  return m || 1;
}

/**
 * One dot's shape at one instant: how deep the morph is, and which way the drop
 * points. The keyframes and the extent bound both read it from here, so what is
 * drawn and what is measured cannot drift apart.
 */
function dashShapeAt(key, sv, backAvg, c) {
  const back = sv < 0;                      /* rolling home */
  let m = c.dropAmt * Math.abs(sv), squash = 1;
  if (back && key === "core" && c.coreBack > 0) {
    m = Math.max(m, c.coreBack * backAvg);
    /* Coming home it should read as a drop, not as a squashed one: the tail and
       the lead stay at full depth, the thinning is dialled back. */
    if (c.coreBackSquash != null) squash = c.coreBackSquash;
  }
  return { m, squash, tail: back ? TAIL_DEG[key] + 180 : TAIL_DEG[key], shift: back ? 2 : 0 };
}

/** Dense through the drive, lighter through the long slow return. */
function dashSampleTimes(c) {
  const q = dashPhases(c);
  const release = (c.rollBack > 0.000001 ? 0.18 : 0) * c.rollMs;
  const lag = c.liquid * 0.45 * c.rollMs;      /* the shape keeps moving this long after */
  const times = ramp(0, q.outEnd, 70)
    .concat(ramp(release, release + 0.12 * c.rollMs, 10))
    .concat(ramp(q.outEnd, Math.min(q.cycle, q.outEnd + lag), 10))
    .concat(ramp(q.pauseEnd, q.backEnd, 44))
    .concat(ramp(q.backEnd, Math.min(q.cycle, q.backEnd + lag), 8))
    .concat([q.pauseEnd, q.cycle]);

  const seen = new Set(), uniq = [];
  for (const t of times.sort((a, b) => a - b)) {
    const tm = Math.min(t, q.cycle), k = tm.toFixed(2);
    if (!seen.has(k)) { seen.add(k); uniq.push(tm); }
  }
  return uniq;
}

/**
 * How much room the mark needs, in multiples of its own width.
 *
 * Travel is the easy half. The other half is that a spinning mark sweeps a
 * disc, not its own box, and the drops grow tips as they morph - so the radius
 * is measured off the generated paths themselves, at every sampled instant.
 * Anchors and control points bound a bezier, so the furthest of those from the
 * spin origin is a safe bound on the ink.
 */
function dashExtent(c) {
  const q = dashPhases(c), peak = dashPeakSpeed(c), off = dashOffset(c);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i <= 600; i++) {
    const x = dashShift((i / 600) * q.cycle, c, off);
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }

  const ox = ELLIPSE.core.cx, oy = ELLIPSE.core.cy;   /* the mark turns about the core */
  const backPeak = dashBackPeak(c, peak);
  let r = 0;
  for (const tm of dashSampleTimes(c)) {
    const sv = dashMorphAt(tm, peak, c);
    const backAvg = sv < 0 ? Math.min(1, Math.abs(sv) / backPeak) : 0;
    for (const d of DOTS) {
      const sh = dashShapeAt(d.key, sv, backAvg, c);
      const path = dropPath(d.key, sh.m, c.dropStretch, sh.tail, sh.shift, sh.squash);
      const n = path.match(/-?\d+\.?\d*/g).map(Number);
      for (let i = 0; i + 1 < n.length; i += 2)
        r = Math.max(r, Math.hypot(n[i] - ox, n[i + 1] - oy));
    }
  }
  /* the viewBox is 25 wide and maps to the mark's width, so units -> widths */
  const radius = r / 25;
  /* Where the mark's own left edge sits inside that box: the ink is centred on
     the core, and the core is not the middle of the mark's box. */
  const lead = radius - ELLIPSE.core.cx / 25 - lo;
  return { lo, hi, radius, lead, travel: hi - lo, span: (hi - lo) + 2 * radius };
}

function dashKeyframes(c, suffix = "") {
  const q = dashPhases(c), peak = dashPeakSpeed(c), times = dashSampleTimes(c);
  const backPeak = dashBackPeak(c, peak);
  const pct = tm => (tm / q.cycle * 100).toFixed(3);
  /* the driver depends only on the instant, so sample it once, not once per dot */
  const frames = times.map(tm => {
    const sv = dashMorphAt(tm, peak, c);
    return { tm, sv, backAvg: sv < 0 ? Math.min(1, Math.abs(sv) / backPeak) : 0 };
  });

  /* translate then rotate: the mark turns in its own space and is carried. */
  const off = dashOffset(c);
  const out = [`@keyframes dashRoll${suffix} {\n` + times.map(tm =>
    `  ${pct(tm)}% { transform: translateX(${(dashShift(tm, c, off) * 100).toFixed(3)}%)`
    + ` rotate(${dashRotation(tm, c).toFixed(3)}deg) }`).join("\n") + "\n}"];

  for (const d of DOTS) {
    const rows = frames.map(f => {
      const sh = dashShapeAt(d.key, f.sv, f.backAvg, c);
      return `  ${pct(f.tm)}% { d: path("`
        + dropPath(d.key, sh.m, c.dropStretch, sh.tail, sh.shift, sh.squash) + `") }`;
    });
    out.push(`@keyframes dash_${d.key}${suffix} {\n${rows.join("\n")}\n}`);
  }

  /* The core holds its orientation: same sample grid, so the angles cancel at
     every instant rather than only at the keyframes. */
  out.push(`@keyframes dashRollInv${suffix} {\n` + times.map(tm =>
    `  ${pct(tm)}% { transform: rotate(${(-dashRotation(tm, c)).toFixed(3)}deg) }`).join("\n") + "\n}");
  return out.join("\n\n");
}


/* The dash, with a line on the ground under it. The head of the line is pinned
   to the mark's core; the tail is where the core WAS, `trailLag` ago. So the
   trail is long exactly when the mark is fast and collapses to nothing when it
   stops - it is the motion drawn out, not a decoration bolted on.
   Both ends read from dashShift, so the line cannot drift off the mark. */
const TRAIL_PRESETS = {
  track: { mode:"dash", rollCount:5, rollMs:1500, rollBack:12, rollOver:14, dashX:5.2360,
           dashPause:140, dashBackMs:2200, dashHold:460,
           dropAmt:0.95, dropStretch:0.20, liquid:0.60, coreBack:0.45, coreBackSquash:0.45,
           dashCentre:1, trail:4, trailLag:160, trailShift:-10, trailGap:-6, trailRadius:1 },
  streak:{ mode:"dash", rollCount:3, rollMs:900, rollBack:14, rollOver:18, dashX:3.1416,
           dashPause:120, dashBackMs:1800, dashHold:460,
           dropAmt:1.00, dropStretch:0.22, liquid:0.50, coreBack:0.40, coreBackSquash:0.45,
           dashCentre:1, trail:4, trailLag:280, trailShift:-10, trailGap:-6, trailRadius:1 }
};

/** The core's resting spot across the mark's own box - where the line is pinned. */
const CORE_X = ELLIPSE.core.cx / 25;
const CORE_BOTTOM = ELLIPSE.core.cy / 25;   /* the line sits under this */

/**
 * Trail geometry at one instant, in mark widths.
 *
 * The bar is one mark wide with its origin on its left edge, so `translateX(h)
 * scaleX(k)` lays it from h to h + k. Pinning the origin to the head keeps that
 * end under the mark, and because k is never positive the bar always mirrors
 * about that origin - which carries the gradient with it, so "to right" runs
 * head to tail no matter which way round the bar sits.
 *
 * k is clamped at 0, so the line only ever reaches back to the LEFT - it belongs
 * to the outward roll and there is none on the way home.
 *
 * The clamp is not what removes it, though. The drive decelerates the whole way
 * in, so the tail closes on the head and the line has already faded to nothing
 * around 950ms - before the mark even stops, let alone turns round. The clamp
 * only holds it there.
 */
function dashTrailAt(tm, c, off) {
  const head = CORE_X + dashShift(tm, c, off);
  const tail = CORE_X + dashShift(Math.max(0, tm - c.trailLag), c, off);
  return { head, k: Math.min(0, tail - head) };
}

function dashTrailKeyframes(c, suffix = "") {
  const q = dashPhases(c), off = dashOffset(c);
  /* the tail reads the motion `trailLag` late, so the grid needs those instants too */
  const base = dashSampleTimes(c);
  const seen = new Set(), times = [];
  for (const t of base.concat(base.map(t => t + c.trailLag)).sort((a, b) => a - b)) {
    const tm = Math.min(t, q.cycle), k = tm.toFixed(2);
    if (!seen.has(k)) { seen.add(k); times.push(tm); }
  }
  const rows = times.map(tm => {
    const { head, k } = dashTrailAt(tm, c, off);
    return `  ${(tm / q.cycle * 100).toFixed(3)}% { transform: `
      + `translateX(${(head * 100).toFixed(3)}%) scaleX(${k.toFixed(4)}) }`;
  });
  return `@keyframes dashTrail${suffix} {\n${rows.join("\n")}\n}`;
}

/** How far the line reaches behind the mark at its longest, in mark widths. */
function dashTrailReach(c) {
  const q = dashPhases(c), off = dashOffset(c);
  let m = 0;
  for (let i = 0; i <= 800; i++)
    m = Math.max(m, Math.abs(dashTrailAt((i / 800) * q.cycle, c, off).k));
  return m;
}

/** Static rules for the trail and the wrapper that positions it. */
function trailCss(c, className, suffix = "", scope = "") {
  const S = scope ? scope + " " : "";
  const rig = `${S}.${className}-rig`, bar = `${S}.${className}-trail`;
  return [
    `${rig} { position: relative; display: inline-block; line-height: 0 }`,
    `${bar} {`,
    `  display: block; position: absolute; left: ${c.trailShift || 0}%;`,
    `  width: 100%; height: ${c.trail}px;`,
    /* the mark's ink reaches exactly here, so gap 0 puts the line against it */
    `  top: calc(${((CORE_BOTTOM + 0.4961) * 100).toFixed(2)}% `
      + `${(c.trailGap || 0) < 0 ? "-" : "+"} ${Math.abs(c.trailGap || 0)}px);`,
    `  border-radius: ${c.trailRadius == null ? 1 : c.trailRadius}px;`,
    `  transform-origin: 0 50%;`,
    `  background: linear-gradient(to right,`,
    `    var(--trail-color, #fff), var(--trail-fade, rgba(255, 255, 255, 0)));`,
    `  pointer-events: none; will-change: transform;`,
    `  animation: dashTrail${suffix} ${cycleOf(c)}ms linear infinite both;`,
    `}`,
    `@media (prefers-reduced-motion: reduce) { ${bar} { animation: none; opacity: 0 } }`
  ].join("\n");
}

/* ----------------------------------------------------------------- cube */

function cubePhases(c) {
  const tumbleMs = c.steps * c.stepMs;
  const tumbleEnd = c.tuckMs + tumbleMs;
  const snapEnd = tumbleEnd + c.snapMs;
  return { tumbleMs, tumbleEnd, snapEnd, stepDeg: 360 / c.steps, cycle: snapEnd + c.cubeRest };
}

/* A tumbling block tips slowly, accelerates, then stops dead on landing. */
const rollEase = t => Math.pow(clamp(t, 0, 1), 1.9);

function cubeRotation(tm, c) {
  const q = cubePhases(c);
  if (tm <= c.tuckMs) return 0;
  if (tm >= q.tumbleEnd) return 360;
  const local = tm - c.tuckMs;
  const i = Math.floor(local / c.stepMs);
  return (i + rollEase((local - i * c.stepMs) / c.stepMs)) * q.stepDeg;
}

function cubeHop(tm, c) {
  const q = cubePhases(c);
  if (tm <= c.tuckMs || tm >= q.tumbleEnd) return 0;
  return -c.hop * Math.sin(Math.PI * (((tm - c.tuckMs) % c.stepMs) / c.stepMs));
}

/** Impact: fires on every landing, the final one included. */
function cubeSquash(tm, c) {
  const local = tm - c.tuckMs;
  if (local < c.stepMs) return 0;
  const i = Math.min(Math.floor(local / c.stepMs), c.steps);
  const since = local - i * c.stepMs, d = c.stepMs * 0.34;
  return since >= d ? 0 : c.squash * (1 - smoother(since / d));
}

/** 1 = fully tucked to the core, 0 = resting; dips below 0 to pop past. */
function cubeTuck(tm, c) {
  const q = cubePhases(c);
  if (tm <= 0) return 0;
  if (tm < c.tuckMs) return smoother(tm / c.tuckMs);
  if (tm < q.tumbleEnd) return 1;
  if (tm < q.snapEnd) {
    const t = (tm - q.tumbleEnd) / c.snapMs;
    return 1 - (smoother(t) + 0.13 * Math.pow(Math.sin(Math.PI * t), 2));
  }
  return 0;
}

function cubeKeyframes(c, suffix = "") {
  const q = cubePhases(c);
  const pct = tm => (tm / q.cycle * 100).toFixed(3);
  const uniq = times => {
    const seen = new Set(), out = [];
    for (const t of times.slice().sort((a, b) => a - b)) {
      const tm = Math.min(t, q.cycle), k = tm.toFixed(2);
      if (!seen.has(k)) { seen.add(k); out.push(tm); }
    }
    return out;
  };

  let markTimes = ramp(0, c.tuckMs, 10);
  for (let i = 0; i < c.steps; i++) {
    markTimes = markTimes.concat(ramp(c.tuckMs + i * c.stepMs, c.tuckMs + (i + 1) * c.stepMs, 12));
  }
  markTimes = markTimes
    .concat(ramp(q.tumbleEnd, q.tumbleEnd + c.stepMs * 0.34, 5))
    .concat(ramp(q.tumbleEnd, q.snapEnd, 16))
    .concat([q.cycle]);

  /* right-to-left: rotate in local space, squash against world axes, then hop */
  const markRows = uniq(markTimes).map(tm => {
    const sq = cubeSquash(tm, c);
    return `  ${pct(tm)}% { transform: translateY(${cubeHop(tm, c).toFixed(4)}px) `
      + `scale(${(1 + sq * 0.6).toFixed(4)}, ${(1 - sq).toFixed(4)}) `
      + `rotate(${cubeRotation(tm, c).toFixed(3)}deg) }`;
  });
  const blocks = [`@keyframes cubeRoll${suffix} {\n${markRows.join("\n")}\n}`];

  const dotTimes = ramp(0, c.tuckMs, 12)
    .concat([q.tumbleEnd])
    .concat(ramp(q.tumbleEnd, q.snapEnd, 16))
    .concat([q.cycle]);
  for (const d of DOTS) {
    const v = RADIAL[d.key], dist = c.tuck * RADIUS[d.key];
    const rows = uniq(dotTimes).map(tm => {
      const f = -dist * cubeTuck(tm, c);
      return `  ${pct(tm)}% { transform: translate(${(v[0] * f).toFixed(4)}px, `
        + `${(v[1] * f).toFixed(4)}px) }`;
    });
    blocks.push(`@keyframes cube_${d.key}${suffix} {\n${rows.join("\n")}\n}`);
  }
  return blocks.join("\n\n");
}

/* ---------------------------------------------------------------- orbit */

function orbitPhases(c) {
  const bloomEnd = c.pushMs + c.bloomMs;
  const spinEnd  = bloomEnd + c.spinMs;
  const inEnd    = spinEnd + c.returnMs;
  return { bloomEnd, spinEnd, inEnd, cycle: inEnd + c.orbitRest };
}

/** Rotation in degrees at tm ms into the cycle. */
function rotationAt(tm, c) {
  const o = orbitPhases(c), end = c.turns * 360;
  if (tm <= 0) return 0;
  if (tm < o.bloomEnd) return -c.windup * smoother(tm / o.bloomEnd);
  if (tm < o.spinEnd) return -c.windup + (end + c.windup) * smoother((tm - o.bloomEnd) / c.spinMs);
  return end;
}

/** How far out a dot is (0..1) at tm, given its bloom offset. */
function pushAt(tm, off, c) {
  const o = orbitPhases(c), start = off * c.bloomMs;
  if (tm <= start) return 0;
  if (tm < start + c.pushMs) return smoother((tm - start) / c.pushMs);
  if (tm < o.spinEnd) return 1;
  if (tm < o.inEnd) return 1 - smoother((tm - o.spinEnd) / c.returnMs);
  return 0;
}

const ramp = (from, to, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => from + (to - from) * (i / steps));

/** Only sample where things actually move; flat stretches need two anchors. */
function orbitKeyframes(c, suffix = "") {
  const o = orbitPhases(c), off = offsets();
  const pct = tm => (tm / o.cycle * 100).toFixed(3);
  const uniq = times => {
    const seen = new Set(), out = [];
    for (const t of times) {
      const tm = Math.min(t, o.cycle), k = tm.toFixed(2);
      if (!seen.has(k)) { seen.add(k); out.push(tm); }
    }
    return out;
  };

  const spin = uniq([...ramp(0, o.bloomEnd, 14), ...ramp(o.bloomEnd, o.spinEnd, 40), o.cycle])
    .map(tm => `  ${pct(tm)}% { transform: rotate(${rotationAt(tm, c).toFixed(3)}deg) }`);
  const blocks = [`@keyframes scatterSpin${suffix} {\n${spin.join("\n")}\n}`];

  const spreadMul = Number.isFinite(c.spreadMul) ? c.spreadMul : 1;
  for (const d of DOTS) {
    const start = off[d.key] * c.bloomMs, v = RADIAL[d.key];
    const base = (spreadMul - 1) * RADIUS[d.key];
    const rows = uniq([
      0, start,
      ...ramp(start, start + c.pushMs, 16),
      o.spinEnd, ...ramp(o.spinEnd, o.inEnd, 16), o.cycle
    ]).map(tm => {
      const f = base + c.push * pushAt(tm, off[d.key], c);
      return `  ${pct(tm)}% { transform: translate(${(v[0] * f).toFixed(4)}px, `
        + `${(v[1] * f).toFixed(4)}px) }`;
    });
    blocks.push(`@keyframes orbit_${d.key}${suffix} {\n${rows.join("\n")}\n}`);
  }
  return blocks.join("\n\n");
}

function keyframes(c, name = "scatterPulse", key = null) {
  const t = timing(c);
  const cycle = t.cycle;
  const pw = (key ? t.lengths[key] : c.pulse) / cycle;
  const rows = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const s = curve(t, c);
    const o = opacityAt(s, c);
    rows.push(`  ${(t * pw * 100).toFixed(3)}% { transform: scale(${s.toFixed(4)})`
      + (c.fade ? `; opacity: ${o.toFixed(3)}` : "") + " }");
  }
  if (pw < 0.999) rows.push(`  100% { transform: scale(1)${c.fade ? "; opacity: 1" : ""} }`);
  return `@keyframes ${name} {\n${rows.join("\n")}\n}`;
}

/**
 * Keyframes for one dot across the whole cycle, holding at rest between its
 * pulses. Used when a dot pulses more than once, which no single delay can say.
 */
function waveKeyframes(c, name, key) {
  const { cycle, starts, lengths } = timing(c);
  const len = lengths[key];
  const frame = (pct, sc) => `  ${pct.toFixed(3)}% { transform: scale(${sc.toFixed(4)})`
    + (c.fade ? `; opacity: ${opacityAt(sc, c).toFixed(3)}` : "") + " }";
  const rest = pct => frame(pct, 1);
  /* Each pulse is a window: the span of the cycle it covers, and the span of
     the curve it draws there. A pulse that runs past the end of the cycle is
     split in two and finishes at the top of the next lap, so the loop closes
     on the same scale it opens on and the seam cannot be seen. */
  const windows = [];
  for (const start of starts[key] || []) {
    const over = start + len - cycle;
    if (over > 0) {
      const t = (cycle - start) / len;
      windows.push({ a: start, b: cycle, t0: 0, t1: t }, { a: 0, b: over, t0: t, t1: 1 });
    } else {
      windows.push({ a: start, b: start + len, t0: 0, t1: 1 });
    }
  }
  windows.sort((x, y) => x.a - y.a);
  const rows = [];
  let cursor = -1;                                   /* % the last pulse ended at */
  for (const w of windows) {
    const a = (w.a / cycle) * 100, b = (w.b / cycle) * 100;
    const fromRest = w.t0 < 0.0001;                  /* a wrapped tail starts mid-curve */
    if (fromRest && a > cursor + 0.001) rows.push(rest(a));   /* hold until it starts */
    for (let i = fromRest ? 1 : 0; i <= SAMPLES; i++) {
      const u = i / SAMPLES;
      rows.push(frame(a + (b - a) * u, curve(w.t0 + (w.t1 - w.t0) * u, c)));
    }
    cursor = b;
  }
  if (cursor < 99.999) rows.push(rest(100));
  if (!rows.length) rows.push(rest(0), rest(100));   /* a dot the wave never reaches */
  return `@keyframes ${name} {\n${rows.join("\n")}\n}`;
}

/** Inline <svg> for the mark, with each dot carrying its own delay. */
function markSvg(c, className = "scatter-mark") {
  /* Only the pulse staggers its dots; every other mode drives them off one
     clock, as does a wave whose dots pulse twice: their timing is in the
     keyframes, not in a delay. */
  const staggered = !c.mode && !wavePulsesTwice(c);
  const delays = staggered ? timing(c).delays : {};
  const paths = DOTS.map(
    d => `    <path class="dot" data-key="${d.key}"`
       + (staggered ? ` style="--delay:${delays[d.key]}ms"` : "")
       + ` d="${d.d}"/>`
  ).join("\n");
  const svg = `<svg class="${className}" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"\n`
    + `     role="img" aria-label="Loading">\n${paths}\n  </svg>`;
  if (!(c.trail > 0)) return svg;
  /* the wrapper is sized by the mark, so the line can be laid out in mark widths */
  return `<span class="${className}-rig">${svg}`
    + `<i class="${className}-trail" aria-hidden="true"></i></span>`;
}

/** How wide to draw the mark: the further a look travels, the smaller it goes. */
function markWidthCss(c) {
  if (c.trail) return "clamp(58px, 6.6vw, 104px)";      /* rolls furthest of the lot */
  if (c.mode === "dash") return "clamp(76px, 8.8vw, 140px)";
  return "clamp(100px, 11.4vw, 180px)";
}

function cycleOf(c) {
  if (c.mode === "dash") return dashPhases(c).cycle;
  if (/^(roll|smear|drop)$/.test(c.mode)) return rollPhases(c).cycle;
  if (c.mode === "cube") return cubePhases(c).cycle;
  if (c.mode === "orbit") return orbitPhases(c).cycle;
  return timing(c).cycle;
}

/** Animation rules + keyframes for a config, at any pair of selectors. */
function animCss(c, markSel, dotSel, suffix = "", scope = "") {
  const cycle = cycleOf(c);
  const S = scope ? scope + " " : "";
  if (c.mode === "roll") {
    /* the mark rolls as one piece: the dots hold formation */
    return [
      `${S}${markSel} { transform-origin: ${SPIN_ORIGIN};`
        + ` animation: rollTip${suffix} ${cycle}ms linear infinite both }`,
      `${S}${dotSel} { animation: none; transform: none }`
    ].join("\n") + "\n\n" + rollKeyframes(c, suffix);
  }
  if (c.mode === "drop") {
    const rules = [
      `${S}${markSel} { transform-origin: ${SPIN_ORIGIN};`
        + ` animation: rollTip${suffix} ${cycle}ms linear infinite both }`,
      `${S}${dotSel} { animation-duration: ${cycle}ms;`
        + ` animation-delay: 0ms; animation-timing-function: linear;`
        + ` animation-iteration-count: infinite; animation-fill-mode: both }`,
      ...DOTS.map(d => d.key === "core"
        ? `${S}${dotSel}[data-key="core"] { animation-name: drop_core${suffix}, rollTipInv${suffix};`
          + ` animation-duration: ${cycle}ms, ${cycle}ms }`
        : `${S}${dotSel}[data-key="${d.key}"] { animation-name: drop_${d.key}${suffix};`
          + ` transform: none }`)
    ];
    return rules.join("\n") + "\n\n" + dropKeyframes(c, suffix);
  }
  if (c.mode === "dash") {
    const rules = [
      `${S}${markSel} { transform-origin: ${SPIN_ORIGIN};`
        + ` animation: dashRoll${suffix} ${cycle}ms linear infinite both }`,
      `${S}${dotSel} { animation-duration: ${cycle}ms;`
        + ` animation-delay: 0ms; animation-timing-function: linear;`
        + ` animation-iteration-count: infinite; animation-fill-mode: both }`,
      ...DOTS.map(d => d.key === "core"
        ? `${S}${dotSel}[data-key="core"] { animation-name: dash_core${suffix}, dashRollInv${suffix};`
          + ` animation-duration: ${cycle}ms, ${cycle}ms }`
        : `${S}${dotSel}[data-key="${d.key}"] { animation-name: dash_${d.key}${suffix};`
          + ` transform: none }`)
    ];
    let css = rules.join("\n") + "\n\n" + dashKeyframes(c, suffix);
    if (c.trail > 0) {
      const cls = markSel.replace(/^.*\./, "");     /* ".mark" -> "mark" */
      css += "\n\n" + trailCss(c, cls, suffix, scope) + "\n\n" + dashTrailKeyframes(c, suffix);
    }
    return css;
  }
  if (c.mode === "smear") {
    const rules = [
      `${S}${markSel} { transform-origin: ${SPIN_ORIGIN};`
        + ` animation: rollTip${suffix} ${cycle}ms linear infinite both }`,
      `${S}${dotSel} { animation-duration: ${cycle}ms; animation-delay: 0ms;`
        + ` animation-timing-function: linear; animation-iteration-count: infinite;`
        + ` animation-fill-mode: both }`,
      ...DOTS.map(d => RADIAL_DEG[d.key] === null
        ? `${S}${dotSel}[data-key="${d.key}"] { animation: none; transform: none }`
        : `${S}${dotSel}[data-key="${d.key}"] { animation-name: smear_${d.key}${suffix} }`)
    ];
    return rules.join("\n") + "\n\n" + smearKeyframes(c, suffix);
  }
  if (c.mode === "cube") {
    const rules = [
      `${S}${markSel} { transform-origin: ${SPIN_ORIGIN};`
        + ` animation: cubeRoll${suffix} ${cycle}ms linear infinite both }`,
      `${S}${dotSel} { animation-duration: ${cycle}ms; animation-delay: 0ms;`
        + ` animation-timing-function: linear; animation-iteration-count: infinite;`
        + ` animation-fill-mode: both }`,
      ...DOTS.map(d => `${S}${dotSel}[data-key="${d.key}"] { animation-name: cube_${d.key}${suffix} }`)
    ];
    return rules.join("\n") + "\n\n" + cubeKeyframes(c, suffix);
  }
  if (c.mode === "orbit") {
    const rules = [
      `${S}${markSel} { transform-origin: ${SPIN_ORIGIN};`
        + ` animation: scatterSpin${suffix} ${cycle}ms linear infinite both }`,
      `${S}${dotSel} { animation-duration: ${cycle}ms; animation-delay: 0ms;`
        + ` animation-timing-function: linear; animation-iteration-count: infinite;`
        + ` animation-fill-mode: both }`,
      ...DOTS.map(d => `${S}${dotSel}[data-key="${d.key}"] { animation-name: orbit_${d.key}${suffix} }`)
    ];
    return rules.join("\n") + "\n\n" + orbitKeyframes(c, suffix);
  }
  const { delays } = timing(c);
  const twice = wavePulsesTwice(c);
  const varied = lengthsVary(c);
  const rules = [
    `${S}${markSel} { animation: none; transform: none }`,
    `${S}${dotSel} { animation-duration: ${cycle}ms;`
      + ` animation-delay: var(--delay, 0ms); animation-timing-function: linear;`
      + ` animation-iteration-count: infinite; animation-fill-mode: both }`,
    ...(twice ? [] : DOTS.map((d, i) =>
      `${S}${dotSel}:nth-child(${i + 1}) { --delay: ${delays[d.key]}ms }`))
  ];
  if (twice) {
    /* Every dot runs off the same clock; when it pulses is in its own keyframes. */
    rules.push(...DOTS.map(d =>
      `${S}${dotSel}[data-key="${d.key}"] { animation-name: pulse_${d.key}${suffix} }`));
    return rules.join("\n") + "\n\n"
      + DOTS.map(d => waveKeyframes(c, `pulse_${d.key}${suffix}`, d.key)).join("\n\n");
  }
  if (!varied) {
    rules.push(`${S}${dotSel} { animation-name: scatterPulse${suffix} }`);
    return rules.join("\n") + "\n\n" + keyframes(c, "scatterPulse" + suffix);
  }
  /* Different spans mean different keyframes: one set per dot. */
  rules.push(...DOTS.map(d =>
    `${S}${dotSel}[data-key="${d.key}"] { animation-name: pulse_${d.key}${suffix} }`));
  const kf = DOTS.map(d => keyframes(c, `pulse_${d.key}${suffix}`, d.key));
  return rules.join("\n") + "\n\n" + kf.join("\n\n");
}

function markCss(c, className = "scatter-mark") {
  return `.${className} { overflow: visible; color: #fff }
.${className} .dot {
  fill: currentColor;
  transform-box: fill-box;
  transform-origin: 50% 50%;
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .${className}, .${className} .dot { animation: none !important }
}

${animCss(c, "." + className, "." + className + " .dot")}`;
}

/** Merge a preset with ?query overrides, keeping every value in range. */
function resolveConfig(id, query = {}) {
  const dashTable = { ...DASH_PRESETS, ...TRAIL_PRESETS };
  const wantsDash = dashTable[id] || query.mode === "dash" || dashTable[query.preset];
  if (wantsDash) {
    const c = { ...(dashTable[id] || dashTable[query.preset] || DASH_PRESETS.dash) };
    const map = {
      rollMs: [80, 4000, true], rollBack: [0, 90, true], rollOver: [0, 90, true],
      rollCount: [1, 12, true], dashX: [0, 8, false], dashPause: [0, 3000, true],
      dashBackMs: [120, 6000, true], dashHold: [0, 4000, true],
      dropAmt: [0, 1.2, false], dropStretch: [0, 0.6, false], liquid: [0, 1, false],
      coreBack: [0, 1.2, false], coreBackSquash: [0, 1, false], dashCentre: [0, 1, false],
      trail: [0, 24, true], trailLag: [0, 2000, true], trailGap: [-40, 40, true],
      trailRadius: [0, 12, true], trailShift: [-60, 60, false]
    };
    for (const [k, [lo, hi, round]] of Object.entries(map)) {
      const n = parseFloat(query[k]);
      if (Number.isFinite(n)) c[k] = round ? Math.round(clamp(n, lo, hi)) : clamp(n, lo, hi);
    }
    c.mode = "dash";
    return c;
  }
  const wantsSmear = SMEAR_PRESETS[id] || query.mode === "smear" || SMEAR_PRESETS[query.preset];
  const wantsDrop = DROP_PRESETS[id] || query.mode === "drop" || DROP_PRESETS[query.preset];
  const wantsRoll = wantsSmear || wantsDrop || ROLL_PRESETS[id] || query.mode === "roll"
                    || ROLL_PRESETS[query.preset];
  if (wantsRoll) {
    const table = wantsDrop ? DROP_PRESETS : wantsSmear ? SMEAR_PRESETS : ROLL_PRESETS;
    const fallback = wantsDrop ? DROP_PRESETS.drop
                   : wantsSmear ? SMEAR_PRESETS.smear : ROLL_PRESETS.roll;
    const c = { ...(table[id] || table[query.preset] || fallback) };
    const map = {
      rollMs: [80, 4000, true], rollBack: [0, 90, true], rollOver: [0, 90, true],
      rollHold: [0, 3000, true], rollCount: [1, 12, true],
      flattenCircle: [0, 0.9, false], flattenOval: [0, 0.9, false],
      dropAmt: [0, 1.2, false], dropStretch: [0, 0.6, false], liquid: [0, 1, false],
      settleMs: [0, 1500, true]
    };
    for (const [k, [lo, hi, round]] of Object.entries(map)) {
      const n = parseFloat(query[k]);
      if (Number.isFinite(n)) c[k] = round ? Math.round(clamp(n, lo, hi)) : clamp(n, lo, hi);
    }
    c.mode = wantsDrop ? "drop" : wantsSmear ? "smear" : "roll";
    return c;
  }
  const wantsCube = CUBE_PRESETS[id] || query.mode === "cube" || CUBE_PRESETS[query.preset];
  if (wantsCube) {
    const c = { ...(CUBE_PRESETS[id] || CUBE_PRESETS[query.preset] || CUBE_PRESETS.tumble) };
    const map = {
      steps: [3, 12, true], stepMs: [30, 1200, true], hop: [0, 12, false],
      squash: [0, 0.6, false], tuck: [0, 1, false], tuckMs: [0, 2000, true],
      snapMs: [60, 3000, true], cubeRest: [0, 4000, true]
    };
    for (const [k, [lo, hi, round]] of Object.entries(map)) {
      const n = parseFloat(query[k]);
      if (Number.isFinite(n)) c[k] = round ? Math.round(clamp(n, lo, hi)) : clamp(n, lo, hi);
    }
    c.mode = "cube";
    return c;
  }
  const wantsOrbit = ORBIT_PRESETS[id] || query.mode === "orbit" || ORBIT_PRESETS[query.preset];
  const base = ORBIT_PRESETS[id] || (wantsOrbit ? (ORBIT_PRESETS[query.preset] || ORBIT_PRESETS.bloom)
                                                : (PRESETS[id] || PRESETS[DEFAULT_PRESET]));
  const c = { ...base };
  if (wantsOrbit) {
    const oMap = {
      push: [0, 14], spreadMul: [0.4, 3], windup: [0, 180], turns: [1, 6], bloomMs: [0, 600],
      pushMs: [60, 4000], spinMs: [120, 6000], returnMs: [60, 4000], orbitRest: [0, 4000]
    };
    for (const [k, [lo, hi]] of Object.entries(oMap)) {
      const n = parseFloat(query[k]);
      if (Number.isFinite(n)) {
        c[k] = (k === "push" || k === "spreadMul") ? clamp(n, lo, hi) : Math.round(clamp(n, lo, hi));
      }
    }
    c.mode = "orbit";
    return c;
  }
  const num = (v, lo, hi) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? clamp(n, lo, hi) : null;
  };
  const map = {
    min:    ["min", 0.2, 0.99], dip:  ["dip", 0.1, 0.9],  over: ["over", 0, 0.3],
    pulse:  ["pulse", 120, 4000], travel: ["travel", 0, 4000],
    rest:   ["rest", 0, 4000],  fade: ["fade", 0, 0.9]
  };
  for (const [q, [key, lo, hi]] of Object.entries(map)) {
    if (query[q] != null) {
      const v = num(query[q], lo, hi);
      if (v != null) c[key] = (key === "pulse" || key === "travel" || key === "rest") ? Math.round(v) : v;
    }
  }
  const explicit = parseDelays(query.delays);
  if (explicit) c.delays = explicit;
  const spans = parseLengths(query.lengths);
  if (spans) c.lengths = spans;
  return c;
}

module.exports = { DOTS, CENTERS, RADIAL, RADIUS, PRESETS, ORBIT_PRESETS, CUBE_PRESETS,
                   ROLL_PRESETS, SMEAR_PRESETS, DROP_PRESETS, DASH_PRESETS, ELLIPSE, TAIL_DEG,
                   dashPhases, dashProgress, dashRotation, dashShift, dashSpeedAt,
                   dashPeakSpeed, dashMorphAt, dashBackPeak, dashShapeAt, dashExtent,
                   dashTravel, dashOffset, TRAIL_PRESETS, dashTrailAt, dashTrailKeyframes,
                   dashTrailReach, trailCss, markWidthCss,
                   dashKeyframes, dashSampleTimes,
                   dropPath, dropKeyframes, morphAt, rollPhases, rollRotation, rollKeyframes,
                   smearKeyframes, rollSpeedAt, rollPeakSpeed, RADIAL_DEG, SHAPE, goDeg,
                   cubePhases, cubeRotation, cubeHop, cubeSquash, cubeTuck, cubeKeyframes,
                   DEFAULT_PRESET, SAMPLES,
                   SPIN_ORIGIN, curve, offsets, waveOffsets, RING, CIRCUIT, SPOKE, timing,
                   keyframes,
                   waveKeyframes, wavePulsesTwice, orbitPhases, orbitKeyframes,
                   rotationAt, pushAt, cycleOf, animCss, markSvg, markCss, resolveConfig,
                   parseDelays, parseLengths, lengthsVary };
