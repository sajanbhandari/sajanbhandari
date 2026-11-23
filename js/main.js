(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // Only allow safe link schemes; everything is inserted via textContent / properties.
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(u) || /^[\w-]+(\/|\.)/.test(u) && !/^[a-z]+:/i.test(u)) return u;
    return '';
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function chips(items) {
    var ul = el('ul', 'chips');
    (items || []).forEach(function (t) { ul.appendChild(el('li', null, t)); });
    return ul;
  }

  function render(d) {
    if (d.meta) {
      if (d.meta.title) document.title = d.meta.title;
      var md = document.querySelector('meta[name="description"]');
      if (md && d.meta.description) md.content = d.meta.description;
    }
    $('name').textContent = d.name || '';
    $('brand').textContent = (d.name || 'SB').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    $('role').textContent = d.role || '';
    $('tagline').textContent = d.tagline || '';

    var av = $('availability');
    if (d.availability) av.lastElementChild.textContent = d.availability; else av.hidden = true;

    var fig = $('avatar');
    if (d.avatar && safeUrl(d.avatar)) {
      var img = el('img'); img.src = safeUrl(d.avatar); img.alt = d.name || ''; img.loading = 'eager';
      fig.appendChild(img); fig.hidden = false;
    }

    var about = d.about || {};
    $('about-heading').textContent = about.heading || '';
    (about.paragraphs || []).forEach(function (p) { $('about-body').appendChild(el('p', null, p)); });

    (d.skills || []).forEach(function (g) {
      var c = el('div', 'skill'); c.appendChild(el('h3', null, g.group)); c.appendChild(chips(g.items));
      $('skills').appendChild(c);
    });

    (d.projects || []).forEach(function (p) {
      var url = safeUrl(p.url);
      var card = el(url ? 'a' : 'div', 'card');
      if (url) { card.href = url; card.target = '_blank'; card.rel = 'noopener noreferrer'; }
      var th = el('div', 'thumb');
      if (p.image && safeUrl(p.image)) { var i = el('img'); i.src = safeUrl(p.image); i.alt = ''; i.loading = 'lazy'; th.appendChild(i); }
      var body = el('div', 'body');
      var h = el('h3', null, p.title || ''); if (url) h.appendChild(el('span', 'arrow', '↗'));
      body.appendChild(h); body.appendChild(el('p', null, p.description)); body.appendChild(chips(p.tags));
      card.appendChild(th); card.appendChild(body);
      $('projects').appendChild(card);
    });

    var exp = d.experience || [];
    if (!exp.length) $('experience').hidden = true;
    exp.forEach(function (x) {
      var li = el('li'); li.appendChild(el('div', 'period', x.period));
      var r = el('div'); var h = el('h3', null, x.role || '');
      if (x.org) { h.appendChild(document.createTextNode(' · ')); h.appendChild(el('span', null, x.org)); }
      r.appendChild(h); if (x.summary) r.appendChild(el('p', null, x.summary));
      li.appendChild(r); $('experience-list').appendChild(li);
    });

    var mail = $('mail');
    if (d.email) { mail.textContent = d.email; mail.href = 'mailto:' + encodeURIComponent(d.email).replace('%40', '@'); }
    else mail.hidden = true;
    (d.socials || []).forEach(function (s) {
      var u = safeUrl(s.url); if (!u) return;
      var li = el('li'), a = el('a', null, s.label); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
      li.appendChild(a); $('socials').appendChild(li);
    });
    $('copy').textContent = '© ' + new Date().getFullYear() + ' ' + (d.name || '');
    observe();
  }

  function observe() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(function (n) { n.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    items.forEach(function (n) { io.observe(n); });
  }

  // Theme toggle
  $('theme').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
  addEventListener('scroll', function () { $('nav').classList.toggle('scrolled', scrollY > 8); }, { passive: true });

  fetch('content/site.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () {
      document.querySelectorAll('.reveal').forEach(function (n) { n.classList.add('in'); });
      $('tagline').textContent = 'Content could not be loaded. Please try again shortly.';
    });
})();
