/**
 * Builds index.html: the landing page for the published site.
 * Generated from anim.js so the variant list can never drift.
 *
 *   node build-site.js
 */
const fs = require("fs");
const anim = require("./anim.js");
const custom = require("./custom.js");

const GROUPS = [
  { name: "Pulse",   blurb: "A wave crossing the mark on the top-left to bottom-right diagonal.", set: anim.PRESETS },
  { name: "Pulse II",blurb: "New shapes, directions and physics for the pulse: grows, double-beats, springs, wind-ups, collisions, tides and echoes.", set: anim.WAVE_PRESETS },
  { name: "Bump",    blurb: "Ten looks that move the dots rather than only scaling them: bursts, impacts, wobbles and running idles.", set: anim.BUMP_PRESETS },
  { name: "Orbit",   blurb: "The outer dots bloom away from the core, the mark winds back and spins.", set: anim.ORBIT_PRESETS },
  { name: "Cube",    blurb: "A GameCube-style tumble: tuck in, roll end over end, snap open.", set: anim.CUBE_PRESETS },
  { name: "Roll",    blurb: "One continuous 240° spin with a wind-up and an overshoot.", set: anim.ROLL_PRESETS },
  { name: "Smear",   blurb: "The roll, with the outer dots flattening along their travel.", set: anim.SMEAR_PRESETS },
  { name: "Teardrop",blurb: "The roll, with every dot morphing into a teardrop as the spin picks up.", set: anim.DROP_PRESETS },
  { name: "Dash",    blurb: "The teardrop, but the mark travels: it rolls off to the right at speed, hangs, then rolls slowly home.", set: anim.DASH_PRESETS },
  { name: "Track",   blurb: "The dash on a smaller mark, rolled further, with a line trailing under it on the way out.", set: anim.TRAIL_PRESETS }
];

/* Custom looks are authored elsewhere and arrive as Lottie, so they have no
   config to summarise - their card carries the source file and the length
   read off it instead. */
const CUSTOM_GROUP = {
  name: "Custom",
  blurb: "Animations authored outside this repo and shipped as Lottie JSON, "
       + "played rather than generated. Drop a file in custom/ to add one."
};

const summarise = c => {
  const cycle = anim.cycleOf(c);
  if (c.mode === "dash")  return `${cycle}ms &middot; ${anim.goDeg(c)}&deg; &middot; ${c.dashX.toFixed(2)} widths`;
  if (c.mode === "drop")  return `${cycle}ms &middot; tail ${Math.round(c.dropAmt * 100)}%`;
  if (c.mode === "smear") return `${cycle}ms &middot; squash ${Math.round(c.flattenCircle * 100)}%`;
  if (c.mode === "roll")  return `${cycle}ms &middot; ${anim.goDeg(c)}&deg;`;
  if (c.mode === "cube")  return `${cycle}ms &middot; ${c.steps} rolls`;
  if (c.mode === "orbit") return `${cycle}ms &middot; ${c.turns * 360}&deg; spin`;
  return `${cycle}ms &middot; ${c.pulse}ms pulse`;
};

const customSection = `
    <section class="group">
      <h2>${CUSTOM_GROUP.name}</h2>
      <p class="blurb">${CUSTOM_GROUP.blurb}</p>
      <div class="chips">
        ${custom.ids().map(id => {
          const m = custom.meta(id);
          return `<a class="chip" href="loading-screen.html#${id}"><b>${id}</b>`
               + `<span>${m.cycle}ms &middot; lottie</span></a>`;
        }).join("\n        ")}
      </div>
    </section>`;

const groups = GROUPS.map(g => `
    <section class="group">
      <h2>${g.name}</h2>
      <p class="blurb">${g.blurb}</p>
      <div class="chips">
        ${Object.keys(g.set).map(id =>
          `<a class="chip" href="loading-screen.html#${id}"><b>${id}</b><span>${summarise(g.set[id])}</span></a>`
        ).join("\n        ")}
      </div>
    </section>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scatter mark &mdash; motion study</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..800&family=Newsreader:opsz,wght@6..72,300..500&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  :root{
    --ground:#E9ECEF; --surface:#F7F9FB; --surface-2:#FFFFFF;
    --ink:#13171C; --ink-2:#4B545F; --ink-3:#7D8794;
    --line:#D4DAE1; --line-2:#E4E9EE; --accent:#B4682A; --on-accent:#fff;
    --shadow:0 1px 2px rgba(19,23,28,.05), 0 10px 28px -16px rgba(19,23,28,.28);
  }
  @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
    --ground:#0D1013; --surface:#141A1F; --surface-2:#1A2128;
    --ink:#E7EBEF; --ink-2:#A3ADB9; --ink-3:#6D7883;
    --line:#252D35; --line-2:#1E252C; --accent:#E5A040; --on-accent:#141A1F;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 14px 34px -18px rgba(0,0,0,.7);
  }}
  :root[data-theme="dark"]{
    --ground:#0D1013; --surface:#141A1F; --surface-2:#1A2128;
    --ink:#E7EBEF; --ink-2:#A3ADB9; --ink-3:#6D7883;
    --line:#252D35; --line-2:#1E252C; --accent:#E5A040; --on-accent:#141A1F;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 14px 34px -18px rgba(0,0,0,.7);
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);
       font-family:"Archivo","Helvetica Neue",Arial,sans-serif;font-size:15px;line-height:1.5;
       -webkit-font-smoothing:antialiased}
  .wrap{max-width:960px;margin:0 auto;padding:clamp(28px,5vw,60px) clamp(16px,4vw,32px) 72px}
  .eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.16em;
           text-transform:uppercase;color:var(--accent);margin-bottom:10px}
  h1{margin:0;font-size:clamp(34px,5.4vw,54px);font-weight:700;line-height:.95;
     font-variation-settings:"wdth" 115;letter-spacing:-.025em}
  .lede{font-family:"Newsreader",Georgia,serif;font-size:17px;line-height:1.55;
        color:var(--ink-2);max-width:56ch;margin:14px 0 0}
  .tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:34px 0 8px}
  .tool{display:block;padding:20px;border:1px solid var(--line);border-radius:14px;
        background:var(--surface);box-shadow:var(--shadow);text-decoration:none;color:inherit;
        transition:border-color .15s}
  .tool:hover{border-color:var(--accent)}
  .tool h3{margin:0 0 6px;font-size:17px}
  .tool p{margin:0;font-size:13.5px;color:var(--ink-2);line-height:1.5}
  .group{margin-top:38px}
  .group h2{margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
            color:var(--ink-3);font-family:"JetBrains Mono",monospace;font-weight:500}
  .blurb{margin:8px 0 14px;font-family:"Newsreader",Georgia,serif;font-size:15.5px;
         color:var(--ink-2);max-width:60ch}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{display:flex;flex-direction:column;gap:3px;padding:10px 14px;border-radius:10px;
        border:1px solid var(--line);background:var(--surface-2);text-decoration:none;
        color:inherit;transition:border-color .15s,background .15s}
  .chip:hover{border-color:var(--accent)}
  .chip b{font-family:"JetBrains Mono",monospace;font-size:12.5px;font-weight:500;text-transform:capitalize}
  .chip span{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--ink-3);
             font-variant-numeric:tabular-nums}
  footer{margin-top:52px;padding-top:22px;border-top:1px solid var(--line-2);
         font-size:13.5px;color:var(--ink-3);line-height:1.8}
  footer a{color:var(--accent)}
  a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style>
</head>
<body>
<div class="wrap">
  <div class="eyebrow">Motion study &middot; navbar mark</div>
  <h1>Scatter mark</h1>
  <p class="lede">${GROUPS.length + 1} ways to animate the seven-dot mark, each shown on black at the
     size it ships at, with nothing behind it. Every variant below is a direct link.</p>

  <div class="tools">
    <a class="tool" href="loading-screen.html">
      <h3>Loading screen &rarr;</h3>
      <p>All ${GROUPS.reduce((n, g) => n + Object.keys(g.set).length, 0) + custom.ids().length} variants on black, with a switcher. Press 1&ndash;9 to compare.</p>
    </a>
    <a class="tool" href="gallery.html">
      <h3>Shortlist &rarr;</h3>
      <p>The looks worth comparing, side by side and running at their real timing.</p>
    </a>
    <a class="tool" href="scatter-pulse.html">
      <h3>Workbench &rarr;</h3>
      <p>Tune every parameter live, retime dots by hand, save looks, and copy drop-in CSS.</p>
    </a>
  </div>
${groups}
${customSection}

  <footer>
    Built as plain HTML, CSS and vanilla JavaScript &mdash; no framework, no build step.
    The animation is generated CSS <code>@keyframes</code>, so it runs on the compositor.<br>
    Source: <a href="https://github.com/reecen9696/animation">github.com/reecen9696/animation</a>
  </footer>
</div>
</body>
</html>
`;

fs.writeFileSync("index.html", html);
console.log("index.html", (html.length / 1024).toFixed(1) + "KB");
