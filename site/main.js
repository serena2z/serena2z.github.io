(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Today's date in the stamp + colophon
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  document.querySelectorAll('[data-today]').forEach((el) => (el.textContent = today));

  // ── Title: split into letters for the staggered entrance
  const split = document.querySelector('.title .split');
  if (split) {
    const text = split.textContent;
    split.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char' + (ch === ' ' ? ' space' : '');
      if (i === 0 || text[i - 1] === ' ') span.classList.add('accent');
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? ' ' : ch;
      split.appendChild(span);
    });
  }

  // ── Reading progress line
  const bar = document.querySelector('.progress span');
  let ticking = false;
  const updateProgress = () => {
    const max = root.scrollHeight - root.clientHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max) : 0);
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { passive: true },
  );
  updateProgress();

  // ── Sections drift in and draw their underline once
  const sections = document.querySelectorAll('.section');
  document.querySelectorAll('.squiggle path').forEach((p) => p.setAttribute('pathLength', '1'));
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  sections.forEach((s) => revealer.observe(s));

  // ── Contents: highlight the section being read
  const tocLinks = [...document.querySelectorAll('.contents a')];
  const tocList = document.querySelector('.contents ol');
  const setActive = (id) => {
    tocLinks.forEach((a, i) => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on && tocList) {
        tocList.style.setProperty('--marker-y', `${i * a.offsetHeight}px`);
        tocList.style.setProperty('--marker-o', 1);
      }
    });
    if (!tocLinks.some((a) => a.classList.contains('is-active')) && tocList) {
      tocList.style.setProperty('--marker-o', 0);
    }
  };
  const spy = () => {
    const line = window.innerHeight * 0.35;
    let current = null;
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top < line) current = s.id;
    });
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) {
      current = sections[sections.length - 1].id;
    }
    setActive(current);
  };
  window.addEventListener('scroll', () => requestAnimationFrame(spy), { passive: true });
  spy();

  // ── Fig. 1: she says hello
  const hit = document.querySelector('.portrait-hit');
  const bubble = document.querySelector('.bubble');
  const sparkles = document.querySelector('.sparkles');
  const lines = [
    'hi!',
    'welcome ♡',
    'thanks for visiting',
    'my work is below ↓',
    'have a lovely day',
    'ok, that tickles',
  ];
  let n = 0;
  const star = 'M0 -5 C 0.6 -0.6 0.6 -0.6 5 0 C 0.6 0.6 0.6 0.6 0 5 C -0.6 0.6 -0.6 0.6 -5 0 C -0.6 -0.6 -0.6 -0.6 0 -5 Z';

  const burst = () => {
    if (reduceMotion) return;
    for (let i = 0; i < 7; i++) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.6;
      const r = 16 + Math.random() * 14;
      const x = 22 + Math.random() * 12;
      const y = 26 + Math.random() * 10;
      const s = 0.45 + Math.random() * 0.55;
      p.setAttribute('d', star);
      p.style.setProperty('--dx', `${Math.cos(angle) * r}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * r}px`);
      if (i % 2) p.style.fill = 'var(--blush)';
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
      g.appendChild(p);
      sparkles.appendChild(g);
      p.addEventListener('animationend', () => g.remove());
    }
  };

  if (hit && bubble) {
    hit.addEventListener('click', () => {
      n = (n + 1) % lines.length;
      bubble.textContent = lines[n];
      bubble.classList.remove('is-swap');
      hit.classList.remove('is-bounce');
      void bubble.offsetWidth; // restart the animations
      bubble.classList.add('is-swap');
      hit.classList.add('is-bounce');
      burst();
    });
    hit.addEventListener('animationend', (e) => {
      if (e.animationName === 'bounce') hit.classList.remove('is-bounce');
    });
  }

  // ── Email: assemble the link in the browser, and copy on request
  const email = document.querySelector('.email');
  const copy = document.querySelector('[data-copy]');
  if (email) {
    const address = `${email.dataset.user}@${email.dataset.domain}`;
    email.innerHTML = '';
    const a = document.createElement('a');
    a.href = `mailto:${address}`;
    a.textContent = address;
    email.appendChild(a);

    if (copy && navigator.clipboard) {
      const label = copy.querySelector('.copy-label');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(address);
          label.textContent = 'copied ♡';
          copy.classList.add('is-done');
        } catch {
          label.textContent = 'press ⌘C';
        }
        setTimeout(() => {
          label.textContent = 'copy';
          copy.classList.remove('is-done');
        }, 1800);
      });
    } else if (copy) {
      copy.hidden = true;
    }
  }
})();
