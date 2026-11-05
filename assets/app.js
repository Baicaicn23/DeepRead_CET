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

  if (passage) {
    let view = "bilingual";
    try { view = localStorage.getItem(VIEW_KEY) || "bilingual"; } catch (err) {}
    setView(view);
  }

  const article = document.querySelector(".article-wrap");
  document.querySelectorAll("[data-type]").forEach((btn) => {
    btn.addEventListener("click", () => {
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

  document.querySelectorAll("[data-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = document.getElementById(el.dataset.jump);
      if (!target) return;
      document.querySelectorAll(".para.is-lit").forEach((p) => p.classList.remove("is-lit"));
      target.classList.add("is-lit");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
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
