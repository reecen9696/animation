/**
 * The contact sheet: every look, side by side, five across.
 *
 * Shared by the dev server (/gallery) and the static build (gallery.html) so the
 * two cannot drift. The only difference between them is where "Test loading"
 * points, which the caller supplies.
 */
const anim = require("./anim.js");

const esc = s => String(s).replace(/[&<>"']/g, ch =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

/* The gallery: every look worth comparing, side by side, each with a way
   through to the real loading screen. One titled row per family, five across,
   so a family can be taken in whole and its members compared against each
   other before being compared across the page. The title carries the family
   name, so the cards below it no longer repeat it. */
const GALLERY = [
  { mode: "Pulse wave",
    ids: ["pulse", "snap", "blink", "ripple", "around", "bounce", "ebb",
          "circuit", "spoke"] },
  { mode: "Pulse wave II",
    ids: ["swell", "drum", "elastic", "windup", "rain", "emanate", "collapse",
          "crossfire", "tide", "doppler", "echo"] },
  { mode: "Bump",
    ids: ["scatter", "shockwave", "cradle", "jelly", "heartbeat",
          "boil", "escapement", "swap", "equalizer", "twinkle",
          "glide", "fathom", "servo", "scan", "float"] },
  { mode: "Orbit spin", ids: ["bloom", "snappy"] },
  { mode: "Corner roll", ids: ["thud"] },
  { mode: "Smear", ids: ["smear", "hard"] },
  { mode: "Teardrop", ids: ["ink"] },
  { mode: "Dash", ids: ["dash"], wide: true },
  { mode: "Track", ids: ["track"], wide: true }
];

function galleryPage(testHref = id => `/test/${encodeURIComponent(id)}`) {
  /* Each cell gets its own scope and keyframe suffix, so every animation on
     the page can share one stylesheet without colliding. */
  const css = [];
  const rows = GALLERY.map(group => ({
    mode: group.mode,
    cells: group.ids.map(id => {
      const c = anim.resolveConfig(id, {});
      const sfx = "_" + id.replace(/[^a-z0-9]/gi, "");
      css.push(anim.animCss(c, ".mark", ".mark .dot", sfx, `#c-${id}`));
      return { id, config: c };
    })
  }));

  /* The look as it would actually ship: a real button, at the real height, with
     the mark standing in for its loading state. `Bet` swaps its label for the
     mark for a second; `Autobet` runs it alongside the label until it is
     stopped. Both reuse the card's own animation - the SVG carries the same
     class the keyframes are scoped to, so it cannot drift from the big one. */
  const uiButtons = config => {
    const spin = anim.markSvg({ ...config, trail: 0 }, "mark");
    return `
        <div class="ui">
          <button class="ui-btn" type="button" data-role="bet" aria-label="Bet">
            <span class="ui-spin" aria-hidden="true">${spin}</span>
            <span class="ui-text">Bet</span>
          </button>
          <button class="ui-btn" type="button" data-role="auto">
            <span class="ui-spin" aria-hidden="true">${spin}</span>
            <span class="ui-text">Start Autobet</span>
          </button>
        </div>`;
  };

  const card = ({ id, config }) => {
    /* The row heading names the family, so the card only has to name the look.
       It sits above the stage: the eye finds the name before the motion, and
       every card below a heading then reads top-down in the same order. */
    const name = `<h3 class="name">${esc(id)}</h3>`;
    if (config.mode === "dash") {
      /* Travel is a percentage of the mark's own width, so the band that holds
         it is sized in mark widths too and the two can never drift apart. The
         cell is only two columns wide, so here the mark is sized off the band
         rather than the other way round. */
      const e = anim.dashExtent(config);
      return `
      <article class="cell wide" id="c-${id}">
        ${name}
        <div class="stage band-stage"
             style="--span:${e.span.toFixed(4)};--lead:${e.lead.toFixed(4)}">
          <div class="band" data-note="${e.span.toFixed(2)}&times; the mark">
            ${anim.markSvg(config, "mark")}
          </div>
        </div>
        ${uiButtons(config)}
        <a class="btn" href="${esc(testHref(id))}">Test loading</a>
      </article>`;
    }
    return `
      <article class="cell" id="c-${id}">
        ${name}
        <div class="stage">${anim.markSvg(config, "mark")}</div>
        ${uiButtons(config)}
        <a class="btn" href="${esc(testHref(id))}">Test loading</a>
      </article>`;
  };

  /* Each family is its own heading and its own grid, so a row never runs on
     into the next one and the five-across rhythm restarts at every title. */
  const sections = rows.map(row => `
  <section class="row">
    <h2>${esc(row.mode)} <span>${row.cells.length}</span></h2>
    <div class="grid">${row.cells.map(card).join("\n")}
    </div>
  </section>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scatter Logo Animation</title>
<style>
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:56px 28px 80px;background:#0b0d0f;color:#e8ebef;
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  .wrap{max-width:1340px;margin:0 auto;--mw:96px}
  h1{margin:0 0 34px;font-size:30px;letter-spacing:-.02em}

  .row{margin-bottom:44px}
  .row h2{display:flex;align-items:center;gap:10px;margin:0 0 14px;
          font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
          color:#e5a040}
  .row h2::after{content:"";flex:1;height:1px;background:#1e252c}
  .row h2 span{font-weight:400;letter-spacing:.04em;color:#6b7581;
               font-variant-numeric:tabular-nums}

  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  @media (max-width:1080px){.grid{grid-template-columns:repeat(3,1fr)}}
  @media (max-width:820px){.grid{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:540px){.grid{grid-template-columns:1fr}
                           .cell.wide{grid-column:span 1}}

  /* Black ground, border kept: the same background the mark gets on the real
     loading screen, so nothing here flatters it. */
  .cell{border:1px solid #262e36;border-radius:14px;background:#000;
        overflow:hidden;display:flex;flex-direction:column}
  .stage{aspect-ratio:4/3;flex:none;display:grid;place-items:center;background:#000}
  .cell.wide{grid-column:span 2}
  .band-stage{aspect-ratio:auto;min-height:188px;padding:16px}
  .band{position:relative;width:100%;
        display:flex;justify-content:flex-start;padding:16px 0;
        outline:1px dashed rgba(229,160,64,.3);border-radius:12px}
  .band .mark{width:calc(100% / var(--span))}
  .band > *{margin-left:calc(var(--lead) / var(--span) * 100%)}
  .band::after{content:attr(data-note);position:absolute;top:-7px;right:12px;
               padding:0 7px;background:#000;font-size:10px;letter-spacing:.1em;
               text-transform:uppercase;color:#a5762f}

  .name{margin:0;padding:13px 14px 11px;font-size:14px;font-weight:600;
        text-transform:capitalize;color:#e5a040}

  /* The shipping button, at the height it ships at. Overflow is clipped
     because a travelling look (dash, track) walks its mark clean out of a
     54px box - which is itself worth seeing. The block's margin-top is auto so
     it hangs off the bottom however tall the stage above it turns out. */
  .ui{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding:14px 14px 10px}
  .ui-btn{display:flex;align-items:center;justify-content:center;gap:10px;
          width:100%;height:54px;padding:0 14px;border:0;border-radius:6px;
          overflow:hidden;cursor:pointer;font:600 15px/1 inherit;color:#fff;
          background:#FF4D41;transition:background .12s}
  .ui-btn:hover{background:#FF8279}
  /* Selected beats hover: a button that is mid-bet or running autobet stays
     pressed-dark, so the state is legible with the cursor sitting on it. */
  .ui-btn.loading,.ui-btn.on,.ui-btn:active{background:#B3362D}
  .ui-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
  .ui-spin{display:none;flex:none;line-height:0}
  .ui-btn .mark{width:22px;filter:none}
  /* Bet swaps its label out; autobet keeps it and runs the mark to its left. */
  .ui-btn.loading .ui-text{display:none}
  .ui-btn.loading .ui-spin,.ui-btn.on .ui-spin{display:block}
  .meta h3{margin:0;font-size:14px;text-transform:capitalize;color:#e5a040}
  .meta span{font-size:10px;letter-spacing:.04em;text-transform:uppercase;
             color:#6b7581;text-align:right;flex:none}
  .btn{display:block;margin:0 14px 14px;margin-top:auto;padding:9px 12px;border-radius:8px;
       border:1px solid #2a323b;text-align:center;text-decoration:none;
       font-size:12px;letter-spacing:.06em;text-transform:uppercase;
       color:#c3ccd6;background:#0e1216;transition:border-color .15s,color .15s,background .15s}
  .btn:hover{border-color:#e5a040;color:#e5a040;background:#161c22}

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
  <h1>Scatter Logo Animation</h1>
${sections}
  <div class="more">
    Every look on this page has a card on the <a href="/">index</a> with its
    numbers; tune new ones in the <a href="/workbench">workbench</a>.
  </div>
</div>
<script>
  /* One listener for the whole page: the cards are identical, so the only
     thing that varies is which button was hit. Both states are a class - the
     mark is display:none until then, and an element that has just stopped
     being display:none starts its animation from the top, so the spin always
     begins on frame one rather than wherever the clock happened to be. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".ui-btn");
    if (!b) return;
    if (b.getAttribute("data-role") === "bet") {
      if (b.classList.contains("loading")) return;
      b.classList.add("loading");
      b.setAttribute("aria-busy", "true");
      setTimeout(function () {
        b.classList.remove("loading");
        b.removeAttribute("aria-busy");
      }, 1000);
      return;
    }
    var on = b.classList.toggle("on");
    b.querySelector(".ui-text").textContent = on ? "Stop Autobet" : "Start Autobet";
  });
</script>
</body>
</html>`;
}

module.exports = { galleryPage, GALLERY };
