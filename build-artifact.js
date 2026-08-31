/**
 * Builds loading-screen.html: the /test route as one self-contained file,
 * with the background inlined as a data URI so it can be published as an
 * Artifact (no external requests are allowed there).
 *
 *   node build-artifact.js
 */
const fs = require("fs");
const anim = require("./anim.js");

const BG = process.argv[2] || "public/background-small.jpg";
const dataUri = "data:image/jpeg;base64," + fs.readFileSync(BG).toString("base64");

const ALL = { ...anim.PRESETS, ...anim.BUMP_PRESETS, ...anim.ORBIT_PRESETS,
              ...anim.CUBE_PRESETS, ...anim.ROLL_PRESETS, ...anim.SMEAR_PRESETS,
              ...anim.DROP_PRESETS, ...anim.DASH_PRESETS, ...anim.TRAIL_PRESETS };
const ids = Object.keys(ALL);

/* Every preset's keyframes are inlined and scoped to body[data-preset], so
   switching is a class swap: no reload, no flash, no refetch. */
const blocks = ids.map(id => `/* ---- ${id} ---- */\n`
  + anim.animCss(ALL[id], ".scatter-mark", ".scatter-mark .dot", `_${id}`,
                 `body[data-preset="${id}"]`)).join("\n\n");

/* Mark size is per-look, and the rig/line markup is shared, so both switch with
   the preset rather than being baked into the markup. */
const perPreset = ids.map(id =>
  `body[data-preset="${id}"] .scatter-mark { width: ${anim.markWidthCss(ALL[id])} }`).join("\n");

const meta = ids.map(id => {
  const c = ALL[id];
  const cycle = anim.cycleOf(c);
  return c.mode === "dash"
    ? `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${anim.goDeg(c)}\\u00b0 \\u00b7 ${c.dashX.toFixed(2)} widths${c.trail ? " \\u00b7 " + c.trail + "px line" : ""}" }`
    : c.mode === "orbit"
    ? `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${c.turns * 360}\\u00b0 spin \\u00b7 ${c.push} out" }`
    : c.mode === "cube"
    ? `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${c.steps} rolls \\u00b7 ${Math.round(c.tuck * 100)}% tuck" }`
    : c.mode === "drop"
    ? `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${anim.goDeg(c)}\\u00b0 \\u00b7 tail ${Math.round(c.dropAmt * 100)}%" }`
    : c.mode === "smear"
    ? `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${anim.goDeg(c)}\\u00b0 \\u00b7 squash ${Math.round(c.flattenCircle*100)}/${Math.round(c.flattenOval*100)}%" }`
    : c.mode === "roll"
    ? `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${anim.goDeg(c)}\\u00b0 in ${c.rollMs}ms" }`
    : `  ${id}: { cycle: ${cycle}, label: "${cycle}ms cycle \\u00b7 ${c.travel}ms travel \\u00b7 min ${c.min}" }`;
}).join(",\n");

const html = `<title>Scatter Loading Screen</title>
<style>
  *, *::before, *::after { box-sizing: border-box }
  html, body { height: 100% }
  body {
    margin: 0; background: #000; overflow: hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }

  /* The app screenshot standing in for the real page underneath. */
  .backdrop {
    position: fixed; inset: 0;
    background: #000 url("${dataUri}") center top / cover no-repeat;
  }
  /* 50% black scrim between the app and the loader. */
  .scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, .5) }

  .loader { position: fixed; inset: 0; display: grid; place-items: center; z-index: 2 }
  .scatter-mark {
    width: clamp(100px, 11.4vw, 180px); height: auto; display: block;
    overflow: visible; color: #fff;
    filter: drop-shadow(0 6px 28px rgba(0, 0, 0, .45));
  }
  .scatter-mark .dot {
    fill: currentColor;
    transform-box: fill-box; transform-origin: 50% 50%;
    will-change: transform;
  }
  /* the wrapper is always present; the line only shows for looks that have one */
  .scatter-mark-rig { position: relative; display: inline-block; line-height: 0 }
  .scatter-mark-trail { display: none }

${perPreset}
  @media (prefers-reduced-motion: reduce) {
    .scatter-mark, .scatter-mark .dot { animation: none !important }
  }

${blocks}

  /* Controls sit in a corner so the simulation stays readable. */
  .panel {
    position: fixed; left: 50%; bottom: 30px; transform: translateX(-50%); z-index: 3;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px;
    padding: 5px; border-radius: 999px; max-width: calc(100vw - 32px);
    background: rgba(6, 8, 10, .62); border: 1px solid rgba(255, 255, 255, .13);
    backdrop-filter: blur(10px);
    transition: opacity .5s ease;
  }
  .panel.dim { opacity: .16 }
  .panel:hover, .panel:focus-within { opacity: 1 }
  .panel button {
    font: 500 11.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .06em; text-transform: uppercase;
    padding: 8px 11px; border: 0; border-radius: 999px; cursor: pointer;
    background: transparent; color: rgba(255, 255, 255, .62);
    transition: background .15s, color .15s;
  }
  .panel button:hover { color: #fff }
  .panel button[aria-pressed="true"] { background: #fff; color: #0b0d0f }
  .panel button:focus-visible { outline: 2px solid #fff; outline-offset: 2px }
  .readout {
    padding: 0 12px 0 8px; font: 400 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    color: rgba(255, 255, 255, .42); font-variant-numeric: tabular-nums; white-space: nowrap;
  }
</style>

<div class="backdrop"></div>
<div class="scrim"></div>
<div class="loader">
  ${anim.markSvg({ ...anim.CUBE_PRESETS.tumble, trail: 4 }, "scatter-mark")}
</div>

<div class="panel" id="panel">
${ids.map(id => `  <button data-preset="${id}" aria-pressed="${id === "pulse"}">${id}</button>`).join("\n")}
  <span class="readout" id="readout"></span>
</div>

<script>
  var META = {
${meta}
  };
  var panel = document.getElementById("panel");
  var readout = document.getElementById("readout");
  var dim;

  function select(id) {
    document.body.setAttribute("data-preset", id);
    var b = panel.querySelectorAll("button"), i;
    for (i = 0; i < b.length; i++) {
      b[i].setAttribute("aria-pressed", String(b[i].getAttribute("data-preset") === id));
    }
    readout.textContent = META[id].label;
    clearTimeout(dim);
    panel.classList.remove("dim");
    dim = setTimeout(function () { panel.classList.add("dim"); }, 3200);
  }

  panel.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) {
      var id = b.getAttribute("data-preset");
      select(id);
      /* keep the URL shareable per variant */
      try { history.replaceState(null, "", "#" + id); } catch (err) {}
    }
  });
  addEventListener("hashchange", function () {
    var id = (location.hash || "").slice(1);
    if (META[id]) select(id);
  });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var keys = ${JSON.stringify(ids)};
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= keys.length) select(keys[n - 1]);
  });

  var initial = (location.hash || "").slice(1);
  select(META[initial] ? initial : "track");
</script>
`;

fs.writeFileSync("loading-screen.html", html);
console.log("loading-screen.html", (html.length / 1024).toFixed(0) + "KB");
