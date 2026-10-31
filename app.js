/* Life Organizer — app logic
   Plain JavaScript, no build step. Everything you enter is saved in this browser's localStorage
   on this device only. Use Settings → Back up / Restore to move data between devices.
   Sections: Today, Plans (dated events), Notes, Tasks, Habits, Settings. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ Storage */
  var KEY = 'lo:data:v1';
  var EMPTY = function () { return { v: 1, tasks: [], habits: [], events: [], notes: [], ack: {} }; };

  function normalise(d) {
    var base = EMPTY();
    if (!d || typeof d !== 'object') return base;
    ['tasks', 'habits', 'events', 'notes'].forEach(function (k) { base[k] = Array.isArray(d[k]) ? d[k] : []; });
    base.habits.forEach(function (h) { if (!h.log || typeof h.log !== 'object') h.log = {}; });
    base.ack = d.ack && typeof d.ack === 'object' ? d.ack : {};   // dismissed clash flags
    return base;
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); return normalise(raw ? JSON.parse(raw) : null); }
    catch (e) { return EMPTY(); }
  }
  var S = load();
  function save() {
    flagCache = null;
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Couldn’t save. Storage may be full: back up and delete old notes.'); }
  }

  /* ------------------------------------------------------------------ Helpers */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(isoStr) { var p = isoStr.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return iso(new Date()); }
  function addDays(isoStr, n) { var d = parse(isoStr); d.setDate(d.getDate() + n); return iso(d); }
  function monday(isoStr) { var dow = (parse(isoStr).getDay() + 6) % 7; return addDays(isoStr, -dow); }
  function fmt(isoStr, opts) { return parse(isoStr).toLocaleDateString('en-GB', opts); }
  function relDate(isoStr) {
    if (!isoStr) return '';
    var t = today();
    if (isoStr === t) return 'Today';
    if (isoStr === addDays(t, 1)) return 'Tomorrow';
    if (isoStr === addDays(t, -1)) return 'Yesterday';
    return fmt(isoStr, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function remove(list, id) { var i = list.findIndex(function (x) { return x.id === id; }); if (i > -1) list.splice(i, 1); }
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ------------------------------------------------------------------ Theme: light (default), dark or match device */
  var THEME_KEY = 'lo:theme';
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function themePref() { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } }
  function isDark() { var t = themePref(); return t === 'dark' || (t === 'system' && darkQuery.matches); }
  function applyTheme() {
    var root = document.documentElement, dark = isDark();
    root.setAttribute('data-theme', themePref());
    root.setAttribute('data-resolved', dark ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#141516' : '#ECEBE7');
    document.querySelectorAll('.theme-key').forEach(function (k) {
      k.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }
  function setTheme(t) { try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* private mode */ } applyTheme(); }
  darkQuery.addEventListener('change', function () { if (themePref() === 'system') { applyTheme(); } });
  function themeKey(cls) {
    return '<button class="key ghost theme-key' + (cls ? ' ' + cls : '') + '" type="button" data-action="toggle-theme" aria-label="' + (isDark() ? 'Switch to light theme' : 'Switch to dark theme') + '">' +
      icon('moon', 'moon') + icon('sun', 'sun') + '</button>';
  }

  /* ------------------------------------------------------------------ Icons (one 1.75 stroke family) */
  var I = {
    today: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    plans: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    notes: '<path d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 3.5V8h5M8.5 12.5h7M8.5 16h4.5"/>',
    tasks: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    habits: '<path d="M4 20h16M7 16v-4M12 16V7M17 16v-6"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M7 7l10 10M17 7 7 17"/>',
    left: '<path d="m14.5 6-6 6 6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    pin: '<path d="M9 4h6l-1 5 3 3v1.5H7V12l3-3-1-5ZM12 13.5V20"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="m6 12.5 4 4 8-9"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 11.6A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9L17.5 7M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/>'
  };
  function icon(name, cls) { return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[name] + '</svg>'; }

  /* ------------------------------------------------------------------ Routing */
  var ROUTES = [
    { id: 'today', label: 'Today' },
    { id: 'plans', label: 'Plans' },
    { id: 'notes', label: 'Notes' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'habits', label: 'Habits' }
  ];
  var ALL = ROUTES.concat([{ id: 'settings', label: 'Settings' }]);

  var state = { taskFilter: 'open', noteQuery: '', selDay: today(), weekStart: monday(today()) };

  function route() {
    var h = (location.hash || '#/today').replace(/^#\//, '').split('/');
    return { name: ALL.some(function (r) { return r.id === h[0]; }) ? h[0] : 'today', arg: h[1] ? decodeURIComponent(h[1]) : '' };
  }
  function navLink(r, cur) {
    return '<a href="#/' + r.id + '"' + (r.id === cur ? ' aria-current="page"' : '') + '>' + icon(r.id) + '<span>' + r.label + '</span></a>';
  }
  function renderNav(cur) {
    document.getElementById('nav').innerHTML = ROUTES.map(function (r) { return navLink(r, cur); }).join('');
    document.getElementById('nav-foot').innerHTML = navLink(ALL[5], cur);
    document.getElementById('rail-theme').innerHTML = themeKey();
    document.getElementById('tabbar').innerHTML = ROUTES.map(function (r) { return navLink(r, cur); }).join('');
  }
  function render(navigated) {
    linkedCache = null; flagCache = null;
    var r = route();
    renderNav(r.name);
    var main = document.getElementById('main');
    main.innerHTML = VIEWS[r.name](r.arg);
    if (navigated) {
      var auto = main.querySelector('[data-autofocus]');
      if (auto && window.matchMedia('(pointer: fine)').matches) auto.focus();
      else main.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------ Shared pieces */
  function head(title, sub, action) {
    return '<header class="page-head"><div><h1>' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' +
      '<div class="head-actions">' + (action || '') + themeKey('narrow-only') +
      '<a class="key ghost narrow-only" href="#/settings" aria-label="Settings">' + icon('settings') + '</a></div></header>';
  }
  function del(action, id, what, ico) {
    return '<button class="del" type="button" data-action="' + action + '" data-id="' + id + '" aria-label="Delete ' + esc(what) + '">' + icon(ico || 'x') + '</button>';
  }
  function empty(msg) { return '<p class="empty">' + msg + '</p>'; }

  function taskRow(t) {
    var overdue = !t.done && t.due && t.due < today();
    return '<li class="row task' + (t.done ? ' done' : '') + '">' +
      '<button class="check" type="button" data-action="toggle-task" data-id="' + t.id + '" aria-pressed="' + !!t.done + '" aria-label="' + (t.done ? 'Mark not done: ' : 'Mark done: ') + esc(t.title) + '">' + icon('check') + '</button>' +
      '<div class="row-body"><span class="row-title">' + esc(t.title) + '</span>' +
      ((t.due || t.priority === 1 || t.list) ? '<span class="meta">' +
        (t.due ? '<span class="' + (overdue ? 'late' : '') + '">' + (overdue ? 'Overdue · ' : '') + esc(relDate(t.due)) + '</span>' : '') +
        (t.priority === 1 ? '<span class="tag hot">High</span>' : '') +
        (t.list ? '<span class="tag">' + esc(t.list) + '</span>' : '') +
      '</span>' : '') + '</div>' + del('delete-task', t.id, 'task: ' + t.title) + '</li>';
  }
  function sortTasks(a, b) {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    var ad = a.due || '9999', bd = b.due || '9999';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.priority || 2) - (b.priority || 2);
  }
  /* A plan may span days: date is the first day, end (optional) the last. */
  function lastDay(e) { return e.end && e.end > e.date ? e.end : e.date; }
  function occursOn(e, d) { return e.date <= d && d <= lastDay(e); }
  function sortEvents(a, b) { var x = a.date + (a.time || ''), y = b.date + (b.time || ''); return x < y ? -1 : x > y ? 1 : 0; }
  function spanLabel(e) {
    if (lastDay(e) === e.date) return '';
    var a = parse(e.date), b = parse(lastDay(e));
    var days = Math.round((b - a) / 864e5) + 1;
    return fmt(e.date, { weekday: 'short', day: 'numeric' }) + ' – ' + fmt(lastDay(e), { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + days + ' days';
  }
  function eventRow(e) {
    var span = spanLabel(e);
    var fl = flagFor(e);
    var meta = [span, e.place].filter(Boolean).map(esc).join(' · ') + (e.tag ? '<span class="tag">' + esc(e.tag) + '</span>' : '') +
      (e.who ? '<span class="tag who" title="From ' + esc(e.srcName || '') + '">' + icon('link', 'tiny') + esc(e.who) + '</span>' : '') +
      (e.deadline ? '<span class="tag">Deadline</span>' : '') +
      (fl ? '<span class="tag ' + fl + '">' + (fl === 'clash' ? 'Clash' : 'Check') + '</span>' : '');
    var when = e.time ? esc(e.time) + (e.endTime ? '<small>' + esc(e.endTime) + '</small>' : '') : 'All day';
    return '<li class="row plan' + (span ? ' multi' : '') + '"><span class="time">' + when + '</span>' +
      '<div class="row-body"><span class="row-title">' + esc(e.title) + '</span>' + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</div>' +
      (e.src ? '' : del('delete-event', e.id, 'plan: ' + e.title)) + '</li>';
  }

  function habitStreak(h) {
    var n = 0, d = today();
    if (!h.log[d]) d = addDays(d, -1);
    while (h.log[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  /* The week dial: a tuning scale with a needle on the selected day. */
  function weekDays() { var out = []; for (var i = 0; i < 7; i++) out.push(addDays(state.weekStart, i)); return out; }
  function dial() {
    var days = weekDays(), t = today();
    var sel = days.indexOf(state.selDay); if (sel < 0) { sel = 0; state.selDay = days[0]; }
    var first = parse(days[0]), last = parse(days[6]);
    var range = first.getMonth() === last.getMonth()
      ? first.getDate() + '–' + last.getDate() + ' ' + fmt(days[6], { month: 'long' })
      : fmt(days[0], { day: 'numeric', month: 'short' }) + ' – ' + fmt(days[6], { day: 'numeric', month: 'short' });
    return '<div class="dial" style="--sel:' + sel + '">' +
      '<div class="dial-head"><span class="dial-range">' + esc(range) + '</span>' +
        '<span class="dial-nav"><button class="key ghost sm" type="button" data-action="week" data-n="-7" aria-label="Previous 7 days">' + icon('left') + '</button>' +
        (state.weekStart !== monday(t) ? '<button class="pill-btn" type="button" data-action="week" data-n="0">Today</button>' : '') +
        '<button class="key ghost sm" type="button" data-action="week" data-n="7" aria-label="Next 7 days">' + icon('right') + '</button></span></div>' +
      '<div class="scale" role="group" aria-label="Choose a day">' +
        days.map(function (d) {
          var n = allEvents().filter(function (e) { return occursOn(e, d); }).length;
          var fd = flagsOn(d), clash = fd.some(function (f) { return f.sev === 'clash'; });
          return '<button class="day' + (d === t ? ' is-today' : d < t ? ' is-past' : '') + (clash ? ' has-clash' : fd.length ? ' has-check' : '') + '" type="button" data-action="pick-day" data-d="' + d + '" aria-pressed="' + (d === state.selDay) + '" aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })) + (n ? ', ' + plural(n, 'plan', 'plans') : '') + (fd.length ? ', ' + plural(fd.length, 'flag', 'flags') : '') + '">' +
            '<span class="dots">' + (n ? '<i></i>'.repeat(Math.min(n, 3)) : '') + '</span>' +
            '<span class="dname">' + esc(fmt(d, { weekday: 'short' })) + '</span><span class="dnum">' + parse(d).getDate() + '</span></button>';
        }).join('') +
        '<span class="needle" aria-hidden="true"></span>' +
      '</div></div>';
  }
  function agenda(day, plansOnly) {
    var t = today();
    var plans = allEvents().filter(function (e) { return occursOn(e, day); }).sort(sortEvents);
    var tasks = plansOnly ? [] : S.tasks.filter(function (x) {
      if (day === t) return (!x.done && x.due && x.due <= t) || (x.done && x.doneAt === t);
      return x.due === day;
    }).sort(sortTasks);
    var name = day === t ? 'today' : fmt(day, { weekday: 'long' });
    return '<h3 class="agenda-day">' + esc(day === t ? 'Today' : fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })) + '</h3>' +
      (plans.length ? '<ul class="list">' + plans.map(eventRow).join('') + '</ul>' : '') +
      (tasks.length ? '<ul class="list">' + tasks.map(taskRow).join('') + '</ul>' : '') +
      (!plans.length && !tasks.length ? empty('Nothing planned for ' + esc(name) + '.' + (plansOnly ? '' : ' <a href="#/plans">Add a plan</a>')) : '');
  }


  /* ------------------------------------------------------------------ Linked apps (read-only)
     The XP app and the Health app are served from the same web address as this app, so their
     saved data is readable in this browser. Nothing is copied: linked activities are read fresh
     on every draw. Douglas's family planner can also be fetched from its Firebase store for the
     weeks ahead, using the family code the XP app saved on this device. */
  var LINKS_KEY = 'lo:links:v1';
  var XP = { shared: 'douglasSharedV1', family: 'douglasFamilyCode', project: 'douglas-battle-pass', apiKey: 'AIzaSyCdS-73Pb77tgIZGskEU3MlyPac6BIT9l0' };
  var DH = { data: 'dh:data:v1', notes: 'dh:notes:v1' };
  var OTHER_ADULTS = /^(mum|nanny)$/i;
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  var LINKS = readJSON(LINKS_KEY) || {};
  if (!LINKS.off) LINKS.off = {};
  if (!LINKS.remote) LINKS.remote = {};
  function saveLinks() { try { localStorage.setItem(LINKS_KEY, JSON.stringify(LINKS)); } catch (e) { /* storage full */ } }
  function cleanTime(t) {
    var m = String(t || '').match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (!m) return '';
    var h = +m[1]; if (m[3]) { h = h % 12 + (/pm/i.test(m[3]) ? 12 : 0); }
    return h < 24 ? pad(h) + ':' + m[2] : '';
  }
  function familyCode() { var c = localStorage.getItem(XP.family); return c && /^[A-Za-z0-9]{20,64}$/.test(c) ? c : null; }

  function xpEvents() {
    var local = readJSON(XP.shared) || {}, weeks = {};
    Object.keys(LINKS.remote).forEach(function (w) { weeks[w] = LINKS.remote[w]; });
    Object.keys(local).forEach(function (w) { if (/^W\d{8}$/.test(w)) weeks[w] = local[w]; });   // this device's copy is the freshest
    var out = [];
    Object.keys(weeks).forEach(function (w) {
      var mon = w.slice(1, 5) + '-' + w.slice(5, 7) + '-' + w.slice(7, 9), items = (weeks[w] || {}).items || {};
      Object.keys(items).forEach(function (id) {
        var it = items[id];
        if (!it || !it.text || typeof it.day !== 'number' && !/^\d$/.test(it.day)) return;
        var who = it.who && it.who !== 'Everyone' ? it.who : 'Family';
        out.push({ id: 'xp:' + w + ':' + id, title: it.text, date: addDays(mon, +it.day), time: cleanTime(it.time), place: '',
          who: who, src: 'xp', srcName: 'Douglas’s planner' });
      });
    });
    return out;
  }
  function healthEvents() {
    var D = readJSON(DH.data) || {}, N = readJSON(DH.notes) || {};
    var name = (D.child && (D.child.shortName || D.child.name)) || 'Dorothea';
    var day = /^\d{4}-\d{2}-\d{2}$/, out = [];
    (Array.isArray(D.appointments) ? D.appointments : []).concat(Array.isArray(N.appts) ? N.appts : []).forEach(function (a, i) {
      if (!a || !day.test(a.date || '') || a.status === 'done' || a.status === 'cancelled') return;
      out.push({ id: 'dh:' + (a.id || i), title: a.title || 'Appointment', date: a.date, time: cleanTime(a.time),
        place: [a.with, a.where].filter(Boolean).join(', '), who: name, src: 'health', srcName: name + '’s health' });
    });
    (Array.isArray(D.keyDates) ? D.keyDates : []).forEach(function (k, i) {
      if (!k || k.type !== 'deadline' || !day.test(k.date || '')) return;
      out.push({ id: 'dh:k:' + (k.id || k.date + i), title: k.label || 'Deadline', date: k.date, time: '', place: '',
        who: name, src: 'health', srcName: name + '’s health', deadline: true });
    });
    return out;
  }
  var linkedCache = null;
  function linked() {
    if (linkedCache) return linkedCache;
    var out = [];
    if (!LINKS.off.xp) out = out.concat(xpEvents());
    if (!LINKS.off.health) out = out.concat(healthEvents());
    return (linkedCache = out);
  }
  function allEvents() { return S.events.concat(linked()); }

  /* Firestore REST: fetch Douglas's planner for this week and the next 7. */
  function fsVal(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('mapValue' in v) { var o = {}, f = v.mapValue.fields || {}; Object.keys(f).forEach(function (k) { o[k] = fsVal(f[k]); }); return o; }
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fsVal);
    return null;
  }
  function fetchPlanner(quiet) {
    var code = familyCode();
    if (!code) { if (!quiet) toast('No family code on this device yet. Open the XP app here first.'); return Promise.resolve(); }
    var start = monday(today()), jobs = [];
    for (var i = 0; i < 8; i++) (function (mon) {
      var w = 'W' + mon.replace(/-/g, '');
      var url = 'https://firestore.googleapis.com/v1/projects/' + XP.project + '/databases/(default)/documents/families/' + code + w + '?key=' + XP.apiKey;
      jobs.push(fetch(url).then(function (r) {
        if (r.status === 404) return { w: w, data: { items: {} } };
        if (!r.ok) throw new Error(r.status);
        return r.json().then(function (j) { var o = {}, f = j.fields || {}; Object.keys(f).forEach(function (k) { o[k] = fsVal(f[k]); }); return { w: w, data: o }; });
      }));
    })(addDays(start, 7 * i));
    return Promise.all(jobs).then(function (res) {
      res.forEach(function (x) { LINKS.remote[x.w] = x.data; });
      Object.keys(LINKS.remote).forEach(function (w) { if (w < 'W' + addDays(start, -7).replace(/-/g, '')) delete LINKS.remote[w]; });
      LINKS.fetchedAt = new Date().toISOString(); saveLinks(); render();
      if (!quiet) toast('Douglas’s planner updated');
    }).catch(function () { if (!quiet) toast('Couldn’t reach the family planner. Showing what’s on this phone.'); });
  }
  function linkStatus() {
    var xp = xpEvents(), dh = healthEvents(), t = today();
    var D = readJSON(DH.data) || {}, name = (D.child && (D.child.shortName || D.child.name)) || 'Dorothea';
    var xpAhead = xp.filter(function (e) { return e.date >= t; }).length, dhAppts = dh.filter(function (e) { return !e.deadline && e.date >= t; }).length;
    var dhDead = dh.filter(function (e) { return e.deadline && e.date >= t; }).length;
    function row(key, title, found, detail, missing, extra) {
      return '<li class="link-row"><div class="row-body"><span class="row-title">' + title + '</span>' +
        '<span class="meta">' + (found ? detail : missing) + '</span>' + (extra || '') + '</div>' +
        (found ? '<label class="switch"><input type="checkbox" data-input="link-toggle" data-k="' + key + '"' + (LINKS.off[key] ? '' : ' checked') + '><span aria-hidden="true"></span><span class="visually-hidden">Include ' + title + '</span></label>' : '') + '</li>';
    }
    var hasXp = !!readJSON(XP.shared) || Object.keys(LINKS.remote).length || familyCode();
    var fa = LINKS.fetchedAt ? new Date(LINKS.fetchedAt) : null;
    var fetched = fa ? 'Family planner checked ' + relDate(iso(fa)).toLowerCase() + ' at ' + pad(fa.getHours()) + ':' + pad(fa.getMinutes()) + '.' : '';
    return '<ul class="list links">' +
      row('xp', 'Douglas’s planner (XP app)', hasXp, esc(plural(xpAhead, 'activity', 'activities')) + ' coming up. ' + esc(fetched),
        'Not found in this browser. Open the XP app once on this phone, in the same browser, then come back.',
        familyCode() ? '<button class="link" type="button" data-action="fetch-planner">Check the family planner now</button>' : '') +
      row('health', esc(name) + '’s health (Family Hub)', !!(readJSON(DH.data) || readJSON(DH.notes)), esc(plural(dhAppts, 'appointment', 'appointments') + ' and ' + plural(dhDead, 'deadline', 'deadlines') + ' coming up.'),
        'Not found in this browser. Open the Health app on this phone and load its data file, then come back.') +
      '</ul>';
  }

  /* ------------------------------------------------------------------ Clash detection
     Work = a plan with a category label, or "(work)" in its title. Everything else is life.
     Each upcoming day is checked; results are cached until the next save. */
  var flagCache = null;
  var HOLIDAY = /^(christmas day|boxing day|new year.s day|good friday|easter monday)|bank holiday/i;
  function isWork(e) { return !!e.tag || /\(work\)/i.test(e.title); }
  function isLeave(e) { return isWork(e) && (e.tag === 'Leave' || /\bleave\b/i.test(e.title)); }
  function isAway(e) { return isWork(e) && !isLeave(e) && (lastDay(e) !== e.date || /\btrip\b/i.test(e.title)); }
  function isBlock(e) { return /calendar block/i.test(e.title); }
  function isHoliday(e) { return !isWork(e) && HOLIDAY.test(e.title); }
  function mins(t) { var p = (t || '').split(':'); return +p[0] * 60 + (+p[1] || 0); }
  function window_(e) { var a = mins(e.time); return [a, e.endTime ? mins(e.endTime) : a + 60]; }
  function overlaps(a, b) { var x = window_(a), y = window_(b); return x[0] < y[1] && y[0] < x[1]; }
  function times(e) { return e.time ? e.time + (e.endTime ? '–' + e.endTime : '') : 'All day'; }
  function hhmm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function names(list, n) { var t = list.slice(0, n).map(function (e) { return e.title; }); return t.join(', ') + (list.length > n ? ' +' + (list.length - n) + ' more' : ''); }

  function flags() {
    if (flagCache) return flagCache;
    var t = today(), byKey = {}, out = [];
    var ALL = allEvents();
    var last = ALL.reduce(function (m, e) { return lastDay(e) > m ? lastDay(e) : m; }, t);
    if (last > addDays(t, 200)) last = addDays(t, 200);
    function push(f) {
      var had = byKey[f.key];
      if (had) {
        if (had.days.indexOf(f.day) < 0) had.days.push(f.day);
        f.ids.forEach(function (id) { if (had.ids.indexOf(id) < 0) had.ids.push(id); });
        if (f.items) had.items = had.items.concat(f.items);
        return;
      }
      f.days = [f.day]; byKey[f.key] = f; out.push(f);
    }
    for (var d = t; d <= last; d = addDays(d, 1)) {
      var evs = ALL.filter(function (e) { return occursOn(e, d); });
      if (!evs.length) continue;
      var work = evs.filter(isWork), life = evs.filter(function (e) { return !isWork(e) && !isHoliday(e) && !e.deadline; });
      evs.forEach(function (e) {
        if (e.deadline && e.date === d) push({ key: 'dead|' + e.id, kind: 'deadline', sev: 'check', day: d, ids: [e.id],
          title: 'Deadline: ' + e.title, detail: e.srcName || '', hint: 'Preplanning: block time before it' });
      });
      var leave = work.filter(isLeave)[0], away = work.filter(isAway)[0], hol = evs.filter(isHoliday)[0];
      var meetings = work.filter(function (e) { return e.time && !isLeave(e) && !isAway(e); });
      var real = meetings.filter(function (e) { return !isBlock(e); });
      if (leave) {
        if (meetings.length) push({ key: 'leave|' + leave.id, kind: 'leave', sev: 'clash', day: d, ids: meetings.map(function (e) { return e.id; }),
          items: meetings, leave: leave, hint: 'Decline or move them' });
        continue;   // you're off, so life plans that day are fine
      }
      if (hol && real.length) push({ key: 'hol|' + d, kind: 'holiday', sev: 'clash', day: d, ids: real.map(function (e) { return e.id; }),
        title: 'Work on ' + hol.title, detail: names(real, 3), hint: 'Probably cancelled: decline or check' });
      life.forEach(function (L) {
        if (L.who && OTHER_ADULTS.test(L.who)) {   // someone else's commitment: a soft heads-up only
          if (away || meetings.length) push({ key: 'adult|' + L.id, pair: 'adult|' + L.title, kind: 'adult', sev: 'check', day: d, ids: [L.id],
            title: L.title + ' (' + L.who + ')', detail: away ? 'You’re away: ' + away.title : 'You’re working ' + meetings.slice().sort(function (a, b) { return mins(a.time) - mins(b.time); })[0].time + ' onwards',
            hint: L.who + '’s down for this: just confirm' });
          return;
        }
        if (away) {
          push({ key: 'away|' + L.id + '|' + away.id, pair: 'away|' + L.title + '|' + away.title, kind: 'away', sev: 'clash', day: d, ids: [L.id],
            title: L.title + ' while you’re away', detail: away.title + (away.place ? ' · ' + away.place : ''), hint: 'Arrange cover, or move it' });
          return;
        }
        if (!meetings.length) return;
        if (L.time) {
          var hit = meetings.filter(function (w) { return overlaps(L, w); });
          if (hit.length) push({ key: 'time|' + L.id + '|' + d, pair: 'time|' + L.title + '|' + hit[0].title, kind: 'overlap', sev: 'clash', day: d,
            ids: [L.id].concat(hit.map(function (w) { return w.id; })),
            title: L.title + ' clashes with ' + hit[0].title + (hit.length > 1 ? ' +' + (hit.length - 1) : ''), detail: times(L) + ' vs ' + times(hit[0]), hint: 'Move one, or arrange cover' });
          return;
        }
        var byTime = meetings.slice().sort(function (a, b) { return mins(a.time) - mins(b.time); });
        var endM = Math.max.apply(null, meetings.map(function (w) { return window_(w)[1]; }));
        var main = real.length ? real : byTime;
        push({ key: 'check|' + L.id, pair: 'check|' + L.title + '|' + main.map(function (w) { return w.title; }).sort().join('+'), kind: 'check', sev: 'check', day: d, ids: [L.id],
          title: L.title + ' on a working day', detail: 'Work ' + byTime[0].time + '–' + hhmm(endM) + ' · ' + names(main, 2), hint: 'Who’s covering? Plan ahead' });
      });
      var timedLife = life.filter(function (e) { return e.time; });
      for (var a = 0; a < timedLife.length; a++) for (var c = a + 1; c < timedLife.length; c++) {
        var A = timedLife[a], B = timedLife[c];
        if ((A.who || 'You') !== (B.who || 'You') && overlaps(A, B)) push({ key: 'two|' + A.id + '|' + B.id, pair: 'two|' + A.title + '|' + B.title, kind: 'two', sev: 'check', day: d,
          ids: [A.id, B.id], title: 'Two things at once: ' + A.title + ' and ' + B.title,
          detail: times(A) + ' (' + (A.who || 'you') + ') and ' + times(B) + ' (' + (B.who || 'you') + ')', hint: 'Needs two adults, or a lift sorted' });
      }
      for (var i = 0; i < real.length; i++) for (var j = i + 1; j < real.length; j++) {
        if (overlaps(real[i], real[j])) push({ key: 'dbl|' + real[i].id + '|' + real[j].id, pair: 'dbl|' + real[i].title + '|' + real[j].title, kind: 'double', sev: 'clash', day: d,
          ids: [real[i].id, real[j].id], title: 'Double-booked: ' + real[i].title + ' and ' + real[j].title, detail: times(real[i]) + ' and ' + times(real[j]), hint: 'Pick one, or send apologies' });
      }
    }
    out.forEach(function (f) {   // leave flags gather every day of the leave into one
      if (f.kind !== 'leave') return;
      var real2 = f.items.filter(function (e) { return !isBlock(e); });
      f.title = plural(f.items.length, 'work commitment', 'work commitments') + ' during ' + f.leave.title;
      f.detail = names(real2.length ? real2 : f.items, 3);
    });
    flagCache = out.filter(function (f) { return !S.ack[f.key] && !(f.pair && S.ack[f.pair]); });
    return flagCache;
  }
  function flagsOn(d) { return flags().filter(function (f) { return f.days.indexOf(d) > -1; }); }
  function flagFor(e) {
    var hit = flags().filter(function (f) { return f.ids.indexOf(e.id) > -1; });
    return hit.some(function (f) { return f.sev === 'clash'; }) ? 'clash' : hit.length ? 'check' : '';
  }
  function dayList(f) {
    var ds = f.days;
    if (ds.length === 1) return fmt(ds[0], { weekday: 'short', day: 'numeric', month: 'short' });
    return fmt(ds[0], { weekday: 'short', day: 'numeric' }) + ' – ' + fmt(ds[ds.length - 1], { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function untilLabel(d) {
    var n = Math.round((parse(d) - parse(today())) / 864e5);
    return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
  }
  function flagRow(f) {
    return '<li class="flag sev-' + f.sev + '">' +
      '<span class="flag-when"><b>' + esc(fmt(f.days[0], { day: 'numeric' })) + '</b><small>' + esc(fmt(f.days[0], { month: 'short' })) + '</small></span>' +
      '<div class="row-body"><span class="flag-head"><span class="tag ' + f.sev + '">' + (f.sev === 'clash' ? 'Clash' : 'Check') + '</span><span class="row-title">' + esc(f.title) + '</span></span>' +
        '<span class="meta">' + esc(dayList(f)) + ' · ' + esc(untilLabel(f.days[0])) + '</span>' +
        '<span class="meta">' + esc(f.detail) + '</span>' +
        '<span class="flag-hint">' + esc(f.hint) + '</span>' +
        '<span class="flag-actions"><button class="pill-btn" type="button" data-action="ack" data-k="' + esc(f.key) + '">' + icon('check', 'tiny') + 'Got it</button>' +
        (f.pair ? '<button class="link" type="button" data-action="ack" data-k="' + esc(f.pair) + '">Always fine</button>' : '') + '</span>' +
      '</div></li>';
  }
  function headsUp(days, limit) {
    var t = today(), until = days ? addDays(t, days) : '9999';
    var list = flags().filter(function (f) { return f.days[0] <= until; });
    if (!list.length) return '';
    var clashes = list.filter(function (f) { return f.sev === 'clash'; }).length;
    var shown = state.allFlags || !limit ? list : list.slice(0, limit);
    var summary = [clashes ? plural(clashes, 'clash', 'clashes') : '', list.length - clashes ? (list.length - clashes) + ' to check' : ''].filter(Boolean).join(' · ');
    return '<section class="panel heads-up" aria-labelledby="h-flags"><div class="panel-head"><h2 id="h-flags">Heads-up' + (days ? ': next ' + days + ' days' : '') + '</h2>' +
      '<span class="meta">' + esc(summary) + '</span></div>' +
      '<ul class="list flags">' + shown.map(flagRow).join('') + '</ul>' +
      (shown.length < list.length ? '<button class="link" type="button" data-action="all-flags">Show all ' + list.length + '</button>' : '') +
      '</section>';
  }

  /* ------------------------------------------------------------------ Views */
  var VIEWS = {
    today: function () {
      var t = today();
      var open = S.tasks.filter(function (x) { return !x.done && x.due && x.due <= t; }).length;
      var plansToday = allEvents().filter(function (e) { return occursOn(e, t); }).length;
      var habitsLeft = S.habits.filter(function (h) { return !h.log[t]; }).length;
      var soon = flags().filter(function (f) { return f.sev === 'clash' && f.days[0] <= addDays(t, 7); }).length;
      var sub = [plural(open, 'task due', 'tasks due'), plural(plansToday, 'plan', 'plans')].concat(soon ? [plural(soon, 'clash', 'clashes') + ' this week'] : [])
        .concat(S.habits.length ? [plural(habitsLeft, 'habit', 'habits') + ' to go'] : []).join(' · ');
      var notes = S.notes.slice().sort(noteOrder).slice(0, 3);
      var undated = S.tasks.filter(function (x) { return !x.done && !x.due; }).sort(sortTasks).slice(0, 4);
      return head(esc(fmt(t, { weekday: 'long', day: 'numeric', month: 'long' })), esc(sub)) +
        quickAdd() +
        '<div class="split">' +
          '<section class="panel" aria-labelledby="h-agenda"><h2 id="h-agenda" class="visually-hidden">Agenda</h2>' + dial() + '<div id="agenda">' + agenda(state.selDay) + '</div></section>' +
          '<div class="stack">' + headsUp(14, 3) +
            (S.habits.length ? '<section class="panel" aria-labelledby="h-hab"><h2 id="h-hab">Habits</h2>' + habitList(1) + '</section>' : '') +
            '<section class="panel" aria-labelledby="h-notes"><div class="panel-head"><h2 id="h-notes">Notes</h2><a class="link" href="#/notes">All notes</a></div>' +
              (notes.length ? '<ul class="list">' + notes.map(noteLine).join('') + '</ul>' : empty('No notes yet. <a href="#/notes" data-action="new-note">Write one</a>')) + '</section>' +
            (undated.length ? '<section class="panel" aria-labelledby="h-any"><div class="panel-head"><h2 id="h-any">Anytime</h2><a class="link" href="#/tasks">All tasks</a></div><ul class="list">' + undated.map(taskRow).join('') + '</ul></section>' : '') +
            (!S.habits.length ? '<p class="hint">Build a routine in <a href="#/habits">Habits</a>.</p>' : '') +
          '</div>' +
        '</div>';
    },

    plans: function () {
      var t = today();
      var past = allEvents().filter(function (e) { return lastDay(e) < t; }).sort(sortEvents).reverse().slice(0, 8);
      return head('Plans', 'Appointments, birthdays, trips: anything with a date.') +
        '<form class="compose" data-form="event" autocomplete="off">' +
          '<div class="quick"><label class="visually-hidden" for="pt">New plan</label>' +
            '<input id="pt" name="title" required placeholder="' + esc(planPrompt(state.selDay)) + '" data-autofocus>' +
            '<button class="key signal" type="submit" aria-label="Add plan">' + icon('plus') + '</button></div>' +
          '<details class="more"><summary>Dates, time and place</summary><div class="form">' +
            '<label class="field"><span>Date</span><input type="date" name="date" required value="' + esc(state.selDay) + '"></label>' +
            '<label class="field"><span>Until</span><input type="date" name="end"></label>' +
            '<label class="field"><span>Starts</span><input type="time" name="time"></label>' +
            '<label class="field"><span>Ends</span><input type="time" name="endTime"></label>' +
            '<label class="field"><span>Where</span><input name="place" placeholder="Optional"></label>' +
          '</div></details></form>' +
        '<div class="split plans-split">' +
          '<section class="panel sticky" aria-labelledby="h-week"><h2 id="h-week" class="visually-hidden">Week</h2>' + dial() + '<div id="agenda" data-plans-only>' + agenda(state.selDay, true) + '</div></section>' +
          '<div class="stack">' + headsUp(0, 5) + '<section class="panel" aria-labelledby="h-up"><h2 id="h-up">Coming up</h2><div id="upcoming">' + upcomingList() + '</div></section>' +
          (past.length ? '<section class="panel quiet" aria-labelledby="h-past"><h2 id="h-past">Recent</h2><ul class="list">' + past.map(function (e) {
            return '<li class="row plan"><span class="time">' + esc(fmt(e.date, { day: 'numeric', month: 'short' })) + '</span><div class="row-body"><span class="row-title">' + esc(e.title) + '</span></div>' + (e.src ? '' : del('delete-event', e.id, 'plan: ' + e.title)) + '</li>';
          }).join('') + '</ul></section>' : '') + '</div>' +
        '</div>';
    },

    notes: function (arg) {
      var open = arg ? byId(S.notes, arg) : null;
      return '<div class="notes' + (arg ? ' has-open' : '') + '">' +
        '<div class="notes-list">' + head('Notes', plural(S.notes.length, 'note', 'notes'), '<button class="key signal" type="button" data-action="new-note" aria-label="New note">' + icon('plus') + '</button>') +
          '<label class="visually-hidden" for="nq">Search notes</label>' +
          '<input id="nq" class="search" type="search" placeholder="Search notes" value="' + esc(state.noteQuery) + '" data-input="note-search" autocomplete="off">' +
          '<div id="note-results">' + noteResults(open && open.id) + '</div></div>' +
        '<div class="notes-editor">' + (open ? noteEditor(open) : (arg ? '<div class="editor-empty"><p>That note no longer exists. <a href="#/notes">Back to notes</a></p></div>' : '<div class="editor-empty"><p>Select a note, or start a new one.</p></div>')) + '</div>' +
      '</div>';
    },

    tasks: function () {
      var f = state.taskFilter, t = today();
      var lists = Array.from(new Set(S.tasks.map(function (x) { return x.list; }).filter(Boolean))).sort();
      var shown = S.tasks.filter(function (x) {
        if (f === 'open') return !x.done;
        if (f === 'done') return x.done;
        if (f === 'overdue') return !x.done && x.due && x.due < t;
        if (f.indexOf('list:') === 0) return x.list === f.slice(5);
        return true;
      }).sort(sortTasks);
      var filters = [['open', 'Open'], ['overdue', 'Overdue'], ['done', 'Done'], ['all', 'All']]
        .concat(lists.map(function (l) { return ['list:' + l, l]; }));
      var openCount = S.tasks.filter(function (x) { return !x.done; }).length;
      return head('Tasks', plural(openCount, 'open task', 'open tasks')) +
        '<form class="compose" data-form="task" autocomplete="off">' +
          '<div class="quick"><label class="visually-hidden" for="tt">New task</label>' +
            '<input id="tt" name="title" required placeholder="Add a task" data-autofocus>' +
            '<button class="key signal" type="submit" aria-label="Add task">' + icon('plus') + '</button></div>' +
          '<details class="more"><summary>Due date, priority and list</summary><div class="form">' +
            '<label class="field"><span>Due</span><input type="date" name="due"></label>' +
            '<label class="field"><span>Priority</span><select name="priority"><option value="2">Normal</option><option value="1">High</option><option value="3">Low</option></select></label>' +
            '<label class="field wide"><span>List</span><input name="list" list="lists" placeholder="e.g. Home"><datalist id="lists">' + lists.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label>' +
          '</div></details></form>' +
        '<div class="segmented" role="group" aria-label="Show tasks">' + filters.map(function (p) {
          return '<button type="button" data-action="filter" data-f="' + esc(p[0]) + '" aria-pressed="' + (f === p[0]) + '">' + esc(p[1]) + '</button>';
        }).join('') + '</div>' +
        '<section class="panel">' + (shown.length ? '<ul class="list">' + shown.map(taskRow).join('') + '</ul>' : empty(f === 'open' ? 'All clear. Nothing left to do.' : 'No tasks here.')) +
        (f === 'done' && shown.length ? '<button class="link" type="button" data-action="clear-done">Clear completed tasks</button>' : '') + '</section>';
    },

    habits: function () {
      return head('Habits', 'Tick off each day. A streak counts days in a row.') +
        '<form class="quick" data-form="habit" autocomplete="off"><label class="visually-hidden" for="hn">New habit</label>' +
          '<input id="hn" name="name" placeholder="New habit, e.g. Walk 20 minutes" required>' +
          '<button class="key signal" type="submit" aria-label="Add habit">' + icon('plus') + '</button></form>' +
        '<section class="panel">' + (S.habits.length ? habitList(7, true) : empty('Add a habit you want to build.')) + '</section>';
    },

    settings: function () {
      var counts = [plural(S.tasks.length, 'task', 'tasks'), plural(S.habits.length, 'habit', 'habits'), plural(S.events.length, 'plan', 'plans'), plural(S.notes.length, 'note', 'notes')].join(', ');
      var tp = themePref();
      return head('Settings') +
        '<section class="panel"><h2 id="h-look">Appearance</h2><div class="segmented inline" role="group" aria-labelledby="h-look">' +
          [['light', 'Light'], ['dark', 'Dark'], ['system', 'Match device']].map(function (o) {
            return '<button type="button" data-action="set-theme" data-t="' + o[0] + '" aria-pressed="' + (tp === o[0]) + '">' + o[1] + '</button>';
          }).join('') + '</div></section>' +
        '<section class="panel"><h2>Linked apps</h2><p>Activities from the family’s other apps on this phone appear in your plans and are checked for clashes. They’re read live and never copied; change them in their own app.</p>' + linkStatus() + '</section>' +
        '<section class="panel"><h2>Your data</h2><p>Everything is stored on this device only: ' + esc(counts) + '. Back up regularly, and use a backup to copy your data to another phone or computer.</p>' +
          '<div class="actions"><button class="btn" type="button" data-action="backup">Back up to a file</button>' +
          '<label class="btn ghost">Restore from a file<input type="file" accept="application/json,.json" data-input="restore" hidden></label></div></section>' +
        '<section class="panel"><h2>Add from a file</h2><p>Add plans, tasks, habits and notes from a Life Organizer file without replacing what’s already here. Anything already on this device is skipped.</p>' +
          '<div class="actions"><label class="btn ghost">Choose a file to add<input type="file" accept="application/json,.json" data-input="merge" hidden></label></div></section>' +
        '<section class="panel"><h2>Install</h2><p><b>Android:</b> open the browser menu and choose <i>Install app</i> or <i>Add to Home screen</i>. <b>iPhone or iPad:</b> in Safari, Share → Add to Home Screen.</p></section>' +
        '<section class="panel"><h2>Start over</h2><p>Erase everything on this device. This can’t be undone, so back up first.</p><button class="btn danger" type="button" data-action="erase">Erase all data</button></section>';
    }
  };

  /* Coming up: every future plan except the day tuned on the dial, which the Week panel already shows. */
  function upcomingList() {
    var t = today(), groups = [], cur = null;
    allEvents().filter(function (e) { return lastDay(e) >= t && !occursOn(e, state.selDay); }).sort(sortEvents).forEach(function (e) {
      var key = e.date < t ? t : e.date;   // a plan already under way is listed under today
      if (!cur || cur.date !== key) { cur = { date: key, items: [] }; groups.push(cur); } cur.items.push(e);
    });
    if (!groups.length) return empty(allEvents().some(function (e) { return lastDay(e) >= t; }) ? 'Nothing else planned.' : 'Nothing planned yet. Add your first plan above.');
    return groups.map(function (g) {
      var rel = relDate(g.date), named = rel === 'Today' || rel === 'Tomorrow';
      return '<div class="date-group"><h3 class="date-label"><span class="big">' + parse(g.date).getDate() + '</span><span>' + esc(named ? rel : fmt(g.date, { weekday: 'long' })) + '<small>' + esc(fmt(g.date, { month: 'long', year: 'numeric' })) + '</small></span></h3>' +
        '<ul class="list">' + g.items.map(eventRow).join('') + '</ul></div>';
    }).join('');
  }

  function planPrompt(d) { return 'Add a plan for ' + (d === today() ? 'today' : relDate(d) === 'Tomorrow' ? 'tomorrow' : fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })); }

  function quickAdd() {
    return '<form class="quick" data-form="quick-task" autocomplete="off"><label class="visually-hidden" for="qt">Add a task for today</label>' +
      '<input id="qt" name="title" placeholder="Add a task for today" required>' +
      '<button class="key signal" type="submit" aria-label="Add task">' + icon('plus') + '</button></form>';
  }

  function habitList(days, full) {
    var t = today(), cols = [];
    for (var i = days - 1; i >= 0; i--) cols.push(addDays(t, -i));
    return '<ul class="list habits">' + S.habits.map(function (h) {
      var s = habitStreak(h);
      return '<li class="row habit' + (days > 1 ? ' week' : '') + '"><div class="row-body"><span class="row-title">' + esc(h.name) + '</span><span class="meta">' + (s ? plural(s, 'day', 'days') + ' in a row' : 'Start today') + '</span></div>' +
        '<div class="keys">' + cols.map(function (d) {
          var on = !!h.log[d];
          return '<button class="hkey' + (on ? ' on' : '') + (d === t ? ' is-today' : '') + '" type="button" data-action="toggle-habit" data-id="' + h.id + '" data-d="' + d + '" aria-pressed="' + on + '" aria-label="' + esc(h.name) + ', ' + esc(relDate(d)) + '">' +
            (days > 1 ? '<span>' + esc(fmt(d, { weekday: 'narrow' })) + '</span>' : icon('check')) + '</button>';
        }).join('') + '</div>' + (full ? del('delete-habit', h.id, 'habit: ' + h.name) : '') + '</li>';
    }).join('') + '</ul>';
  }

  function noteOrder(a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : 0); }
  function notePreview(n) { return n.body.replace(/\s+/g, ' ').trim().slice(0, 120); }
  function noteLine(n) {
    return '<li class="row note-line"><a href="#/notes/' + n.id + '"><span class="row-title">' + (n.pinned ? icon('pin', 'tiny') : '') + esc(n.title || 'Untitled') + '</span>' +
      '<span class="meta">' + esc(relDate(n.updated.slice(0, 10))) + (notePreview(n) ? ' · ' + esc(notePreview(n)) : '') + '</span></a></li>';
  }
  function noteResults(openId) {
    var q = state.noteQuery.toLowerCase();
    var list = S.notes.filter(function (n) { return !q || (n.title + ' ' + n.body).toLowerCase().indexOf(q) > -1; }).sort(noteOrder);
    if (!list.length) return empty(q ? 'No notes match “' + esc(state.noteQuery) + '”.' : 'No notes yet. Tap New to write one.');
    return '<ul class="list note-index">' + list.map(function (n) {
      return '<li><a class="note-item' + (n.id === openId ? ' is-open' : '') + '" href="#/notes/' + n.id + '"' + (n.id === openId ? ' aria-current="true"' : '') + ' data-note="' + n.id + '">' +
        '<span class="note-top"><b data-note-title>' + (n.pinned ? icon('pin', 'tiny') : '') + esc(n.title || 'Untitled') + '</b><time>' + esc(relDate(n.updated.slice(0, 10))) + '</time></span>' +
        '<span class="note-prev" data-note-prev>' + esc(notePreview(n)) + '</span></a></li>';
    }).join('') + '</ul>';
  }
  function noteEditor(n) {
    return '<div class="editor">' +
      '<div class="editor-bar"><a class="key ghost sm back-btn" href="#/notes" aria-label="All notes">' + icon('back') + '</a>' +
        '<span class="saved" id="saved">Saved</span>' +
        '<button class="pill-btn" type="button" data-action="pin-note" data-id="' + n.id + '" aria-pressed="' + !!n.pinned + '">' + icon('pin', 'tiny') + (n.pinned ? 'Pinned' : 'Pin') + '</button>' +
        del('delete-note', n.id, 'note: ' + (n.title || 'Untitled'), 'trash') + '</div>' +
      '<label class="visually-hidden" for="nt">Title</label><input id="nt" class="note-title" placeholder="Title" value="' + esc(n.title) + '" data-input="note-title" data-id="' + n.id + '"' + (n.title ? '' : ' data-autofocus') + '>' +
      '<label class="visually-hidden" for="nb">Note</label><textarea id="nb" placeholder="Write anything…" data-input="note-body" data-id="' + n.id + '">' + esc(n.body) + '</textarea></div>';
  }

  /* ------------------------------------------------------------------ Events */
  document.addEventListener('submit', function (ev) {
    var form = ev.target, kind = form.getAttribute('data-form');
    if (!kind) return;
    ev.preventDefault();
    var f = Object.fromEntries(new FormData(form));
    var title = (f.title || f.name || '').trim();
    if (!title) { toast('Type something first'); return; }
    if (kind === 'quick-task') S.tasks.push({ id: uid(), title: title, due: today(), priority: 2, done: false, created: today() });
    if (kind === 'task') S.tasks.push({ id: uid(), title: title, due: f.due || '', priority: +f.priority || 2, list: (f.list || '').trim(), done: false, created: today() });
    if (kind === 'habit') S.habits.push({ id: uid(), name: title, created: today(), log: {} });
    if (kind === 'event') {
      var ev2 = { id: uid(), title: title, date: f.date, time: f.time || '', place: (f.place || '').trim() };
      if (f.end && f.end > f.date) ev2.end = f.end;
      if (f.time && f.endTime && f.endTime > f.time) ev2.endTime = f.endTime;
      S.events.push(ev2); selectDay(f.date);
    }
    save(); render(); toast('Added');
    var first = document.querySelector('[data-form="' + kind + '"] input');
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus();
  });

  /* Select a day, moving the 7-day window so the day is on the dial. */
  function selectDay(d) {
    state.selDay = d;
    state.weekStart = monday(d);
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), id = b.getAttribute('data-id');
    switch (a) {
      case 'toggle-task': var t = byId(S.tasks, id); if (!t) return; t.done = !t.done; t.doneAt = t.done ? today() : null; break;
      case 'delete-task': remove(S.tasks, id); toast('Task deleted'); break;
      case 'clear-done': if (!confirm('Delete all completed tasks?')) return; S.tasks = S.tasks.filter(function (x) { return !x.done; }); break;
      case 'filter': state.taskFilter = b.getAttribute('data-f'); break;
      case 'toggle-habit': var h = byId(S.habits, id), d = b.getAttribute('data-d'); if (!h) return; if (h.log[d]) delete h.log[d]; else h.log[d] = true; break;
      case 'delete-habit': if (!confirm('Delete this habit and its history?')) return; remove(S.habits, id); break;
      case 'delete-event': remove(S.events, id); toast('Plan deleted'); break;
      case 'pick-day': pickDay(b); return;
      case 'week':
        var n = +b.getAttribute('data-n');
        state.weekStart = n ? addDays(state.weekStart, n) : monday(today());
        state.selDay = n ? (weekDays().indexOf(today()) > -1 ? today() : state.weekStart) : today();
        render(); return;
      case 'new-note':
        ev.preventDefault();
        var note = { id: uid(), title: '', body: '', updated: new Date().toISOString(), pinned: false };
        S.notes.push(note); save(); location.hash = '#/notes/' + note.id; return;
      case 'pin-note': var pn = byId(S.notes, id); if (pn) pn.pinned = !pn.pinned; break;
      case 'delete-note':
        if (!confirm('Delete this note?')) return;
        remove(S.notes, id); save(); location.hash = '#/notes'; toast('Note deleted'); return;
      case 'toggle-theme': setTheme(isDark() ? 'light' : 'dark'); if (route().name === 'settings') render(); return;
      case 'set-theme': setTheme(b.getAttribute('data-t')); render(); return;
      case 'ack': S.ack[b.getAttribute('data-k')] = today(); toast(b.getAttribute('data-k').indexOf('|') > -1 && b.classList.contains('link') ? 'Won’t flag that pairing again' : 'Dismissed'); break;
      case 'fetch-planner': b.disabled = true; b.textContent = 'Checking…'; fetchPlanner(false); return;
      case 'all-flags': state.allFlags = true; render(); return;
      case 'backup': backup(); return;
      case 'erase': if (!confirm('Erase all your tasks, habits, plans and notes on this device?')) return; S = EMPTY(); toast('Everything erased'); break;
      default: return;
    }
    save(); render();
  });

  /* Picking a day moves the needle in place (so it glides) and swaps only the agenda. */
  function pickDay(b) {
    var d = b.getAttribute('data-d');
    state.selDay = d;
    var dialEl = b.closest('.dial');
    dialEl.style.setProperty('--sel', weekDays().indexOf(d));
    dialEl.querySelectorAll('.day').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var ag = document.getElementById('agenda');
    if (ag) { ag.innerHTML = agenda(d, ag.hasAttribute('data-plans-only')); ag.style.animation = 'none'; void ag.offsetWidth; ag.style.animation = ''; }
    var dateInput = document.querySelector('[data-form="event"] input[name="date"]');
    if (dateInput) dateInput.value = d;
    var up = document.getElementById('upcoming');
    if (up) up.innerHTML = upcomingList();
    var titleInput = document.getElementById('pt');
    if (titleInput) titleInput.placeholder = planPrompt(d);
  }

  var savedTimer;
  document.addEventListener('input', function (ev) {
    var el = ev.target, k = el.getAttribute('data-input');
    if (k === 'note-search') {
      state.noteQuery = el.value;
      document.getElementById('note-results').innerHTML = noteResults(route().arg);
    }
    if (k === 'note-title' || k === 'note-body') {
      var n = byId(S.notes, el.getAttribute('data-id'));
      if (!n) return;
      n[k === 'note-title' ? 'title' : 'body'] = el.value;
      n.updated = new Date().toISOString(); save();
      var item = document.querySelector('[data-note="' + n.id + '"]');
      if (item) {
        item.querySelector('[data-note-title]').innerHTML = (n.pinned ? icon('pin', 'tiny') : '') + esc(n.title || 'Untitled');
        item.querySelector('[data-note-prev]').textContent = notePreview(n);
      }
      var sv = document.getElementById('saved');
      if (sv) { sv.textContent = 'Saving…'; clearTimeout(savedTimer); savedTimer = setTimeout(function () { sv.textContent = 'Saved'; }, 500); }
    }
  });

  /* Merge another file into this device: skip ids already present, and plans with the same title and dates. */
  function merge(d) {
    var added = 0;
    ['tasks', 'habits', 'events', 'notes'].forEach(function (k) {
      (Array.isArray(d[k]) ? d[k] : []).forEach(function (item) {
        if (!item || typeof item !== 'object') return;
        if (item.id && byId(S[k], item.id)) return;
        if (k === 'events' && S.events.some(function (e) { return e.title === item.title && e.date === item.date && (e.end || '') === (item.end || ''); })) return;
        if (k === 'events' && !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '')) return;
        var copy = Object.assign({}, item); if (!copy.id) copy.id = uid();
        if (k === 'habits' && (!copy.log || typeof copy.log !== 'object')) copy.log = {};
        S[k].push(copy); added++;
      });
    });
    return added;
  }

  document.addEventListener('change', function (ev) {
    if (ev.target.getAttribute('data-input') === 'link-toggle') {
      var lk = ev.target.getAttribute('data-k');
      if (ev.target.checked) delete LINKS.off[lk]; else LINKS.off[lk] = true;
      saveLinks(); render(); toast(ev.target.checked ? 'Included' : 'Hidden from your plans'); return;
    }
    if (ev.target.getAttribute('data-input') === 'merge') {
      var mi = ev.target, mf = mi.files[0]; if (!mf) return;
      mf.text().then(function (txt) {
        var d = JSON.parse(txt);
        if (!d || d.v !== 1) throw new Error('bad');
        var n = merge(d); save(); render();
        toast(n ? 'Added ' + plural(n, 'item', 'items') : 'Nothing new to add');
      }).catch(function () { toast('That file isn’t a Life Organizer file'); })
        .finally(function () { mi.value = ''; });
      return;
    }
    if (ev.target.getAttribute('data-input') !== 'restore') return;
    var input = ev.target, file = input.files[0]; if (!file) return;
    file.text().then(function (txt) {
      var d = JSON.parse(txt);
      if (!d || d.v !== 1) throw new Error('bad');
      if (!confirm('Replace everything on this device with this backup?')) return;
      S = normalise(d); save(); render(); toast('Backup restored');
    }).catch(function () { toast('That file isn’t a Life Organizer backup'); })
      .finally(function () { input.value = ''; });
  });

  function backup() {
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'life-organizer-backup-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Backup downloaded');
  }

  window.addEventListener('hashchange', function () { render(true); window.scrollTo(0, 0); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { S = load(); render(); } if (e.key === THEME_KEY) applyTheme();
    if ([XP.shared, DH.data, DH.notes, XP.family].indexOf(e.key) > -1) render(); });
  window.addEventListener('focus', function () {   // pick up changes made in the other apps
    var ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.value) return;   // don't wipe a half-typed entry
    render();
  });
  if (familyCode() && navigator.onLine && (!LINKS.fetchedAt || Date.now() - Date.parse(LINKS.fetchedAt) > 3 * 36e5)) fetchPlanner(true);
  applyTheme();
  render();
})();
