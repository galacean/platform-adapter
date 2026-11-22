// Control mini-game: does each subpackage's game.js run after wx.loadSubpackage?
// `config.js` is written by conformance/control/serve.mjs and is not in the repository.
var config = {};
try {
  config = require("./config.js");
} catch (e) {}
var api = typeof tt !== "undefined" ? tt : wx;
var canvas = api.createCanvas();
var context = canvas.getContext("2d");
var lines = [];

function draw() {
  context.fillStyle = "#111";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  context.font = Math.round(canvas.width / 24) + "px sans-serif";
  for (var i = 0; i < lines.length; i++) context.fillText(lines[i], 20, 60 + i * canvas.width / 16);
}

function report(path, data) {
  if (!config.collector) return;
  api.request({ url: config.collector + path, method: "POST", data: JSON.stringify(data), header: { "content-type": "application/json" } });
}

function inspect(name) {
  // DevTools only: what the simulator put into the page for this subpackage.
  var info = {};
  try {
    var g = GameGlobal;
    info.barriers = g.__$scriptOnLoadBarriers ? Object.keys(g.__$scriptOnLoadBarriers) : "none";
    var heads = [];
    if (g.__$ownerHead) heads.push(["ownerHead", g.__$ownerHead]);
    if (g.document && g.document.head && g.document.head !== g.__$ownerHead) heads.push(["head", g.document.head]);
    info.scripts = heads.map(function (pair) {
      var list = Array.prototype.slice.call(pair[1].querySelectorAll("script")).map(function (s) { return s.src; });
      return pair[0] + ": " + list.filter(function (src) { return src.indexOf("stage") >= 0; }).join(", ");
    });
    info.location = g.location && g.location.href;
  } catch (e) {
    info.error = String(e);
  }
  return info;
}

var info = api.getSystemInfoSync();
lines.push("subpackage control · " + info.platform + " · lib " + info.SDKVersion);
draw();

var names = ["stageA", "stageB", "stageC", "stageD"];
var results = [];
(function next(i) {
  if (i >= names.length) {
    report("/done", { runId: config.runId, platform: info.platform, sdk: info.SDKVersion, results: results });
    return;
  }
  var name = names[i];
  api.loadSubpackage({
    name: name,
    success: function () { finish("success"); },
    fail: function (e) { finish("fail " + (e && e.errMsg)); }
  });
  function finish(outcome) {
    setTimeout(function () {
      var ran = (GameGlobal.__controlRan || []).indexOf(name) >= 0;
      var result = { name: name, load: outcome, entryRan: ran, devtools: inspect(name) };
      results.push(result);
      lines.push(name + ": " + outcome + " · entry " + (ran ? "RAN" : "NOT RUN"));
      draw();
      next(i + 1);
    }, 300);
  }
})(0);
