/* =========================================================
   SILLAGE — THE LABEL (popup card)
   Text comes from window.SILLAGE_LABEL in data.js.
   ========================================================= */

(function () {
  "use strict";

  const L = window.SILLAGE_LABEL;
  const DATA = window.SILLAGE_DATA || [];
  const overlay = document.getElementById("label");
  const card = document.getElementById("label-card");
  if (!L || !overlay || !card) return;

  let lastTrigger = null;
  let closeTimer = null;

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // "5 ingredients · 17 notes", counted from data.js
  function composedOf() {
    const points = DATA.reduce(function (n, c) { return n + (c.points ? c.points.length : 0); }, 0);
    return DATA.length + " ingredients · " + points + " notes";
  }

  function build() {
    const fields = (L.fields || []).map(function (f) {
      const value = f.value || (f.label === "Composed of" ? composedOf() : "");
      return (
        '<div class="label-field">' +
          '<dt>' + esc(f.label) + ':</dt>' +
          '<dd>' + esc(value) + '</dd>' +
        '</div>'
      );
    }).join("");

    // three note rows, styled like a product spec with a little timeline
    const notes = (L.notes || []).map(function (n, i, all) {
      const pos = all.length > 1 ? (i / (all.length - 1)) * 100 : 0;
      return (
        '<li class="label-note">' +
          '<div class="label-note__head">' +
            '<span>[' + esc(n.tag) + ']</span>' +
            '<span>' + esc(n.word) + '</span>' +
          '</div>' +
          '<div class="label-note__line" aria-hidden="true"><i style="left:' + pos + '%"></i></div>' +
          '<p class="label-note__text">' + esc(n.text) + '</p>' +
        '</li>'
      );
    }).join("");

    card.innerHTML =
      '<div class="label-card__frame">' +
        '<header class="label-head">' +
          '<h2 class="label-title" id="label-title">' + esc(L.title) + '</h2>' +
          '<p class="label-tagline">' + esc(L.tagline) + '</p>' +
        '</header>' +

        '<dl class="label-fields">' + fields + '</dl>' +

        '<section class="label-section">' +
          '<h3 class="label-section__title">' + esc(L.whyTitle) + ':</h3>' +
          '<p class="label-why">' + esc(L.why) + '</p>' +
        '</section>' +

        '<section class="label-section">' +
          '<h3 class="label-section__title">' + esc(L.howTitle) + ':</h3>' +
          '<p class="label-small">' + esc(L.howIntro) + '</p>' +
          '<ul class="label-notes">' + notes + '</ul>' +
          '<p class="label-small label-small--end">' + esc(L.howOutro) + '</p>' +
        '</section>' +

        '<footer class="label-foot">' +
          '<button class="label-close" type="button">[&times;] Close</button>' +
          '<span class="label-sign">' + esc(L.footer) + '</span>' +
        '</footer>' +
      '</div>';

    card.querySelector(".label-close").addEventListener("click", close);
  }

  function open(trigger) {
    clearTimeout(closeTimer);
    lastTrigger = trigger || null;
    build();
    overlay.hidden = false;
    void overlay.offsetWidth;                 // let the fade-in run
    overlay.classList.add("is-open");
    document.documentElement.classList.add("label-open");
    overlay.scrollTop = 0;
    const btn = card.querySelector(".label-close");
    if (btn) btn.focus({ preventScroll: true });
  }

  function close() {
    if (overlay.hidden) return;
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("label-open");
    closeTimer = setTimeout(function () { overlay.hidden = true; }, 500);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  window.SillageLabel = {
    isOpen: function () { return !overlay.hidden && overlay.classList.contains("is-open"); },
    close: close
  };

  // any element with data-open-label opens the card
  document.addEventListener("click", function (e) {
    const t = e.target.closest && e.target.closest("[data-open-label]");
    if (t) { e.preventDefault(); open(t); }
  });

  // click on the blurred background closes it
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });

  // Esc closes the card first (before any page navigation)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && window.SillageLabel.isOpen()) {
      e.stopImmediatePropagation();
      close();
    }
  }, true);
})();
