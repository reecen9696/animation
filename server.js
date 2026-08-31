/**
 * Zero-dependency dev server for the Scatter loading screen.
 *
 *   node server.js            # http://localhost:4173
 *   PORT=8080 node server.js
 *
 * Routes
 *   /                  index of the variants
 *   /test              loading screen, default preset
 *   /test/:id          loading screen for :id
 *                      - if :id names a preset (pulse|breathe|snap|ripple) it selects it
 *                      - otherwise :id is treated as an opaque id (game, session, round)
 *                        and the preset comes from ?preset=
 *   /gallery           the contact sheet: every look side by side
 *   /workbench         the tuning workbench
 *   /public/*          static assets
 *
 * Query overrides on /test: min, dip, over, pulse, travel, rest, fade, preset, debug
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const anim = require("./anim.js");
const custom = require("./custom.js");
const { galleryPage } = require("./gallery.js");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".csv": "text/csv; charset=utf-8"
};

const esc = s => String(s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* ---------------------------------------------------------------- pages */

const ALL_PRESETS = { ...anim.PRESETS, ...anim.WAVE_PRESETS, ...anim.BUMP_PRESETS, ...anim.ORBIT_PRESETS,
                      ...anim.CUBE_PRESETS, ...anim.ROLL_PRESETS, ...anim.SMEAR_PRESETS,
                      ...anim.DROP_PRESETS, ...anim.DASH_PRESETS, ...anim.TRAIL_PRESETS };

function loadingPage({ id, presetId, config, debug }) {
  const cycle = anim.cycleOf(config);
  const presetLinks = Object.keys(ALL_PRESETS);

  /* Debug rows differ per mode. */
  let rows;
  if (config.mode === "bump") {
    /* Every look takes its own knobs, so the panel lists whatever this one
       actually has rather than a fixed set it might not use. */
    const ms = new Set(["burstMs", "hangMs", "homeMs", "bumpRest", "thumpMs", "waveMs",
                        "springMs", "coreLead", "waveStagger", "swingMs", "travelMs",
                        "boilMs", "tickMs", "tickGap", "escHold", "coreDipMs",
                        "jellyPeriod", "jellyHalf", "jellyMs", "lagMs", "swapMs",
                        "swapHold", "eqMs", "twinkleMs", "twinkleGap", "beatMs",
                        "beatOut", "beat2", "pulseMs", "travelMs", "restMs"]);
    rows = [["look", esc(config.look)]]
      .concat(config.look === "wave" ? []
        : [["reaches", `${anim.bumpReach(config).toFixed(2)} units past the mark`]])
      .concat(Object.keys(config)
        .filter(k => k !== "mode" && k !== "look" && Number.isFinite(config[k]))
        .map(k => [k, ms.has(k) ? `${config[k]}ms` : `${config[k]}`]));
  } else if (config.mode === "dash") {
    const e = anim.dashExtent(config);
    const d = anim.dashPhases(config);
    rows = [["travel", `${config.dashX.toFixed(2)} widths`],
            ["turn", `${anim.goDeg(config)}&deg;`],
            ["roll out", `${config.rollMs}ms`],
            ["hang", `${config.dashPause}ms`],
            ["roll home", `${config.dashBackMs}ms`],
            ["rest", `${config.dashHold}ms`],
            ["home at", `${d.backEnd}ms`],
            ["needs", `${e.span.toFixed(2)}&times; width`],
            ["tail", `${Math.round(config.dropAmt * 100)}%`],
            ["liquid lag", `${Math.round(config.liquid * 100)}%`]]
      .concat(config.trail ? [["line", `${config.trail}px`],
                             ["line lag", `${config.trailLag}ms`],
                             ["reaches", `${anim.dashTrailReach(config).toFixed(2)} widths`]] : []);
  } else if (/^(roll|smear|drop)$/.test(config.mode)) {
    rows = [["turns", `${config.rollCount}`],
            ["one go", `${anim.goDeg(config)}&deg;`],
            ["spin time", `${config.rollMs}ms`],
            ["wind back", `${config.rollBack}&deg;`],
            ["over-roll", `${config.rollOver}&deg;`],
            ["rest", `${config.rollHold}ms`]]
      .concat(config.mode === "smear"
        ? [["circles", `${Math.round(config.flattenCircle * 100)}%`],
           ["ovals", `${Math.round(config.flattenOval * 100)}%`]]
        : config.mode === "drop"
        ? [["tail", `${Math.round(config.dropAmt * 100)}%`],
           ["stretch", `${Math.round(config.dropStretch * 100)}%`],
           ["liquid lag", `${Math.round(config.liquid * 100)}%`]] : []);
  } else if (config.mode === "cube") {
    const q = anim.cubePhases(config);
    rows = [["tuck in", `${config.tuckMs}ms`], ["rolls", `${config.steps}`],
            ["per roll", `${config.stepMs}ms`], ["deg per roll", `${q.stepDeg.toFixed(0)}&deg;`],
            ["hop", `${config.hop} units`], ["squash", `${Math.round(config.squash * 100)}%`],
            ["tuck", `${Math.round(config.tuck * 100)}%`],
            ["snap out", `${config.snapMs}ms`], ["rest", `${config.cubeRest}ms`],
            ["tumble ends", `${q.tumbleEnd}ms`], ["open at", `${q.snapEnd}ms`]];
  } else if (config.mode === "orbit") {
    const o = anim.orbitPhases(config);
    rows = [["push out", `${config.pushMs}ms`], ["bloom stagger", `${config.bloomMs}ms`],
            ["spin", `${config.spinMs}ms`], ["pull in", `${config.returnMs}ms`],
            ["rest", `${config.orbitRest}ms`], ["push", `${config.push} units`],
            ["wind back", `${config.windup}&deg;`], ["turn", `${config.turns * 360}&deg;`],
            ["spin starts", `${o.bloomEnd}ms`], ["spin ends", `${o.spinEnd}ms`]];
  } else {
    const { delays, starts } = anim.timing(config);
    rows = [["pulse", `${config.pulse}ms`], ["travel", `${config.travel}ms`],
            ["rest", `${config.rest}ms`], ["min scale", `${config.min}`]]
      /* a dot that pulses twice a cycle lists both starts */
      .concat(Object.keys(delays).sort((a, b) => delays[a] - delays[b])
        .map(k => [k, starts[k].map(ms => `${ms}ms`).join(" &middot; ")]));
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Loading &middot; ${esc(id || presetId)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box }
  html, body { height: 100% }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #000;
    overflow: hidden;
  }

  /* Nothing behind the mark but black: the body's own background is the whole
     stage, so the motion is judged on its own rather than against the app. */
  .loader {
    position: fixed; inset: 0;
    display: grid; place-items: center;
    z-index: 2;
  }

  ${anim.markCss(config, "scatter-mark").split("\n").map(l => "  " + l).join("\n").trim()}

  .scatter-mark {
    width: ${anim.markWidthCss(config)};
    height: auto;
    display: block;
    filter: drop-shadow(0 6px 28px rgba(0, 0, 0, .45));
  }

  /* Hint, corner debug panel: both fade out and never block the pointer. */
  .hint {
    position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%);
    z-index: 3; pointer-events: none;
    font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
    color: rgba(255, 255, 255, .5);
    background: rgba(0, 0, 0, .45); border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 14px; border-radius: 999px;
    backdrop-filter: blur(6px);
    transition: opacity .6s ease; opacity: 1;
  }
  .hint.gone { opacity: 0 }
  .hint b { color: rgba(255, 255, 255, .82); font-weight: 600 }

  /* Back to the gallery. Comes up with the cursor and goes again when it
     stills, so nothing sits over the mark while it is being watched. */
  .back {
    position: fixed; top: 18px; left: 18px; z-index: 4;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px; border-radius: 999px; text-decoration: none;
    font-size: 12px; letter-spacing: .06em; text-transform: uppercase;
    color: rgba(255, 255, 255, .72);
    background: rgba(6, 8, 10, .72); border: 1px solid rgba(255, 255, 255, .14);
    backdrop-filter: blur(10px);
    opacity: 0; pointer-events: none;
    transition: opacity .3s ease, color .15s, border-color .15s;
  }
  .back.show { opacity: 1; pointer-events: auto }
  .back:hover { color: #fff; border-color: rgba(255, 255, 255, .4) }
  .back:focus-visible { opacity: 1; pointer-events: auto;
                        outline: 2px solid #fff; outline-offset: 2px }

  .debug {
    position: fixed; top: 76px; left: 18px; z-index: 3;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px; line-height: 1.7; color: rgba(255, 255, 255, .72);
    background: rgba(6, 8, 10, .92); border: 1px solid rgba(255, 255, 255, .16);
    border-radius: 10px; padding: 12px 14px; min-width: 210px;
    backdrop-filter: blur(10px); box-shadow: 0 8px 28px rgba(0,0,0,.5);
  }
  .debug h2 { margin: 0 0 8px; font-size: 10px; letter-spacing: .14em;
              text-transform: uppercase; color: rgba(255, 255, 255, .45) }
  .debug .row { display: flex; justify-content: space-between; gap: 18px }
  .debug .row span:last-child { font-variant-numeric: tabular-nums; color: #fff }

  @media (prefers-reduced-motion: reduce) { .hint, .back { transition: none } }
</style>
</head>
<body>
  <a class="back" id="back" href="/gallery">&larr; Gallery</a>

  <div class="loader">
    ${anim.markSvg(config, "scatter-mark")}
  </div>

  <div class="hint" id="hint">
    <b>${esc(presetId)}</b> &nbsp;&middot;&nbsp; press 1&ndash;9 to compare &nbsp;&middot;&nbsp; d for detail
  </div>

  ${debug ? `<div class="debug">
    <h2>${esc(presetId)}${id && id !== presetId ? " &middot; " + esc(id) : ""}</h2>
    <div class="row"><span>cycle</span><span>${cycle}ms</span></div>
    ${rows.map(r => `<div class="row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("\n    ")}
  </div>` : ""}

<script>
  var PRESETS = ${JSON.stringify(presetLinks)};   // 1-4 pulse, 5-8 orbit
  var hint = document.getElementById("hint");
  var timer = setTimeout(function () { hint.classList.add("gone"); }, 4000);

  /* The way back only exists while the cursor is being moved. Hovering it
     keeps generating mousemove, so it cannot vanish from under the pointer. */
  var back = document.getElementById("back"), backTimer;
  addEventListener("mousemove", function () {
    back.classList.add("show");
    clearTimeout(backTimer);
    backTimer = setTimeout(function () { back.classList.remove("show"); }, 2000);
  });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= PRESETS.length) {
      location.href = "/test/" + PRESETS[n - 1] + location.search;
      return;
    }
    if (e.key === "d" || e.key === "D") {
      var u = new URL(location.href);
      if (u.searchParams.get("debug")) u.searchParams.delete("debug");
      else u.searchParams.set("debug", "1");
      location.href = u.toString();
      return;
    }
    if (e.key === "h" || e.key === "H") {
      clearTimeout(timer);
      hint.classList.toggle("gone");
    }
  });
</script>
</body>
</html>`;
}

/**
 * The same stage as loadingPage, for a look lottie draws rather than the
 * stylesheet. The chrome is identical - black, centred, a way back that comes
 * up with the cursor - so the two can be compared without the frame changing
 * around them.
 */
function customLoadingPage({ id, debug }) {
  const m = custom.meta(id);
  const rows = [["source", esc(m.source)], ["cycle", `${m.cycle}ms`],
                ["drawn by", "lottie"], ["recoloured", m.recolored ? "yes" : "no"]];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Loading &middot; ${esc(id)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box }
  html, body { height: 100% }
  body { margin: 0; background: #000; overflow: hidden;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif }
  .loader { position: fixed; inset: 0; display: grid; place-items: center; z-index: 2 }
  .stage-lottie { width: clamp(180px, 21vw, 320px); aspect-ratio: 1; position: relative }
  .stage-lottie .scene, .stage-lottie .lottie { position: relative; width: 100%; height: 100% }
  ${custom.motionCss(id, "", "_" + id) || ""}
  .back {
    position: fixed; top: 18px; left: 18px; z-index: 4;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px; border-radius: 999px; text-decoration: none;
    font-size: 12px; letter-spacing: .06em; text-transform: uppercase;
    color: rgba(255, 255, 255, .72);
    background: rgba(6, 8, 10, .72); border: 1px solid rgba(255, 255, 255, .14);
    backdrop-filter: blur(10px);
    opacity: 0; pointer-events: none;
    transition: opacity .3s ease, color .15s, border-color .15s;
  }
  .back.show { opacity: 1; pointer-events: auto }
  .back:hover { color: #fff; border-color: rgba(255, 255, 255, .4) }
  .hint {
    position: fixed; left: 50%; bottom: 34px; transform: translateX(-50%);
    z-index: 3; pointer-events: none;
    font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
    color: rgba(255, 255, 255, .5);
    background: rgba(0, 0, 0, .45); border: 1px solid rgba(255, 255, 255, .12);
    padding: 7px 14px; border-radius: 999px; backdrop-filter: blur(6px);
    transition: opacity .6s ease;
  }
  .hint.gone { opacity: 0 }
  .hint b { color: rgba(255, 255, 255, .82); font-weight: 600 }
  .debug {
    position: fixed; top: 76px; left: 18px; z-index: 3;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px; line-height: 1.7; color: rgba(255, 255, 255, .72);
    background: rgba(6, 8, 10, .92); border: 1px solid rgba(255, 255, 255, .16);
    border-radius: 10px; padding: 12px 14px; min-width: 210px;
  }
  .debug h2 { margin: 0 0 8px; font-size: 10px; letter-spacing: .14em;
              text-transform: uppercase; color: rgba(255, 255, 255, .45) }
  .debug .row { display: flex; justify-content: space-between; gap: 18px }
  .debug .row span:last-child { color: #fff }
</style>
</head>
<body>
  <a class="back" id="back" href="/gallery">&larr; Gallery</a>
  <div class="loader"><div class="stage-lottie" id="stage-box">${
    custom.markup(id) || `<div class="lottie" id="stage" data-anim="${esc(id)}"></div>`
  }</div></div>
  <div class="hint" id="hint"><b>${esc(id)}</b> &nbsp;&middot;&nbsp; custom &nbsp;&middot;&nbsp; ${m.cycle}ms</div>
  ${debug ? `<div class="debug"><h2>${esc(id)}</h2>
    ${rows.map(r => `<div class="row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("\n    ")}
  </div>` : ""}
<script src="/public/lottie.min.js"></script>
<script>
  var still = ${JSON.stringify(custom.stills()[id] === undefined ? null : custom.stills()[id])};
  var player = lottie.loadAnimation({
    container: document.querySelector("#stage-box .lottie"), renderer: "svg",
    loop: still === null, autoplay: still === null,
    animationData: ${JSON.stringify(custom.data(id))}
  });
  if (still !== null) player.goToAndStop(still, true);
  var stageMount = document.querySelector("#stage-box .lottie");
  if (stageMount) stageMount._anim = player;
${custom.driverJs('document.querySelectorAll("#stage-box .lottie[data-anim]")')}

  var hint = document.getElementById("hint");
  setTimeout(function () { hint.classList.add("gone"); }, 4000);
  var back = document.getElementById("back"), backTimer;
  addEventListener("mousemove", function () {
    back.classList.add("show");
    clearTimeout(backTimer);
    backTimer = setTimeout(function () { back.classList.remove("show"); }, 2000);
  });
</script>
</body>
</html>`;
}

function indexPage() {
  const card = ([id, c]) => {
    const cycle = anim.cycleOf(c);
    const rows = c.look === "wave"
      ? [["cycle", `${cycle}ms`], ["depth", `${Math.round(c.waveDepth * 100)}%`],
         ["travel", `${c.travelMs}ms`],
         ["dir", c.waveDir === "diag" ? "diagonal" : c.waveDir]]
      : c.mode === "bump"
      ? [["cycle", `${cycle}ms`], ["look", c.look],
         ["reaches", `${anim.bumpReach(c).toFixed(2)} units`]]
      : c.mode === "dash"
      ? [["cycle", `${cycle}ms`], ["travel", `${c.dashX.toFixed(2)} widths`],
         c.trail ? ["trail", `${c.trail}px &middot; ${c.trailLag}ms`]
                 : ["turn", `${anim.goDeg(c)}&deg;`],
         ["needs", `${anim.dashExtent(c).span.toFixed(2)}&times; width`]]
      : /^(roll|smear|drop)$/.test(c.mode)
      ? [["cycle", `${cycle}ms`], ["one go", `${anim.goDeg(c)}&deg;`],
         ["spin", `${c.rollMs}ms`],
         c.mode === "smear" ? ["squash", `${Math.round(c.flattenCircle*100)}/${Math.round(c.flattenOval*100)}%`]
         : c.mode === "drop" ? ["tail", `${Math.round(c.dropAmt*100)}%`]
                            : ["rolls", `${c.rollCount}`]]
      : c.mode === "cube"
      ? [["cycle", `${cycle}ms`], ["rolls", `${c.steps}`],
         ["per roll", `${c.stepMs}ms`], ["tuck", `${Math.round(c.tuck * 100)}%`]]
      : c.mode === "orbit"
      ? [["cycle", `${cycle}ms`], ["spin", `${c.turns * 360}&deg;`],
         ["push", `${c.push} units`], ["wind back", `${c.windup}&deg;`]]
      : [["cycle", `${cycle}ms`], ["pulse", `${c.pulse}ms`],
         ["travel", `${c.travel}ms`], ["min scale", `${c.min}`]];
    return `<a class="card" href="/test/${id}">
      <h2>${id}</h2>
      <dl>${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>
    </a>`;
  };
  const cards = Object.entries(anim.PRESETS).map(card).join("\n");
  const waveCards = Object.entries(anim.WAVE_PRESETS).map(([id, c]) =>
    card([id, anim.resolveConfig(id, {})]).replace("</dl>",
      `</dl><p class="blurb">${anim.BUMP_NOTES[id] || ""}</p>`)).join("\n");
  const bumpCards = Object.entries(anim.BUMP_PRESETS).map(([id, c]) =>
    card([id, c]).replace("</dl>",
      `</dl><p class="blurb">${anim.BUMP_NOTES[id] || ""}</p>`)).join("\n");
  const orbitCards = Object.entries(anim.ORBIT_PRESETS).map(card).join("\n");
  const cubeCards = Object.entries(anim.CUBE_PRESETS).map(card).join("\n");
  const rollCards = Object.entries(anim.ROLL_PRESETS).map(card).join("\n");
  const smearCards = Object.entries(anim.SMEAR_PRESETS).map(card).join("\n");
  const dropCards = Object.entries(anim.DROP_PRESETS).map(card).join("\n");
  const dashCards = Object.entries(anim.DASH_PRESETS).map(card).join("\n");
  const trailCards = Object.entries(anim.TRAIL_PRESETS).map(card).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scatter loading screen</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:56px 28px;background:#0b0d0f;color:#e8ebef;
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .wrap{max-width:860px;margin:0 auto}
  h1{margin:0 0 6px;font-size:30px;letter-spacing:-.02em}
  h3{margin:26px 0 12px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7c8794;
     font-weight:500}
  h3:first-of-type{margin-top:0}
  p.lede{margin:0 0 34px;color:#98a2ae;max-width:60ch;line-height:1.6}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em;
       background:#171c22;border:1px solid #262e36;border-radius:5px;padding:1px 6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px}
  .card{display:block;padding:18px;border:1px solid #262e36;border-radius:12px;
        background:#12171c;text-decoration:none;color:inherit;transition:border-color .15s,background .15s}
  .card:hover{border-color:#e5a040;background:#161c22}
  .card h2{margin:0 0 12px;font-size:15px;text-transform:capitalize;color:#e5a040}
  dl{margin:0;display:flex;flex-direction:column;gap:5px}
  dl div{display:flex;justify-content:space-between;font-size:12px}
  dt{color:#7c8794}
  dd{margin:0;font-variant-numeric:tabular-nums}
  .grid.wide{grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
  .blurb{margin:12px 0 0;padding-top:11px;border-top:1px solid #1e252c;
         font-size:12px;line-height:1.55;color:#8b96a3}
  .more{margin-top:34px;padding-top:22px;border-top:1px solid #1e252c;color:#98a2ae;
        font-size:14px;line-height:1.8}
  .more a{color:#e5a040}
</style>
</head>
<body>
<div class="wrap">
  <h1>Scatter loading screen</h1>
  <p class="lede">The mark centred on black at the size it ships at, with nothing behind it.
     Each variant is a route &mdash; open one and press a number key to flip between them
     without leaving the page.</p>
  <h3>Pulse wave</h3>
  <div class="grid">${cards}</div>
  <h3>Pulse wave II &mdash; new shapes, directions and physics for the pulse</h3>
  <div class="grid wide">${waveCards}</div>
  <h3>Bump &mdash; the dots move, rather than only scaling</h3>
  <div class="grid wide">${bumpCards}</div>
  <h3>Orbit spin</h3>
  <div class="grid">${orbitCards}</div>
  <h3>Cube tumble</h3>
  <div class="grid">${cubeCards}</div>
  <h3>Corner roll</h3>
  <div class="grid">${rollCards}</div>
  <h3>Smear</h3>
  <div class="grid">${smearCards}</div>
  <h3>Teardrop</h3>
  <div class="grid">${dropCards}</div>
  <h3>Dash &mdash; teardrop that travels</h3>
  <div class="grid">${dashCards}</div>
  <h3>Track &mdash; dash with a line under it</h3>
  <div class="grid">${trailCards}</div>
  <div class="more">
    Any other id works too &mdash; <code>/test/round-8817</code> renders the default preset for an
    opaque id, and <code>?preset=snap</code> picks a different one.<br>
    See <a href="/gallery">every look</a> side by side, tune live in the
    <a href="/workbench">workbench</a>, or override inline:
    <code>/test/pulse?min=0.9&amp;travel=900&amp;debug=1</code>
  </div>
</div>
</body>
</html>`;
}

/* --------------------------------------------------------------- server */

function serveStatic(res, urlPath) {
  const rel = decodeURIComponent(urlPath.replace(/^\/+/, ""));
  const full = path.join(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) return send(res, 403, "text/plain", "Forbidden");
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, "text/plain", "Not found");
    send(res, 200, MIME[path.extname(full).toLowerCase()] || "application/octet-stream", buf);
  });
}

function send(res, code, type, body) {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const q = Object.fromEntries(url.searchParams);

  if (p === "/") return send(res, 200, MIME[".html"], indexPage());

  if (p === "/test" || p.startsWith("/test/")) {
    const id = p === "/test" ? "" : decodeURIComponent(p.slice("/test/".length));
    /* a custom look is a file, not a config: nothing here can be tuned */
    if (custom.has(id)) {
      return send(res, 200, MIME[".html"], customLoadingPage(
        { id, debug: q.debug === "1" || q.debug === "true" }));
    }
    // :id selects a preset when it names one; otherwise it is an opaque id.
    const presetId = ALL_PRESETS[id] ? id
      : (ALL_PRESETS[q.preset] ? q.preset
        : (q.mode === "dash" ? "dash" : q.mode === "drop" ? "drop" : q.mode === "smear" ? "smear" : q.mode === "roll" ? "roll" : q.mode === "cube" ? "tumble"
          : q.mode === "orbit" ? "bloom" : anim.DEFAULT_PRESET));
    const config = anim.resolveConfig(presetId, q);
    return send(res, 200, MIME[".html"],
      loadingPage({ id, presetId, config, debug: q.debug === "1" || q.debug === "true" }));
  }

  if (p === "/gallery") return send(res, 200, MIME[".html"], galleryPage());
  if (p === "/workbench") return serveStatic(res, "/scatter-pulse.html");
  if (p.startsWith("/public/")) return serveStatic(res, p);

  send(res, 404, MIME[".html"],
    `<body style="background:#0b0d0f;color:#98a2ae;font-family:system-ui;padding:60px">
       <h1 style="color:#e8ebef">404</h1><p>Try <a style="color:#e5a040" href="/">/</a>
       or <a style="color:#e5a040" href="/test/pulse">/test/pulse</a>.</p></body>`);
}).listen(PORT, () => {
  console.log(`Scatter loading screen  ->  http://localhost:${PORT}`);
  console.log(`  /                  variants`);
  console.log(`  /test/pulse        loading screen`);
  console.log(`  /test/round-8817   opaque id, default preset`);
  console.log(`  /gallery           every look, side by side`);
  console.log(`  /workbench         tuning workbench`);
});
