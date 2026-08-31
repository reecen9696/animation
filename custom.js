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
 * `recolor` maps a source colour to the one the site should draw instead, as
 * "#RRGGBB" keys. The stage here is black and the mark is white, so a file
 * authored for a light background has to be turned round or half of it
 * disappears into the background. `hide` drops whole layers by name prefix.
 * The files on disk are never touched - both happen on the way out, so the
 * original stays the reference and two looks can share one file.
 */
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

/** The animation as the site should draw it: ready to hand to lottie. */
function data(id) {
  const d = raw(id);
  if (CUSTOM[id].recolor) applyRecolor(d, CUSTOM[id].recolor);
  if (CUSTOM[id].hide) applyHide(d, CUSTOM[id].hide);
  return d;
}

/** How long one loop runs, in ms, read off the file rather than declared. */
function cycleOf(id) {
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

module.exports = { CUSTOM, ids, has, raw, data, cycleOf, meta, bundle, DIR };
