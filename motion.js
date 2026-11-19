/* =========================================================
   motion.js — animation & interaction layer
   Sits on top of script.js without changing its logic:
   watches the DOM and adds transitions, gliders, waveforms,
   count-ups and celebrations.
   ========================================================= */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const raf = fn => requestAnimationFrame(fn);
  const observe = (el, fn, opts = { childList: true }) => { if (el) new MutationObserver(fn).observe(el, opts); };

  /* ---------- 1. Splash + first entrance ---------- */
  const t0 = performance.now();
  window.addEventListener("load", () => {
    const wait = Math.max(0, (reduced ? 0 : 1300) - (performance.now() - t0));
    setTimeout(() => {
      $("splash")?.classList.add("gone");
      document.querySelector("main.app")?.classList.add("enter");
      document.querySelectorAll(".tabs").forEach(staggerTabs);
      placePill(); document.querySelectorAll(".tabs").forEach(t => moveGlider(t, true));
    }, wait);
  });

  /* ---------- 2. Background parallax ---------- */
  const par = document.querySelector(".bg-scene .parallax");
  if (par && !reduced) {
    window.addEventListener("pointermove", e => {
      const x = (e.clientX / innerWidth - .5) * 30, y = (e.clientY / innerHeight - .5) * 30;
      par.style.transform = `translate(${x}px,${y}px)`;
    }, { passive: true });
  }

  /* ---------- 3. Sliding pill on Write / Speak ---------- */
  const modes = document.querySelector(".modes"), pill = modes?.querySelector(".pill");
  function placePill() {
    if (!pill) return;
    const a = modes.querySelector(".mode.active"); if (!a) return;
    modes.classList.add("has-pill");
    const w = Math.max(56, a.offsetWidth * .7);
    pill.style.width = w + "px";
    pill.style.transform = `translateX(${a.offsetLeft + (a.offsetWidth - w) / 2}px)`;
  }
  modes?.querySelectorAll(".mode").forEach(b => observe(b, placePill, { attributes: true, attributeFilter: ["class"] }));
  window.addEventListener("resize", () => { placePill(); document.querySelectorAll(".tabs").forEach(t => moveGlider(t, true)); });

  // When a view becomes visible, re-measure gliders and stagger its tabs
  ["writeView", "speakView"].forEach(id => observe($(id), () => {
    const v = $(id); if (v.hidden) return;
    raf(() => { const t = v.querySelector(".tabs"); moveGlider(t, true); staggerTabs(t); });
  }, { attributes: true, attributeFilter: ["hidden"] }));

  /* ---------- 4. Gliding highlight behind the active task ---------- */
  const gliders = new WeakMap();
  function moveGlider(tabs, instant) {
    if (!tabs || !tabs.offsetParent) return;
    let g = gliders.get(tabs);
    if (!g) { g = document.createElement("div"); g.className = "glider"; gliders.set(tabs, g); tabs.closest(".sidebar")?.classList.add("has-glider"); }
    const prev = g.style.transform;
    if (g.parentNode !== tabs) {
      tabs.prepend(g);
      if (prev) { g.style.transition = "none"; g.style.transform = prev; void g.offsetWidth; g.style.transition = ""; }
    }
    const a = tabs.querySelector(".tab.active"); if (!a) return;
    if (instant) g.style.transition = "none";
    // On wide screens the highlight is a "tab" that runs down to the bar's bottom edge and melts into the page below
    const bar = tabs.closest(".sidebar"), merge = !!bar && innerWidth >= 900;
    let h = a.offsetHeight;
    if (merge) h = Math.round(bar.getBoundingClientRect().bottom - tabs.getBoundingClientRect().top - a.offsetTop) + 1;
    g.classList.toggle("merge", merge);
    g.style.width = a.offsetWidth + "px"; g.style.height = h + "px";
    g.style.transform = `translate(${a.offsetLeft}px,${a.offsetTop}px)`;
    g.classList.add("ready");
    if (instant) { void g.offsetWidth; g.style.transition = ""; }
    // keep the active chip in view on phones
    if (tabs.scrollWidth > tabs.clientWidth) a.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
  }
  function staggerTabs(tabs) {
    if (!tabs || reduced) return;
    tabs.querySelectorAll(".tab").forEach((t, i) => t.style.setProperty("--i", i));
    tabs.classList.remove("stagger"); void tabs.offsetWidth; tabs.classList.add("stagger");
    setTimeout(() => tabs.classList.remove("stagger"), 900);
  }
  ["tabs", "sTabs"].forEach(id => observe($(id), () => moveGlider($(id))));

  /* ---------- 5. Ripple on press ---------- */
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest("button.primary, button.ghost, .tab, .mode, .link-btn");
    if (!b || b.disabled || reduced) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement("span");
    s.className = "ripple";
    Object.assign(s.style, { width: d + "px", height: d + "px", left: (e.clientX - r.left - d / 2) + "px", top: (e.clientY - r.top - d / 2) + "px" });
    b.appendChild(s); setTimeout(() => s.remove(), 700);
  });

  /* ---------- 6. Titles and prompts ---------- */
  ["wTitle", "sTitle"].forEach(id => observe($(id), () => {
    const h = $(id); h.classList.remove("swap"); void h.offsetWidth; h.classList.add("swap");
  }));
  const reveal = (box, step = 70) => {
    if (!box || reduced) return;
    [...box.children].forEach((c, i) => { c.style.setProperty("--i", i); c.classList.remove("reveal"); void c.offsetWidth; c.classList.add("reveal"); });
    // fade in the pane body too, so the whole task feels like a new screen
    void step;
  };
  ["promptBox", "sPromptBox"].forEach(id => observe($(id), () => {
    reveal($(id));
    $(id).closest(".pane")?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }));

  /* ---------- 7. Word progress + counter bump ---------- */
  const count = $("count"), wprog = $("wprog");
  let lastCountCls = "";
  function syncProgress() {
    if (!count || !wprog) return;
    const m = count.textContent.match(/(\d+)\s+words?.*?(\d+)\s*[–-]\s*(\d+)/);
    const bar = wprog.querySelector("span");
    if (!m) { bar.style.width = "0"; return; }
    const n = +m[1], min = +m[2], max = +m[3] || 1, scale = max * 1.25;
    bar.style.width = Math.min(100, (n / scale) * 100) + "%";
    const zone = wprog.querySelector(".zone");
    if (zone) { zone.style.left = (min / scale * 100) + "%"; zone.style.width = ((max - min) / scale * 100) + "%"; }
    wprog.classList.toggle("ok", n >= min && n <= max);
    wprog.classList.toggle("over", n > max);
    const cls = count.className;
    if (cls !== lastCountCls && !reduced) { count.classList.remove("bump"); void count.offsetWidth; count.classList.add("bump"); }
    lastCountCls = count.className.replace(" bump", "");
  }
  observe(count, syncProgress, { childList: true, characterData: true, subtree: true });
  syncProgress();

  /* ---------- 8. Live coach: pop chips that just got ticked, slide in new sentences ---------- */
  let chipState = {};
  observe($("checklist"), () => {
    const next = {};
    $("checklist").querySelectorAll("span").forEach(s => {
      const key = s.textContent.slice(2).trim(); next[key] = s.className;
      if (chipState[key] && chipState[key] !== s.className && s.className === "done" && !reduced) s.classList.add("pop");
    });
    chipState = next;
  });
  let sentCount = 0;
  observe($("sentences"), () => {
    const rows = $("sentences").querySelectorAll(".sent");
    rows.forEach((r, i) => { if (i >= sentCount) r.classList.add("new"); });
    sentCount = rows.length;
  });

  /* ---------- 9. Feedback panels: skeleton, stagger, ring, count-up, celebration ---------- */
  const skeleton = msg => `<div class="skeleton"><div class="sk h2"></div><div class="sk h1"></div><div class="sk h3"></div><div class="sk h2"></div><div class="msg">${msg}</div></div>`;
  const evalBtn = $("evalBtn");
  observe(evalBtn, () => { if (evalBtn.disabled) $("out").innerHTML = skeleton("Reading your answer and checking grammar…"); },
    { attributes: true, attributeFilter: ["disabled"] });

  function animateFeedback(box) {
    if (!box) return;
    if (box.querySelector(".empty .spinner")) { box.innerHTML = skeleton("Checking your answer…"); return; }
    if (box.querySelector(".skeleton")) return;
    reveal(box);
    const card = box.querySelector(".scorecard");
    if (!card) return;
    recordResult(box, card.querySelector(".ring-num"));

    // bars fill one after another
    card.querySelectorAll(".bar").forEach((bar, r) => bar.querySelectorAll("span").forEach((s, i) => s.style.setProperty("--b", r * 2 + i)));

    const prog = card.querySelector(".ring .prog"), num = card.querySelector(".ring-num");
    if (prog) {
      const target = prog.style.strokeDasharray, circ = target.split(/[ ,]+/)[1] || "188.5";
      const color = prog.style.stroke; card.querySelector(".ring").style.setProperty("--ring-glow", color);
      if (!reduced) { prog.style.transition = "none"; prog.style.strokeDasharray = `0 ${circ}`; void prog.getBoundingClientRect(); prog.style.transition = ""; setTimeout(() => prog.style.strokeDasharray = target, 250); }
    }
    let ratio = 0;
    if (num) {
      const tn = [...num.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
      const max = parseFloat((num.querySelector("small")?.textContent || "").replace(/[^\d.]/g, "")) || 0;
      if (tn) {
        const end = parseFloat(tn.textContent), dec = (tn.textContent.split(".")[1] || "").length;
        ratio = max ? end / max : 0;
        if (!reduced && end > 0) {
          const start = performance.now() + 250, dur = 1300;
          tn.textContent = (0).toFixed(dec);
          const tick = now => {
            const p = Math.min(1, Math.max(0, (now - start) / dur)), e = 1 - Math.pow(1 - p, 3);
            tn.textContent = (end * e).toFixed(dec);
            if (p < 1) raf(tick);
          };
          raf(tick);
        }
      }
    }
    if (ratio >= .75 && !reduced) setTimeout(() => celebrate(card.querySelector(".ring")), 1350);
    box.closest(".pane")?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }
  ["out", "sOut"].forEach(id => observe($(id), () => { animateFeedback($(id)); updateSteps(); }));

  /* Keep each task's best score so the task list can show "Done · best 12/16" */
  function recordResult(box, num) {
    try {
      if (!num) return;
      const m = num.textContent.match(/([\d.]+)\s*\/\s*([\d.]+)/); if (!m) return;
      const write = box.id === "out", key = (write ? "w:" + current : "s:" + sCurrent);
      const prev = RESULTS[key], val = +m[1], max = +m[2];
      if (!prev || val / max > prev.split("/")[0] / prev.split("/")[1]) RESULTS[key] = `${m[1]}/${m[2]}`;
      write ? renderTabs() : renderSTabs();
    } catch (e) { /* the task list just won't show the score */ }
  }

  /* ---------- Stepper: Prepare → Write/Record → Feedback ---------- */
  function setSteps(id, step) {
    const ol = $(id); if (!ol) return;
    [...ol.children].forEach((li, i) => { li.classList.toggle("on", i === step - 1); li.classList.toggle("past", i < step - 1); });
  }
  function updateSteps() {
    const wDone = !!$("out")?.querySelector(".scorecard");
    const typed = /^[1-9]/.test($("count")?.textContent || "");
    setSteps("wSteps", wDone ? 3 : typed ? 2 : 1);
    const sDone = !!$("sOut")?.querySelector(".scorecard");
    const rec = $("recBtn")?.classList.contains("on") || !!$("live")?.textContent.trim().match(/\w/) && !$("live").querySelector(".sub");
    setSteps("sSteps", sDone ? 3 : rec ? 2 : 1);
  }
  observe($("count"), updateSteps, { childList: true, characterData: true, subtree: true });
  observe($("recBtn"), updateSteps, { attributes: true, attributeFilter: ["class"] });
  observe($("live"), updateSteps);
  updateSteps();

  function celebrate(el) {
    if (!el) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ["#1f4fd8", "#e2262d", "#0d0f14", "#1f4fd8", "#e2262d", "#a4a9b4"];
    for (let i = 0; i < 34; i++) {
      const s = document.createElement("span"); s.className = "spark";
      s.style.background = colors[i % colors.length];
      s.style.left = cx + "px"; s.style.top = cy + "px";
      if (i % 3 === 0) s.style.borderRadius = "50%";
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 110;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 30;
      s.animate([
        { transform: "translate(-50%,-50%) scale(1) rotate(0)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.9) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .6 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 70}px)) scale(.4) rotate(${Math.random() * 540}deg)`, opacity: 0 }
      ], { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = () => s.remove();
    }
  }

  /* ---------- 11. Toast for copy ---------- */
  const toast = document.createElement("div"); toast.className = "toast"; toast.setAttribute("role", "status"); document.body.appendChild(toast);
  let toastTimer;
  const showToast = msg => { toast.textContent = msg; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200); };
  document.addEventListener("click", e => {
    if (e.target.closest("#copyBtn")) setTimeout(() => showToast(e.target.closest("#copyBtn").textContent === "Copied" ? "Feedback copied to clipboard" : "Copying isn't allowed here"), 250);
    if (e.target.closest("#sampleBtn")) showToast("Sample answer added. Edit it, then get feedback");
  });
})();
