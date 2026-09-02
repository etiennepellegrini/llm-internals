/* ======================================================================
   assets/cache.js
   Interactive figures for cache.html
   ====================================================================== */

(function(){
"use strict";

/* ==================================================================== */
/* number formatting                                                     */
/* ==================================================================== */
var fmtN = function(n){ return Math.round(n).toLocaleString(); };
var usd = function(v){
  if (v >= 100) return "$" + v.toFixed(0);
  if (v >= 1)   return "$" + v.toFixed(2);
  return "$" + v.toFixed(3);
};

/* ==================================================================== */
/* divergence strip                                                      */
/* ==================================================================== */
var TOTAL = 14000, BASE = 5, READ = 0.5, WRITE5 = 6.25;
var dv = document.getElementById("div");
function drawStrip(){
  var d = +dv.value, reuse = d, fresh = TOTAL - d;
  document.getElementById("divV").textContent = "token " + fmtN(d) + " of " + fmtN(TOTAL);
  var s = document.getElementById("stripA");
  s.innerHTML = "";
  if (reuse > 0){
    var a = document.createElement("div");
    a.style.cssText = "flex:" + reuse + ";background:#2C7A57";
    a.textContent = reuse/TOTAL > .16 ? "reused \u00b7 " + fmtN(reuse) : "";
    s.appendChild(a);
  }
  if (fresh > 0){
    var b = document.createElement("div");
    b.style.cssText = "flex:" + fresh + ";background:#A34E19";
    b.textContent = fresh/TOTAL > .16 ? "redone \u00b7 " + fmtN(fresh) : "";
    s.appendChild(b);
  }
  var cached = (reuse*READ + fresh*WRITE5)/1e6, plain = (TOTAL*BASE)/1e6;
  document.getElementById("stripStat").innerHTML =
    "this call: <b>" + usd(cached) + "</b> vs <b>" + usd(plain) +
    "</b> with no caching &#183; saving <b>" + Math.round((1-cached/plain)*100) + "%</b>";
}
dv.addEventListener("input", drawStrip);
drawStrip();

/* ==================================================================== */
/* TTL simulator                                                         */
/* ==================================================================== */
var SIM_PFX = 30000, TTL = 300, SPAN = 1500;
var now = 0, expiry = -1, cost = 0, reads = 0, writes = 0, warms = [], events = [];

function simDraw(){
  var tl = document.getElementById("tl");
  tl.querySelectorAll(".warm,.ev,.now").forEach(function(e){ e.remove(); });
  var pct = function(t){ return (Math.min(t,SPAN)/SPAN*100) + "%"; };
  warms.forEach(function(w){
    var d = document.createElement("div");
    d.className = "warm";
    d.style.left = pct(w.start);
    d.style.width = ((Math.min(w.end,SPAN) - w.start)/SPAN*100) + "%";
    tl.appendChild(d);
  });
  events.forEach(function(e){
    var d = document.createElement("div");
    d.className = "ev " + (e.hit ? "hit" : "miss");
    d.style.left = pct(e.t);
    tl.appendChild(d);
  });
  var n = document.createElement("div");
  n.className = "now"; n.style.left = pct(now);
  tl.appendChild(n);

  var live = now < expiry;
  document.getElementById("simState").innerHTML =
    "clock <b>" + Math.floor(now/60) + "m " + (now%60) + "s</b> &#183; cache " +
    (live ? '<b style="color:#2C7A57">warm</b>, expires in <b>' + Math.max(0,Math.round(expiry-now)) + "s</b>"
          : '<b style="color:#9E2B45">cold</b>');
  document.getElementById("simCost").innerHTML =
    "<b>" + writes + "</b> save" + (writes===1?"":"s") + " &#183; <b>" + reads +
    "</b> read" + (reads===1?"":"s") + " &#183; total <b>" + usd(cost) + "</b>";
}

function simSend(){
  var hit = now < expiry;
  if (hit){ reads++; cost += SIM_PFX*READ/1e6; }
  else { writes++; cost += SIM_PFX*WRITE5/1e6; }
  events.push({t:now, hit:hit});
  if (hit && warms.length) warms[warms.length-1].end = now + TTL;
  else warms.push({start:now, end:now + TTL});
  expiry = now + TTL;

  var l = document.getElementById("log");
  if (!l.dataset.started){ l.innerHTML = ""; l.dataset.started = "1"; l.style.color = "var(--ink)"; }
  var d = document.createElement("div");
  d.className = hit ? "h" : "m";
  d.innerHTML = "t+" + String(Math.floor(now/60)).padStart(2,"0") + ":" +
    String(now%60).padStart(2,"0") + "  " + (hit ? "HIT   read " : "MISS  save ") +
    fmtN(SIM_PFX) + " tok   " + usd(SIM_PFX*(hit?READ:WRITE5)/1e6);
  l.insertBefore(d, l.firstChild);
  simDraw();
}
document.getElementById("send").addEventListener("click", simSend);
document.querySelectorAll("[data-adv]").forEach(function(b){
  b.addEventListener("click", function(){ now = Math.min(now + (+b.dataset.adv), SPAN); simDraw(); });
});
document.getElementById("simReset").addEventListener("click", function(){
  now=0; expiry=-1; cost=0; reads=0; writes=0; warms=[]; events=[];
  var l = document.getElementById("log");
  l.innerHTML = '<div style="border:0">Send a request to start the clock, then wait and send another.</div>';
  delete l.dataset.started;
  l.style.color = "var(--faint)";
  simDraw();
});
(function(){
  var ax = document.getElementById("axis");
  for (var m=5; m<=20; m+=5){
    var x = (m*60/SPAN*100) + "%";
    var s = document.createElement("span");
    s.style.left = x; s.textContent = m + "m"; ax.appendChild(s);
    var t = document.createElement("i");
    t.style.left = x; ax.appendChild(t);
  }
})();
simDraw();

/* ==================================================================== */
/* cost calculator                                                       */
/* ==================================================================== */
var mdl=document.getElementById("mdl"), pfx=document.getElementById("pfx"),
    nreq=document.getElementById("nreq"), gap=document.getElementById("gap");

function calc(){
  var p = mdl.value.split(",").map(Number);
  var base=p[0], w5=p[1], w1h=p[2], rd=p[3];
  var P=+pfx.value, N=+nreq.value, G=+gap.value;

  document.getElementById("pfxV").textContent = fmtN(P);
  document.getElementById("nreqV").textContent = N;
  document.getElementById("gapV").textContent =
    G < 60 ? G + " s" : (G/60).toFixed(G%60?1:0) + " min";

  var M = P/1e6;
  var none = N*M*base;
  var c5 = (G <= 300) ? M*w5 + (N-1)*M*rd : N*M*w5;
  var c1h = (G <= 3600) ? M*w1h + (N-1)*M*rd : N*M*w1h;

  var opts = [
    {k:"no caching", v:none, sub:N + " \u00d7 full-price prefill"},
    {k:"5-minute TTL", v:c5,
     sub: G<=300 ? "1 save + " + (N-1) + " free-refreshed reads"
                 : "expires every time \u2014 " + N + " saves, 0 reads"},
    {k:"1-hour TTL", v:c1h,
     sub: G<=3600 ? "1 save at 2\u00d7 + " + (N-1) + " reads"
                  : "expires every time \u2014 " + N + " saves, 0 reads"}
  ];
  var best = Math.min(none,c5,c1h), worst = Math.max(none,c5,c1h);
  var host = document.getElementById("kpis");
  host.innerHTML = "";
  opts.forEach(function(o){
    var d = document.createElement("div");
    d.className = "kpi" + (o.v===best ? " win" : (o.v===worst ? " bad" : ""));
    d.innerHTML = '<div class="lab">' + o.k + '</div><div class="big">' + usd(o.v) +
      '</div><div class="lab" style="margin:6px 0 0">' + o.sub + '</div>';
    host.appendChild(d);
  });

  var msg = "Cheapest option saves <b>" + Math.round((1-best/none)*100) +
            "%</b> on the repeated opening, across " + N + " calls.";
  if (G > 300 && G <= 3600)
    msg += " The gap is past 5 minutes, so the standard cache dies between every call &#8212; " +
           "this is the window where the hour earns its premium.";
  else if (G > 3600)
    msg += " Past an hour nothing survives, and caching costs more than not caching.";
  else if (N === 2)
    msg += " At two calls the 5-minute save has just paid for itself; the hour needs a third.";
  document.getElementById("calcNote").innerHTML = msg;
}
[mdl,pfx,nreq,gap].forEach(function(el){ el.addEventListener("input", calc); });
calc();

/* ==================================================================== */
/* usage field decomposition                                             */
/* ==================================================================== */
(function(){
  var parts = [
    {n:"cache_read", v:29800, c:"#2C7A57"},
    {n:"cache_creation", v:240, c:"#A34E19"},
    {n:"input", v:62, c:"#4A5A61"}
  ];
  var tot = parts.reduce(function(a,b){ return a+b.v; },0);
  var s = document.getElementById("usageStrip");
  parts.forEach(function(p){
    var d = document.createElement("div");
    d.style.cssText = "flex:" + Math.max(p.v, tot*0.012) + ";background:" + p.c;
    d.textContent = p.v/tot > .12 ? p.n : "";
    d.title = p.n + " = " + fmtN(p.v);
    s.appendChild(d);
  });
  document.getElementById("usageStat").innerHTML =
    "total input processed: <b>" + fmtN(tot) + "</b> tokens &#183; billed as <b>" +
    usd(29800*0.5/1e6 + 240*6.25/1e6 + 62*5/1e6) + "</b> on Opus 5, against <b>" +
    usd(tot*5/1e6) + "</b> uncached";
})();

})();
