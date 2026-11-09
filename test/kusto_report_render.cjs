// Renders a saved report page in jsdom and prints, as JSON, what each section shows.
// usage: node kusto_report_render.cjs PAGE.html JSDOM_DIR
const fs = require("fs");
const { JSDOM, VirtualConsole } = require(process.argv[3]);
const html = fs.readFileSync(process.argv[2], "utf8");
const problems = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => problems.push("jsdomError: " + (e.detail || e.message)));
vc.on("error", (...a) => problems.push("console.error: " + a.join(" ")));
const noop = new Proxy(function () {}, { get: (t, k) => (k === "measureText" ? () => ({ width: 10 }) : noop), set: () => true, apply: () => noop });
const dom = new JSDOM(html, {
  runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    Object.defineProperty(w.HTMLElement.prototype, "clientWidth", { get() { return 1000; } });
    w.HTMLCanvasElement.prototype.getContext = () => noop;
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {} }));
  },
});
setTimeout(() => {
  const d = dom.window.document;
  const out = { problems, title: d.title, lede: (d.querySelector("#lede") || {}).textContent, window: (d.querySelector("#window") || {}).textContent, sections: {} };
  d.querySelectorAll("section.sec").forEach(s => {
    const n = s.querySelector(".notice");
    out.sections[s.id] = {
      headline: s.querySelector("h2").textContent,
      notice: n ? (n.classList.contains("error") ? "error" : "empty") : null,
      noticeText: n ? n.textContent : "",
      drawn: s.querySelectorAll("svg, canvas").length,
      findings: [...s.querySelectorAll(".findings li")].map(li => li.textContent),
      text: s.textContent,
    };
  });
  console.log(JSON.stringify(out));
  process.exit(0);
}, 300);
