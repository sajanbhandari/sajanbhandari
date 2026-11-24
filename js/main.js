(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // Only allow safe link schemes; everything is inserted via textContent / properties.
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(u)) return u;
    if (/^[\w-]+(\/|\.)/.test(u) && !/^[a-z]+:/i.test(u)) return u;
    return '';
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function arr(v) { return Array.isArray(v) ? v : []; }

  function hideSection(id) {
    var s = $(id); if (s) s.hidden = true;
    var a = document.querySelector('.masthead nav a[href="#' + id + '"]'); if (a) a.hidden = true;
  }

  function setFact(id, value) {
    var box = $('fact-' + id);
    if (value) box.querySelector('dd').textContent = value; else box.hidden = true;
  }

  function renderHero(d) {
    var name = str(d.name);
    $('name').textContent = name;
    $('brand-name').textContent = name;
    $('brand').textContent = name ? name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() : 'SB';
    $('tagline').hidden = !str(d.tagline);
    $('tagline').textContent = str(d.tagline);
    setFact('role', str(d.role));
    setFact('location', str(d.location));
    setFact('availability', str(d.availability));
    if ($('facts').querySelectorAll('.fact:not([hidden])').length === 0) $('facts').hidden = true;

    // Shirt-back graphic: surname and number come from the content file.
    var parts = name.split(/\s+/).filter(Boolean);
    var surname = (parts.length > 1 ? parts[parts.length - 1] : name).toUpperCase();
    var number = str(String(d.number == null ? '' : d.number)).slice(0, 3);
    var jn = $('jersey-name'), jnum = $('jersey-number');
    jn.textContent = surname;
    jn.setAttribute('font-size', Math.max(16, Math.min(34, Math.floor(330 / Math.max(surname.length, 1)))));
    jnum.textContent = number;
    jnum.setAttribute('font-size', number.length > 2 ? 140 : 190);
    if (!name && !number) document.querySelector('.hero-art').hidden = true;
  }

  function renderAbout(a, avatar, name) {
    a = a || {};
    var heading = str(a.heading), paras = arr(a.paragraphs).map(str).filter(Boolean);
    var src = safeUrl(avatar);
    if (src) {
      var img = el('img'); img.src = src; img.alt = name || ''; img.width = 800; img.height = 1000; img.loading = 'lazy';
      $('avatar').appendChild(img); $('avatar').hidden = false;
    } else $('about-grid').classList.add('no-photo');
    if (!heading && !paras.length && !src) { hideSection('about'); return; }
    $('about-heading').textContent = heading; $('about-heading').hidden = !heading;
    paras.forEach(function (p) { $('about-body').appendChild(el('p', null, p)); });
  }

  function bindHighlight(scope) {
    function toggle(n, on) {
      scope.querySelectorAll('[data-n="' + n + '"]').forEach(function (n2) { n2.classList.toggle('is-on', on); });
    }
    scope.querySelectorAll('[data-n]').forEach(function (node) {
      var n = node.getAttribute('data-n');
      node.addEventListener('mouseenter', function () { toggle(n, true); });
      node.addEventListener('mouseleave', function () { toggle(n, false); });
      node.addEventListener('focus', function () { toggle(n, true); });
      node.addEventListener('blur', function () { toggle(n, false); });
    });
  }

  function renderSkills(raw) {
    var groups = arr(raw).map(function (g) {
      return { group: str(g && g.group), items: arr(g && g.items).map(str).filter(Boolean) };
    }).filter(function (g) { return g.items.length; });
    if (!groups.length) { hideSection('skills'); return; }

    var n = 1;
    groups.forEach(function (g) { g.nums = g.items.map(function () { return n++; }); });

    var pitchOk = groups.length <= 5 && groups.every(function (g) { return g.items.length <= 6; });
    var section = $('skills'), squad = $('squad');

    groups.forEach(function (g) {
      var box = el('div', 'squad-group');
      var h = el('h3', null, g.group); h.appendChild(document.createTextNode(' '));
      h.appendChild(el('span', 'count', '(' + g.items.length + ')'));
      box.appendChild(h);
      var ul = el('ul');
      g.items.forEach(function (item, i) {
        var li = el('li'); li.setAttribute('data-n', g.nums[i]);
        if (pitchOk) li.tabIndex = 0;
        li.appendChild(el('span', 'num', String(g.nums[i]))); li.appendChild(el('span', 'name', item));
        ul.appendChild(li);
      });
      box.appendChild(ul); squad.appendChild(box);
    });

    if (!pitchOk) {
      $('pitch').hidden = true; section.classList.add('teamsheet--list');
      $('ts-note').textContent = 'Skills grouped by area.';
      return;
    }

    var lines = $('formation-lines');
    groups.slice().reverse().forEach(function (g, i) {
      var fl = el('div', 'fl'); fl.style.setProperty('--i', i);
      g.items.forEach(function (item, j) {
        var dot = el('span', 'dot'); dot.setAttribute('data-n', g.nums[j]);
        dot.appendChild(el('span', 'dot-num', String(g.nums[j])));
        var lab = el('span', 'dot-label', item); lab.title = item; dot.appendChild(lab);
        fl.appendChild(dot);
      });
      fl.appendChild(el('span', 'fl-label', g.group));
      lines.appendChild(fl);
    });

    if (groups.length >= 2) {
      $('formation-figure').textContent = groups.slice().reverse().map(function (g) { return g.items.length; }).join('-');
      $('formation').hidden = false;
    }
    bindHighlight(section.querySelector('.teamsheet-grid'));

    var pitch = $('pitch');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('IntersectionObserver' in window && !reduce) {
      pitch.classList.add('is-armed');
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { pitch.classList.add('is-live'); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(pitch);
    }
  }

  function renderProjects(raw) {
    var list = arr(raw).filter(function (p) { return p && (str(p.title) || str(p.description)); });
    if (!list.length) { hideSection('work'); return; }
    list.forEach(function (p) {
      var li = el('li'), art = el('article', 'report');
      var url = safeUrl(p.url), img = safeUrl(p.image);

      var h = el('h3', 'report-title');
      if (url) {
        var a = el('a', null, str(p.title)); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.appendChild(el('span', 'sr-only', ' (opens in a new tab)')); h.appendChild(a);
      } else h.textContent = str(p.title);

      var body = el('div', 'report-body');
      if (str(p.description)) body.appendChild(el('p', null, str(p.description)));
      var tags = arr(p.tags).map(str).filter(Boolean);
      if (tags.length) body.appendChild(el('p', 'report-tags small', 'Built with ' + tags.join(', ')));

      if (img) {
        var fig = el('figure', 'report-media'), im = el('img');
        im.src = img; im.alt = ''; im.loading = 'lazy'; im.width = 640; im.height = 400; fig.appendChild(im);
        body.insertBefore(h, body.firstChild); art.appendChild(fig); art.appendChild(body);
      } else {
        art.classList.add('report--text'); art.appendChild(h); art.appendChild(body);
      }
      li.appendChild(art); $('projects').appendChild(li);
    });
  }

  function cell(tag, cls, label, value) {
    var c = el(tag, cls); c.setAttribute('data-label', label);
    if (tag === 'th') c.scope = 'row';
    if (value) c.textContent = value;
    else { c.textContent = '—'; c.setAttribute('aria-label', 'Not given'); }
    return c;
  }
  function renderExperience(raw) {
    var rows = arr(raw).filter(function (x) { return x && (str(x.role) || str(x.org)); });
    if (!rows.length) { hideSection('experience'); return; }
    rows.forEach(function (x) {
      var tr = el('tr');
      tr.appendChild(cell('td', 'season', 'Season', str(x.period)));
      tr.appendChild(cell('th', null, 'Role', str(x.role)));
      tr.appendChild(cell('td', null, 'Team', str(x.org)));
      tr.appendChild(cell('td', 'summary', 'Summary', str(x.summary)));
      $('experience-list').appendChild(tr);
    });
  }

  function renderContact(d) {
    var email = str(d.email);
    if (email) {
      var m = $('mail'); m.textContent = email; m.href = 'mailto:' + encodeURIComponent(email).replace('%40', '@');
    } else { $('mail').hidden = true; $('mail-intro').hidden = true; }
    var n = 0;
    arr(d.socials).forEach(function (s) {
      var u = safeUrl(s && s.url); if (!u) return;
      var li = el('li'), a = el('a', null, str(s.label) || u); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.appendChild(el('span', 'sr-only', ' (opens in a new tab)'));
      li.appendChild(a); $('socials').appendChild(li); n++;
    });
    if (!n) $('elsewhere').hidden = true;
    if (!email && !n) hideSection('contact');
  }

  function renderServices(raw) {
    var list = arr(raw).filter(function (x) { return x && str(x.title); });
    if (!list.length) { hideSection('services'); return; }
    list.forEach(function (x) {
      var li = el('li'); li.appendChild(el('h3', null, str(x.title)));
      if (str(x.description)) li.appendChild(el('p', null, str(x.description)));
      $('services-list').appendChild(li);
    });
  }

  function renderQuotes(raw) {
    var list = arr(raw).filter(function (x) { return x && str(x.quote); });
    if (!list.length) { hideSection('quotes'); return; }
    list.forEach(function (x) {
      var bq = el('blockquote'); bq.appendChild(el('p', null, '“' + str(x.quote) + '”'));
      if (str(x.name)) {
        var c = el('cite', 'small'); c.appendChild(el('strong', null, str(x.name)));
        if (str(x.role)) c.appendChild(document.createTextNode(', ' + str(x.role)));
        bq.appendChild(c);
      }
      $('quotes-list').appendChild(bq);
    });
  }

  function renderNews(raw) {
    var list = arr(raw).filter(function (x) { return x && str(x.title); });
    if (!list.length) { hideSection('news'); return; }
    list.forEach(function (x) {
      var li = el('li'), when = str(x.date);
      var t = el('time', null, when);
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(when)) {
        t.dateTime = when;
        var dt = new Date(when.length === 7 ? when + '-01T00:00:00' : when + 'T00:00:00');
        if (!isNaN(dt)) t.textContent = dt.toLocaleDateString('en-GB', when.length === 7 ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });
      }
      var body = el('div'), h = el('h3'), url = safeUrl(x.url);
      if (url) {
        var a = el('a', null, str(x.title)); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.appendChild(el('span', 'sr-only', ' (opens in a new tab)')); h.appendChild(a);
      } else h.textContent = str(x.title);
      body.appendChild(h); if (str(x.summary)) body.appendChild(el('p', null, str(x.summary)));
      li.appendChild(t); li.appendChild(body); $('news-list').appendChild(li);
    });
  }

  // Static hosting has no mail backend, so the form prepares an email in the visitor's own app.
  function bindForm(email) {
    var form = $('form');
    if (!email) { form.hidden = true; return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('f-name'), m = $('f-email'), g = $('f-msg'), note = $('form-note');
      if (!n.value.trim() || !m.validity.valid || !m.value.trim() || !g.value.trim()) {
        note.textContent = 'Fill in your name, a valid email and a message.';
        (!n.value.trim() ? n : (!m.validity.valid || !m.value.trim()) ? m : g).focus();
        return;
      }
      var body = g.value.trim() + '\n\n' + n.value.trim() + '\n' + m.value.trim();
      location.href = 'mailto:' + encodeURIComponent(email).replace('%40', '@') +
        '?subject=' + encodeURIComponent('Message from ' + n.value.trim()) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Your email app should open with the message ready. If it does not, write to ' + email + '.';
    });
  }

  function renderPlan(raw) {
    var list = arr(raw).filter(function (x) { return x && str(x.title); });
    if (!list.length) { hideSection('process'); return; }
    list.forEach(function (x) {
      var li = el('li'); li.appendChild(el('h3', null, str(x.title)));
      if (str(x.description)) li.appendChild(el('p', null, str(x.description)));
      $('plan-list').appendChild(li);
    });
  }

  // Local time at the player's base, so visitors know when a reply is likely.
  function startLocalTime(tz) {
    var box = $('fact-time');
    if (!tz) { box.hidden = true; return; }
    function tick() {
      try {
        var parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
        var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
        $('localtime').textContent = get('hour') + ':' + get('minute') + ' ' + get('timeZoneName');
      } catch (e) { box.hidden = true; clearInterval(timer); }
    }
    var timer = setInterval(tick, 30000); tick();
  }

  // Match clock: scroll progress shown as minutes played.
  function startClock() {
    var bar = $('progress'), clock = $('clock'), queued = false;
    function update() {
      queued = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      clock.textContent = p >= .995 ? 'FT' : Math.round(p * 90) + '\u2032';
    }
    addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); update();
  }

  function startTheme() {
    var btn = $('mode'), root = document.documentElement;
    function sync() {
      var dark = root.dataset.theme === 'dark';
      btn.setAttribute('aria-pressed', dark); btn.textContent = dark ? 'Day match' : 'Night match';
    }
    btn.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      sync();
    });
    sync();
  }

  function watchNav() {
    if (!('IntersectionObserver' in window)) return;
    var links = {};
    document.querySelectorAll('.masthead nav a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
        if (links[e.target.id]) links[e.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(links).forEach(function (id) { var s = $(id); if (s && !s.hidden) io.observe(s); });
  }

  function render(d) {
    d = d || {};
    if (d.meta) {
      if (str(d.meta.title)) document.title = d.meta.title;
      var md = document.querySelector('meta[name="description"]');
      if (md && str(d.meta.description)) md.content = d.meta.description;
    }
    renderHero(d);
    renderAbout(d.about, d.avatar, str(d.name));
    renderServices(d.services);
    renderSkills(d.skills);
    renderProjects(d.projects);
    renderPlan(d.process);
    renderExperience(d.experience);
    renderQuotes(d.testimonials);
    renderNews(d.news);
    renderContact(d);
    bindForm(str(d.email));
    var cv = safeUrl(d.cv);
    if (cv) { $('cv').href = cv; $('cv').hidden = false; }
    startLocalTime(str(d.timezone));
    if ($('work').hidden) $('cta-work').hidden = true;
    $('copy').textContent = '© ' + new Date().getFullYear() + (str(d.name) ? ' ' + str(d.name) : '');
    watchNav();
  }

  startTheme(); startClock();

  fetch('content/site.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(render)
    .catch(function () {
      $('tagline').hidden = false;
      $('tagline').textContent = 'Content failed to load. Refresh to try again.';
    });
})();
