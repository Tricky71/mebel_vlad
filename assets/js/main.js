/* =========================================================
   ARCHITECTURAL GLAZING — main.js
   Vanilla JS only. Auto-init via data-* attributes.
   ========================================================= */

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var pageLockY = 0;
  var pageLockCount = 0;

  function lockPage() {
    if (pageLockCount === 0) {
      pageLockY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.classList.add("is-locked");
      document.body.classList.add("is-locked");
      document.body.style.top = "-" + pageLockY + "px";
    }
    pageLockCount += 1;
  }

  function unlockPage() {
    if (pageLockCount === 0) {
      return;
    }
    pageLockCount -= 1;
    if (pageLockCount > 0) {
      return;
    }
    document.documentElement.classList.remove("is-locked");
    document.body.classList.remove("is-locked");
    document.body.style.top = "";
    window.scrollTo(0, pageLockY);
  }

  function initImageFallbacks() {
    document.querySelectorAll("img").forEach(function (image) {
      image.addEventListener("error", function () {
        image.classList.add("is-missing");
      });
    });
  }

  /**
   * Burger / Mobile menu toggle
   * Markup:
   *   <button data-burger aria-controls="mobile-menu" aria-expanded="false"></button>
   *   <div data-mobile-menu id="mobile-menu" hidden></div>
   */
  function initBurger() {
    var burgers = document.querySelectorAll("[data-burger]");
    if (!burgers.length) return;

    burgers.forEach(function (burger) {
      var targetId = burger.getAttribute("aria-controls");
      var menu = targetId
        ? document.getElementById(targetId)
        : document.querySelector("[data-mobile-menu]");
      if (!menu) return;

      var open = function () {
        menu.hidden = false;
        // force reflow so transition triggers
        void menu.offsetWidth;
        menu.classList.add("is-open");
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", "Закрыть меню");
        lockPage();
      };

      var close = function () {
        menu.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Открыть меню");
        unlockPage();
        menu.dispatchEvent(new CustomEvent("glass:mobile-menu-close"));
        // Hide after transition, with a fallback for reduced-motion/no-transition.
        var finished = false;
        var onEnd = function () {
          if (finished) return;
          finished = true;
          if (!menu.classList.contains("is-open")) {
            menu.hidden = true;
          }
          menu.removeEventListener("transitionend", onEnd);
        };
        menu.addEventListener("transitionend", onEnd);
        window.setTimeout(onEnd, 420);
      };

      var toggle = function () {
        if (burger.getAttribute("aria-expanded") === "true") {
          close();
        } else {
          open();
        }
      };

      burger.addEventListener("click", toggle);

      // close on menu link click
      menu.addEventListener("click", function (e) {
        var action = e.target.closest("a, [data-modal-open]");
        if (action) close();
      });

      // close on Escape
      document.addEventListener("keydown", function (e) {
        if (
          e.key === "Escape" &&
          burger.getAttribute("aria-expanded") === "true"
        ) {
          close();
          burger.focus();
        }
      });

      // reset on resize to desktop
      var mq = window.matchMedia("(min-width: 1024px)");
      var onChange = function (ev) {
        if (ev.matches && burger.getAttribute("aria-expanded") === "true") {
          close();
        }
      };
      if (mq.addEventListener) {
        mq.addEventListener("change", onChange);
      } else if (mq.addListener) {
        mq.addListener(onChange);
      }
    });
  }

  /**
   * Drill-down panels for nested WordPress mobile menus.
   */
  function initMobileMenuPanels() {
    document.querySelectorAll("[data-mobile-menu]").forEach(function (menu) {
      var nav = menu.querySelector(".mobile-menu__nav");
      var root = menu.querySelector(".mobile-menu__list");
      if (!nav || !root) return;

      var panels = [];

      function directChild(item, selector) {
        return Array.prototype.find.call(item.children, function (child) {
          return child.matches(selector);
        });
      }

      root
        .querySelectorAll(".mobile-menu__item.menu-item-has-children")
        .forEach(function (item) {
          var link = directChild(item, ".mobile-menu__link");
          var panel = directChild(item, ".sub-menu");
          if (!link || !panel) return;

          var title = (link.textContent || "Раздел").trim();
          var parentPanel = item.parentElement.closest(".sub-menu");
          var depth = parentPanel
            ? Number(parentPanel.getAttribute("data-menu-depth") || "1") + 1
            : 1;

          panel.classList.add("mobile-menu__panel");
          panel.setAttribute("data-menu-depth", String(depth));
          panel.setAttribute("aria-hidden", "true");
          panel.style.zIndex = String(50 + depth);

          var next = document.createElement("button");
          next.className = "mobile-menu__next";
          next.type = "button";
          next.setAttribute("aria-label", "Открыть раздел «" + title + "»");
          next.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          link.insertAdjacentElement("afterend", next);

          var head = document.createElement("li");
          head.className = "mobile-menu__panel-head";
          head.innerHTML =
            '<button class="mobile-menu__back" type="button" aria-label="Вернуться назад"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="mobile-menu__panel-title"></span>';
          head.querySelector(".mobile-menu__panel-title").textContent = title;
          panel.prepend(head);
          nav.appendChild(panel);

          function openPanel() {
            nav.scrollLeft = 0;
            panel.classList.add("is-active");
            panel.setAttribute("aria-hidden", "false");
            nav.classList.add("has-active-panel");
            var firstLink = panel.querySelector(".mobile-menu__link");
            if (firstLink) firstLink.focus({ preventScroll: true });
          }

          function closePanel() {
            panel.classList.remove("is-active");
            panel.setAttribute("aria-hidden", "true");
            panel
              .querySelectorAll(".mobile-menu__panel.is-active")
              .forEach(function (childPanel) {
                childPanel.classList.remove("is-active");
                childPanel.setAttribute("aria-hidden", "true");
              });
            if (!root.querySelector(".mobile-menu__panel.is-active")) {
              nav.classList.remove("has-active-panel");
            }
            nav.scrollLeft = 0;
            next.focus({ preventScroll: true });
          }

          next.addEventListener("click", openPanel);
          head
            .querySelector(".mobile-menu__back")
            .addEventListener("click", closePanel);
          panels.push(panel);
        });

      menu.addEventListener("glass:mobile-menu-close", function () {
        panels.forEach(function (panel) {
          panel.classList.remove("is-active");
          panel.setAttribute("aria-hidden", "true");
        });
        nav.scrollLeft = 0;
        nav.classList.remove("has-active-panel");
      });
    });
  }

  function initModals() {
    var modals = document.querySelectorAll("[data-modal]");
    if (!modals.length) return;

    var active = null;
    var opener = null;

    function openModal(name, trigger) {
      var modal = document.querySelector('[data-modal="' + name + '"]');
      if (!modal) return;
      if (active && active !== modal) closeModal(active, false);

      active = modal;
      opener = trigger || null;
      modal.hidden = false;
      void modal.offsetWidth;
      modal.classList.add("is-open");
      document.body.classList.add("is-modal-open");
      lockPage();

      var closeButton = modal.querySelector(".site-modal__close");
      if (closeButton) closeButton.focus();
    }

    function closeModal(modal, restoreFocus) {
      if (!modal) return;
      modal.classList.remove("is-open");
      document.body.classList.remove("is-modal-open");
      unlockPage();
      window.setTimeout(function () {
        if (!modal.classList.contains("is-open")) modal.hidden = true;
      }, 320);
      if (restoreFocus !== false && opener) opener.focus();
      active = null;
      opener = null;
    }

    document.addEventListener("click", function (event) {
      var openButton = event.target.closest("[data-modal-open]");
      if (openButton) {
        event.preventDefault();
        openModal(openButton.getAttribute("data-modal-open"), openButton);
        return;
      }

      var closeButton = event.target.closest("[data-modal-close]");
      if (closeButton) closeModal(closeButton.closest("[data-modal]"), true);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && active) closeModal(active, true);
    });

    document.addEventListener("glass:open-modal", function (event) {
      openModal(event.detail && event.detail.name, null);
    });
  }

  function initDiscountPopup() {
    var popup = document.querySelector("[data-discount-popup]");
    if (!popup) return;

    var storageKey = "glass_discount_seen_at";
    var repeatAfter = 7 * 24 * 60 * 60 * 1000;
    var delay = Math.max(
      0,
      Number(popup.getAttribute("data-delay-ms") || "210000"),
    );
    var shown = false;
    var lastSeen = 0;

    try {
      lastSeen = Number(window.localStorage.getItem(storageKey) || "0");
    } catch (error) {
      lastSeen = 0;
    }

    if (Date.now() - lastSeen < repeatAfter) return;
    if (new URL(window.location.href).searchParams.has("lead")) return;

    function showPopup() {
      if (shown) return;
      if (
        document.body.classList.contains("is-modal-open") ||
        document.querySelector("[data-mobile-menu].is-open")
      ) {
        window.setTimeout(showPopup, 5000);
        return;
      }
      shown = true;
      try {
        window.localStorage.setItem(storageKey, String(Date.now()));
      } catch (error) {
        // localStorage может быть отключён настройками приватности.
      }
      document.dispatchEvent(
        new CustomEvent("glass:open-modal", { detail: { name: "discount" } }),
      );
    }

    window.setTimeout(showPopup, delay);
  }

  function initToast() {
    var toast = document.querySelector("[data-site-toast]");
    if (!toast) return;
    window.setTimeout(function () {
      toast.classList.add("is-hidden");
    }, 5000);
  }

  /**
   * Homepage hero background slider.
   * The comma-separated image list lives in data-hero-images.
   */
  function initHeroSlider() {
    var hero = document.querySelector("[data-hero][data-hero-images]");
    if (!hero) return;

    var image = hero.querySelector(".hero__bg");
    var previous = hero.querySelector(".slider-nav__btn--prev");
    var next = hero.querySelector(".slider-nav__btn--next");
    var images = (hero.getAttribute("data-hero-images") || "")
      .split(",")
      .map(function (url) {
        return url.trim();
      })
      .filter(Boolean);

    if (!image || images.length < 2) {
      if (previous) previous.hidden = true;
      if (next) next.hidden = true;
      return;
    }

    images.forEach(function (url) {
      var preload = new Image();
      preload.src = url;
    });

    var index = Math.max(0, images.indexOf(image.getAttribute("src")));
    var timer = null;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function show(target) {
      index = (target + images.length) % images.length;
      image.classList.add("is-changing");

      window.setTimeout(function () {
        image.src = images[index];
        image.addEventListener(
          "load",
          function () {
            image.classList.remove("is-changing");
          },
          { once: true },
        );
      }, 180);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (!reduceMotion.matches) {
        timer = window.setInterval(function () {
          show(index + 1);
        }, 7000);
      }
    }

    if (previous) {
      previous.addEventListener("click", function () {
        show(index - 1);
        start();
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        show(index + 1);
        start();
      });
    }

    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });
    start();
  }

  function initFeatureCarousels() {
    document
      .querySelectorAll("[data-feature-carousel]")
      .forEach(function (root) {
        var slides = Array.prototype.slice.call(
          root.querySelectorAll("[data-feature-slide]"),
        );
        if (slides.length < 2) return;

        var previous = root.querySelector("[data-feature-prev]");
        var next = root.querySelector("[data-feature-next]");
        var current = root.querySelector("[data-feature-current]");
        var reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        );
        var index = 0;
        var timer = null;

        function show(target) {
          index = (target + slides.length) % slides.length;
          slides.forEach(function (slide, slideIndex) {
            var active = slideIndex === index;
            slide.classList.toggle("is-active", active);
            slide.setAttribute("aria-hidden", active ? "false" : "true");
          });
          if (current) current.textContent = String(index + 1).padStart(2, "0");
        }

        function stop() {
          if (timer) window.clearInterval(timer);
          timer = null;
        }

        function start() {
          stop();
          if (!reduceMotion.matches) {
            timer = window.setInterval(function () {
              show(index + 1);
            }, 7000);
          }
        }

        if (previous) {
          previous.addEventListener("click", function () {
            show(index - 1);
            start();
          });
        }
        if (next) {
          next.addEventListener("click", function () {
            show(index + 1);
            start();
          });
        }

        root.addEventListener("mouseenter", stop);
        root.addEventListener("mouseleave", start);
        root.addEventListener("focusin", stop);
        root.addEventListener("focusout", start);
        document.addEventListener("visibilitychange", function () {
          if (document.hidden) stop();
          else start();
        });
        start();
      });
  }

  function initEntityGalleries() {
    document.querySelectorAll("[data-entity-gallery]").forEach(function (root) {
      var track = root.querySelector("[data-entity-gallery-track]");
      var slides = Array.prototype.slice.call(
        root.querySelectorAll("[data-entity-gallery-slide]"),
      );
      if (!track || slides.length < 2) return;

      var previous = root.querySelector("[data-entity-gallery-prev]");
      var next = root.querySelector("[data-entity-gallery-next]");
      var current = root.querySelector("[data-entity-gallery-current]");
      var dots = Array.prototype.slice.call(
        root.querySelectorAll("[data-entity-gallery-dot]"),
      );
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      var index = 0;
      var timer = null;
      var dragging = false;
      var horizontalDrag = false;
      var directionLocked = false;
      var pointerId = null;
      var startX = 0;
      var startY = 0;
      var deltaX = 0;

      function show(target) {
        index = (target + slides.length) % slides.length;
        track.style.transform = "translate3d(-" + index * 100 + "%, 0, 0)";
        slides.forEach(function (slide, slideIndex) {
          var active = slideIndex === index;
          slide.classList.toggle("is-active", active);
          slide.setAttribute("aria-hidden", active ? "false" : "true");
        });
        dots.forEach(function (dot, dotIndex) {
          var active = dotIndex === index;
          dot.classList.toggle("is-active", active);
          dot.setAttribute("aria-current", active ? "true" : "false");
        });
        if (current) current.textContent = String(index + 1).padStart(2, "0");
      }

      function stop() {
        if (timer) window.clearInterval(timer);
        timer = null;
      }

      function start() {
        stop();
        if (!reduceMotion.matches && !document.hidden) {
          timer = window.setInterval(function () {
            show(index + 1);
          }, 6500);
        }
      }

      function move(direction) {
        show(index + direction);
        start();
      }

      if (previous) {
        previous.addEventListener("click", function () {
          move(-1);
        });
      }
      if (next) {
        next.addEventListener("click", function () {
          move(1);
        });
      }
      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          show(parseInt(dot.getAttribute("data-entity-gallery-dot"), 10) || 0);
          start();
        });
      });

      root.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      });

      root.addEventListener("pointerdown", function (event) {
        if (event.button !== 0 || event.target.closest("button")) return;
        dragging = true;
        horizontalDrag = false;
        directionLocked = false;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        deltaX = 0;
        root.classList.add("is-dragging");
        track.style.transition = "none";
        stop();
        root.setPointerCapture(event.pointerId);
      });

      root.addEventListener("pointermove", function (event) {
        if (!dragging || event.pointerId !== pointerId) return;
        deltaX = event.clientX - startX;
        var deltaY = event.clientY - startY;

        if (
          !directionLocked &&
          Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 6
        ) {
          directionLocked = true;
          horizontalDrag = Math.abs(deltaX) > Math.abs(deltaY);
        }
        if (!horizontalDrag) return;

        if (event.cancelable) event.preventDefault();
        var slideWidth = root.clientWidth;
        var offset = -index * slideWidth + deltaX;
        track.style.transform = "translate3d(" + offset + "px, 0, 0)";
      });

      function finishDrag(event) {
        if (!dragging || event.pointerId !== pointerId) return;
        dragging = false;
        root.classList.remove("is-dragging");
        track.style.transition = "";

        if (
          horizontalDrag &&
          Math.abs(deltaX) > Math.max(42, root.clientWidth * 0.08)
        ) {
          show(index + (deltaX < 0 ? 1 : -1));
        } else {
          show(index);
        }

        if (root.hasPointerCapture(pointerId))
          root.releasePointerCapture(pointerId);
        pointerId = null;
        start();
      }

      root.addEventListener("pointerup", finishDrag);
      root.addEventListener("pointercancel", finishDrag);
      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", start);
      root.addEventListener("focusin", stop);
      root.addEventListener("focusout", function (event) {
        if (!root.contains(event.relatedTarget)) start();
      });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
        else start();
      });

      show(0);
      start();
    });
  }

  /**
   * Reveal on scroll — IntersectionObserver
   * Markup:
   *   <section data-reveal-root>
   *     <div data-reveal="image">…</div>
   *     <p data-reveal="title">…</p>
   *     <div data-reveal="card">…</div>
   *     <span data-reveal="decor"></span>
   *   </section>
   *
   * When the [data-reveal-root] enters the viewport,
   * all its [data-reveal] children get class "is-revealed"
   * with staggered delays.
   */
  function initReveal() {
    var roots = document.querySelectorAll("[data-reveal-root]");
    if (!roots.length || !("IntersectionObserver" in window)) {
      // fallback: reveal everything immediately
      document.querySelectorAll("[data-reveal]").forEach(function (el) {
        el.classList.add("is-revealed");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          var root = entry.target;
          var items = root.querySelectorAll("[data-reveal]");
          items.forEach(function (el, i) {
            var delay = i * 120; // stagger 120ms
            setTimeout(function () {
              el.classList.add("is-revealed");
            }, delay);
          });

          observer.unobserve(root);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    roots.forEach(function (root) {
      observer.observe(root);
    });
  }

  /**
   * Horizontal sliders — arrows + drag/swipe
   * Markup:
   *   <div data-slider>
   *     <div data-slider-track> …cards… </div>
   *   </div>
   *   <div data-slider-arrows>
   *     <button data-slider-prev></button>
   *     <button data-slider-next></button>
   *   </div>
   * The arrows block must be a sibling within the same parent as [data-slider].
   */
  function initSliders() {
    var sliders = document.querySelectorAll("[data-slider]");

    sliders.forEach(function (slider) {
      var track = slider.querySelector("[data-slider-track]");
      if (!track) return;

      var parent = slider.parentElement;
      var arrowsBox = parent
        ? parent.querySelector("[data-slider-arrows]")
        : null;
      var prevBtn = arrowsBox
        ? arrowsBox.querySelector("[data-slider-prev]")
        : null;
      var nextBtn = arrowsBox
        ? arrowsBox.querySelector("[data-slider-next]")
        : null;

      var offset = 0; // current translateX (negative)

      function maxOffset() {
        return Math.max(0, track.scrollWidth - slider.clientWidth);
      }

      function step() {
        var first = track.querySelector(":scope > *");
        if (!first) return slider.clientWidth * 0.8;
        var gap =
          parseInt(
            getComputedStyle(track).columnGap ||
              getComputedStyle(track).gap ||
              "0",
            10,
          ) || 0;
        return first.getBoundingClientRect().width + gap;
      }

      function apply() {
        var max = maxOffset();
        if (offset > 0) offset = 0;
        if (offset < -max) offset = -max;
        track.style.transform = "translateX(" + offset + "px)";
        updateButtons(max);
      }

      function updateButtons(max) {
        if (prevBtn) prevBtn.disabled = offset >= 0;
        if (nextBtn) nextBtn.disabled = offset <= -max;
      }

      function move(dir) {
        offset -= dir * step();
        apply();
      }

      if (prevBtn)
        prevBtn.addEventListener("click", function () {
          move(-1);
        });
      if (nextBtn)
        nextBtn.addEventListener("click", function () {
          move(1);
        });

      /* Drag / swipe */
      var isDown = false;
      var startX = 0;
      var startOffset = 0;
      var moved = false;

      function pointerDown(e) {
        isDown = true;
        moved = false;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startOffset = offset;
        track.style.transition = "none";
      }

      function pointerMove(e) {
        if (!isDown) return;
        var x = e.touches ? e.touches[0].clientX : e.clientX;
        var delta = x - startX;
        if (Math.abs(delta) > 5) moved = true;
        offset = startOffset + delta;
        track.style.transform = "translateX(" + offset + "px)";
      }

      function pointerUp() {
        if (!isDown) return;
        isDown = false;
        track.style.transition = "";
        apply();
      }

      slider.addEventListener("mousedown", pointerDown);
      window.addEventListener("mousemove", pointerMove);
      window.addEventListener("mouseup", pointerUp);

      slider.addEventListener("touchstart", pointerDown, { passive: true });
      slider.addEventListener("touchmove", pointerMove, { passive: true });
      slider.addEventListener("touchend", pointerUp);

      // prevent ghost click after drag
      slider.addEventListener(
        "click",
        function (e) {
          if (moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true,
      );

      // recalc on resize
      window.addEventListener("resize", apply);

      apply();
    });
  }

  /**
   * Accordion (FAQ)
   * Markup:
   *   <div data-accordion data-accordion-multiple="false">
   *     <div class="faq-item" data-accordion-item [data-open]>
   *       <button class="faq-item__head" data-accordion-trigger aria-expanded="false" aria-controls="faq-1">
   *         <span class="faq-item__question">…</span>
   *         <span class="faq-item__icon" aria-hidden="true"></span>
   *       </button>
   *       <div class="faq-item__body" id="faq-1" data-accordion-panel>
   *         <div class="faq-item__inner">…answer…</div>
   *       </div>
   *     </div>
   *   </div>
   *
   * Опции:
   *   data-accordion-multiple="true"  — можно держать открытыми несколько
   *   data-open                       — этот item открыт по умолчанию
   */
  function initAccordion() {
    var roots = document.querySelectorAll("[data-accordion]");
    if (!roots.length) return;

    roots.forEach(function (root) {
      var multiple = root.getAttribute("data-accordion-multiple") === "true";
      var items = root.querySelectorAll("[data-accordion-item]");

      function setOpen(item, isOpen) {
        var trigger = item.querySelector("[data-accordion-trigger]");
        var panel = item.querySelector("[data-accordion-panel]");
        if (!trigger || !panel) return;

        if (isOpen) {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          // установить высоту в px для плавной анимации
          panel.style.height = panel.scrollHeight + "px";
          var onEnd = function (e) {
            if (e.propertyName !== "height") return;
            panel.style.height = "auto";
            panel.removeEventListener("transitionend", onEnd);
          };
          panel.addEventListener("transitionend", onEnd);
        } else {
          item.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          // если сейчас "auto", зафиксировать текущую высоту, затем на 0
          if (getComputedStyle(panel).height !== "0px") {
            panel.style.height = panel.scrollHeight + "px";
            // force reflow
            void panel.offsetHeight;
          }
          panel.style.height = "0px";
        }
      }

      items.forEach(function (item) {
        var trigger = item.querySelector("[data-accordion-trigger]");
        var panel = item.querySelector("[data-accordion-panel]");
        if (!trigger || !panel) return;

        // initial state
        var openByDefault = item.hasAttribute("data-open");
        if (openByDefault) {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          panel.style.height = "auto";
        } else {
          item.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          panel.style.height = "0px";
        }

        trigger.addEventListener("click", function () {
          var isOpen = item.classList.contains("is-open");

          if (!multiple) {
            items.forEach(function (other) {
              if (other !== item && other.classList.contains("is-open")) {
                setOpen(other, false);
              }
            });
          }

          setOpen(item, !isOpen);
        });
      });
    });
  }

  /* Init on DOM ready */
  function init() {
    initImageFallbacks();
    initBurger();
    initMobileMenuPanels();
    initModals();
    initDiscountPopup();
    initToast();
    initHeroSlider();
    initFeatureCarousels();
    initEntityGalleries();
    initReveal();
    initSliders();
    initAccordion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
