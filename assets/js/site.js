/*
 * PRINCE LUBRICANTS: site runtime.
 *
 * Every module is a no-op on a page that has none of its elements. GSAP (core,
 * ScrollTrigger, SplitText) choreographs when it is present; without it the page still
 * reveals, counts and navigates. Nothing here writes content: every word on every page
 * is already in the HTML, which is what search engines and answer engines read.
 */
(() => {
  'use strict';

  const d = document;
  const html = d.documentElement;
  const $ = (sel, ctx = d) => ctx.querySelector(sel);
  const $$ = (sel, ctx = d) => Array.from(ctx.querySelectorAll(sel));
  const mq = (q) => window.matchMedia(q).matches;
  const reduced = html.classList.contains('reduced') || mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const G = window.gsap && window.ScrollTrigger ? window.gsap : null;
  const Split = G && window.SplitText ? window.SplitText : null;
  if (G) G.registerPlugin(window.ScrollTrigger, ...(Split ? [Split] : []));

  // Resolves once the first-visit loader has gone (at once on every later page), so an
  // intro never plays underneath it.
  let markReady;
  const pageReady = new Promise((resolve) => { markReady = resolve; });

  // Page scenes register here by name and run for each [data-scene="name"] element.
  const SCENES = {};

  /* Double-click preview from disk. Under file: a link to a folder opens a folder
     listing, so point it at that folder's index.html. Served, nothing changes. */
  function fileLinks() {
    if (location.protocol !== 'file:') return;
    for (const a of $$('a[href]')) {
      const href = a.getAttribute('href');
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#)/i.test(href)) continue;
      const [path, hash] = href.split('#');
      if (!path.endsWith('/') && path !== '.' && path !== '..') continue;
      const dir = path.endsWith('/') ? path : `${path}/`;
      a.setAttribute('href', `${dir}index.html${hash === undefined ? '' : `#${hash}`}`);
    }
  }

  function loaderOnce() {
    const el = $('#loader');
    if (!el || getComputedStyle(el).display === 'none') {
      if (el) el.remove();
      markReady();
      return;
    }
    const out = () => {
      el.classList.add('is-out');
      markReady();
      setTimeout(() => el.remove(), 750);
    };
    const go = () => setTimeout(out, Math.max(0, 1300 - performance.now()));
    if (d.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  function header() {
    const head = $('.site-header');
    if (!head) return;

    // Scrolled state from a sentinel, not a scroll listener.
    const top = d.createElement('div');
    top.className = 'scroll-sentinel';
    top.setAttribute('aria-hidden', 'true');
    d.body.prepend(top);
    new IntersectionObserver(([e]) => head.classList.toggle('is-scrolled', !e.isIntersecting)).observe(top);

    const items = $$('.nav-item[data-menu]');
    const burger = $('.burger');
    const menu = $('#mobile-menu');

    const setOpen = (item, open, returnFocus) => {
      const toggle = $('.nav-toggle', item);
      item.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      head.classList.toggle('has-open', items.some((i) => i.classList.contains('is-open')));
      if (!open && returnFocus) toggle.focus();
    };
    const openOnly = (item) => {
      for (const other of items) if (other !== item) setOpen(other, false);
      setOpen(item, true);
    };

    for (const item of items) {
      const toggle = $('.nav-toggle', item);
      let timer = 0;
      toggle.addEventListener('click', () => {
        if (item.classList.contains('is-open')) setOpen(item, false);
        else openOnly(item);
      });
      if (finePointer) {
        item.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(() => openOnly(item), 90); });
        item.addEventListener('mouseleave', () => { clearTimeout(timer); timer = setTimeout(() => setOpen(item, false), 180); });
      }
      item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) setOpen(item, false); });
    }

    const setMobile = (open, returnFocus) => {
      if (!burger || !menu) return;
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      d.body.style.overflow = open ? 'hidden' : '';
      if (!open && returnFocus) burger.focus();
    };
    if (burger) burger.addEventListener('click', () => setMobile(burger.getAttribute('aria-expanded') !== 'true'));
    if (menu) menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMobile(false); });

    d.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = items.find((i) => i.classList.contains('is-open'));
      if (open) setOpen(open, false, true);
      if (burger && burger.getAttribute('aria-expanded') === 'true') setMobile(false, true);
    });
    d.addEventListener('pointerdown', (e) => {
      for (const item of items) if (!item.contains(e.target)) setOpen(item, false);
    });
  }

  // Browsers with CSS scroll timelines draw the bar in CSS alone.
  function progress() {
    const bar = $('#progress');
    if (!bar || (window.CSS && CSS.supports('animation-timeline: scroll()'))) return;
    let queued = false;
    const update = () => {
      const max = html.scrollHeight - window.innerHeight;
      bar.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      queued = false;
    };
    window.addEventListener('scroll', () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function cursor() {
    const ring = $('#cursor-ring');
    const dot = $('#cursor-dot');
    if (!ring || !dot || !finePointer || reduced) return;
    html.classList.add('cursor-on');
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    }, { passive: true });
    (function follow() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();
    window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    d.addEventListener('pointerover', (e) => {
      ring.classList.toggle('is-big', !!e.target.closest('a, button, .tilt, [data-cursor]'));
    });
    html.addEventListener('mouseleave', () => { ring.classList.add('is-hidden'); dot.classList.add('is-hidden'); });
    html.addEventListener('mouseenter', () => { ring.classList.remove('is-hidden'); dot.classList.remove('is-hidden'); });
  }

  function dots() {
    const sections = $$('[data-dot]');
    if (sections.length < 3) return;
    const nav = d.createElement('nav');
    nav.id = 'section-dots';
    nav.setAttribute('aria-label', 'Sections on this page');
    const buttons = sections.map((section) => {
      const b = d.createElement('button');
      b.type = 'button';
      b.className = 'sdot';
      b.dataset.label = section.dataset.dot;
      b.setAttribute('aria-label', section.dataset.dot);
      b.addEventListener('click', () => section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
      nav.append(b);
      return b;
    });
    d.body.append(nav);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = sections.indexOf(e.target);
        buttons.forEach((b, j) => b.classList.toggle('is-on', i === j));
        nav.classList.toggle('on-light', e.target.matches('.section--paper, .section--paper-2, .section--gold, .stat-band, .cta-band'));
      }
    }, { rootMargin: '-48% 0px -48% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  function toTop() {
    const btn = $('#to-top');
    if (!btn) return;
    const deep = d.createElement('div');
    deep.className = 'scroll-sentinel scroll-sentinel--deep';
    deep.setAttribute('aria-hidden', 'true');
    d.body.prepend(deep);
    new IntersectionObserver(([e]) => {
      btn.classList.toggle('is-shown', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(deep);
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      const main = $('#main');
      if (main) main.focus({ preventScroll: true });
    });
  }

  function reveals() {
    const els = $$('.rv, .rv-l, .rv-r, .rv-s');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('vis'));
      return;
    }
    const intro = els.filter((el) => el.closest('[data-intro]'));
    pageReady.then(() => intro.forEach((el) => el.classList.add('vis')));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('vis');
        io.unobserve(e.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.filter((el) => !intro.includes(el)).forEach((el) => io.observe(el));
  }

  // Headlines rise line by line from a mask. Lines are re-measured when fonts load or
  // the window resizes (autoSplit), so a headline never keeps a stale break.
  function splitHeadings() {
    const heads = $$('[data-split]');
    if (!heads.length) return;
    if (reduced || !Split) {
      heads.forEach((h) => h.classList.add('is-split'));
      return;
    }
    const run = () => heads.forEach((el) => {
      const isIntro = !!el.closest('[data-intro]');
      let played = false;
      Split.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit(self) {
          el.classList.add('is-split');
          if (played) return undefined;
          if (isIntro) {
            G.set(self.lines, { yPercent: 110 });
            pageReady.then(() => {
              played = true;
              G.to(self.lines, { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.1, delay: 0.05 });
            });
            return undefined;
          }
          return G.from(self.lines, {
            yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true, onEnter: () => { played = true; } },
          });
        },
      });
    });
    (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(run);
  }

  // A counter's final value is its HTML text, so a crawler and a visitor without
  // JavaScript both read the real figure. The count runs up to it and lands on it.
  function counters() {
    const els = $$('[data-count]');
    if (!els.length || reduced) return;
    const run = (el) => {
      const final = el.textContent;
      const m = final.match(/^(\D*?)(\d[\d,]*)(.*)$/s);
      if (!m) return;
      const [, pre, digits, post] = m;
      const target = parseInt(digits.replace(/,/g, ''), 10);
      const commas = digits.includes(',');
      const fmt = (v) => (commas ? Math.round(v).toLocaleString('en-US') : String(Math.round(v)));
      el.style.minWidth = `${el.getBoundingClientRect().width}px`;
      el.style.display = 'inline-block';
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 1900);
        el.textContent = pre + fmt(target * (1 - Math.pow(1 - p, 4))) + post;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = final;
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        run(e.target);
        io.unobserve(e.target);
      }
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  function parallax() {
    if (!G || reduced) return;
    for (const el of $$('[data-parallax]')) {
      const amount = (parseFloat(el.dataset.parallax) || 0.12) * 100;
      const atTop = !!el.closest('.hero, .page-hero');
      G.fromTo(el, { yPercent: atTop ? 0 : -amount }, {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: atTop ? 'top top' : 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  }

  function tilt() {
    if (!finePointer || reduced) return;
    for (const card of $$('.tilt')) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilting');
        card.style.transform = `perspective(1000px) rotateY(${x * 9}deg) rotateX(${-y * 7}deg) translateY(-6px)`;
        card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    }
  }

  function scenes() {
    for (const el of $$('[data-scene]')) {
      const scene = SCENES[el.dataset.scene];
      if (scene) scene(el, { G, Split, reduced, pageReady });
    }
  }

  function safely(fn) {
    try { fn(); } catch (err) { console.error(`[prince] ${fn.name}:`, err); }
  }

  function init() {
    [fileLinks, loaderOnce, header, progress, cursor, dots, toTop, reveals, splitHeadings, counters, parallax, tilt, scenes]
      .forEach(safely);
    html.classList.add('motion-ready');
    if (G) window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
