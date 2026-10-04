/*
 * PRINCE LUBRICANTS: site runtime.
 *
 * The behaviour of the client-approved index.html (loader, gold progress bar, ring
 * cursor, side dots, back-to-top, typewriter title, particles, reveals, counters,
 * parallax, card tilt), carried to every page and taken further with GSAP where it is
 * present. Every module is a no-op on a page without its elements. Nothing here writes
 * content: every word is already in the HTML, which is what crawlers read.
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

  // Resolves once the first-visit loader has gone (at once on later pages), so an intro
  // never plays underneath it. A timer guarantees it resolves whatever else happens.
  let markReady;
  const pageReady = new Promise((resolve) => { markReady = resolve; });
  setTimeout(() => markReady(), 4000);

  // Page scenes register here by name and run for each [data-scene="name"] element.
  const SCENES = {};

  /* Double-click preview from disk: under file: a folder link opens a folder listing,
     so point it at that folder's index.html. Served, nothing changes. */
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
    const go = () => setTimeout(out, Math.max(0, 1500 - performance.now()));
    if (d.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  function navbar() {
    const nav = $('#nav');
    if (!nav) return;

    const top = d.createElement('div');
    top.className = 'scroll-sentinel';
    top.setAttribute('aria-hidden', 'true');
    d.body.prepend(top);
    new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting)).observe(top);

    const items = $$('.nav-item[data-menu]');
    const burger = $('.burger');
    const menu = $('#mob-menu');

    const setOpen = (item, open, returnFocus) => {
      const toggle = $('.nav-toggle', item);
      item.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('has-open', items.some((i) => i.classList.contains('is-open')));
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
        item.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(() => openOnly(item), 80); });
        item.addEventListener('mouseleave', () => { clearTimeout(timer); timer = setTimeout(() => setOpen(item, false), 160); });
      }
      item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) setOpen(item, false); });
    }

    const setMobile = (open, returnFocus) => {
      if (!burger || !menu) return;
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
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
    const ring = $('#cur-ring');
    const dot = $('#cur-dot');
    if (!ring || !dot || !finePointer || reduced) return;
    html.classList.add('cursor-on');
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    }, { passive: true });
    (function follow() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    })();
    window.addEventListener('pointerdown', () => ring.classList.add('click'));
    window.addEventListener('pointerup', () => ring.classList.remove('click'));
    d.addEventListener('pointerover', (e) => {
      ring.classList.toggle('big', !!e.target.closest('a, button, .tilt, .pillar, .why-card, .tp, .tn, .tag, .cert'));
    });
    html.addEventListener('mouseleave', () => { ring.classList.add('gone'); dot.classList.add('gone'); });
    html.addEventListener('mouseenter', () => { ring.classList.remove('gone'); dot.classList.remove('gone'); });
  }

  function sideDots() {
    const sections = $$('[data-dot]');
    if (sections.length < 3) return;
    const nav = d.createElement('nav');
    nav.id = 'sidenav';
    nav.setAttribute('aria-label', 'Sections on this page');
    const dots = sections.map((section) => {
      const b = d.createElement('button');
      b.type = 'button';
      b.className = 'snd';
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
        dots.forEach((b, j) => b.classList.toggle('on', i === j));
        nav.classList.toggle('on-light', e.target.matches('[data-light], .stats'));
      }
    }, { rootMargin: '-48% 0px -48% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  function backToTop() {
    const btn = $('#btt');
    if (!btn) return;
    const deep = d.createElement('div');
    deep.className = 'scroll-sentinel scroll-sentinel--deep';
    deep.setAttribute('aria-hidden', 'true');
    d.body.prepend(deep);
    new IntersectionObserver(([e]) => {
      btn.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(deep);
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      const main = $('#main');
      if (main) main.focus({ preventScroll: true });
    });
  }

  function reveals() {
    const els = $$('.rv, .rv-l, .rv-r, .rv-s, .rv-wipe, [data-reveal]');
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
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.filter((el) => !intro.includes(el)).forEach((el) => io.observe(el));
  }

  // Section titles rise line by line from a mask. autoSplit re-measures the lines when
  // fonts load or the window resizes, so a title never keeps a stale break.
  function splitTitles() {
    const titles = $$('[data-split]');
    if (!titles.length) return;
    if (reduced || !Split) {
      titles.forEach((t) => t.classList.add('is-split'));
      return;
    }
    const run = () => titles.forEach((el) => {
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
              G.to(self.lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, delay: 0.1 });
            });
            return undefined;
          }
          return G.from(self.lines, {
            yPercent: 110, duration: 1.05, ease: 'expo.out', stagger: 0.09,
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
        el.textContent = pre + fmt(target * (1 - Math.pow(1 - p, 3))) + post;
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
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  }

  function parallax() {
    if (!G || reduced) return;
    for (const el of $$('[data-parallax]')) {
      const amount = (parseFloat(el.dataset.parallax) || 0.12) * 100;
      const atTop = !!el.closest('.hero, .page-hero');
      G.fromTo(el, { yPercent: atTop ? 0 : -amount / 2 }, {
        yPercent: atTop ? amount : amount / 2,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: atTop ? 'top top' : 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  }

  // index.html's 3D card tilt, with a glare that follows the pointer.
  function tilt() {
    if (!finePointer || reduced) return;
    for (const card of $$('.tilt')) {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add('is-tilting');
        card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
        card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    }
  }

  /* index.html's typewriter title. The words are in the HTML for crawlers and for
     visitors without JavaScript; here they are only revealed one letter at a time,
     with the gold cursor following the last letter typed. */
  SCENES.typewriter = (el) => {
    const ready = () => el.classList.add('tw-ready');
    if (reduced) { ready(); return; }
    try {
      const label = el.textContent.replace(/\s+/g, ' ').trim();
      const chars = [];
      const split = (node) => {
        for (const child of Array.from(node.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const frag = d.createDocumentFragment();
            for (const ch of child.textContent) {
              const span = d.createElement('span');
              span.className = 'tw-char';
              span.setAttribute('aria-hidden', 'true');
              span.textContent = ch;
              frag.append(span);
              chars.push(span);
            }
            child.replaceWith(frag);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            split(child);
          }
        }
      };
      split(el);
      el.setAttribute('aria-label', label);
      const caret = d.createElement('span');
      caret.className = 'type-cursor';
      caret.setAttribute('aria-hidden', 'true');
      el.append(caret);
      const place = (c, after) => {
        caret.style.left = `${c.offsetLeft + (after ? c.offsetWidth + 4 : -8)}px`;
        caret.style.top = `${c.offsetTop + c.offsetHeight * 0.11}px`;
        caret.style.height = `${c.offsetHeight * 0.78}px`;
      };
      el.classList.add('tw-on');
      place(chars[0], false);
      pageReady.then(() => {
        let i = 0;
        const step = () => {
          if (i >= chars.length) return;
          chars[i].classList.add('on');
          place(chars[i], true);
          i += 1;
          setTimeout(step, chars[i - 1].textContent === ' ' ? 30 : 62);
        };
        setTimeout(step, 350);
      });
    } finally {
      ready();
    }
  };

  // Global Presence: the arcs draw out from Singapore and the markets light up once the
  // map is a third of the way into view. The drawing itself is CSS (pathLength="1").
  SCENES.worldMap = (wrap) => {
    if (reduced || !('IntersectionObserver' in window)) { wrap.classList.add('map-on'); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      wrap.classList.add('map-on');
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(wrap);
  };

  // Ester technologies: the sticky stage follows whichever pillar holds the viewport
  // centre. Its state drives the molecule drawing; its caption names the pillar.
  SCENES.esterScene = (block) => {
    const stage = $('.ester-stage', block);
    const caption = $('.ester-caption', block);
    const pillars = $$('.ep', block);
    if (!stage || !caption || !pillars.length) return;
    const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
    const activate = (pillar) => {
      if (pillar.classList.contains('is-active')) return;
      pillars.forEach((p) => p.classList.toggle('is-active', p === pillar));
      stage.dataset.state = pillar.dataset.state;
      $('.ester-caption-num', caption).textContent = String(pillars.indexOf(pillar) + 1).padStart(2, '0');
      $('.ester-caption-text', caption).textContent = $('h3', pillar).textContent;
      if (!reduced) { retrigger(caption, 'swap'); retrigger(stage, 'pulse'); }
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) activate(e.target);
    }, { rootMargin: '-45% 0px -45% 0px' });
    pillars.forEach((p) => io.observe(p));
    activate(pillars[0]);
  };

  // Gold dust rising through the hero, as in index.html, on one canvas.
  SCENES.particles = (canvas) => {
    if (reduced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 2.2 + 0.6,
      vy: -(Math.random() * 0.45 + 0.12),
      vx: (Math.random() - 0.5) * 0.18,
      a: Math.random() * 0.5 + 0.2,
      t: Math.random() * Math.PI * 2,
    });
    const dots = Array.from({ length: Math.round(Math.min(70, w / 20)) }, () => spawn(true));
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    (function frame() {
      if (visible) {
        ctx.clearRect(0, 0, w, h);
        for (const p of dots) {
          p.x += p.vx; p.y += p.vy; p.t += 0.02;
          if (p.y < -12) Object.assign(p, spawn(false));
          const alpha = p.a * (0.55 + 0.45 * Math.sin(p.t)) * Math.min(1, p.y / (h * 0.25));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 215, 0, ${alpha.toFixed(3)})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(255, 200, 0, .85)';
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    })();
  };

  function scenes() {
    for (const el of $$('[data-scene]')) {
      const scene = SCENES[el.dataset.scene];
      if (!scene) continue;
      try { scene(el); } catch (err) { console.error(`[prince] scene ${el.dataset.scene}:`, err); }
    }
  }

  function safely(fn) {
    try { fn(); } catch (err) { console.error(`[prince] ${fn.name}:`, err); }
  }

  function init() {
    [fileLinks, loaderOnce, navbar, progress, cursor, sideDots, backToTop, reveals, splitTitles, counters, parallax, tilt, scenes]
      .forEach(safely);
    html.classList.add('motion-ready');
    if (G) window.addEventListener('load', () => window.ScrollTrigger.refresh(), { once: true });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
