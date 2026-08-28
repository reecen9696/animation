/**
 * The shortlist page: every look worth comparing, side by side.
 *
 * Shared by the dev server (/gallery) and the static build (gallery.html) so the
 * two cannot drift. The only difference between them is where "Test on UI"
 * points, which the caller supplies.
 */
const anim = require("./anim.js");

const esc = s => String(s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* The gallery: every look worth comparing, side by side, each with a way
   through to the real loading screen. Grouped by mode, three across. */
const GALLERY = [
  { mode: "Pulse wave",
    ids: ["pulse", "snap", "ripple", "around", "bounce", "circuit", "spoke"] },
  { mode: "Orbit spin", ids: ["bloom", "snappy"] },
  { mode: "Corner roll", ids: ["thud"] },
  { mode: "Smear", ids: ["smear", "hard"] },
  { mode: "Teardrop", ids: ["ink"] },
  { mode: "Dash", ids: ["dash"], wide: true },
  { mode: "Track", ids: ["track"], wide: true }
];

function galleryPage(testHref = id => `/test/${encodeURIComponent(id)}`) {
  /* Each cell gets its own scope and keyframe suffix, so eight animations
     can share one stylesheet without colliding. */
  const cells = [], css = [];
  for (const group of GALLERY) {
    for (const id of group.ids) {
      const c = anim.resolveConfig(id, {});
      const sfx = "_" + id.replace(/[^a-z0-9]/gi, "");
      css.push(anim.animCss(c, ".mark", ".mark .dot", sfx, `#c-${id}`));
      cells.push({ id, group, config: c, cycle: anim.cycleOf(c) });
    }
  }

  const card = ({ id, config, cycle }) => {
    if (config.mode === "dash") {
      /* Travel is a percentage of the mark's own width, so the band that holds
         it is sized in mark widths too and the two can never drift apart. */
      const e = anim.dashExtent(config);
      return `
      <article class="cell wide" id="c-${id}">
        <div class="stage band-stage"
             style="--span:${e.span.toFixed(4)};--lead:${e.lead.toFixed(4)}">
          <div class="band" data-note="${e.span.toFixed(2)}&times; the mark">
            ${anim.markSvg(config, "mark")}
          </div>
        </div>
        <div class="meta"><h3>${esc(id)}</h3><span>${cycle}ms</span></div>
        <a class="btn" href="${esc(testHref(id))}">Test on UI</a>
      </article>`;
    }
    return `
      <article class="cell" id="c-${id}">
        <div class="stage">${anim.markSvg(config, "mark")}</div>
        <div class="meta"><h3>${esc(id)}</h3><span>${cycle}ms</span></div>
        <a class="btn" href="${esc(testHref(id))}">Test on UI</a>
      </article>`;
  };

  const sections = GALLERY.map(g => `
      <h2 class="group">${esc(g.mode)}</h2>
      ${g.ids.map(id => card(cells.find(x => x.id === id))).join("\n")}`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scatter mark &middot; the shortlist</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:56px 28px 80px;background:#0b0d0f;color:#e8ebef;
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .wrap{max-width:940px;margin:0 auto;--mw:96px}
  h1{margin:0 0 30px;font-size:30px;letter-spacing:-.02em}

  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
  @media (max-width:820px){.grid{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:540px){.grid{grid-template-columns:1fr}}

  .group{grid-column:1/-1;margin:22px 0 0;font-size:11px;letter-spacing:.14em;
         text-transform:uppercase;color:#7c8794;font-weight:500;
         display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
  .group:first-of-type{margin-top:0}

  .cell{border:1px solid #262e36;border-radius:14px;background:#12171c;overflow:hidden}
  .stage{aspect-ratio:4/3;display:grid;place-items:center;
         background:radial-gradient(120% 90% at 50% 40%,#191f26 0%,#0f1419 100%)}
  .cell.wide{grid-column:1/-1}
  .band-stage{aspect-ratio:auto;min-height:210px;padding:20px}
  .band{position:relative;width:calc(var(--span) * var(--mw));
        display:flex;justify-content:flex-start;padding:16px 0;
        outline:1px dashed rgba(229,160,64,.3);border-radius:12px}
  .band > *{margin-left:calc(var(--lead) * var(--mw))}
  .band::after{content:attr(data-note);position:absolute;top:-7px;right:12px;
               padding:0 7px;background:#141a20;font-size:10px;letter-spacing:.1em;
               text-transform:uppercase;color:#a5762f}

  .meta{display:flex;justify-content:space-between;align-items:baseline;
        padding:12px 14px 0}
  .meta h3{margin:0;font-size:14px;text-transform:capitalize;color:#e5a040}
  .meta span{font-size:11px;color:#7c8794;font-variant-numeric:tabular-nums}
  .btn{display:block;margin:10px 14px 14px;padding:9px 12px;border-radius:8px;
       border:1px solid #2a323b;text-align:center;text-decoration:none;
       font-size:12px;letter-spacing:.06em;text-transform:uppercase;
       color:#c3ccd6;background:#171d24;transition:border-color .15s,color .15s,background .15s}
  .btn:hover{border-color:#e5a040;color:#e5a040;background:#1c232b}

  /* Shared mark styling; the per-cell rules below drive the motion. */
  .mark{width:var(--mw);height:auto;display:block;overflow:visible;color:#fff;
        filter:drop-shadow(0 4px 18px rgba(0,0,0,.5))}
  .mark .dot{fill:currentColor;transform-box:fill-box;transform-origin:50% 50%;
             will-change:transform}
  @media (prefers-reduced-motion:reduce){
    .mark,.mark .dot{animation:none !important}
  }

  .more{margin-top:38px;padding-top:22px;border-top:1px solid #1e252c;color:#98a2ae;
        font-size:14px;line-height:1.8}
  .more a{color:#e5a040}

${css.join("\n\n")}
</style>
</head>
<body>
<div class="wrap">
  <h1>Scatter mark &middot; the shortlist</h1>
  <div class="grid">${sections}
  </div>
  <div class="more">
    All the variants live on the <a href="/">index</a>; tune new ones in the
    <a href="/workbench">workbench</a>.
  </div>
</div>
</body>
</html>`;
}

module.exports = { galleryPage, GALLERY };
