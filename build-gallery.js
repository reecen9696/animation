/**
 * Builds gallery.html: the shortlist as one static page for the published site.
 *
 * Same module the dev server renders /gallery from, so the two cannot drift.
 * "Test on UI" points at the standalone loading screen instead of the route.
 *
 *   node build-gallery.js
 */
const fs = require("fs");
const { galleryPage } = require("./gallery.js");

const html = galleryPage(id => `loading-screen.html#${id}`)
  /* the static site has no /workbench or / routes */
  .replace('<a href="/">index</a>', '<a href="index.html">index</a>')
  .replace('<a href="/workbench">workbench</a>', '<a href="scatter-pulse.html">workbench</a>');

fs.writeFileSync("gallery.html", html);
console.log("gallery.html", (html.length / 1024).toFixed(0) + "KB");
