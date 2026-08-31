/**
 * Builds loading-screen.html: the /test route as one self-contained file.
 * The mark runs on black with nothing behind it, so the page is pure markup,
 * CSS and script and makes no external requests at all — which is what an
 * Artifact needs, and what the switcher below stays fast on.
 *
 *   node build-artifact.js
 */
const fs = require("fs");
const anim = require("./anim.js");
const custom = require("./custom.js");

/* The custom looks are files, not configs, so they cannot be turned into
   keyframes: lottie and their JSON are inlined instead. Nothing here is
   fetched at runtime, which is the whole point of this build. */
const LOTTIE = fs.readFileSync("public/lottie.min.js", "utf8");
const CUSTOM_IDS = custom.ids();

const ALL = { ...anim.PRESETS, ...anim.WAVE_PRESETS, ...anim.BUMP_PRESETS, ...anim.ORBIT_PRESETS,
              ...anim.CUBE_PRESETS, ...anim.ROLL_PRESETS, ...anim.SMEAR_PRESETS,
              ...anim.DROP_PRESETS, ...anim.DASH_PRESETS, ...anim.TRAIL_PRESETS };
const ids = Object.keys(ALL);
const allIds = ids.concat(CUSTOM_IDS);   /* panel order and the number keys */
/* Render what the server would: a preset is a delta on its mode's defaults,
   and resolveConfig is where the two meet. */
for (const id of ids) ALL[id] = anim.resolveConfig(id, {});

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
}).join(",\n")
  + ",\n" + CUSTOM_IDS.map(id => {
      const m = custom.meta(id);
      return `  ${id}: { cycle: ${m.cycle}, custom: true, label: "${m.cycle}ms cycle \\u00b7 custom \\u00b7 ${m.source.replace(/"/g, "")}" }`;
    }).join(",\n");

const html = `<title>Scatter Loading Screen</title>
<style>
  *, *::before, *::after { box-sizing: border-box }
  html, body { height: 100% }
  body {
    margin: 0; background: #000; overflow: hidden;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }

  .loader { position: fixed; inset: 0; display: grid; place-items: center; z-index: 2 }
  /* A custom look swaps the generated mark out for a lottie mount; only ever
     one of the two is in the layout. */
  .stage-lottie { display: none; width: clamp(180px, 21vw, 320px); aspect-ratio: 1 }
  .stage-lottie .scene { position: relative; width: 100%; height: 100% }
${CUSTOM_IDS.map(id => custom.motionCss(id, "body", "_" + id)).filter(Boolean).join("\n")}
  /* a look that hops is drawn smaller so its arc has somewhere to go */
${CUSTOM_IDS.filter(id => custom.mountScale(id) < 1).map(id =>
  `  body[data-custom="${id}"] .stage-lottie { width: clamp(132px, 15vw, 236px) }`).join("\n")}
  body[data-custom] .scatter-mark, body[data-custom] .scatter-mark-rig { display: none }
  body[data-custom] .stage-lottie { display: block }
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
  @media (prefers-reduced-motion: reduce) { .back { transition: none } }

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

<a class="back" id="back" href="gallery.html">&larr; Gallery</a>

<div class="loader">
  ${anim.markSvg({ ...anim.CUBE_PRESETS.tumble, trail: 4 }, "scatter-mark")}
  <div class="stage-lottie lottie" id="stage-lottie"></div>
</div>

<div class="panel" id="panel">
${allIds.map(id => `  <button data-preset="${id}" aria-pressed="${id === "pulse"}">${id}</button>`).join("\n")}
  <span class="readout" id="readout"></span>
</div>

<script>${LOTTIE}</script>
<script>
  var CUSTOM = ${JSON.stringify(custom.bundle())};
  var STILL = ${JSON.stringify(custom.stills())};   /* held on one frame; CSS moves them */
  /* Looks that need more around them than a single mark. */
  var SCENE = ${JSON.stringify(Object.fromEntries(
      CUSTOM_IDS.map(id => [id, custom.markup(id)]).filter(([, m]) => m)))};
  var META = {
${meta}
  };
  var panel = document.getElementById("panel");
  var readout = document.getElementById("readout");
  var dim;

  /* The way back only exists while the cursor is being moved. Hovering it
     keeps generating mousemove, so it cannot vanish from under the pointer. */
  var back = document.getElementById("back"), backTimer;
  addEventListener("mousemove", function () {
    back.classList.add("show");
    clearTimeout(backTimer);
    backTimer = setTimeout(function () { back.classList.remove("show"); }, 2000);
  });

  /* One player, reloaded on each switch: the JSON is already in memory, so
     rebuilding is cheap and it guarantees the look starts on frame one. */
  var mount = document.getElementById("stage-lottie"), player;
  function showCustom(id) {
    if (player) { player.destroy(); player = null; }
    if (!CUSTOM[id]) { document.body.removeAttribute("data-custom"); return; }
    document.body.setAttribute("data-custom", id);
    mount.setAttribute("data-anim", id);
    var still = STILL[id];
    /* A scene supplies its own markup; the player then goes in the mount it
       names rather than straight into the stage. */
    mount.innerHTML = SCENE[id] || "";
    var host = SCENE[id] ? mount.querySelector(".lottie") : mount;
    player = lottie.loadAnimation({
      container: host, renderer: "svg",
      loop: still === undefined, autoplay: still === undefined,
      animationData: CUSTOM[id]
    });
    if (still !== undefined) player.goToAndStop(still, true);
  }

  function select(id) {
    document.body.setAttribute("data-preset", id);
    showCustom(id);
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
    var keys = ${JSON.stringify(allIds)};
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= keys.length) select(keys[n - 1]);
  });

  var initial = (location.hash || "").slice(1);
  select(META[initial] ? initial : "track");
</script>
`;

fs.writeFileSync("loading-screen.html", html);
console.log("loading-screen.html", (html.length / 1024).toFixed(0) + "KB");
