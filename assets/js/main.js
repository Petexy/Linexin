/* ============================================================
   Linexin — shared site behavior
   Requires assets/js/i18n.js to be loaded first.
   ============================================================ */

(function () {
    "use strict";

    var LANGS = [
        { code: "en", label: "English", html: "en" },
        { code: "pl", label: "Polski", html: "pl" },
        { code: "ru", label: "Русский", html: "ru" },
        { code: "es", label: "Español", html: "es" },
        { code: "ua", label: "Українська", html: "uk" },
        { code: "de", label: "Deutsch", html: "de" },
        { code: "fr", label: "Français", html: "fr" },
        { code: "pt", label: "Português", html: "pt" },
        { code: "zh", label: "中文", html: "zh" },
        { code: "hi", label: "हिन्दी", html: "hi" }
    ];

    var STORAGE_KEY = "linexin-lang";
    var CONSENT_KEY = "linexin-cookie-consent";
    var LANG_COOKIE_KEY = "linexin-lang";
    var consentChoice = null;
    var currentLang = "en";
    var dictionaries = window.LINEXIN_I18N || {};
    var originals = null; // captured English content, keyed per element

    function getCookie(name) {
        var match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function setCookie(name, value, days) {
        var maxAge = days ? days * 24 * 60 * 60 : 365 * 24 * 60 * 60;
        var cookie = name + "=" + encodeURIComponent(value) +
            "; Max-Age=" + maxAge + "; Path=/; SameSite=Lax";
        if (location.protocol === "https:") cookie += "; Secure";
        document.cookie = cookie;
    }

    function deleteCookie(name) {
        document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax" +
            (location.protocol === "https:" ? "; Secure" : "");
    }

    function getConsentChoice() {
        if (consentChoice) return consentChoice;
        var fromCookie = getCookie(CONSENT_KEY);
        if (fromCookie === "accepted" || fromCookie === "rejected") {
            consentChoice = fromCookie;
            return consentChoice;
        }
        try {
            var stored = localStorage.getItem(CONSENT_KEY);
            if (stored === "accepted" || stored === "rejected") {
                consentChoice = stored;
                return consentChoice;
            }
        } catch (e) { /* private mode */ }
        return null;
    }

    function setConsentChoice(choice) {
        consentChoice = choice;
        setCookie(CONSENT_KEY, choice, 365);
        try { localStorage.setItem(CONSENT_KEY, choice); } catch (e) { /* private mode */ }
        if (choice === "accepted") {
            persistLangPreference(currentLang);
        } else {
            deleteCookie(LANG_COOKIE_KEY);
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* private mode */ }
        }
    }

    function persistLangPreference(code) {
        if (getConsentChoice() === "accepted") {
            try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* private mode */ }
            setCookie(LANG_COOKIE_KEY, code, 365);
        } else {
            deleteCookie(LANG_COOKIE_KEY);
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* private mode */ }
        }
    }

    function translationAttribute(el) {
        return el.getAttribute("data-translate-attr") ||
            (el.getAttribute("data-translate-type") === "alt" ? "alt" : null);
    }

    function captureOriginals() {
        originals = new Map();
        document.querySelectorAll("[data-translate-key]").forEach(function (el) {
            var attribute = translationAttribute(el);
            originals.set(el, attribute ? (attribute === "text" ? el.textContent : el.getAttribute(attribute)) : el.innerHTML);
        });
    }

    function setLang(code) {
        if (code !== "en" && !dictionaries[code]) code = "en";
        currentLang = code;
        var dict = dictionaries[code] || {};

        document.querySelectorAll("[data-translate-key]").forEach(function (el) {
            var key = el.getAttribute("data-translate-key");
            var value = dict[key];
            if (value === undefined) value = originals.get(el); // English fallback
            if (value === undefined) return;
            var attribute = translationAttribute(el);
            if (attribute === "text") el.textContent = value;
            else if (attribute) el.setAttribute(attribute, value);
            else el.innerHTML = value;
        });

        var langInfo = LANGS.find(function (l) { return l.code === code; });
        document.documentElement.lang = langInfo ? langInfo.html : "en";

        document.querySelectorAll(".lang-current").forEach(function (el) {
            el.textContent = code.toUpperCase();
        });
        document.querySelectorAll("[data-lang]").forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-lang") === code);
        });

        // Re-measure any open FAQ answers (their content just changed)
        document.querySelectorAll(".faq-item.open .faq-answer").forEach(function (el) {
            el.style.maxHeight = el.scrollHeight + "px";
        });

        persistLangPreference(code);
    }

    function initialLang() {
        if (getConsentChoice() === "accepted") {
            var cookieLang = getCookie(LANG_COOKIE_KEY);
            if (cookieLang) return cookieLang;
            try {
                var saved = localStorage.getItem(STORAGE_KEY);
                if (saved) return saved;
            } catch (e) { /* private mode */ }
        }
        var nav = (navigator.language || "en").toLowerCase();
        if (nav.startsWith("uk")) return "ua";
        var match = LANGS.find(function (l) { return nav.startsWith(l.code); });
        return match ? match.code : "en";
    }

    function buildConsentBanner() {
        if (document.getElementById("cookie-consent-banner")) return;
        var banner = document.createElement("div");
        banner.id = "cookie-consent-banner";
        banner.className = "cookie-banner glass-panel";
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-live", "polite");
        banner.innerHTML = [
            '<div class="cookie-banner__content">',
            '<p data-translate-key="cookie_notice">We use a cookie to remember your language choice across pages. Accept it to keep your selection, or decline to keep browsing without this preference cookie.</p>',
            '<div class="cookie-banner__actions">',
            '<button type="button" class="btn btn-ghost cookie-banner__btn" data-consent="decline" data-translate-key="cookie_decline">Decline</button>',
            '<button type="button" class="btn btn-primary cookie-banner__btn" data-consent="accept" data-translate-key="cookie_accept">Accept</button>',
            '</div>',
            '</div>'
        ].join("");

        banner.querySelector("[data-consent='accept']").addEventListener("click", function () {
            setConsentChoice("accepted");
            hideConsentBanner();
        });
        banner.querySelector("[data-consent='decline']").addEventListener("click", function () {
            setConsentChoice("rejected");
            hideConsentBanner();
        });

        document.body.appendChild(banner);
    }

    function showConsentBanner() {
        buildConsentBanner();
        var banner = document.getElementById("cookie-consent-banner");
        if (banner) banner.classList.add("visible");
    }

    function hideConsentBanner() {
        var banner = document.getElementById("cookie-consent-banner");
        if (banner) banner.classList.remove("visible");
    }

    function buildLangMenus() {
        var list = document.getElementById("lang-list");
        if (list) {
            LANGS.forEach(function (l) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.setAttribute("data-lang", l.code);
                btn.textContent = l.label;
                list.appendChild(btn);
            });
        }
        var mobile = document.getElementById("mobile-langs");
        if (mobile) {
            LANGS.forEach(function (l) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.setAttribute("data-lang", l.code);
                btn.textContent = l.code.toUpperCase();
                mobile.appendChild(btn);
            });
        }
    }

    document.addEventListener("DOMContentLoaded", function () {

        /* ---------- i18n ---------- */
        buildConsentBanner();
        if (!getConsentChoice()) {
            showConsentBanner();
        } else {
            hideConsentBanner();
        }
        buildLangMenus();
        captureOriginals();
        var startLang = initialLang();
        if (startLang !== "en") setLang(startLang);
        else setLang("en");

        document.addEventListener("click", function (e) {
            var langBtn = e.target.closest("[data-lang]");
            if (langBtn) {
                e.preventDefault();
                setLang(langBtn.getAttribute("data-lang"));
                var menu = langBtn.closest(".lang-menu");
                if (menu) menu.classList.remove("open");
            }
        });

        /* ---------- Language dropdown ---------- */
        var langMenu = document.querySelector(".lang-menu");
        if (langMenu) {
            var toggle = langMenu.querySelector(".lang-btn");
            toggle.addEventListener("click", function (e) {
                e.stopPropagation();
                langMenu.classList.toggle("open");
                toggle.setAttribute("aria-expanded", langMenu.classList.contains("open"));
            });
            document.addEventListener("click", function (e) {
                if (!langMenu.contains(e.target)) langMenu.classList.remove("open");
            });
        }

        /* ---------- Navbar scroll state ---------- */
        var siteNav = document.querySelector(".site-nav");
        if (siteNav) {
            var onScroll = function () {
                siteNav.classList.toggle("scrolled", window.scrollY > 20);
            };
            window.addEventListener("scroll", onScroll, { passive: true });
            onScroll();
        }

        /* ---------- Mobile menu ---------- */
        var menuToggle = document.querySelector(".menu-toggle");
        var mobileMenu = document.getElementById("mobile-menu");
        function closeMobileMenu() {
            if (mobileMenu) mobileMenu.classList.remove("open");
            if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
        }
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener("click", function (e) {
                e.stopPropagation();
                var open = mobileMenu.classList.toggle("open");
                menuToggle.setAttribute("aria-expanded", open);
            });
            mobileMenu.addEventListener("click", function (e) {
                if (e.target.closest("a")) closeMobileMenu();
            });
            document.addEventListener("click", function (e) {
                if (mobileMenu.classList.contains("open") &&
                    !mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                    closeMobileMenu();
                }
            });
        }

        /* ---------- Escape closes menus ---------- */
        document.addEventListener("keydown", function (e) {
            if (e.key !== "Escape") return;
            closeMobileMenu();
            document.querySelectorAll(".lang-menu.open").forEach(function (menu) {
                menu.classList.remove("open");
                var btn = menu.querySelector(".lang-btn");
                if (btn) btn.setAttribute("aria-expanded", "false");
            });
        });

        /* ---------- Scrollspy (highlight nav link of visible section) ---------- */
        var spyLinks = [];
        document.querySelectorAll(".nav-links > a, .mobile-menu > a").forEach(function (a) {
            var href = a.getAttribute("href") || "";
            var hashIdx = href.indexOf("#");
            if (hashIdx === -1) return;
            var id = href.slice(hashIdx + 1);
            var section = document.getElementById(id);
            if (section) spyLinks.push({ link: a, section: section });
        });
        if (spyLinks.length && "IntersectionObserver" in window) {
            var visibleSpy = new Set();
            var spyObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) visibleSpy.add(entry.target);
                    else visibleSpy.delete(entry.target);
                });
                var current = null;
                spyLinks.forEach(function (item) {
                    if (!current && visibleSpy.has(item.section)) current = item.section;
                });
                spyLinks.forEach(function (item) {
                    item.link.classList.toggle("active", item.section === current);
                });
            }, { rootMargin: "-25% 0px -60% 0px" });
            new Set(spyLinks.map(function (i) { return i.section; })).forEach(function (s) {
                spyObserver.observe(s);
            });
        }

        /* ---------- Reveal on scroll ---------- */
        var revealEls = document.querySelectorAll(".reveal");
        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            revealEls.forEach(function (el) { observer.observe(el); });
        } else {
            revealEls.forEach(function (el) { el.classList.add("active"); });
        }

        /* ---------- FAQ accordion ---------- */
        document.querySelectorAll(".faq-question").forEach(function (btn) {
            btn.setAttribute("aria-expanded", "false");
            btn.addEventListener("click", function () {
                var item = btn.closest(".faq-item");
                var answer = item.querySelector(".faq-answer");
                var wasOpen = item.classList.contains("open");

                document.querySelectorAll(".faq-item.open").forEach(function (other) {
                    other.classList.remove("open");
                    other.querySelector(".faq-answer").style.maxHeight = null;
                    other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
                });

                if (!wasOpen) {
                    item.classList.add("open");
                    answer.style.maxHeight = answer.scrollHeight + "px";
                    btn.setAttribute("aria-expanded", "true");
                }
            });
        });

        /* ---------- Tabs ---------- */
        document.querySelectorAll("[data-tabs]").forEach(function (group) {
            var buttons = group.querySelectorAll(".tab-btn");
            var scope = document.getElementById(group.getAttribute("data-tabs")) || document;
            buttons.forEach(function (btn) {
                btn.addEventListener("click", function () {
                    buttons.forEach(function (b) { b.classList.remove("active"); });
                    btn.classList.add("active");
                    scope.querySelectorAll(".tab-panel").forEach(function (panel) {
                        panel.classList.toggle("active",
                            panel.getAttribute("data-panel") === btn.getAttribute("data-tab"));
                    });
                });
            });
        });

        /* Pre-select the USB-writing tab matching the visitor's OS */
        var usbTabs = document.querySelector('[data-tabs="usb-panels"]');
        if (usbTabs) {
            var ua = navigator.userAgent || "";
            var osTab = null;
            if (/Macintosh|Mac OS X/.test(ua)) osTab = "mac";
            else if (/Linux|X11/.test(ua) && !/Android/.test(ua)) osTab = "lin";
            if (osTab) {
                var osBtn = usbTabs.querySelector('.tab-btn[data-tab="' + osTab + '"]');
                if (osBtn) osBtn.click();
            }
        }

        /* ---------- Segmented control (desktop style gallery) ---------- */
        document.querySelectorAll(".segmented-control[data-segments]").forEach(function (control) {
            var buttons = control.querySelectorAll(".segment-btn");
            var slider = control.querySelector(".segment-slider");
            buttons.forEach(function (btn, index) {
                btn.addEventListener("click", function () {
                    buttons.forEach(function (b, i) {
                        b.classList.toggle("active", b === btn);
                        var target = document.querySelector(b.getAttribute("data-seg-target"));
                        if (target) target.style.display = (b === btn) ? "" : "none";
                    });
                    if (slider) {
                        slider.style.transform = index === 0
                            ? "translateX(0)"
                            : "translateX(calc(100% + 0px))";
                        slider.style.width = "calc(" + (100 / buttons.length) + "% - 4px)";
                    }
                });
            });
        });

        /* ---------- Lightbox (click a screenshot to zoom) ---------- */
        var lightbox = (function () {
            var overlay, imgEl, captionEl, prevBtn, nextBtn, closeBtn;
            var group = [], index = 0, lastFocus = null;

            function build() {
                if (overlay) return;
                overlay = document.createElement("div");
                overlay.className = "lightbox";
                overlay.setAttribute("role", "dialog");
                overlay.setAttribute("aria-modal", "true");
                overlay.setAttribute("aria-label", "Screenshot viewer");
                overlay.innerHTML = [
                    '<button type="button" class="lightbox-btn lightbox-close" aria-label="Close">',
                    '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">',
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>',
                    '<button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous screenshot">',
                    '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">',
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></button>',
                    '<button type="button" class="lightbox-btn lightbox-next" aria-label="Next screenshot">',
                    '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">',
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>',
                    '<img alt="">',
                    '<div class="lightbox-caption"></div>'
                ].join("");
                imgEl = overlay.querySelector("img");
                captionEl = overlay.querySelector(".lightbox-caption");
                closeBtn = overlay.querySelector(".lightbox-close");
                prevBtn = overlay.querySelector(".lightbox-prev");
                nextBtn = overlay.querySelector(".lightbox-next");

                closeBtn.addEventListener("click", close);
                prevBtn.addEventListener("click", function () { step(-1); });
                nextBtn.addEventListener("click", function () { step(1); });
                overlay.addEventListener("click", function (e) {
                    if (e.target === overlay) close();
                });
                document.body.appendChild(overlay);
            }

            function render() {
                var item = group[index];
                imgEl.src = item.src;
                imgEl.alt = item.alt || "";
                var caption = item.caption || item.alt || "";
                captionEl.textContent = caption;
                captionEl.style.display = caption ? "" : "none";
                var multi = group.length > 1;
                prevBtn.style.display = multi ? "" : "none";
                nextBtn.style.display = multi ? "" : "none";
            }

            function open(items, startIndex, triggerEl) {
                build();
                group = items;
                index = startIndex || 0;
                lastFocus = triggerEl || document.activeElement;
                overlay.classList.add("open");
                document.body.classList.add("no-scroll");
                render();
                closeBtn.focus();
            }

            function close() {
                overlay.classList.remove("open");
                document.body.classList.remove("no-scroll");
                if (lastFocus && lastFocus.focus) lastFocus.focus();
            }

            function step(delta) {
                index = (index + delta + group.length) % group.length;
                render();
            }

            document.addEventListener("keydown", function (e) {
                if (!overlay || !overlay.classList.contains("open")) return;
                if (e.key === "Escape") close();
                else if (e.key === "ArrowLeft") step(-1);
                else if (e.key === "ArrowRight") step(1);
            });

            return { open: open };
        })();

        /* Zoomable gallery grids (navigate within the grid) */
        document.querySelectorAll(".gallery-grid").forEach(function (grid) {
            var imgs = Array.prototype.slice.call(grid.querySelectorAll(".shot img"));
            imgs.forEach(function (img, i) {
                img.classList.add("zoomable");
                img.addEventListener("click", function () {
                    var items = imgs.map(function (im) {
                        var card = im.closest(".gallery-card");
                        var label = card && card.querySelector(".label");
                        return {
                            src: im.currentSrc || im.src,
                            alt: im.alt,
                            caption: label ? label.textContent.trim() : im.alt
                        };
                    });
                    lightbox.open(items, i, img);
                });
            });
        });

        /* ---------- Carousel ---------- */
        document.querySelectorAll("[data-carousel]").forEach(function (carousel) {
            var frame = carousel.querySelector(".carousel-frame");
            var img = carousel.querySelector(".carousel-frame img");
            var sources = (carousel.getAttribute("data-carousel") || "").split(",")
                .map(function (s) { return s.trim(); })
                .filter(Boolean);
            if (!img || sources.length === 0) return;

            sources.forEach(function (src) { new Image().src = src; });

            var captions = (carousel.getAttribute("data-captions") || "").split("|")
                .map(function (s) { return s.trim(); });

            var captionEl = null;
            if (captions.some(Boolean) && frame) {
                captionEl = document.createElement("div");
                captionEl.className = "carousel-caption";
                frame.appendChild(captionEl);
            }

            var dotsWrap = carousel.parentElement.querySelector(".carousel-dots");
            var dots = [];
            if (dotsWrap) {
                sources.forEach(function (_, i) {
                    var dot = document.createElement("button");
                    dot.type = "button";
                    dot.setAttribute("aria-label", "Screenshot " + (i + 1));
                    dot.addEventListener("click", function () { show(i); });
                    dotsWrap.appendChild(dot);
                    dots.push(dot);
                });
            }

            var index = 0;
            function show(i) {
                index = (i + sources.length) % sources.length;
                img.style.opacity = "0";
                setTimeout(function () {
                    img.src = sources[index];
                    img.style.opacity = "1";
                }, 250);
                if (captionEl) captionEl.textContent = captions[index] || "";
                dots.forEach(function (d, di) { d.classList.toggle("active", di === index); });
            }

            var prev = carousel.querySelector(".carousel-prev");
            var next = carousel.querySelector(".carousel-next");
            if (prev) prev.addEventListener("click", function () { show(index - 1); });
            if (next) next.addEventListener("click", function () { show(index + 1); });

            /* Arrow keys while focus is inside the carousel */
            carousel.addEventListener("keydown", function (e) {
                if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
                else if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
            });

            /* Touch swipe */
            var startX = null, swiped = false;
            if (frame) {
                frame.addEventListener("pointerdown", function (e) {
                    startX = e.clientX;
                    swiped = false;
                });
                frame.addEventListener("pointerup", function (e) {
                    if (startX === null) return;
                    var dx = e.clientX - startX;
                    if (Math.abs(dx) > 40) {
                        swiped = true;
                        show(index + (dx < 0 ? 1 : -1));
                    }
                    startX = null;
                });
                frame.addEventListener("pointercancel", function () { startX = null; });
            }

            /* Click to zoom */
            img.classList.add("zoomable");
            img.addEventListener("click", function () {
                if (swiped) { swiped = false; return; }
                var items = sources.map(function (src, i) {
                    return { src: src, alt: img.alt, caption: captions[i] || "" };
                });
                lightbox.open(items, index, img);
            });

            img.src = sources[0];
            if (captionEl) captionEl.textContent = captions[0] || "";
            if (dots[0]) dots[0].classList.add("active");
        });

        /* ---------- Copy buttons ---------- */
        function copyText(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text);
            }
            return new Promise(function (resolve, reject) {
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
                } catch (err) {
                    reject(err);
                }
                ta.remove();
            });
        }

        document.querySelectorAll(".copy-btn").forEach(function (btn) {
            var original = btn.innerHTML;
            btn.addEventListener("click", function () {
                var text = btn.getAttribute("data-copy") || "";
                copyText(text).then(function () {
                    btn.classList.add("copied");
                    btn.innerHTML = "✓";
                    setTimeout(function () {
                        btn.classList.remove("copied");
                        btn.innerHTML = original;
                    }, 1600);
                }).catch(function () { /* clipboard unavailable */ });
            });
        });

        /* ---------- Back to top ---------- */
        var backToTop = document.createElement("button");
        backToTop.type = "button";
        backToTop.className = "back-to-top";
        backToTop.setAttribute("aria-label", "Back to top");
        backToTop.innerHTML = '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>';
        backToTop.addEventListener("click", function () {
            var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        });
        document.body.appendChild(backToTop);
        window.addEventListener("scroll", function () {
            backToTop.classList.toggle("visible", window.scrollY > 700);
        }, { passive: true });

        /* ---------- Footer year ---------- */
        document.querySelectorAll(".footer-year").forEach(function (el) {
            el.textContent = new Date().getFullYear();
        });
    });
})();
