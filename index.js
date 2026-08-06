// ==========================================================================
// MOBO BEACH CLUB — navbar behaviour
// Theme is resolved by the inline <head> script; this file only handles
// switching it afterwards, plus the mobile panel and the scrolled state.
// ==========================================================================

(function () {
    "use strict";

    const root = document.documentElement;
    const nav = document.getElementById("nav");
    const menu = document.getElementById("nav-menu");
    const burger = document.getElementById("nav-burger");
    const themeBtn = document.getElementById("theme-toggle");
    const desktop = window.matchMedia("(min-width: 64rem)");

    // --- theme ------------------------------------------------------------
    // The two labels come from the markup so translated pages announce their own
    // language; the English defaults are only a safety net if a page omits them.
    function applyTheme(theme) {
        root.dataset.theme = theme;
        const toDark = theme === "light";
        themeBtn.setAttribute("aria-label", toDark
            ? themeBtn.dataset.labelDark || "Switch to dark mode"
            : themeBtn.dataset.labelLight || "Switch to light mode");
        themeBtn.setAttribute("aria-pressed", String(theme === "dark"));
    }

    applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

    themeBtn.addEventListener("click", () => {
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(next);
        try {
            localStorage.setItem("mobo-theme", next);
        } catch {
            /* private mode — the toggle still works for this session */
        }
    });

    // Deliberately does NOT follow the OS colour scheme. The site opens light,
    // and only the toggle switches it — matching the inline script in <head>.

    // --- mobile panel -----------------------------------------------------
    function setMenu(open) {
        menu.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open
            ? burger.dataset.labelClose || "Close menu"
            : burger.dataset.labelOpen || "Open menu");
    }

    burger.addEventListener("click", () => {
        setMenu(burger.getAttribute("aria-expanded") !== "true");
    });

    menu.addEventListener("click", e => {
        if (e.target.closest(".nav__link")) setMenu(false);
    });

    document.addEventListener("keydown", e => {
        if (e.key !== "Escape" || burger.getAttribute("aria-expanded") !== "true") return;
        setMenu(false);
        burger.focus();
    });

    document.addEventListener("click", e => {
        if (burger.getAttribute("aria-expanded") !== "true") return;
        if (!e.target.closest(".nav__inner")) setMenu(false);
    });

    // Crossing into desktop leaves the panel class stale otherwise.
    desktop.addEventListener("change", e => {
        if (e.matches) setMenu(false);
    });

    // --- language menu ----------------------------------------------------
    // A plain disclosure: the list is real links, so it still works without JS
    // once opened, and hidden is the only state JS touches.
    const langBtn = document.getElementById("lang-toggle");
    const langList = document.getElementById("lang-list");

    if (langBtn && langList) {
        const setLang = open => {
            langList.hidden = !open;
            langBtn.setAttribute("aria-expanded", String(open));
        };

        langBtn.addEventListener("click", e => {
            // Without this the document handler below sees the same click and
            // closes the list in the same tick it was opened.
            e.stopPropagation();
            setLang(langBtn.getAttribute("aria-expanded") !== "true");
        });

        document.addEventListener("click", e => {
            if (!e.target.closest("#nav-lang")) setLang(false);
        });

        document.addEventListener("keydown", e => {
            if (e.key !== "Escape" || langBtn.getAttribute("aria-expanded") !== "true") return;
            setLang(false);
            langBtn.focus();
        });

        // The panel is anchored to the button, so it would drift off on a resize.
        desktop.addEventListener("change", () => setLang(false));
    }

    // --- hero background video (small screens only) -----------------------
    // Desktop uses a still declared in CSS, so the source is attached here
    // rather than in the markup — otherwise every desktop visitor would pull
    // 1.67 MB they never see.
    const video = document.getElementById("hero-video");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = !!navigator.connection?.saveData;

    function wantsVideo() {
        return !desktop.matches && !reduceMotion.matches && !saveData;
    }

    // Runs on load and on every breakpoint change: crossing up to desktop has to
    // hide and pause an already-loaded video, or it keeps covering the still.
    function syncHeroBackdrop() {
        // Pages without a hero (the menu) share this file — nothing to sync.
        if (!video) return;

        const bg = video.parentNode;

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

        // Four language copies of this markup exist; if one loses its data-src,
        // fall back to the still rather than requesting "undefined".
        if (!video.dataset.src) {
            bg.classList.add("is-still");
            return;
        }

        bg.classList.remove("is-still");

        if (!video.dataset.loaded) {
            video.dataset.loaded = "1";
            // muted is what actually keeps it silent in the page; the file itself
            // still carries an audio track.
            video.muted = true;
            // The path comes from the markup, not from here: translated pages sit
            // one folder down, so a literal "assets/p.mp4" would resolve against
            // /fr/ and 404. Each page states its own relative path.
            video.src = video.dataset.src;
            video.addEventListener("canplay", () => {
                video.classList.add("is-ready");
            }, { once: true });
        } else {
            video.classList.add("is-ready");
        }

        video.play()?.catch(() => {
            // Autoplay refused — the still shows through instead.
            video.classList.remove("is-ready");
            bg.classList.add("is-still");
        });
    }

    syncHeroBackdrop();
    desktop.addEventListener("change", syncHeroBackdrop);
    reduceMotion.addEventListener("change", syncHeroBackdrop);

    // --- dishes carousel --------------------------------------------------
    // The track is a native scroll container, so touch, trackpad and keyboard
    // already work. This only drives the arrows and their disabled states.
    (function () {
        const track = document.getElementById("dishes-track");
        const prev = document.getElementById("dishes-prev");
        const next = document.getElementById("dishes-next");
        if (!track || !prev || !next) return;

        const originals = [...track.children];
        if (!originals.length) return;

        // Looping needs a copy on BOTH sides: a native scroller cannot go below
        // scrollLeft 0, so with only a trailing copy you could never scroll
        // backwards past the first card. Sitting in the middle set leaves room
        // in both directions, and the jump between identical sets is invisible.
        function cloneOf(node) {
            const c = node.cloneNode(true);
            c.setAttribute("aria-hidden", "true");
            c.dataset.clone = "1";
            return c;
        }
        // prepend/append take the nodes in argument order, so each set lands in
        // the same order as the originals.
        track.prepend(...originals.map(cloneOf));
        track.append(...originals.map(cloneOf));

        function setWidth() {
            // distance from the first leading clone to the first original —
            // exactly one set, gap included
            return originals[0].offsetLeft - track.firstElementChild.offsetLeft;
        }

        function step() {
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return originals[0].getBoundingClientRect().width + gap;
        }

        // Snapping fights an instant scrollLeft write, so it is switched off for
        // the single frame the jump happens in.
        function jump(to) {
            const snap = track.style.scrollSnapType;
            track.style.scrollSnapType = "none";
            track.scrollLeft = to;
            requestAnimationFrame(() => { track.style.scrollSnapType = snap; });
        }

        function wrap() {
            const w = setWidth();
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

        prev.addEventListener("click", () => nudge(-1));
        next.addEventListener("click", () => nudge(1));
        track.addEventListener("scroll", wrap, { passive: true });
        window.addEventListener("resize", () => jump(setWidth()));

        // Start in the middle set. Images are lazy, so widths are only final
        // once layout has settled.
        function start() { jump(setWidth()); }
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start);
    })();

    // --- footer year ------------------------------------------------------
    const year = document.getElementById("foot-year");
    if (year) year.textContent = new Date().getFullYear();

    // --- scrolled state ---------------------------------------------------
    let ticking = false;

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            nav.classList.toggle("is-scrolled", window.scrollY > 8);
            ticking = false;
        });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
})();
