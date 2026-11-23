(function () {
  'use strict';

  var CONTENT_PATH = 'content/site.json';
  var UPLOAD_DIR = 'assets/uploads/';
  var $ = function (id) { return document.getElementById(id); };

  // ---- Content schema: drives the whole editor form ----
  var text = function (key, label, o) { return Object.assign({ key: key, label: label, type: 'text' }, o); };
  var area = function (key, label) { return { key: key, label: label, type: 'textarea' }; };
  var SCHEMA = [
    { title: 'Site', type: 'object', key: 'meta', fields: [text('title', 'Page title'), area('description', 'Search description')] },
    { title: 'Intro', type: 'group', fields: [
      text('name', 'Name'), text('role', 'Role'), text('tagline', 'Tagline'),
      text('availability', 'Availability badge (leave empty to hide)'), text('location', 'Location'),
      { key: 'avatar', label: 'Photo', type: 'image' }
    ] },
    { title: 'About', type: 'object', key: 'about', fields: [
      text('heading', 'Headline'),
      { key: 'paragraphs', label: 'Paragraphs', type: 'list', itemType: 'textarea', noun: 'paragraph' }
    ] },
    { title: 'Skills', type: 'group', fields: [{
      key: 'skills', label: 'Skill groups', type: 'list', itemType: 'object', noun: 'group', titleKey: 'group',
      fields: [text('group', 'Group name'), { key: 'items', label: 'Skills', type: 'list', itemType: 'text', noun: 'skill' }]
    }] },
    { title: 'Projects', type: 'group', fields: [{
      key: 'projects', label: 'Projects', type: 'list', itemType: 'object', noun: 'project', titleKey: 'title',
      fields: [text('title', 'Title'), area('description', 'Description'), text('url', 'Link (https://…)'),
        { key: 'image', label: 'Image', type: 'image' },
        { key: 'tags', label: 'Tags', type: 'list', itemType: 'text', noun: 'tag' }]
    }] },
    { title: 'Experience', type: 'group', fields: [{
      key: 'experience', label: 'Entries', type: 'list', itemType: 'object', noun: 'entry', titleKey: 'role',
      fields: [text('role', 'Role'), text('org', 'Organisation'), text('period', 'Period'), area('summary', 'Summary')]
    }] },
    { title: 'Contact', type: 'group', fields: [
      text('email', 'Email'),
      { key: 'socials', label: 'Social links', type: 'list', itemType: 'object', noun: 'link', titleKey: 'label',
        fields: [text('label', 'Label'), text('url', 'URL')] }
    ] }
  ];

  // ---- State ----
  var cfg, data, sha, dirty = false;

  function setStatus(msg, cls) { var s = $('status'); s.textContent = msg || ''; s.className = cls || ''; }
  function markDirty() { if (!dirty) { dirty = true; setStatus('Unsaved changes'); } }

  // ---- GitHub API ----
  function api(path, opts) {
    opts = opts || {};
    return fetch('https://api.github.com/repos/' + cfg.repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/') +
      (opts.method === 'PUT' ? '' : '?ref=' + encodeURIComponent(cfg.branch)), {
      method: opts.method || 'GET',
      headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.message || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  var b64 = function (s) { return btoa(unescape(encodeURIComponent(s))); };
  var unb64 = function (s) { return decodeURIComponent(escape(atob(s.replace(/\n/g, '')))); };

  function load() {
    return api(CONTENT_PATH).then(function (f) { sha = f.sha; data = JSON.parse(unb64(f.content)); });
  }

  function save() {
    var btn = $('save'); btn.disabled = true; setStatus('Saving…');
    var body = { message: 'Update portfolio content', branch: cfg.branch, sha: sha, content: b64(JSON.stringify(data, null, 2) + '\n') };
    api(CONTENT_PATH, { method: 'PUT', body: body }).then(function (r) {
      sha = r.content.sha; dirty = false; setStatus('Saved. Live in about a minute.', 'ok');
    }).catch(function (e) {
      setStatus(e.status === 409 || e.status === 422 ? 'Content changed elsewhere. Reload the page and retry.' : 'Save failed: ' + e.message, 'err');
    }).then(function () { btn.disabled = false; });
  }

  function upload(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('Could not read file')); };
      fr.onload = function () {
        var name = Date.now() + '-' + file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        api(UPLOAD_DIR + name, { method: 'PUT', body: { message: 'Upload ' + name, branch: cfg.branch, content: String(fr.result).split(',')[1] } })
          .then(function () { res(UPLOAD_DIR + name); }, rej);
      };
      fr.readAsDataURL(file);
    });
  }

  // ---- Form rendering ----
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function field(f, obj, key) {
    if (f.type === 'list') return listField(f, obj, key);
    var wrap = h('label', null, f.label);
    if (f.type === 'image') {
      var row = h('div', 'imgrow'), inp = h('input'); inp.type = 'text'; inp.placeholder = 'assets/uploads/… or https://…';
      var prev = h('img'); prev.alt = ''; prev.hidden = true;
      var show = function () { var v = obj[key] || ''; prev.hidden = !v; if (v) prev.src = /^https?:/.test(v) ? v : '../' + v; };
      inp.value = obj[key] || ''; show();
      inp.addEventListener('input', function () { obj[key] = inp.value; show(); markDirty(); });
      var file = h('input'); file.type = 'file'; file.accept = 'image/*';
      var up = h('button', null, 'Upload'); up.type = 'button';
      up.addEventListener('click', function (ev) { ev.preventDefault(); file.click(); });
      file.addEventListener('change', function () {
        if (!file.files[0]) return;
        if (file.files[0].size > 5e6) { setStatus('Image must be under 5 MB', 'err'); return; }
        setStatus('Uploading…'); up.disabled = true;
        upload(file.files[0]).then(function (p) { obj[key] = p; inp.value = p; show(); markDirty(); setStatus('Image uploaded. Save to publish.'); })
          .catch(function (e) { setStatus('Upload failed: ' + e.message, 'err'); })
          .then(function () { up.disabled = false; file.value = ''; });
      });
      row.append(prev, inp, up, file); wrap.appendChild(row); return wrap;
    }
    var i = f.type === 'textarea' ? h('textarea') : h('input');
    i.value = obj[key] == null ? '' : obj[key];
    i.addEventListener('input', function () { obj[key] = i.value; markDirty(); });
    wrap.appendChild(i); return wrap;
  }

  function listField(f, obj, key) {
    if (!Array.isArray(obj[key])) obj[key] = [];
    var arr = obj[key];
    var box = h('div'); box.appendChild(h('h2', null, f.label));
    var items = h('div'); box.appendChild(items);
    var add = h('button', 'add', 'Add ' + f.noun); add.type = 'button';
    box.appendChild(add);

    function draw() {
      items.textContent = '';
      arr.forEach(function (_, idx) {
        var it = h('div', 'item'), head = h('div', 'item-head');
        var title = f.titleKey && arr[idx] && arr[idx][f.titleKey];
        head.appendChild(h('span', null, title || (f.noun + ' ' + (idx + 1))));
        [['↑', -1], ['↓', 1]].forEach(function (m) {
          var b = h('button', null, m[0]); b.type = 'button'; b.title = 'Move';
          b.disabled = idx + m[1] < 0 || idx + m[1] >= arr.length;
          b.addEventListener('click', function () { var t = arr[idx]; arr[idx] = arr[idx + m[1]]; arr[idx + m[1]] = t; markDirty(); draw(); });
          head.appendChild(b);
        });
        var rm = h('button', null, 'Remove'); rm.type = 'button';
        rm.addEventListener('click', function () { if (confirm('Remove this ' + f.noun + '?')) { arr.splice(idx, 1); markDirty(); draw(); } });
        head.appendChild(rm); it.appendChild(head);
        if (f.itemType === 'object') {
          f.fields.forEach(function (sf) { it.appendChild(field(sf, arr[idx], sf.key)); });
        } else {
          it.appendChild(field({ type: f.itemType, label: f.noun }, arr, idx));
        }
        items.appendChild(it);
      });
    }
    add.addEventListener('click', function () {
      arr.push(f.itemType === 'object' ? {} : ''); markDirty(); draw();
    });
    draw(); return box;
  }

  function renderForm() {
    var root = $('form'); root.textContent = '';
    SCHEMA.forEach(function (sec) {
      var g = h('section', 'group');
      var target = data;
      if (sec.type === 'object') { if (!data[sec.key]) data[sec.key] = {}; target = data[sec.key]; }
      g.appendChild(h('h2', null, sec.title));
      sec.fields.forEach(function (f) { g.appendChild(field(f, target, f.key)); });
      root.appendChild(g);
    });
  }

  // ---- Session ----
  function start() {
    $('login').hidden = true; $('app').hidden = false; setStatus('Loading…');
    load().then(function () { renderForm(); setStatus(''); }).catch(function (e) {
      $('app').hidden = true; $('login').hidden = false;
      $('login-error').textContent = e.status === 401 || e.status === 403 || e.status === 404
        ? 'GitHub rejected the request (' + e.message + '). Check the repo name, branch and token permissions.'
        : 'Could not load content: ' + e.message;
    });
  }

  $('login-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    cfg = { repo: $('repo').value.trim(), branch: $('branch').value.trim(), token: $('token').value.trim() };
    try { localStorage.setItem('cms-cfg', JSON.stringify(cfg)); } catch (e) {}
    $('login-error').textContent = ''; start();
  });
  $('logout').addEventListener('click', function () {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    try { localStorage.removeItem('cms-cfg'); } catch (e) {}
    location.reload();
  });
  $('save').addEventListener('click', save);
  addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  try {
    var saved = JSON.parse(localStorage.getItem('cms-cfg') || 'null');
    if (saved && saved.token) { cfg = saved; $('repo').value = cfg.repo; $('branch').value = cfg.branch; start(); }
  } catch (e) {}
})();
