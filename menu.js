// ==========================================================================
// MOBO BEACH CLUB — menu page
//
// Two-level filtering: group tabs, then a sub-category filter inside the
// active group. Progressive enhancement — with JS off, every panel and every
// category is visible and the tabs behave as plain anchors.
//
// URL: #group  or  #group/category
// ==========================================================================

(function () {
    "use strict";

    const tabsBar = document.getElementById("m-tabs");
    const body = document.getElementById("m-body");
    if (!tabsBar || !body) return;

    const tabs = [...tabsBar.querySelectorAll(".m-tab")];
    const panels = [...body.querySelectorAll(".m-panel")];
    if (!tabs.length || !panels.length) return;

    // Tells the stylesheet it may start hiding things.
    document.documentElement.classList.add("js-menu");

    // A Map rather than a plain object: these keys are looked up straight from
    // the URL hash, and on an object "#constructor" would hit Object.prototype
    // and pass as a real group.
    const byGroup = new Map(panels.map(panel => [panel.dataset.group, {
        panel,
        tab: tabsBar.querySelector(`.m-tab[data-group="${panel.dataset.group}"]`),
        select: panel.querySelector(".m-sub__select"),
        chips: [...panel.querySelectorAll(".m-sub__chip")],
        cats: [...panel.querySelectorAll(".m-cat")]
    }]));

    const groupIds = panels.map(p => p.dataset.group);
    const state = { group: groupIds[0], sub: "all" };

    // --- ARIA -------------------------------------------------------------
    tabsBar.querySelector(".m-tabs__list").setAttribute("role", "tablist");
    tabs.forEach(tab => {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", tab.dataset.group);
    });
    panels.forEach(panel => {
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("tabindex", "-1");
    });

    // --- rendering --------------------------------------------------------
    function render() {
        groupIds.forEach(id => {
            const g = byGroup.get(id);
            const on = id === state.group;

            g.panel.hidden = !on;
            g.tab.classList.toggle("is-current", on);
            g.tab.setAttribute("aria-selected", String(on));
            // Only the active tab stays in the tab sequence; arrows move between.
            g.tab.setAttribute("tabindex", on ? "0" : "-1");

            if (!on) return;

            g.cats.forEach(cat => {
                cat.hidden = !(state.sub === "all" || cat.dataset.sub === state.sub);
            });
            g.chips.forEach(chip => {
                chip.classList.toggle("is-current", chip.dataset.sub === state.sub);
            });
            if (g.select && g.select.value !== state.sub) g.select.value = state.sub;
        });
    }

    function hash() {
        return `#${state.group}${state.sub === "all" ? "" : `/${state.sub}`}`;
    }

    function go(group, sub, push) {
        const g = byGroup.get(group);
        if (!g) return;
        // A sub-category that does not belong to this group falls back to All.
        const inGroup = sub === "all" || g.cats.some(c => c.dataset.sub === sub);

        state.group = group;
        state.sub = inGroup ? sub : "all";
        render();
        if (push) history.pushState(null, "", hash());
    }

    // --- URL --------------------------------------------------------------
    function fromHash() {
        const raw = location.hash.replace(/^#/, "");
        if (!raw) return { group: groupIds[0], sub: "all" };

        const bits = raw.split("/");
        if (byGroup.has(bits[0])) return { group: bits[0], sub: bits[1] || "all" };

        // A bare category id (an old link, or one shared before grouping):
        // open whichever group contains it.
        const owner = groupIds.find(id =>
            byGroup.get(id).cats.some(c => c.dataset.sub === bits[0])
        );
        if (owner) return { group: owner, sub: bits[0] };

        return { group: groupIds[0], sub: "all" };
    }

    function applyHash(push) {
        const { group, sub } = fromHash();
        go(group, sub, push);
    }

    // --- events -----------------------------------------------------------
    tabsBar.addEventListener("click", e => {
        const tab = e.target.closest(".m-tab");
        if (!tab) return;
        e.preventDefault();
        go(tab.dataset.group, "all", true);
        scrollToTop();
    });

    body.addEventListener("click", e => {
        const chip = e.target.closest(".m-sub__chip");
        if (!chip) return;
        e.preventDefault();
        go(state.group, chip.dataset.sub, true);
        scrollToTop();
    });

    body.addEventListener("change", e => {
        if (!e.target.classList.contains("m-sub__select")) return;
        go(state.group, e.target.value, true);
        scrollToTop();
    });

    // Roving focus across the tab row.
    tabsBar.addEventListener("keydown", e => {
        const i = tabs.indexOf(document.activeElement);
        if (i === -1) return;
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs.at(-1);
        if (!next) return;
        e.preventDefault();
        next.focus();
        go(next.dataset.group, "all", true);
    });

    window.addEventListener("popstate", () => applyHash(false));
    window.addEventListener("hashchange", () => applyHash(false));

    // Switching filters shortens the page; if the reader is below the tab bar
    // they would otherwise land in the middle of the new, shorter list.
    function scrollToTop() {
        const bar = tabsBar.getBoundingClientRect();
        if (bar.top >= 0) return;
        const y = window.scrollY + bar.top - document.querySelector(".nav").getBoundingClientRect().height;
        window.scrollTo({ top: y, behavior: "smooth" });
    }

    applyHash(false);
})();
