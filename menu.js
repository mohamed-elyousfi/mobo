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

    var tabsBar = document.getElementById("m-tabs");
    var body = document.getElementById("m-body");
    if (!tabsBar || !body) return;

    var tabs = Array.prototype.slice.call(tabsBar.querySelectorAll(".m-tab"));
    var panels = Array.prototype.slice.call(body.querySelectorAll(".m-panel"));
    if (!tabs.length || !panels.length) return;

    // Tells the stylesheet it may start hiding things.
    document.documentElement.classList.add("js-menu");

    var byGroup = {};
    panels.forEach(function (panel) {
        byGroup[panel.dataset.group] = {
            panel: panel,
            tab: tabsBar.querySelector('.m-tab[data-group="' + panel.dataset.group + '"]'),
            select: panel.querySelector(".m-sub__select"),
            chips: Array.prototype.slice.call(panel.querySelectorAll(".m-sub__chip")),
            cats: Array.prototype.slice.call(panel.querySelectorAll(".m-cat"))
        };
    });

    var groupIds = panels.map(function (p) { return p.dataset.group; });
    var state = { group: groupIds[0], sub: "all" };

    // --- ARIA -------------------------------------------------------------
    tabsBar.querySelector(".m-tabs__list").setAttribute("role", "tablist");
    tabs.forEach(function (tab) {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", tab.dataset.group);
    });
    panels.forEach(function (panel) {
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("tabindex", "-1");
    });

    // --- rendering --------------------------------------------------------
    function render() {
        groupIds.forEach(function (id) {
            var g = byGroup[id];
            var on = id === state.group;

            g.panel.hidden = !on;
            g.tab.classList.toggle("is-current", on);
            g.tab.setAttribute("aria-selected", String(on));
            // Only the active tab stays in the tab sequence; arrows move between.
            g.tab.setAttribute("tabindex", on ? "0" : "-1");

            if (!on) return;

            g.cats.forEach(function (cat) {
                cat.hidden = !(state.sub === "all" || cat.dataset.sub === state.sub);
            });
            g.chips.forEach(function (chip) {
                chip.classList.toggle("is-current", chip.dataset.sub === state.sub);
            });
            if (g.select && g.select.value !== state.sub) g.select.value = state.sub;
        });
    }

    function hash() {
        return "#" + state.group + (state.sub === "all" ? "" : "/" + state.sub);
    }

    function go(group, sub, push) {
        if (!byGroup[group]) return;
        var g = byGroup[group];
        // A sub-category that does not belong to this group falls back to All.
        if (sub !== "all" && !g.cats.some(function (c) { return c.dataset.sub === sub; })) {
            sub = "all";
        }
        state.group = group;
        state.sub = sub;
        render();
        if (push) history.pushState(null, "", hash());
    }

    // --- URL --------------------------------------------------------------
    function fromHash() {
        var raw = location.hash.replace(/^#/, "");
        if (!raw) return { group: groupIds[0], sub: "all" };

        var bits = raw.split("/");
        if (byGroup[bits[0]]) return { group: bits[0], sub: bits[1] || "all" };

        // A bare category id (an old link, or one shared before grouping):
        // open whichever group contains it.
        for (var i = 0; i < groupIds.length; i++) {
            var g = byGroup[groupIds[i]];
            if (g.cats.some(function (c) { return c.dataset.sub === bits[0]; })) {
                return { group: groupIds[i], sub: bits[0] };
            }
        }
        return { group: groupIds[0], sub: "all" };
    }

    function applyHash(push) {
        var next = fromHash();
        go(next.group, next.sub, push);
    }

    // --- events -----------------------------------------------------------
    tabsBar.addEventListener("click", function (e) {
        var tab = e.target.closest(".m-tab");
        if (!tab) return;
        e.preventDefault();
        go(tab.dataset.group, "all", true);
        scrollToTop();
    });

    body.addEventListener("click", function (e) {
        var chip = e.target.closest(".m-sub__chip");
        if (!chip) return;
        e.preventDefault();
        go(state.group, chip.dataset.sub, true);
        scrollToTop();
    });

    body.addEventListener("change", function (e) {
        if (!e.target.classList.contains("m-sub__select")) return;
        go(state.group, e.target.value, true);
        scrollToTop();
    });

    // Roving focus across the tab row.
    tabsBar.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(document.activeElement);
        if (i === -1) return;
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        next.focus();
        go(next.dataset.group, "all", true);
    });

    window.addEventListener("popstate", function () { applyHash(false); });
    window.addEventListener("hashchange", function () { applyHash(false); });

    // Switching filters shortens the page; if the reader is below the tab bar
    // they would otherwise land in the middle of the new, shorter list.
    function scrollToTop() {
        var bar = tabsBar.getBoundingClientRect();
        if (bar.top >= 0) return;
        var y = window.scrollY + bar.top - document.querySelector(".nav").getBoundingClientRect().height;
        window.scrollTo({ top: y, behavior: "smooth" });
    }

    applyHash(false);
})();
