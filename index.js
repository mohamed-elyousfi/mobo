// ==========================================================================
// MOBO BEACH CLUB — navbar behaviour
// Theme is resolved by the inline <head> script; this file only handles
// switching it afterwards, plus the mobile panel and the scrolled state.
// ==========================================================================

(function () {
    "use strict";

    var root = document.documentElement;
    var nav = document.getElementById("nav");
    var menu = document.getElementById("nav-menu");
    var burger = document.getElementById("nav-burger");
    var themeBtn = document.getElementById("theme-toggle");
    var desktop = window.matchMedia("(min-width: 64rem)");

    // --- theme ------------------------------------------------------------
    function applyTheme(theme) {
        root.dataset.theme = theme;
        var toDark = theme === "light";
        themeBtn.setAttribute("aria-label", toDark ? "Switch to dark mode" : "Switch to light mode");
        themeBtn.setAttribute("aria-pressed", String(theme === "dark"));
    }

    applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

    themeBtn.addEventListener("click", function () {
        var next = root.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        try {
            localStorage.setItem("mobo-theme", next);
        } catch (e) {
            /* private mode — the toggle still works for this session */
        }
    });

    // Follow the OS only while the visitor hasn't made a choice of their own.
    var osScheme = window.matchMedia("(prefers-color-scheme: dark)");
    osScheme.addEventListener("change", function (e) {
        var stored;
        try {
            stored = localStorage.getItem("mobo-theme");
        } catch (err) {
            stored = null;
        }
        if (!stored) applyTheme(e.matches ? "dark" : "light");
    });

    // --- mobile panel -----------------------------------------------------
    function setMenu(open) {
        menu.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    burger.addEventListener("click", function () {
        setMenu(burger.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", function (e) {
        if (e.target.closest(".nav__link")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key !== "Escape" || burger.getAttribute("aria-expanded") !== "true") return;
        setMenu(false);
        burger.focus();
    });

    document.addEventListener("click", function (e) {
        if (burger.getAttribute("aria-expanded") !== "true") return;
        if (!e.target.closest(".nav__inner")) setMenu(false);
    });

    // Crossing into desktop leaves the panel class stale otherwise.
    desktop.addEventListener("change", function (e) {
        if (e.matches) setMenu(false);
    });

    // --- hero background video (small screens only) -----------------------
    // Desktop uses a still declared in CSS, so the source is attached here
    // rather than in the markup — otherwise every desktop visitor would pull
    // 1.67 MB they never see.
    var video = document.getElementById("hero-video");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var conn = navigator.connection;
    var saveData = !!(conn && conn.saveData);

    function wantsVideo() {
        return !desktop.matches && !reduceMotion.matches && !saveData;
    }

    // Runs on load and on every breakpoint change: crossing up to desktop has to
    // hide and pause an already-loaded video, or it keeps covering the still.
    function syncHeroBackdrop() {
        // Pages without a hero (the menu) share this file — nothing to sync.
        if (!video) return;

        var bg = video.parentNode;

        if (desktop.matches) {
            if (video.dataset.loaded) {
                video.pause();
                video.classList.remove("is-ready");
            }
            bg.classList.remove("is-still");
            return;
        }

        if (!wantsVideo()) {
            // Data saver has no CSS query to hook, so fall back to the still here.
            bg.classList.add("is-still");
            return;
        }

        bg.classList.remove("is-still");

        if (!video.dataset.loaded) {
            video.dataset.loaded = "1";
            // muted is what actually keeps it silent in the page; the file itself
            // still carries an audio track.
            video.muted = true;
            video.src = "assets/p.mp4";
            video.addEventListener("canplay", function () {
                video.classList.add("is-ready");
            }, { once: true });
        } else {
            video.classList.add("is-ready");
        }

        var started = video.play();
        if (started && started.catch) {
            started.catch(function () {
                // Autoplay refused — the still shows through instead.
                video.classList.remove("is-ready");
                bg.classList.add("is-still");
            });
        }
    }

    syncHeroBackdrop();
    desktop.addEventListener("change", syncHeroBackdrop);
    reduceMotion.addEventListener("change", syncHeroBackdrop);

    // --- dishes carousel --------------------------------------------------
    // The track is a native scroll container, so touch, trackpad and keyboard
    // already work. This only drives the arrows and their disabled states.
    (function () {
        var track = document.getElementById("dishes-track");
        var prev = document.getElementById("dishes-prev");
        var next = document.getElementById("dishes-next");
        if (!track || !prev || !next) return;

        var originals = Array.prototype.slice.call(track.children);
        if (!originals.length) return;

        // Looping needs a copy on BOTH sides: a native scroller cannot go below
        // scrollLeft 0, so with only a trailing copy you could never scroll
        // backwards past the first card. Sitting in the middle set leaves room
        // in both directions, and the jump between identical sets is invisible.
        function cloneOf(node) {
            var c = node.cloneNode(true);
            c.setAttribute("aria-hidden", "true");
            c.dataset.clone = "1";
            return c;
        }
        for (var i = originals.length - 1; i >= 0; i--) {
            track.insertBefore(cloneOf(originals[i]), track.firstChild);
        }
        originals.forEach(function (li) { track.appendChild(cloneOf(li)); });

        function setWidth() {
            // distance from the first leading clone to the first original —
            // exactly one set, gap included
            return originals[0].offsetLeft - track.firstElementChild.offsetLeft;
        }

        function step() {
            var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return originals[0].getBoundingClientRect().width + gap;
        }

        // Snapping fights an instant scrollLeft write, so it is switched off for
        // the single frame the jump happens in.
        function jump(to) {
            var snap = track.style.scrollSnapType;
            track.style.scrollSnapType = "none";
            track.scrollLeft = to;
            requestAnimationFrame(function () { track.style.scrollSnapType = snap; });
        }

        function wrap() {
            var w = setWidth();
            if (w <= 0) return;
            // Wrap at the set boundaries rather than the hard ends, so a jump is
            // never needed mid-gesture at scrollLeft 0 or scrollWidth.
            if (track.scrollLeft >= w * 2) jump(track.scrollLeft - w);
            else if (track.scrollLeft < w * 0.5) jump(track.scrollLeft + w);
        }

        function nudge(dir) {
            track.scrollBy({
                left: dir * step(),
                behavior: reduceMotion.matches ? "auto" : "smooth"
            });
        }

        prev.addEventListener("click", function () { nudge(-1); });
        next.addEventListener("click", function () { nudge(1); });
        track.addEventListener("scroll", wrap, { passive: true });
        window.addEventListener("resize", function () { jump(setWidth()); });

        // Start in the middle set. Images are lazy, so widths are only final
        // once layout has settled.
        function start() { jump(setWidth()); }
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start);
    })();

    // --- footer year ------------------------------------------------------
    var year = document.getElementById("foot-year");
    if (year) year.textContent = new Date().getFullYear();

    // --- scrolled state ---------------------------------------------------
    var ticking = false;

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            nav.classList.toggle("is-scrolled", window.scrollY > 8);
            ticking = false;
        });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
})();
