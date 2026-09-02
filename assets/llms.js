/* ======================================================================
   assets/llms.js
   Interactive figures for llms.html
   ====================================================================== */

(function(){
"use strict";

/* ==================================================================== */
/* one training step                                                     */
/* ==================================================================== */
var TR = [
 '<span style="color:#7C8A8E">corpus passage</span> The spacecraft entered orbit around <span style="background:#C9D2CE">&#9608;&#9608;&#9608;&#9608;&#9608;</span>',
 '<span style="color:#7C8A8E">model predicts</span> Jupiter 0.31 &#183; Saturn 0.22 &#183; Earth 0.14 &#183; the 0.09 &#183; \u2026',
 '<span style="color:#7C8A8E">actual token</span>   <span style="color:#A34E19">Saturn</span>  \u2014 the model gave it p = 0.22',
 '<span style="color:#7C8A8E">loss</span>           \u2212ln(0.22) = <span style="color:#A34E19">1.51</span>',
 '<span style="color:#7C8A8E">update</span>         step every parameter against the gradient of that loss',
 '<span style="color:#7C8A8E">repeat</span>         \u00d7 10<sup>14</sup>'
];
var trI = 1, trHost = document.getElementById("trainStage");
function trDraw(){
  trHost.innerHTML = TR.slice(0, trI).map(function(l){ return "<div>"+l+"</div>"; }).join("");
  document.getElementById("trStep").disabled = trI >= TR.length;
}
document.getElementById("trStep").addEventListener("click", function(){ if(trI<TR.length){ trI++; trDraw(); } });
document.getElementById("trReset").addEventListener("click", function(){ trI=1; trDraw(); });
trDraw();

/* ==================================================================== */
/* stateless replay                                                      */
/* ==================================================================== */
var TURNS = [
  [["system","You are a coding assistant. Tools: read_file, edit, bash \u2026", 2400],
   ["user","Why is the build failing on RHEL?", 12]],
  [["assistant","Let me look at the CMake config.", 60],
   ["tool","read_file(CMakeLists.txt) \u2192 210 lines", 1800],
   ["user","Yes, and check the toolchain file too.", 14]],
  [["assistant","Found it \u2014 the Fortran flags differ.", 80],
   ["tool","read_file(toolchain-rhel.cmake) \u2192 64 lines", 620],
   ["user","Can you patch it?", 9]],
  [["assistant","Here's the change to line 41.", 140],
   ["tool","edit(toolchain-rhel.cmake) \u2192 ok", 90],
   ["user","Now re-run the build.", 11]]
];
var shown = 1;
var rHost = document.getElementById("replay"), rTok = document.getElementById("rTok");

function rDraw(){
  rHost.innerHTML = "";
  var running = 0, fresh = 0, replayed = 0;
  var box = document.createElement("div");
  box.className = "req";
  for (var t=0; t<shown; t++){
    TURNS[t].forEach(function(ln){
      var isNew = (t === shown-1);
      var d = document.createElement("div");
      d.className = "ln " + (isNew ? "new" : "old");
      d.innerHTML = '<span class="who">' + ln[0] + '</span><span>' + ln[1] + '</span>';
      box.appendChild(d);
      running += ln[2];
      if (isNew) fresh += ln[2]; else replayed += ln[2];
    });
  }
  var hd = document.createElement("div");
  hd.className = "hd";
  hd.innerHTML = "<span>request " + shown + " &#183; POST /v1/messages</span><span>" +
                 running.toLocaleString() + " input tokens</span>";
  box.insertBefore(hd, box.firstChild);
  rHost.appendChild(box);

  var cum = 0;
  for (var i=0;i<shown;i++) for (var j=0;j<=i;j++)
    TURNS[j].forEach(function(l){ cum += l[2]; });

  rTok.innerHTML = "replayed this call: <b>" + replayed.toLocaleString() +
    "</b> &#183; new this call: <b>" + fresh.toLocaleString() +
    "</b> &#183; cumulative input tokens billed across all " + shown +
    " call" + (shown>1?"s":"") + ": <b>" + cum.toLocaleString() + "</b>";
  document.getElementById("rNext").disabled = shown >= TURNS.length;
}
document.getElementById("rNext").addEventListener("click", function(){ if(shown<TURNS.length){ shown++; rDraw(); } });
document.getElementById("rReset").addEventListener("click", function(){ shown=1; rDraw(); });
rDraw();

})();
