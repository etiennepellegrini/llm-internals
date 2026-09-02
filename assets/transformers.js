/* ======================================================================
   assets/transformers.js
   Interactive figures for transformers.html
   ====================================================================== */

(function(){
"use strict";

/* ==================================================================== */
/* tokenizer approximation                                               */
/* ==================================================================== */
var tokIn = document.getElementById("tokIn"), tokOut = document.getElementById("tokOut");
function pseudoTokens(s){
  var raw = s.match(/\s*[A-Za-z]+|\s*\d+|\s*[^\sA-Za-z\d]|\s+/g) || [];
  var out = [];
  raw.forEach(function(t){
    var body = t.replace(/^\s+/,"");
    if (body.length > 7){ out.push(t.slice(0, t.length-body.length+5)); out.push(body.slice(5)); }
    else out.push(t);
  });
  return out.filter(function(t){ return t.length; });
}
function hashId(t){
  var h = 0;
  for (var i=0;i<t.length;i++) h = (h*31 + t.charCodeAt(i)) % 100000;
  return h;
}
function renderTokens(){
  var ts = pseudoTokens(tokIn.value);
  tokOut.innerHTML = "";
  ts.forEach(function(t){
    var d = document.createElement("span");
    d.className = "chip";
    d.textContent = t.replace(/ /g,"\u00b7");
    var id = document.createElement("span");
    id.style.cssText = "color:var(--faint);margin-left:7px";
    id.textContent = hashId(t);
    d.appendChild(id);
    tokOut.appendChild(d);
  });
  var n = document.createElement("span");
  n.className = "mono";
  n.style.cssText = "font-size:12px;color:var(--faint);align-self:center";
  n.textContent = ts.length + " tokens";
  tokOut.appendChild(n);
}
tokIn.addEventListener("input", renderTokens);
renderTokens();

/* ==================================================================== */
/* embedding lookup + positional encoding                                */
/* ==================================================================== */
var ETOK = ["The","\u00b7probe","\u00b7reached","\u00b7Jupiter"];
var NDIM = 10, DMODEL = 5000, ei = 3;

function seeded(seed){
  var s = (seed >>> 0) || 1;
  return function(){ s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
}
function rowFor(id){
  var r = seeded(id + 7), v = [];
  for (var i=0;i<NDIM;i++) v.push(+((r()*2-1)*0.9).toFixed(2));
  return v;
}
/* genuine sinusoidal positional encoding from Vaswani et al. */
function posVec(p){
  var v = [];
  for (var i=0;i<NDIM;i++){
    var f = Math.pow(10000, 2*Math.floor(i/2)/DMODEL);
    v.push(+(i%2===0 ? Math.sin(p/f) : Math.cos(p/f)).toFixed(2));
  }
  return v;
}

var OTHER = [["\u00b7orbit",41290],["\u00b7Saturn",7731],["\u00b7the",464],["\u00b7launch",92817]];
var embToks = document.getElementById("embToks");
ETOK.forEach(function(t,i){
  var b = document.createElement("button");
  b.className = "tok"; b.textContent = t;
  b.setAttribute("aria-pressed", i===ei ? "true":"false");
  b.addEventListener("click", function(){ ei = i; drawEmb(); });
  embToks.appendChild(b);
});

function drawEmb(){
  embToks.querySelectorAll("button").forEach(function(b,i){
    b.setAttribute("aria-pressed", i===ei ? "true":"false");
  });
  var tok = ETOK[ei], id = hashId(tok.replace(/\u00b7/g," "));
  var rows = OTHER.map(function(o){ return {lab:o[0], id:o[1], on:false}; });
  rows.push({lab:tok, id:id, on:true});
  rows.sort(function(a,b){ return a.id - b.id; });

  var host = document.getElementById("embTable");
  host.innerHTML = "";
  var hdr = document.createElement("div");
  hdr.className = "emrow";
  hdr.innerHTML = '<div class="idx" style="color:var(--faint)">row &#183; token</div>' +
    Array.from({length:NDIM}, function(_,i){
      return '<div class="cellv" style="color:var(--faint)">d' + i + '</div>'; }).join("");
  host.appendChild(hdr);

  rows.forEach(function(r){
    var v = rowFor(r.id);
    var d = document.createElement("div");
    d.className = "emrow" + (r.on ? " on" : "");
    d.innerHTML = '<div class="idx">' + r.id + "  " + r.lab + '</div>' +
      v.map(function(n){ return '<div class="cellv">' + n.toFixed(2) + '</div>'; }).join("");
    host.appendChild(d);
  });
  var el = document.createElement("div");
  el.className = "emrow";
  el.innerHTML = '<div class="idx" style="color:var(--faint)">&#8942;</div>';
  host.appendChild(el);

  var emb = rowFor(id), pos = posVec(ei);
  var sum = emb.map(function(e,i){ return +(e + pos[i]).toFixed(2); });
  var line = function(tag, vec, colour){
    return '<div class="vecline"><div class="tag">' + tag + '</div>' +
      vec.map(function(n){ return '<div class="n" style="color:' + colour + '">' +
        n.toFixed(2) + '</div>'; }).join("") + '</div>';
  };
  document.getElementById("embMath").innerHTML =
    line("embedding[" + id + "]", emb, "var(--q)") +
    line("+ position[" + ei + "]", pos, "var(--k)") +
    '<div style="border-top:1px solid var(--rule-2);margin:4px 0"></div>' +
    line("= into layer 1", sum, "var(--ink)");
}
drawEmb();

/* ==================================================================== */
/* attention on a 4-token / 4-dim toy, real arithmetic                   */
/* ==================================================================== */
var TOK = ["The","probe","reached","Jupiter"];
var Q = [[0.8,0.1,-0.2,0.3],[0.2,1.0,0.3,-0.4],[-0.1,0.5,1.0,0.2],[0.0,0.9,1.1,0.2]];
var K = [[1.0,0.2,-0.4,0.1],[0.3,1.1,0.2,-0.5],[-0.2,0.4,1.2,0.3],[0.1,-0.3,0.5,1.0]];
var V = [[0.5,-0.2,0.1,0.4],[-0.3,0.8,0.2,-0.1],[0.2,0.1,0.9,0.3],[0.6,0.4,-0.2,0.7]];
var D = 4, qi = 3, stage = 0;

function dot(a,b){ var s=0; for(var i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
function f(x,n){ return (x<0?"":"\u2009") + x.toFixed(n===undefined?2:n); }

function compute(){
  var raw = K.map(function(k){ return dot(Q[qi],k); });
  var scaled = raw.map(function(s){ return s/Math.sqrt(D); });
  var masked = scaled.map(function(s,j){ return j<=qi ? s : -Infinity; });
  var mx = Math.max.apply(null, masked.filter(isFinite));
  var ex = masked.map(function(s){ return isFinite(s) ? Math.exp(s-mx) : 0; });
  var sum = ex.reduce(function(a,b){ return a+b; },0);
  var w = ex.map(function(e){ return e/sum; });
  var out = [0,0,0,0];
  w.forEach(function(wi,j){ for(var d=0;d<D;d++) out[d] += wi*V[j][d]; });
  return {raw:raw, scaled:scaled, masked:masked, w:w, out:out};
}

var qbtns = document.getElementById("qbtns");
TOK.forEach(function(t,i){
  var b = document.createElement("button");
  b.className = "tok"; b.textContent = t;
  b.setAttribute("aria-pressed", i===qi ? "true":"false");
  b.addEventListener("click", function(){ qi=i; stage=5; draw(); });
  qbtns.appendChild(b);
});

function draw(){
  var r = compute();
  qbtns.querySelectorAll("button").forEach(function(b,i){
    b.setAttribute("aria-pressed", i===qi ? "true":"false");
  });
  var fmt = function(arr,dec,mi){
    return arr.map(function(v){ return (mi && !isFinite(v)) ? "  \u2212\u221e" : f(v,dec); }).join("   ");
  };
  document.getElementById("s1").textContent = "q\u00b7k  =  " + fmt(r.raw,2);
  document.getElementById("s2").textContent = "\u00f7 2   =  " + fmt(r.scaled,2);
  document.getElementById("s3").textContent = "        " + fmt(r.masked,2,true);
  document.getElementById("s4").textContent = "w     =  " + fmt(r.w,3);
  document.getElementById("s5").textContent = "out   =  [" + r.out.map(function(v){ return v.toFixed(2); }).join(", ") + "]";
  document.querySelectorAll(".steps .st").forEach(function(el){
    el.classList.toggle("on", (+el.dataset.s) <= stage);
  });
  var host = document.getElementById("abars");
  host.innerHTML = "";
  TOK.forEach(function(t,j){
    var masked = j > qi, show = stage >= 4 && !masked;
    var row = document.createElement("div");
    row.className = "arow" + (masked ? " masked" : "");
    row.innerHTML = '<div class="lbl">' + t + '</div><div class="track"><div class="abar" style="width:' +
      (show ? (r.w[j]*100).toFixed(1) : 0) + '%"></div></div><div class="val">' +
      (masked ? "\u2014" : (show ? r.w[j].toFixed(3) : "")) + '</div>';
    host.appendChild(row);
  });
}
document.getElementById("stepBtn").addEventListener("click", function(){ stage = stage>=5?5:stage+1; draw(); });
document.getElementById("allBtn").addEventListener("click", function(){ stage=5; draw(); });
document.getElementById("resetBtn").addEventListener("click", function(){ stage=0; draw(); });
draw();

/* ==================================================================== */
/* illustrative head patterns                                            */
/* ==================================================================== */
var HTOK = ["The","probe","that","JPL","built","reached","Jupiter"];
var HEADS = [
  {name:"a head that looks at the previous token", f:function(i,j){ return j===i-1?1:(j===i?.12:0); }},
  {name:"a head that looks back at the sentence start", f:function(i,j){ return j===0?1:(j===i?.2:.05); }},
  {name:"a head that looks at a local window", f:function(i,j){ var d=i-j; return d>=0&&d<3?1-d*.32:0; }},
  {name:"a head that links verbs to their subjects", f:function(i,j){
    if(i===5&&j===1) return 1; if(i===6&&j===5) return .85; if(i===4&&j===3) return .8;
    return j<=i?.09:0; }}
];
var hostH = document.getElementById("heads");
HEADS.forEach(function(h){
  var wrap = document.createElement("div");
  var cap = document.createElement("div");
  cap.className = "headcap"; cap.textContent = h.name;
  var g = document.createElement("div");
  g.className = "heat";
  g.style.gridTemplateColumns = "repeat(" + HTOK.length + ",1fr)";
  for (var i=0;i<HTOK.length;i++) for (var j=0;j<HTOK.length;j++){
    var c = document.createElement("div");
    c.className = "cell";
    var v = j<=i ? Math.max(0,Math.min(1,h.f(i,j))) : -1;
    c.style.background = v<0 ? "#E7EBE7" : "rgba(28,106,135," + (0.06+v*0.94).toFixed(3) + ")";
    c.title = HTOK[i] + " looking at " + HTOK[j];
    g.appendChild(c);
  }
  wrap.appendChild(cap); wrap.appendChild(g); hostH.appendChild(wrap);
});

/* ==================================================================== */
/* sampling                                                              */
/* ==================================================================== */
var CAND = [["\u00b7orbit",4.10],["\u00b7Jupiter",3.55],["\u00b7the",3.20],["\u00b7its",2.40],
            ["\u00b7a",1.85],["\u00b7Saturn",1.10],["\u00b7lunch",-1.40],["\u00b7purple",-2.60]];
var temp = document.getElementById("temp"), topp = document.getElementById("topp"),
    samp = document.getElementById("sampler");
function drawSampler(){
  var T = Math.max(0.01,+temp.value), P = +topp.value;
  document.getElementById("tempV").textContent = T.toFixed(2);
  document.getElementById("toppV").textContent = P.toFixed(2);
  var mx = Math.max.apply(null, CAND.map(function(c){ return c[1]/T; }));
  var ex = CAND.map(function(c){ return Math.exp(c[1]/T - mx); });
  var s = ex.reduce(function(a,b){ return a+b; },0);
  var pr = ex.map(function(e){ return e/s; });
  var idx = pr.map(function(_,i){ return i; }).sort(function(a,b){ return pr[b]-pr[a]; });
  var keep = {}, acc = 0;
  for (var n=0;n<idx.length;n++){ keep[idx[n]] = true; acc += pr[idx[n]]; if (acc >= P) break; }
  samp.innerHTML = "";
  CAND.forEach(function(c,i){
    var inSet = !!keep[i];
    var row = document.createElement("div");
    row.className = "arow" + (inSet ? "" : " masked");
    row.innerHTML = '<div class="lbl">' + c[0] + '</div><div class="track"><div class="abar" style="width:' +
      (pr[i]*100).toFixed(2) + '%;background:' + (inSet?"var(--q)":"var(--rule)") +
      '"></div></div><div class="val">' + (pr[i]*100).toFixed(1) + '%</div>';
    samp.appendChild(row);
  });
}
temp.addEventListener("input", drawSampler);
topp.addEventListener("input", drawSampler);
drawSampler();

})();
