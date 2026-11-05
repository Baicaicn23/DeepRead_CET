(function () {
  const catalog = document.getElementById("catalog");
  if (catalog && Array.isArray(window.ARTICLE_CATALOG)) {
    const items = window.ARTICLE_CATALOG;
    if (!items.length) {
      catalog.innerHTML = '<p class="empty">还没有正式篇目。把原文和题目发给我，下一篇就会出现在这里。</p>';
    } else {
      catalog.innerHTML = items.map((item) => {
        const badge = item.isExample ? '<span class="badge">示例</span>' : "";
        const zh = item.titleZh ? `<small>${escapeHtml(item.titleZh)}</small>` : "";
        return `<a class="card" href="${escapeHtml(item.href)}">
          <div class="card-kicker">${badge}<span>${escapeHtml(item.source || "")}</span><span>${escapeHtml(item.date || "")}</span></div>
          <h2>${escapeHtml(item.title || "")}${zh}</h2>
          <p>${escapeHtml(item.summary || "")}</p>
        </a>`;
      }).join("");
    }
  }

  const passage = document.querySelector("[data-passage]");
  const viewButtons = document.querySelectorAll("[data-view]");
  const VIEW_KEY = "jingdu-view";
  const TYPE_KEY = "jingdu-type";

  function setView(view) {
    if (!passage) return;
    passage.setAttribute("data-mode", view);
    document.body.classList.toggle("is-bilingual", view === "bilingual");
    viewButtons.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === view));
    try { localStorage.setItem(VIEW_KEY, view); } catch (err) {}
  }

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });

  if (passage && viewButtons.length) {
    let view = "bilingual";
    try { view = localStorage.getItem(VIEW_KEY) || "bilingual"; } catch (err) {}
    setView(view);
  }

  const article = document.querySelector(".article-wrap");
  document.querySelectorAll("[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!article) return;
      const next = Number(article.style.getPropertyValue("--type") || 0) + Number(btn.dataset.type);
      const clamped = Math.max(-2, Math.min(3, next));
      article.style.setProperty("--type", String(clamped));
      article.style.fontSize = `${18 + clamped}px`;
      try { localStorage.setItem(TYPE_KEY, String(clamped)); } catch (err) {}
    });
  });
  if (article) {
    try {
      const saved = localStorage.getItem(TYPE_KEY);
      if (saved) {
        article.style.setProperty("--type", saved);
        article.style.fontSize = `${18 + Number(saved)}px`;
      }
    } catch (err) {}
  }

  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollOpts = (block) => ({ behavior: reduceMotion() ? "auto" : "smooth", block: block || "center" });

  // Per-paragraph translate toggles
  function setPara(para, open) {
    const btn = para.querySelector(".tr-toggle");
    para.classList.toggle("is-open", open);
    if (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "收起" : "翻译";
    }
  }
  document.querySelectorAll(".tr-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const para = btn.closest(".para");
      if (para) setPara(para, !para.classList.contains("is-open"));
    });
  });
  document.querySelectorAll(".tr-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const para = btn.closest(".para");
      if (!para) return;
      setPara(para, false);
      const main = para.querySelector(".tr-toggle");
      if (main) main.focus();
    });
  });

  // Question stem Chinese on/off
  const ZH_KEY = "deepread-stem-zh";
  const zhBtn = document.querySelector(".stemzh-toggle");
  function setStemZh(on) {
    document.body.classList.toggle("hide-stem-zh", !on);
    if (zhBtn) {
      zhBtn.setAttribute("aria-pressed", on ? "true" : "false");
      zhBtn.textContent = "题目中文：" + (on ? "开" : "关");
    }
    try { localStorage.setItem(ZH_KEY, on ? "on" : "off"); } catch (err) {}
  }
  if (zhBtn) {
    let on = true;
    try { on = localStorage.getItem(ZH_KEY) !== "off"; } catch (err) {}
    setStemZh(on);
    zhBtn.addEventListener("click", () => setStemZh(zhBtn.getAttribute("aria-pressed") !== "true"));
  }

  // Question switcher (one question at a time)
  const qButtons = Array.from(document.querySelectorAll("[data-q-goto]"));
  const qPanels = Array.from(document.querySelectorAll(".study .q[data-q]"));
  const status = document.getElementById("q-status");
  let current = null;
  let lastJump = null;

  function setRevealed(panel, open) {
    const btn = panel.querySelector(".reveal");
    const ans = panel.querySelector(".teach-answer");
    panel.classList.toggle("is-revealed", open);
    if (ans) ans.hidden = !open;
    if (btn) {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "收起答案与解析" : "看答案与解析";
    }
  }

  qPanels.forEach((panel) => {
    const reveal = panel.querySelector(".reveal");
    if (reveal) reveal.addEventListener("click", () => setRevealed(panel, !panel.classList.contains("is-revealed")));
    panel.querySelectorAll(".opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        panel.querySelectorAll(".options li").forEach((li) => {
          li.classList.remove("is-picked");
          li.querySelector(".opt").setAttribute("aria-pressed", "false");
        });
        const li = opt.closest("li");
        li.classList.add("is-picked");
        opt.setAttribute("aria-pressed", "true");
        panel.classList.toggle("picked-right", li.classList.contains("is-key"));
        panel.classList.toggle("picked-wrong", !li.classList.contains("is-key"));
        setRevealed(panel, true);
        if (status) status.textContent = li.classList.contains("is-key") ? "回答正确" : "回答错误，已显示正确答案与解析";
      });
    });
    const i = qPanels.indexOf(panel);
    const prev = panel.querySelector(".q-prev");
    const next = panel.querySelector(".q-next");
    if (prev) { prev.disabled = i === 0; prev.addEventListener("click", () => qPanels[i - 1] && showQuestion(qPanels[i - 1].dataset.q, true, true)); }
    if (next) { next.disabled = i === qPanels.length - 1; next.addEventListener("click", () => qPanels[i + 1] && showQuestion(qPanels[i + 1].dataset.q, true, true)); }
  });

  function setActiveEvidence(id) {
    document.querySelectorAll("mark.ev").forEach((m) => {
      const q = m.dataset.ev || (m.id || "").replace(/^q|-ev$/g, "");
      m.classList.toggle("is-active", q === id);
    });
  }

  function showQuestion(num, pushHash, focus) {
    if (!qPanels.length) return;
    const id = String(num);
    current = id;
    qPanels.forEach((panel) => {
      const active = panel.dataset.q === id;
      panel.classList.toggle("is-active", active);
      if (active) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
    qButtons.forEach((btn) => {
      const active = btn.dataset.qGoto === id;
      if (active) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });
    setActiveEvidence(id);
    updateBack();
    if (pushHash) writeHash();
    if (focus) {
      if (status) status.textContent = "第 " + id + " 题，共 " + qPanels.length + " 题";
      const panel = qPanels.find((p) => p.dataset.q === id);
      const title = panel && panel.querySelector(".q-label");
      if (title) title.focus({ preventScroll: true });
      const right = document.querySelector(".study-right");
      if (right) right.scrollTop = 0;
    }
  }

  qButtons.forEach((btn) => {
    btn.addEventListener("click", () => showQuestion(btn.dataset.qGoto, true, true));
  });

  // "Back to question" button shown beside the located passage
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "back-to-q";
  backBtn.hidden = true;
  backBtn.addEventListener("click", () => {
    const panel = qPanels.find((p) => p.dataset.q === current);
    if (!panel) return;
    const right = document.querySelector(".study-right");
    if (window.matchMedia("(max-width: 920px)").matches && right) right.scrollIntoView(scrollOpts("start"));
    const target = (lastJump && panel.contains(lastJump)) ? lastJump : panel.querySelector(".q-label");
    if (target) target.focus({ preventScroll: !window.matchMedia("(max-width: 920px)").matches });
  });
  function updateBack() {
    backBtn.textContent = "回第 " + current + " 题";
    if (lastJump && lastJump.closest(".q") && lastJump.closest(".q").dataset.q !== current) lastJump = null;
  }

  // Paragraph paging
  const paras = Array.from(document.querySelectorAll(".study .passage .para"));
  const pageStatus = document.getElementById("page-status");
  const pagePrev = document.querySelector(".page-prev");
  const pageNext = document.querySelector(".page-next");
  const pageCount = document.querySelector(".page-count");
  let page = 0;

  function writeHash() {
    try { history.replaceState(null, "", "#q" + current + "&p" + (page + 1)); } catch (err) {}
  }

  function showPage(idx, opts) {
    if (!paras.length) return;
    opts = opts || {};
    page = Math.max(0, Math.min(paras.length - 1, idx));
    paras.forEach((p, i) => { p.hidden = i !== page; });
    if (pagePrev) pagePrev.disabled = page === 0;
    if (pageNext) pageNext.disabled = page === paras.length - 1;
    if (pageCount) pageCount.textContent = (page + 1) + " / " + paras.length;
    if (backBtn.parentNode && backBtn.closest(".para") !== paras[page]) backBtn.hidden = true;
    if (opts.hash !== false) writeHash();
    if (opts.announce && pageStatus) pageStatus.textContent = "第 " + (page + 1) + " 段，共 " + paras.length + " 段";
    if (opts.focus) paras[page].focus({ preventScroll: true });
  }
  if (pagePrev) pagePrev.addEventListener("click", () => showPage(page - 1, { announce: true }));
  if (pageNext) pageNext.addEventListener("click", () => showPage(page + 1, { announce: true }));

  const studyLeft = document.querySelector(".study-left");
  document.addEventListener("keydown", (e) => {
    if (!paras.length || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    const inLeft = studyLeft && studyLeft.contains(a) && !(a.closest && a.closest(".q-switcher"));
    const onBody = !a || a === document.body || a === document.documentElement;
    if (!inLeft && !onBody) return;
    e.preventDefault();
    showPage(page + (e.key === "ArrowRight" ? 1 : -1), { announce: true, focus: true });
  });

  function readHash() {
    const h = (location.hash || "").replace(/^#/, "");
    const out = {};
    h.split("&").forEach((part) => {
      let m = /^q(\d+)$/i.exec(part); if (m) out.q = m[1];
      m = /^p(\d+)$/i.exec(part); if (m) out.p = Number(m[1]);
    });
    return out;
  }

  if (qPanels.length) {
    const h = readHash();
    let initial = qPanels[0].dataset.q;
    if (h.q && qPanels.some((p) => p.dataset.q === h.q)) initial = h.q;
    showQuestion(initial, false, false);
  }
  showPage(((readHash().p || 1) - 1), { hash: false });

  window.addEventListener("hashchange", () => {
    const h = readHash();
    if (h.p) showPage(h.p - 1, { announce: true, focus: true });
    if (h.q && h.q !== current && qPanels.some((p) => p.dataset.q === h.q)) showQuestion(h.q, false, false);
    writeHash();
  });

  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = document.getElementById(el.dataset.jump);
      if (!target) return;
      const para = target.closest(".para") || target;
      const idx = paras.indexOf(para);
      if (idx >= 0 && idx !== page) showPage(idx, { announce: true });
      document.querySelectorAll(".para.is-lit").forEach((p) => p.classList.remove("is-lit"));
      para.classList.add("is-lit");
      lastJump = el;
      para.appendChild(backBtn);
      backBtn.hidden = false;
      updateBack();
      const r = target.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight - 80) target.scrollIntoView(scrollOpts("center"));
      target.focus({ preventScroll: true });
    });
  });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
