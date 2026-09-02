/* ======================================================================
   assets/site.js
   Shared behaviour for every page: section banners, the index masthead,
   table scrolling, sidebar navigation and table of contents.
   ====================================================================== */

(function(){
"use strict";

var PAGES = [
  ["index.html",        "overview"],
  ["transformers.html", "transformers"],
  ["llms.html",         "llms"],
  ["cache.html",        "cache"]
];


/* ======================================================================
   Measuring the monospace column

   Banner rules must span exactly --measure. Deriving the font-size from
   the column width does not work: browsers round monospace advances to
   whole pixels, so the rule lands short at most widths. Instead the
   font-size is fixed and the character count is computed to fit.
   ====================================================================== */

// ----------------------------------------------------------------------
function charsThatFit(el){
  var cs = getComputedStyle(el);
  var probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;" +
    "font-family:" + cs.fontFamily + ";font-size:" + cs.fontSize +
    ";letter-spacing:" + cs.letterSpacing;
  probe.textContent = new Array(101).join("=");
  document.body.appendChild(probe);
  var per = probe.getBoundingClientRect().width / 100;
  document.body.removeChild(probe);

  var avail = el.getBoundingClientRect().width;
  return per > 0 ? Math.max(14, Math.floor(avail / per)) : 72;
}

// ----------------------------------------------------------------------
function pad(text, width){
  return new Array(Math.max(0, Math.floor((width - text.length) / 2)) + 1).join(" ");
}

// ----------------------------------------------------------------------
function esc(t){
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}


/* ======================================================================
   Section banners

   Each <h2> carries its title in a visually-hidden .sr span; the visible
   comment banner is generated from it, so the markup stays readable and
   the title is available to screen readers and the table of contents.
   ====================================================================== */

// ----------------------------------------------------------------------
function drawBanners(){
  document.querySelectorAll(".bannerwrap h2").forEach(function(h2){
    var sr = h2.querySelector(".sr"), art = h2.querySelector(".art");
    if (!sr || !art) return;

    var n = charsThatFit(art) - 2;                  // less the "# " gutter
    var rule = new Array(n + 1).join("=");
    var title = sr.textContent.toUpperCase();

    art.innerHTML = "# " + rule +
                    "\n#" +
                    "\n# " + pad(title, n) + "<b>" + esc(title) + "</b>" +
                    "\n#" +
                    "\n# " + rule;
  });
}


/* ======================================================================
   Index masthead, built from the JSON spec in index.html
   ====================================================================== */

// ----------------------------------------------------------------------
function drawMasthead(){
  var art  = document.getElementById("mhArt");
  var data = document.getElementById("mhData");
  if (!art || !data) return;

  var d;
  try { d = JSON.parse(data.textContent); } catch (e) { return; }

  var n = charsThatFit(art) - 2;
  var eq = new Array(n + 1).join("=");
  var dash = new Array(n + 1).join("-");

  var out = [
    "# " + eq,
    "#",
    "# " + pad(d.title, n) + "<b>" + esc(d.title) + "</b>",
    "#",
    "# " + dash,
    "# <b>" + esc(d.lead) + "</b>",
    "#"
  ];

  var w = 0;
  d.fields.forEach(function(f){ w = Math.max(w, f[0].length); });
  d.fields.forEach(function(f){
    var gap = new Array(w - f[0].length + 4).join(" ");
    out.push("# <i>" + esc(f[0]) + "</i>" + gap + "<u>" + esc(f[1]) + "</u>");
  });

  out.push("#", "# " + eq);
  art.innerHTML = out.join("\n");
}


/* ======================================================================
   Tables

   Wrapped so a wide table scrolls inside the column rather than pushing
   the page wider than --measure.
   ====================================================================== */

// ----------------------------------------------------------------------
function wrapTables(){
  document.querySelectorAll("table").forEach(function(t){
    if (t.parentNode.classList.contains("tblscroll")) return;
    var w = document.createElement("div");
    w.className = "tblscroll";
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });
}


/* ======================================================================
   Sidebar: site navigation plus a table of contents for this page
   ====================================================================== */

// ----------------------------------------------------------------------
function buildSidebar(){
  var side = document.getElementById("side");
  if (!side) return null;

  var here = location.pathname.split("/").pop() || "index.html";
  var h = '<div class="brand">llm-internals</div><nav class="pages">';
  PAGES.forEach(function(p){
    h += '<a href="' + p[0] + '"' + (p[0] === here ? ' aria-current="page"' : '') +
         '>' + p[1] + '</a>';
  });
  h += '</nav>';

  var secs = [].slice.call(document.querySelectorAll(".bannerwrap"));
  if (secs.length){
    h += '<div class="lab">on this page</div><nav class="toc">';
    secs.forEach(function(w, i){
      if (!w.id) w.id = "sec-" + i;
      var sr = w.querySelector(".sr");
      h += '<a href="#' + w.id + '">' + (sr ? sr.textContent : "section") + '</a>';
    });
    h += '</nav>';
  }
  side.innerHTML = h;

  // --- highlight whichever section is currently in view
  var links = [].slice.call(side.querySelectorAll(".toc a"));
  if (!links.length) return null;

  var ticking = false;
  function spy(){
    ticking = false;
    var y = window.scrollY + 130, idx = -1;
    secs.forEach(function(s, i){ if (s.offsetTop <= y) idx = i; });
    links.forEach(function(a, i){ a.classList.toggle("on", i === idx); });
  }
  window.addEventListener("scroll", function(){
    if (!ticking){ ticking = true; requestAnimationFrame(spy); }
  }, {passive:true});
  spy();
  return spy;
}


/* ======================================================================
   Entry point
   ====================================================================== */

function layout(){
  drawBanners();
  drawMasthead();
}

layout();
wrapTables();
var spy = buildSidebar();

// Rules are measured in pixels, so rebuild them whenever the column
// changes width: resize, orientation change, or the webfont arriving.
var timer;
window.addEventListener("resize", function(){
  clearTimeout(timer);
  timer = setTimeout(function(){ layout(); if (spy) spy(); }, 120);
}, {passive:true});

if (document.fonts && document.fonts.ready){
  document.fonts.ready.then(function(){ layout(); if (spy) spy(); });
}

})();
