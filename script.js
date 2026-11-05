/* =========================================================
   SILLAGE — navigation, envelope animation, category pages
   ========================================================= */

(function () {
  "use strict";

  const DATA = window.SILLAGE_DATA || [];

  /* ---------- easy-to-edit settings for View 2 ---------- */
  const ARC = {
    radiusX: 0.28,          // 28vw  — how wide the semicircle is
    radiusY: 0.36,          // 36vh  — how tall the semicircle is
    centerY: 0.62,          // envelope centre = 62% of screen height
    angles: [180, 140, 90, 40, 0],                 // 01 → 05 (0° = right, 90° = up)
    labelSide: ["left", "left", "top", "right", "right"]
  };

  const views = {
    home: document.getElementById("view-home"),
    notes: document.getElementById("view-notes"),
    category: document.getElementById("view-category")
  };
  const notesStage = document.getElementById("notes-stage");
  const ingredientList = document.getElementById("ingredients");

  /* ---------- helpers ---------- */
  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // if an image file is missing, show a soft placeholder instead of a broken icon
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  function markMissing(img) {
    if (img.classList.contains("is-missing")) return;
    img.classList.add("is-missing");
    img.dataset.missing = img.getAttribute("src");   // remembers which file is missing
    img.src = BLANK;
  }
  function watchImages(root) {
    root.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () { markMissing(img); }, { once: true });
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) markMissing(img);
    });
  }

  // Optional torn-edge mask for the shimmering-point circles.
  // "" = plain perfect circles (current). To try a mask, put a SQUARE png with a
  // black circle on a transparent background in assets/mask/ and write its path here.
  const MASK_FILE = "";

  // the mask is switched on only if the file really exists.
  // Browsers block CSS masks on pages opened straight from a file (file://),
  // which would make the images vanish — so it only runs through Live Server or online.
  (function detectMask() {
    if (!MASK_FILE || location.protocol === "file:") return;
    const probe = new Image();
    probe.onload = function () {
      document.documentElement.style.setProperty("--mask", 'url("' + MASK_FILE + '")');
      document.documentElement.classList.add("has-mask");
    };
    probe.src = MASK_FILE;
  })();

  /* =================== VIEW 2 — build ingredients =================== */
  function buildIngredients() {
    ingredientList.innerHTML = DATA.map(function (cat, i) {
      const side = ARC.labelSide[i] || "right";
      return (
        '<li class="ingredient" style="--i:' + i + ';--c:' + esc(cat.color || "#EEE") + ';--d:' + esc(cat.deep || "#777") + '">' +
          '<a class="ingredient__link" href="#' + esc(cat.id) + '" aria-label="' + esc(cat.name) + '">' +
            '<img class="ingredient__img" src="' + esc(cat.image) + '" alt="">' +
            '<span class="ingredient__label ingredient__label--' + side + '">' +
              '<span class="ingredient__num">' + esc(cat.num) + '</span>' +
              '<span class="ingredient__name">' + esc(cat.name) + '</span>' +
            '</span>' +
          '</a>' +
        '</li>'
      );
    }).join("");
    watchImages(ingredientList);
    placeIngredients();

    // hovering an ingredient softly tints the big arc behind the envelope with its colour
    ingredientList.querySelectorAll(".ingredient__link").forEach(function (link, i) {
      const cat = DATA[i];
      function on() {
        notesStage.style.setProperty("--hover", cat.color || "#EEE");
        notesStage.classList.add("is-hovering");
      }
      function off() { notesStage.classList.remove("is-hovering"); }
      link.addEventListener("mouseenter", on);
      link.addEventListener("focus", on);
      link.addEventListener("mouseleave", off);
      link.addEventListener("blur", off);
    });
  }

  // compute each ingredient's offset from the envelope centre
  function placeIngredients() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const narrow = w < 860;
    const rx = (narrow ? 0.38 : ARC.radiusX) * w;
    const ry = ARC.radiusY * h;

    ingredientList.querySelectorAll(".ingredient").forEach(function (el, i) {
      const rad = (ARC.angles[i] || 0) * Math.PI / 180;
      el.style.setProperty("--tx", Math.round(Math.cos(rad) * rx) + "px");
      el.style.setProperty("--ty", Math.round(-Math.sin(rad) * ry) + "px");
    });
  }

  function openEnvelope() {
    notesStage.classList.remove("is-open", "is-hovering");
    void notesStage.offsetWidth;                 // restart the animation
    setTimeout(function () { notesStage.classList.add("is-open"); }, 220);
  }

  /* =================== VIEW 3 — category page =================== */
  let current = null;        // current category object
  let activeIndex = -1;
  let hoverLockUntil = 0;    // ignore hover while the column is auto-scrolling
  let detailTimer = null;

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function renderCategory(cat) {
    current = cat;
    activeIndex = -1;

    // the ingredient's colour becomes the theme of its page (also tints the dot cursor)
    const root = document.documentElement;
    root.style.setProperty("--accent", cat.color || "#E4E4E4");
    root.style.setProperty("--deep", cat.deep || "#8A8A8A");

    const keywordsHTML = String(cat.keywords || "").split("/").map(function (k) {
      return k.trim();
    }).filter(Boolean).map(function (k) {
      return '<li>' + esc(k) + '</li>';
    }).join("");

    const pointsHTML = cat.points.map(function (p, i) {
      return (
        '<button class="point" type="button" data-index="' + i + '" aria-label="' + esc(p.name) + '">' +
          '<span class="point__media"><img src="' + esc(p.image) + '" alt=""></span>' +
        '</button>'
      );
    }).join("");

    const listHTML = cat.points.map(function (p, i) {
      return '<li><button class="notes-item" type="button" data-index="' + i + '">' +
               '<span class="notes-item__num">' + pad(i + 1) + '</span>' +
               '<span class="notes-item__name">' + esc(p.name) + '</span>' +
             '</button></li>';
    }).join("");

    views.category.innerHTML =
      '<div class="category">' +

        '<aside class="cat-left">' +
          '<div class="cat-top"><a class="cat-back" href="#notes" aria-label="Back to the ingredients">&larr;</a></div>' +
          '<div class="cat-body">' +
            '<div class="cat-title">' +
              '<p class="cat-label">' + esc(cat.label) + '</p>' +
              '<h2 class="cat-name">' + esc(cat.name) + '</h2>' +
              '<p class="cat-etymology">' + esc(cat.etymology) + '</p>' +
            '</div>' +
            '<div class="cat-figure"><img class="cat-image" src="' + esc(cat.image) + '" alt=""></div>' +
            '<div class="cat-about">' +
              '<p class="cat-subtitle">' + esc(cat.subtitle) + '</p>' +
              '<p class="cat-desc">' + esc(cat.description) + '</p>' +
            '</div>' +
            '<ul class="cat-keywords" aria-label="Keywords">' + keywordsHTML + '</ul>' +
          '</div>' +
        '</aside>' +

        '<div class="cat-points" id="cat-points">' + pointsHTML + '</div>' +

        '<aside class="cat-notes">' +
          '<div class="cat-notes__inner">' +
            '<h3 class="notes-head"><span>The Notes</span><span class="notes-head__count">' + pad(cat.points.length) + '</span></h3>' +
            '<ul class="notes-list">' + listHTML + '</ul>' +
            '<div class="notes-detail" id="notes-detail" aria-live="polite"></div>' +
          '</div>' +
        '</aside>' +

      '</div>';

    watchImages(views.category);

    // ← always returns to the ingredients page
    views.category.querySelector(".cat-back").addEventListener("click", function (e) {
      e.preventDefault();
      location.hash = "notes";
    });

    const column = document.getElementById("cat-points");

    // hover a circle → choose it (no scrolling, so the page doesn't jump under the mouse)
    column.querySelectorAll(".point").forEach(function (btn) {
      btn.addEventListener("mouseenter", function () {
        if (Date.now() < hoverLockUntil) return;
        activate(Number(btn.dataset.index), { scroll: false, touched: true });
      });
      btn.addEventListener("click", function () {
        activate(Number(btn.dataset.index), { scroll: true, touched: true });
      });
    });

    // click a name in THE NOTES → choose it and bring it to the centre
    views.category.querySelectorAll(".notes-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activate(Number(btn.dataset.index), { scroll: true, touched: true });
      });
    });

    // first point is chosen when the page opens (background stays white until the visitor chooses)
    activate(0, { scroll: false, touched: false, instant: true });
    column.scrollTop = 0;
  }

  function activate(index, opts) {
    if (!current) return;
    opts = opts || {};
    const page = views.category.querySelector(".category");
    const column = document.getElementById("cat-points");
    const points = column.querySelectorAll(".point");
    const items = views.category.querySelectorAll(".notes-item");

    if (opts.touched) page.classList.add("is-touched");

    if (index !== activeIndex) {
      points.forEach(function (el, i) { el.classList.toggle("is-active", i === index); });
      items.forEach(function (el, i) { el.classList.toggle("is-active", i === index); });
      showDetail(current.points[index], opts.instant, index);
      activeIndex = index;
    }

    if (opts.scroll && points[index]) {
      const el = points[index];
      const target = el.offsetTop - (column.clientHeight - el.offsetHeight) / 2;
      hoverLockUntil = Date.now() + 900;
      column.scrollTo({ top: target, behavior: "smooth" });
    }
  }

  // the chosen point, laid out like a fragrance sheet (same language as THE LABEL)
  function showDetail(p, instant, index) {
    const box = document.getElementById("notes-detail");
    if (!box || !p) return;

    // the three notes of the "perfume": top → heart → base, with a little timeline
    const NOTES = [
      ["top",   "Top note",   "Inspiration"],
      ["heart", "Heart note", "Medium"],
      ["base",  "Base note",  "Strategy"]
    ];
    const notesHTML = NOTES.map(function (n, i) {
      if (!p[n[0]]) return "";
      const pos = (i / (NOTES.length - 1)) * 100;
      return (
        '<li class="sheet-note sheet-note--' + n[0] + '">' +
          '<div class="sheet-note__head"><span>[' + n[1] + ']</span><span>' + n[2] + '</span></div>' +
          '<div class="sheet-note__line" aria-hidden="true"><i style="left:' + pos + '%"></i></div>' +
          '<p class="sheet-note__text">' + esc(p[n[0]]) + '</p>' +
        '</li>'
      );
    }).join("");

    let html =
      '<article class="sheet">' +
        '<div class="sheet__frame">' +
          '<header class="sheet__head">' +
            '<span>No. ' + pad((index || 0) + 1) + ' / ' + pad(current.points.length) + '</span>' +
            '<span>Shimmering point</span>' +
          '</header>' +
          '<h4 class="sheet__name">' + esc(p.name) + '</h4>' +
          (notesHTML ? '<ul class="sheet__notes">' + notesHTML + '</ul>' : '') +
          (!notesHTML && p.why ? '<p class="sheet__why">' + esc(p.why) + '</p>' : '') +
          (p.note ?
            '<dl class="sheet__field"><dt>Personal note:</dt><dd>' + esc(p.note) + '</dd></dl>' : '') +
          '<footer class="sheet__foot">' +
            (p.link ?
              '<a class="sheet__link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' +
                'Explore more <span class="sheet__arrow">&nearr;</span></a>' : '<span></span>') +
            '<span class="sheet__sign">' + esc(current.name) + '</span>' +
          '</footer>' +
        '</div>' +
      '</article>';

    clearTimeout(detailTimer);
    if (instant) { box.innerHTML = html; box.classList.remove("is-changing"); return; }

    box.classList.add("is-changing");
    detailTimer = setTimeout(function () {
      box.innerHTML = html;
      box.classList.remove("is-changing");
    }, 260);
  }

  /* =================== routing (#home, #notes, #peonique …) =================== */
  function show(name) {
    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle("is-active", key === name);
    });
    // spray cursor on pages 1–2, plain grey dot cursor on the category pages
    document.documentElement.classList.toggle("mode-dot", name === "category");
  }

  function route() {
    const hash = decodeURIComponent(location.hash.replace("#", "")).toLowerCase() || "home";
    const cat = DATA.find(function (c) { return c.id === hash; });

    if (hash === "notes") {
      show("notes");
      openEnvelope();
    } else if (cat) {
      renderCategory(cat);
      show("category");
    } else {
      show("home");
      notesStage.classList.remove("is-open");
    }
  }

  // Esc goes one step back
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (views.category.classList.contains("is-active")) location.hash = "notes";
    else if (views.notes.classList.contains("is-active")) location.hash = "home";
  });

  window.addEventListener("resize", placeIngredients);
  window.addEventListener("hashchange", route);

  buildIngredients();
  route();
})();
