/**
 * Builds dice-lab.html: a bench for deciding which of the die's dots are
 * showing at which frame.
 *
 * The delivered file draws all eight dot layers at every frame, which is why
 * it reads as see-through mid-roll. Which ones ought to be hidden, and when,
 * is a judgement call about how it looks - not something to derive - so this
 * puts every frame on screen at once with a grid to paint over.
 *
 * Nothing here writes to the animation. It produces a config, which is then
 * pasted into custom.js.
 *
 *   node build-dice-lab.js
 */
const fs = require("fs");
const custom = require("./custom.js");

const LOTTIE = fs.readFileSync("public/lottie.min.js", "utf8");
/* The die as it ships on this site: body turned white, dots turned black. */
const DATA = custom.data("dice");
const RAW = custom.raw("dice");
const FPS = RAW.fr || 30;
const LAST = Math.round((RAW.op || 0) - (RAW.ip || 0));   /* inclusive */

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dice lab &middot; which dots, when</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;background:#0b0d0f;color:#e8ebef;
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
       padding:22px 24px 60px}
  h1{margin:0 0 4px;font-size:22px;letter-spacing:-.02em}
  .sub{margin:0 0 20px;color:#8a94a0;font-size:13px;max-width:70ch;line-height:1.6}
  .cols{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}

  .stage{width:300px;height:300px;background:#000;border:1px solid #262e36;
         border-radius:12px;position:relative;flex:none}
  .stage svg{display:block;width:100%;height:100%}
  .badge{position:absolute;transform:translate(-50%,-50%);pointer-events:none;
         font:600 11px/1 ui-monospace,monospace;color:#e5a040;
         background:rgba(0,0,0,.55);border-radius:4px;padding:2px 4px}
  .stage.tint .badge{background:transparent}

  .side{flex:1;min-width:360px}
  .row{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
  label{font-size:12px;color:#98a2ae}
  button{font:500 12px/1 ui-monospace,monospace;letter-spacing:.04em;
         padding:8px 12px;border-radius:7px;border:1px solid #2a323b;
         background:#12171c;color:#c3ccd6;cursor:pointer}
  button:hover{border-color:#e5a040;color:#e5a040}
  button.on{background:#e5a040;border-color:#e5a040;color:#0b0d0f}
  input[type=range]{width:190px;accent-color:#e5a040}
  .num{font:500 12px ui-monospace,monospace;color:#e5a040;min-width:34px}

  /* the grid: a row per dot, a column per frame */
  .grid{margin-top:18px;overflow-x:auto;padding-bottom:6px}
  table{border-collapse:collapse;font:500 10px ui-monospace,monospace}
  th{color:#6b7581;font-weight:500;padding:0 0 5px;text-align:center;min-width:17px}
  th.dot{text-align:right;padding-right:9px;color:#e5a040;min-width:52px}
  td{padding:0}
  .cell{width:17px;height:22px;border:1px solid #12171c;
        cursor:pointer;display:block}
  .cell{background:#2f3a45}
  .cell.off{background:#0e1216}
  .cell.fade{background:#7a5a2a}
  tr:hover .cell{outline:0}
  .legend{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
  .chip{display:flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;
        border:1px solid #2a323b;background:#12171c;font:500 11px ui-monospace,monospace;
        color:#c3ccd6;cursor:pointer}
  .chip i{width:10px;height:10px;border-radius:50%;display:block}
  .chip.hidden{opacity:.45;text-decoration:line-through}

  /* every frame, drawn with the current settings applied */
  .strip{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px}
  .fcell{width:92px}
  .fcell .box{width:92px;height:92px;background:#000;border:1px solid #1e252c;
              border-radius:8px;overflow:hidden;cursor:pointer}
  .fcell.sel .box{border-color:#e5a040}
  .fcell .box svg{display:block;width:100%;height:100%}
  .fcell .cap{text-align:center;font:500 10px ui-monospace,monospace;color:#6b7581;padding-top:3px}

  textarea{width:100%;height:150px;margin-top:12px;background:#0e1216;color:#c3ccd6;
           border:1px solid #2a323b;border-radius:8px;padding:11px;
           font:12px/1.5 ui-monospace,monospace;resize:vertical}
</style>
</head>
<body>
<h1>Dice lab</h1>
<p class="sub">Every frame of the die, and a switch for each of its eight dot
   layers at each one. Dark cell = hidden, light = showing, amber = mid-fade.
   Click or drag across the grid to paint. The strip at the bottom redraws with
   whatever is set, so the whole roll can be judged at once rather than a
   frame at a time.</p>

<div class="cols">
  <div>
    <div class="stage" id="stage"></div>
    <div class="row" style="margin-top:10px">
      <button id="play" class="on">Pause</button>
      <label>frame</label>
      <input type="range" id="scrub" min="0" max="${LAST}" value="0" style="width:150px">
      <span class="num" id="fnum">0</span>
    </div>
    <div class="row">
      <button id="tint">Tint dots</button>
      <button id="badges" class="on">Numbers</button>
    </div>
  </div>

  <div class="side">
    <div class="row">
      <label>fade</label>
      <input type="range" id="fade" min="0" max="10" value="3">
      <span class="num" id="fadenum">3f</span>
      <span style="color:#6b7581;font-size:11px">frames to ramp in and out</span>
    </div>
    <div class="row">
      <button id="allon">All showing</button>
      <button id="reset">Reset</button>
      <button id="copy">Copy config</button>
    </div>
    <div class="legend" id="legend"></div>
    <div class="grid" id="grid"></div>
  </div>
</div>

<div class="strip" id="strip"></div>
<textarea id="out" readonly></textarea>

<script>${LOTTIE}</script>
<script>
var DATA = ${JSON.stringify(DATA)};
var FPS = ${FPS}, LAST = ${LAST}, FRAMES = LAST + 1;
var DOTS = ["01","02","03","04","05","06","07","08"];
var TINT = {"01":"#e6194b","02":"#3cb44b","03":"#4363d8","04":"#f58231",
            "05":"#911eb4","06":"#00c2c7","07":"#f032e6","08":"#ffe119"};

/* on[dot][frame] - every dot showing everywhere to begin with, which is
   exactly the file as delivered. */
var on = {};
DOTS.forEach(function (d) {
  on[d] = [];
  for (var f = 0; f < FRAMES; f++) on[d].push(true);
});
var fadeLen = 3, tinted = false, showBadges = true, playing = true, frame = 0;

/* Opacity for a dot at a frame: how far it is from the nearest hidden frame,
   over the fade length. The cycle loops, so the search wraps. */
function opacityAt(dot, f) {
  var v = on[dot];
  if (!v[f]) return 0;
  if (fadeLen <= 0) return 1;
  for (var d = 1; d <= fadeLen; d++) {
    if (!v[(f - d + FRAMES * 2) % FRAMES] || !v[(f + d) % FRAMES]) {
      var t = d / (fadeLen + 1);
      return t * t * (3 - 2 * t);
    }
  }
  return 1;
}

/* One player for the big stage, one for drawing the strip's stills. */
function build(container) {
  return lottie.loadAnimation({ container: container, renderer: "svg",
    loop: false, autoplay: false, animationData: JSON.parse(JSON.stringify(DATA)) });
}
var stage = document.getElementById("stage");
var main = build(stage);
var oven = document.createElement("div");
oven.style.cssText = "position:absolute;left:-9999px;width:92px;height:92px";
document.body.appendChild(oven);
var baker = build(oven);

function pipsOf(an) {
  var inner = an.renderer.elements[0].elements, out = {};
  inner.forEach(function (e) {
    var m = /3D_Circle_(\\d+)/.exec(e.data.nm || "");
    if (m) out[m[1]] = e.baseElement || e.layerElement;
  });
  return out;
}
var mainPips = null, bakePips = null;

function paint(an, pips, f) {
  an.goToAndStop(f, true);
  DOTS.forEach(function (d) {
    var el = pips[d];
    if (!el) return;
    el.style.opacity = opacityAt(d, f);
    if (tinted) el.querySelectorAll("path").forEach(function (p) { p.style.fill = TINT[d]; });
    else el.querySelectorAll("path").forEach(function (p) { p.style.fill = ""; });
  });
}

/* Numbered badges sit over the stage so a dot can be told from its row. */
var badgeEls = {};
function badges() {
  var host = stage.getBoundingClientRect();
  DOTS.forEach(function (d) {
    var b = badgeEls[d];
    if (!b) { b = badgeEls[d] = document.createElement("div"); b.className = "badge";
              b.textContent = d; stage.appendChild(b); }
    var el = mainPips[d];
    if (!el || !showBadges) { b.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    b.style.display = opacityAt(d, Math.round(frame)) > 0.05 ? "block" : "none";
    b.style.left = (r.x + r.width / 2 - host.x) + "px";
    b.style.top = (r.y + r.height / 2 - host.y) + "px";
  });
}

function drawStage() {
  paint(main, mainPips, Math.round(frame));
  badges();
  document.getElementById("fnum").textContent = Math.round(frame);
  document.getElementById("scrub").value = Math.round(frame);
}

/* The strip is stills: bake each frame once and clone the SVG in. */
var stripEls = [];
function buildStrip() {
  var strip = document.getElementById("strip");
  strip.innerHTML = ""; stripEls = [];
  for (var f = 0; f < FRAMES; f++) {
    var cell = document.createElement("div"); cell.className = "fcell";
    var box = document.createElement("div"); box.className = "box";
    var cap = document.createElement("div"); cap.className = "cap"; cap.textContent = "f" + f;
    cell.appendChild(box); cell.appendChild(cap); strip.appendChild(cell);
    (function (n) { cell.onclick = function () { playing = false; setPlay(); frame = n; drawStage(); markStrip(); }; })(f);
    stripEls.push({ cell: cell, box: box });
  }
}
function drawStrip() {
  for (var f = 0; f < FRAMES; f++) {
    paint(baker, bakePips, f);
    var svg = oven.querySelector("svg");
    stripEls[f].box.innerHTML = "";
    stripEls[f].box.appendChild(svg.cloneNode(true));
  }
  markStrip();
}
function markStrip() {
  stripEls.forEach(function (s, i) {
    s.cell.className = "fcell" + (i === Math.round(frame) ? " sel" : "");
  });
}

/* The grid. A row per dot, a column per frame; drag to paint. */
var painting = null;
function buildGrid() {
  var head = "<tr><th class='dot'></th>";
  for (var f = 0; f < FRAMES; f++) head += "<th>" + (f % 5 === 0 ? f : "") + "</th>";
  head += "</tr>";
  var body = "";
  DOTS.forEach(function (d) {
    body += "<tr><th class='dot'>dot " + d + "</th>";
    for (var f = 0; f < FRAMES; f++)
      body += "<td><span class='cell' data-d='" + d + "' data-f='" + f + "'></span></td>";
    body += "</tr>";
  });
  document.getElementById("grid").innerHTML = "<table>" + head + body + "</table>";

  var legend = document.getElementById("legend");
  legend.innerHTML = DOTS.map(function (d) {
    return "<span class='chip' data-d='" + d + "'><i style='background:" + TINT[d] + "'></i>dot " + d + "</span>";
  }).join("");
  legend.onclick = function (e) {
    var c = e.target.closest(".chip"); if (!c) return;
    var d = c.getAttribute("data-d");
    var anyOn = on[d].some(Boolean);
    for (var f = 0; f < FRAMES; f++) on[d][f] = !anyOn;
    refresh();
  };

  var grid = document.getElementById("grid");
  grid.onmousedown = function (e) {
    var c = e.target.closest(".cell"); if (!c) return;
    e.preventDefault();
    var d = c.getAttribute("data-d"), f = +c.getAttribute("data-f");
    painting = !on[d][f];
    on[d][f] = painting; refresh(false);
  };
  grid.onmouseover = function (e) {
    if (painting === null) return;
    var c = e.target.closest(".cell"); if (!c) return;
    on[c.getAttribute("data-d")][+c.getAttribute("data-f")] = painting;
    refresh(false);
  };
  addEventListener("mouseup", function () {
    if (painting !== null) { painting = null; drawStrip(); }
  });
}

function drawGrid() {
  document.querySelectorAll(".cell").forEach(function (c) {
    var d = c.getAttribute("data-d"), f = +c.getAttribute("data-f");
    var o = opacityAt(d, f);
    c.className = "cell" + (o === 0 ? " off" : (o < 0.99 ? " fade" : ""));
  });
  document.querySelectorAll(".chip").forEach(function (c) {
    var d = c.getAttribute("data-d");
    c.className = "chip" + (on[d].some(Boolean) ? "" : " hidden");
  });
}

/** Hidden runs per dot, which is the compact way to say it in custom.js. */
function config() {
  var out = { fade: fadeLen, fps: FPS, frames: FRAMES, hide: {} };
  DOTS.forEach(function (d) {
    var runs = [], start = null;
    for (var f = 0; f < FRAMES; f++) {
      if (!on[d][f] && start === null) start = f;
      if ((on[d][f] || f === FRAMES - 1) && start !== null) {
        runs.push([start, on[d][f] ? f - 1 : f]); start = null;
      }
    }
    if (runs.length) out.hide[d] = runs;
  });
  return out;
}

/* Grid, stage and config are cheap and go straight through. The strip is 32
   renders, so it is left until the drag ends rather than run per cell. */
function refresh(withStrip) {
  drawGrid(); drawStage();
  document.getElementById("out").value = JSON.stringify(config(), null, 2);
  if (withStrip !== false) drawStrip(); else markStrip();
}

function setPlay() { document.getElementById("play").textContent = playing ? "Pause" : "Play";
  document.getElementById("play").className = playing ? "on" : ""; }

document.getElementById("play").onclick = function () { playing = !playing; setPlay(); };
document.getElementById("scrub").oninput = function (e) {
  playing = false; setPlay(); frame = +e.target.value; drawStage(); markStrip(); };
document.getElementById("fade").oninput = function (e) {
  fadeLen = +e.target.value;
  document.getElementById("fadenum").textContent = fadeLen + "f";
  refresh(); };
document.getElementById("tint").onclick = function () {
  tinted = !tinted; this.className = tinted ? "on" : "";
  stage.classList.toggle("tint", tinted); refresh(); };
document.getElementById("badges").onclick = function () {
  showBadges = !showBadges; this.className = showBadges ? "on" : ""; badges(); };
document.getElementById("allon").onclick = function () {
  DOTS.forEach(function (d) { for (var f = 0; f < FRAMES; f++) on[d][f] = true; }); refresh(); };
document.getElementById("reset").onclick = function () {
  DOTS.forEach(function (d) { for (var f = 0; f < FRAMES; f++) on[d][f] = true; });
  fadeLen = 3; document.getElementById("fade").value = 3;
  document.getElementById("fadenum").textContent = "3f"; refresh(); };
document.getElementById("copy").onclick = function () {
  var t = document.getElementById("out"); t.select();
  try { document.execCommand("copy"); this.textContent = "Copied";
        var b = this; setTimeout(function () { b.textContent = "Copy config"; }, 1200); } catch (e) {}
};

var ready = 0;
function start() {
  if (++ready < 2) return;
  mainPips = pipsOf(main); bakePips = pipsOf(baker);
  buildGrid(); buildStrip(); refresh();
  var last = performance.now();
  (function tick(now) {
    if (playing) {
      /* A long task - redrawing the strip, say - can hand back a delta of
         hundreds of frames. Cap it, then wrap with a modulo: subtracting one
         cycle only works if the overshoot was under one cycle. */
      var dt = Math.min(now - last, 200) / 1000 * FPS;
      frame = (frame + dt) % FRAMES;
      drawStage(); markStrip();
    }
    last = now;
    requestAnimationFrame(tick);
  })(performance.now());
}
main.addEventListener("DOMLoaded", start);
baker.addEventListener("DOMLoaded", start);
</script>
</body>
</html>
`;

fs.writeFileSync("dice-lab.html", html);
console.log("dice-lab.html", (html.length / 1024).toFixed(0) + "KB",
            "-", (LAST + 1) + " frames at " + FPS + "fps");
