/* =========================================================
   SILLAGE — perfume cursor, "칙" spray sound, mist
   ========================================================= */

(function () {
  "use strict";

  /* ---------- easy-to-edit settings ---------- */
  const FILES = {
    idle:  "assets/cursor/hand-idle.png",
    spray: "assets/cursor/spray.png",
    sound: "assets/sound/perfume-spray.wav"
  };
  const VOLUME = 0.6;
  const MIST = {
    count: 20,
    angle: -135,          // spray direction in degrees: 0 = right, -90 = up, -135 = up-left, 180 = left
    spread: 50,           // width of the spray cone in degrees
    distance: [30, 110],  // how far particles drift (px)
    size: [2, 6],         // particle size (px)
    duration: 800         // fade-out time (ms)
  };
  const FOLLOW = 0.45;    // 1 = cursor sticks exactly to the mouse, lower = softer glide
  const PRESS_MS = 150;   // how long the "pressing" hand shows

  const root = document.documentElement;
  const cursor = document.getElementById("cursor");
  const cursorImg = document.getElementById("cursor-img");
  const toggle = document.getElementById("sound-toggle");
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ---------- sound ---------- */
  const baseAudio = new Audio(FILES.sound);
  baseAudio.preload = "auto";

  let soundOn = true;
  try { soundOn = localStorage.getItem("sillage-sound") !== "off"; } catch (e) { /* ignore */ }

  function renderToggle() {
    toggle.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    toggle.setAttribute("aria-pressed", String(soundOn));
  }
  renderToggle();

  toggle.addEventListener("click", function () {
    soundOn = !soundOn;
    try { localStorage.setItem("sillage-sound", soundOn ? "on" : "off"); } catch (e) { /* ignore */ }
    renderToggle();
  });

  function playSpray() {
    if (!soundOn) return;
    const a = baseAudio.cloneNode();   // a fresh copy each time → rapid clicks overlap
    a.volume = VOLUME;
    const p = a.play();
    if (p && p.catch) p.catch(function () { /* browser blocked or file missing */ });
  }

  /* ---------- touch devices: no custom cursor, sound only ---------- */
  if (isTouch) {
    root.classList.remove("custom-cursor");
    document.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest("#sound-toggle")) return;
      if (root.classList.contains("mode-dot")) return;
      playSpray();
    });
    return;
  }

  /* ---------- custom cursor ---------- */
  // if the hand image is missing, fall back to the normal mouse pointer
  cursorImg.addEventListener("error", function () { root.classList.remove("custom-cursor"); });
  new Image().src = FILES.spray;   // preload the pressing hand

  // plain grey dot cursor used on the category pages (html.mode-dot, set by script.js)
  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);

  function inDotMode() { return root.classList.contains("mode-dot"); }

  // the dot grows softly over anything clickable
  document.addEventListener("mouseover", function (e) {
    const hit = e.target.closest && e.target.closest("a, button");
    dot.classList.toggle("is-hover", !!hit);
  });

  let mouseX = -200, mouseY = -200;
  let drawX = -200, drawY = -200;
  let hotX = 0, hotY = 0;

  function readHotspot() {
    const css = getComputedStyle(root);
    hotX = parseFloat(css.getPropertyValue("--cursor-x")) || 0;
    hotY = parseFloat(css.getPropertyValue("--cursor-y")) || 0;
  }
  readHotspot();

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!cursor.classList.contains("is-visible")) {
      drawX = mouseX; drawY = mouseY;          // jump straight there the first time
      cursor.classList.add("is-visible");
      dot.classList.add("is-visible");
    }
  });
  document.addEventListener("mouseleave", function () {
    cursor.classList.remove("is-visible");
    dot.classList.remove("is-visible");
  });

  (function loop() {
    drawX += (mouseX - drawX) * FOLLOW;
    drawY += (mouseY - drawY) * FOLLOW;
    cursor.style.transform =
      "translate3d(" + (drawX - hotX).toFixed(1) + "px," + (drawY - hotY).toFixed(1) + "px,0)";
    dot.style.transform =
      "translate3d(" + drawX.toFixed(1) + "px," + drawY.toFixed(1) + "px,0)";
    requestAnimationFrame(loop);
  })();

  /* ---------- click = spray ---------- */
  let pressTimer = null;

  document.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    if (inDotMode()) return;   // category pages: no spray, sound or mist

    // hand presses the nozzle
    clearTimeout(pressTimer);
    cursorImg.src = FILES.spray;
    cursor.classList.add("is-spraying");
    pressTimer = setTimeout(function () {
      cursorImg.src = FILES.idle;
      cursor.classList.remove("is-spraying");
    }, PRESS_MS);

    if (!(e.target.closest && e.target.closest("#sound-toggle"))) playSpray();
    mist(e.clientX, e.clientY);
  });

  /* ---------- mist particles ---------- */
  function rand(min, max) { return min + Math.random() * (max - min); }

  function mist(x, y) {
    if (!document.body.animate) return;
    for (let i = 0; i < MIST.count; i++) {
      const dot = document.createElement("span");
      dot.className = "mist";
      const s = rand(MIST.size[0], MIST.size[1]);
      dot.style.width = s + "px";
      dot.style.height = s + "px";
      document.body.appendChild(dot);

      const angle = (MIST.angle + rand(-MIST.spread / 2, MIST.spread / 2)) * Math.PI / 180;
      const dist = rand(MIST.distance[0], MIST.distance[1]);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - rand(0, 14);   // a little lift, like real mist
      const start = "translate(" + (x - s / 2) + "px," + (y - s / 2) + "px)";
      const end = "translate(" + (x - s / 2 + dx) + "px," + (y - s / 2 + dy) + "px)";

      dot.animate(
        [
          { transform: start + " scale(0.6)", opacity: 0.9 },
          { transform: end + " scale(1.8)", opacity: 0 }
        ],
        {
          duration: MIST.duration * rand(0.7, 1.1),
          easing: "cubic-bezier(0.2, 0.8, 0.3, 1)",
          fill: "forwards"
        }
      ).onfinish = function () { dot.remove(); };
    }
  }

  window.addEventListener("resize", readHotspot);
})();
