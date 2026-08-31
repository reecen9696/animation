/**
 * Builds gallery.html: the contact sheet as one static page for the published site.
 *
 * Same module the dev server renders /gallery from, so the two cannot drift.
 * "Test on UI" points at the standalone loading screen instead of the route.
 *
 *   node build-gallery.js
 */
const fs = require("fs");
const { galleryPage } = require("./gallery.js");

/* The two files deploy together but cache separately, and a fresh gallery
   opening a stale loading screen sends every new look to the fallback. A
   build stamp on the link forces the pair to move in step. */
const V = Date.now().toString(36);
const html = galleryPage(id => `loading-screen.html?v=${V}#${id}`)
  /* the static site has no /workbench or / routes */
  .replace('<a href="/">index</a>', '<a href="index.html">index</a>')
  .replace('<a href="/workbench">workbench</a>', '<a href="scatter-pulse.html">workbench</a>');

fs.writeFileSync("gallery.html", html);
console.log("gallery.html", (html.length / 1024).toFixed(0) + "KB");
