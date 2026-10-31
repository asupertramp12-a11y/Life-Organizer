/* Life Organizer — app logic
   Plain JavaScript, no build step. Everything you enter is saved in this browser's localStorage
   on this device only. Use Settings → Back up / Restore to move data between devices.
   Sections: Today, Plans (dated events), Notes, Tasks, Habits, Settings. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ Storage */
  var KEY = 'lo:data:v1';
  var APP_VERSION = '22';
  var EMPTY = function () { return { v: 1, tasks: [], habits: [], events: [], notes: [], ack: {}, cats: { byId: {}, byTitle: {} } }; };

  function normalise(d) {
    var base = EMPTY();
    if (!d || typeof d !== 'object') return base;
    ['tasks', 'habits', 'events', 'notes'].forEach(function (k) { base[k] = Array.isArray(d[k]) ? d[k] : []; });
    base.habits.forEach(function (h) { if (!h.log || typeof h.log !== 'object') h.log = {}; });
    base.ack = d.ack && typeof d.ack === 'object' ? d.ack : {};   // dismissed clash flags
    var c = d.cats && typeof d.cats === 'object' ? d.cats : {};     // who each plan is for: by plan, or by title
    base.cats = { byId: c.byId && typeof c.byId === 'object' ? c.byId : {}, byTitle: c.byTitle && typeof c.byTitle === 'object' ? c.byTitle : {} };
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
  function toast(msg, withUndo) {   // withUndo: offer to take back the last change()
    var el = document.getElementById('toast');
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (withUndo ? '<button type="button" data-action="undo">Undo</button>' : '');
    el.classList.add('show'); el.classList.toggle('has-undo', !!withUndo);
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show', 'has-undo'); }, withUndo ? 6000 : 2600);
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
    calendar: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M9 9.5v11M15 9.5v11M3.5 15h17"/>',
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
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
    trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 11.6A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9L17.5 7M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/>'
  };
  function icon(name, cls) { return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + I[name] + '</svg>'; }

  /* ------------------------------------------------------------------ Routing: four tabs
     The Hub (what matters now), Calendar (month, week by person, agenda), Thoughts (to-dos and
     notes) and Heads up (clashes and preplanning). Settings sits under the gear. Old addresses
     from earlier versions still work. */
  var ROUTES = [
    { id: 'hub', label: 'The Hub', icon: 'today' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'thoughts', label: 'Thoughts', icon: 'notes' },
    { id: 'headsup', label: 'Heads up', icon: 'bell' }
  ];
  var SETTINGS = { id: 'settings', label: 'Settings', icon: 'settings' };
  var OLD = { today: 'hub', plans: 'calendar', notes: 'thoughts', tasks: 'thoughts', habits: 'hub' };

  var state = { selDay: today(), weekStart: monday(today()), calMode: 'month', calMonth: null, agendaDays: 14,
    query: '', openWork: {}, showDone: false, showSorted: false };

  function route() {
    var h = (location.hash || '#/hub').replace(/^#\//, '').split('/');
    var name = OLD[h[0]] || h[0];
    if (name !== 'settings' && !ROUTES.some(function (r) { return r.id === name; })) name = 'hub';
    return { name: name, arg: h[1] ? decodeURIComponent(h[1]) : '' };
  }
  function navLink(r, cur) {
    var n = r.id === 'headsup' ? soonClashes() : 0;   // the badge counts clashes only
    return '<a href="#/' + r.id + '"' + (r.id === cur ? ' aria-current="page"' : '') + '>' + icon(r.icon) + '<span>' + r.label + '</span>' +
      (n ? '<b class="badge"><span class="visually-hidden">, </span>' + n + '<span class="visually-hidden"> ' + (n === 1 ? 'clash' : 'clashes') + ' in the next 7 days</span></b>' : '') + '</a>';
  }
  function renderNav(cur) {
    var links = ROUTES.map(function (r) { return navLink(r, cur); }).join('');
    document.getElementById('nav').innerHTML = links;
    document.getElementById('tabbar').innerHTML = links;
    document.getElementById('nav-foot').innerHTML = navLink(SETTINGS, cur);
    document.getElementById('rail-theme').innerHTML = themeKey();
  }
  /* While the file picker is open, background refreshes wait: redrawing would replace the file
     button and the chosen file would arrive at a button nobody is listening to. */
  var pickingSince = 0, refreshWaiting = false;
  function picking() { return pickingSince && Date.now() - pickingSince < 3 * 6e4; }
  function refresh() { if (picking() || sheetOpen()) { refreshWaiting = true; return; } render(); }
  function render(navigated) {
    linkedCache = null; flagCache = null;
    var r = route();
    renderNav(r.name);
    var main = document.getElementById('main');
    main.innerHTML = VIEWS[r.name](r.arg);
    main.querySelectorAll('input[data-input="merge"]').forEach(function (inp) {   // listen on the button itself too
      inp.addEventListener('change', function () { takeFile(inp); });
      inp.addEventListener('cancel', function () { pickingSince = 0; importStatus('No file chosen.'); flushRefresh(); });
    });
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
  function empty(msg) { return '<p class="empty">' + msg + '</p>'; }
  function flagTag(sev) { return sev ? '<span class="tag ' + (sev === 'clash' ? 'clash' : 'chk') + '">' + (sev === 'clash' ? 'Clash' : 'Check') + '</span>' : ''; }

  function taskRow(t) {
    var overdue = !t.done && t.due && t.due < today();
    var meta = (t.due ? '<span class="' + (overdue ? 'late' : '') + '">' + (overdue ? 'Overdue · ' : '') + esc(relDate(t.due)) + '</span>' : '') +
      (t.priority === 1 ? '<span class="tag">High</span>' : '') + (t.list ? '<span class="tag">' + esc(t.list) + '</span>' : '');
    return '<li class="row task' + (t.done ? ' done' : '') + '">' +
      '<button class="check" type="button" data-action="toggle-task" data-id="' + t.id + '" aria-pressed="' + !!t.done + '" aria-label="' + (t.done ? 'Mark not done: ' : 'Mark done: ') + esc(t.title) + '">' + icon('check') + '</button>' +
      '<button class="row-main" type="button" data-action="edit-task" data-id="' + t.id + '"><span class="row-title">' + esc(t.title) + '</span>' +
        (meta ? '<span class="meta">' + meta + '</span>' : '') + '</button></li>';
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
  function byTimeOfDay(a, b) { return (a.time ? 1 : 0) - (b.time ? 1 : 0) || ((a.time || '') < (b.time || '') ? -1 : (a.time || '') > (b.time || '') ? 1 : 0); }
  function spanLabel(e) {
    if (lastDay(e) === e.date) return '';
    var days = Math.round((parse(lastDay(e)) - parse(e.date)) / 864e5) + 1;
    return fmt(e.date, { weekday: 'short', day: 'numeric' }) + ' – ' + fmt(lastDay(e), { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + days + ' days';
  }
  function nowMins() { var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function isPast(e, day) {
    var t = today();
    if (lastDay(e) < t) return true;
    if (day !== t || !e.time || lastDay(e) > t) return false;
    return window_(e)[1] <= nowMins();
  }
  function eventRow(e, day) {
    var span = spanLabel(e), fl = flagFor(e);
    var meta = [span, e.place].filter(Boolean).map(esc).join(' · ') +
      (e.tag && e.tag !== 'Work' ? '<span class="tag">' + esc(e.tag) + '</span>' : '') +
      (e.who ? '<span class="tag who">' + icon('link', 'tiny') + esc(e.who) + '</span>' : '') +
      (e.deadline ? '<span class="tag">Deadline</span>' : '') +
      (e.busy ? '<span class="tag">' + (e.busy === 'free' ? 'Free' : 'Tentative') + '</span>' : '') + flagTag(fl);
    var when = e.time ? esc(e.time) + (e.endTime ? '<small>' + esc(e.endTime) + '</small>' : '') : 'All day';
    return '<li class="row plan' + (isPast(e, day || today()) ? ' past' : '') + '"><span class="time">' + when + '</span>' +
      '<button class="row-main" type="button" data-action="open-plan" data-id="' + esc(e.id) + '">' +
        '<span class="row-title">' + catDot(catOf(e)) + '<span class="visually-hidden">' + esc(catLabel(catOf(e))) + ': </span>' + esc(e.title) + '</span>' +
        (meta ? '<span class="meta">' + meta + '</span>' : '') + '</button></li>';
  }

  /* Work meetings that don't clash with anything fold into one line per day. */
  function foldable(e) { return catOf(e) === 'work' && e.time && !flagFor(e) && !isLeave(e) && !isAway(e); }
  function workRow(list, day) {
    var start = list.map(function (e) { return e.time; }).sort()[0];
    var end = hhmm(Math.max.apply(null, list.map(function (e) { return window_(e)[1]; })));
    var real = list.filter(function (e) { return !isBlock(e); });
    var allPast = list.every(function (e) { return isPast(e, day); });
    return '<li class="row plan work-sum' + (allPast ? ' past' : '') + '"><span class="time">' + esc(start) + '<small>' + esc(end) + '</small></span>' +
      '<button class="row-main" type="button" data-action="open-work" data-d="' + day + '" aria-expanded="false">' +
        '<span class="row-title">' + catDot('work') + 'At work · ' + plural(real.length || list.length, 'meeting', 'meetings') + '</span>' +
        '<span class="meta">' + esc(names(real.length ? real : list, 2)) + ' · <span class="more-link">Show</span></span></button></li>';
  }
  /* One day's merged list: all-day first, then by time, with work folded and a now-line on today. */
  function agendaList(day, withTasks) {
    var t = today(), plans = shown().filter(function (e) { return occursOn(e, day); }).sort(byTimeOfDay);
    var fold = state.openWork[day] ? [] : plans.filter(foldable);
    var items = plans.filter(function (e) { return fold.indexOf(e) < 0; }).map(function (e) { return { key: e.time || '', html: eventRow(e, day) }; });
    if (fold.length > 1) items.push({ key: fold[0].time, html: workRow(fold, day) });
    else if (fold.length === 1) items.push({ key: fold[0].time, html: eventRow(fold[0], day) });
    items.sort(function (a, b) { return (a.key ? 1 : 0) - (b.key ? 1 : 0) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); });
    if (day === t) {
      var now = hhmm(nowMins()), at = items.findIndex(function (x) { return x.key && x.key > now; });
      var line = { html: '<li class="now-line" aria-label="Now, ' + now + '"><span>' + now + '</span></li>' };
      if (at < 0) items.push(line); else items.splice(at, 0, line);
    }
    var tasks = !withTasks ? [] : S.tasks.filter(function (x) {
      if (day === t) return (!x.done && x.due && x.due <= t) || (x.done && x.doneAt === t);
      return x.due === day;
    }).sort(sortTasks);
    var body = (items.some(function (x) { return x.key !== undefined; }) ? '<ul class="list agenda">' + items.map(function (x) { return x.html; }).join('') + '</ul>' : '') +
      (state.openWork[day] && plans.some(foldable) ? '<button class="link" type="button" data-action="close-work" data-d="' + day + '">Fold work meetings</button>' : '') +
      (tasks.length ? '<h3 class="agenda-day">To do</h3><ul class="list">' + tasks.map(taskRow).join('') + '</ul>' : '');
    var label = day === t ? 'Today' : fmt(day, { weekday: 'long', day: 'numeric', month: 'long' });
    return '<h3 class="agenda-day">' + esc(label) + '</h3>' + (body || empty('Nothing planned. <button class="link inline" type="button" data-action="new-plan" data-d="' + day + '">Add a plan</button>'));
  }

  /* The week dial: a tuning scale with a needle on the selected day, labelled with that day's count. */
  function tipText(d) {
    var n = shown().filter(function (e) { return occursOn(e, d); }).length;
    return n ? plural(n, 'plan', 'plans') : 'Free';
  }
  function weekDays() { var out = []; for (var i = 0; i < 7; i++) out.push(addDays(state.weekStart, i)); return out; }
  function weekRange(days) {
    var first = parse(days[0]), last = parse(days[6]);
    return first.getMonth() === last.getMonth()
      ? first.getDate() + '–' + last.getDate() + ' ' + fmt(days[6], { month: 'long' })
      : fmt(days[0], { day: 'numeric', month: 'short' }) + ' – ' + fmt(days[6], { day: 'numeric', month: 'short' });
  }
  function weekNav() {
    return '<span class="dial-nav"><button class="key ghost sm" type="button" data-action="week" data-n="-7" aria-label="Previous week">' + icon('left') + '</button>' +
      (state.weekStart !== monday(today()) ? '<button class="pill-btn" type="button" data-action="week" data-n="0">This week</button>' : '') +
      '<button class="key ghost sm" type="button" data-action="week" data-n="7" aria-label="Next week">' + icon('right') + '</button></span>';
  }
  function dial() {
    var days = weekDays(), t = today();
    var sel = days.indexOf(state.selDay); if (sel < 0) { sel = 0; state.selDay = days[0]; }
    return '<div class="dial" style="--sel:' + sel + '">' +
      '<div class="dial-head"><h2 class="dial-range">' + esc(weekRange(days)) + '</h2>' + weekNav() + '</div>' +
      '<div class="scale" role="group" aria-label="Choose a day">' +
        days.map(function (d) {
          var dayEvs = shown().filter(function (e) { return occursOn(e, d); });
          var fd = flagsOn(d), clash = fd.some(function (f) { return f.sev === 'clash'; });
          return '<button class="day' + (d === t ? ' is-today' : d < t ? ' is-past' : '') + (clash ? ' has-clash' : fd.length ? ' has-check' : '') + '" type="button" data-action="pick-day" data-d="' + d + '" aria-pressed="' + (d === state.selDay) + '"' +
            ' aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })) + ', ' + plural(dayEvs.length, 'plan', 'plans') + (fd.length ? ', ' + plural(fd.length, 'flag', 'flags') : '') + '">' +
            '<span class="dots">' + cats().filter(function (c) { return dayEvs.some(function (e) { return catOf(e) === c.id; }); }).map(function (c) { return catDot(c.id); }).join('') + '</span>' +
            '<span class="dname">' + esc(fmt(d, { weekday: 'short' })) + '</span><span class="dnum">' + parse(d).getDate() + '</span></button>';
        }).join('') +
        '<span class="needle" aria-hidden="true"><span class="tip">' + esc(tipText(state.selDay)) + '</span></span>' +
      '</div></div>';
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
  function allEvents() {
    var own = LINKS.off.outlook ? S.events.filter(function (e) { return e.feed !== 'outlook'; }) : S.events;
    return own.concat(linked());
  }

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
      LINKS.fetchedAt = new Date().toISOString(); saveLinks(); refresh();
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
      row('outlook', 'Work calendar (Outlook)', S.events.some(function (e) { return e.feed === 'outlook'; }),
        esc(plural(S.events.filter(function (e) { return e.feed === 'outlook' && lastDay(e) >= t; }).length, 'event', 'events') + ' coming up. ') +
          (LINKS.outlookAt ? 'Updated ' + esc(relDate(iso(new Date(LINKS.outlookAt))).toLowerCase()) + '. ' : '') + 'To refresh, tap your Work calendar bookmark, then Add from a file below.',
        'Not added yet. Download your published Outlook calendar (calendar.ics), then use Add from a file below.') +
      '</ul>';
  }

  /* ------------------------------------------------------------------ Outlook calendar (.ics) import
     A published Outlook calendar downloads as calendar.ics. Importing it replaces the previous
     Outlook import, so moved meetings move, cancelled ones disappear and new ones appear.
     Repeating series are expanded from a week ago to 200 days ahead. */
  var WINZONES = { 'GMT Standard Time': 'Europe/London', 'Greenwich Standard Time': 'Atlantic/Reykjavik', 'UTC': 'UTC',
    'W. Europe Standard Time': 'Europe/Berlin', 'Romance Standard Time': 'Europe/Paris', 'Central Europe Standard Time': 'Europe/Budapest',
    'Central European Standard Time': 'Europe/Warsaw', 'GTB Standard Time': 'Europe/Athens', 'E. Europe Standard Time': 'Europe/Chisinau',
    'FLE Standard Time': 'Europe/Kiev', 'Eastern Standard Time': 'America/New_York', 'Central Standard Time': 'America/Chicago',
    'Mountain Standard Time': 'America/Denver', 'Pacific Standard Time': 'America/Los_Angeles', 'India Standard Time': 'Asia/Kolkata',
    'Singapore Standard Time': 'Asia/Singapore', 'Arab Standard Time': 'Asia/Riyadh', 'Arabian Standard Time': 'Asia/Dubai', 'Arabic Standard Time': 'Asia/Baghdad', 'Israel Standard Time': 'Asia/Jerusalem', 'Turkey Standard Time': 'Europe/Istanbul', 'Egypt Standard Time': 'Africa/Cairo', 'AUS Eastern Standard Time': 'Australia/Sydney' };
  function zoneOffset(tz, utcMs) {   // minutes the zone is ahead of UTC at that instant
    var p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(utcMs)).forEach(function (x) { p[x.type] = +x.value; });
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - utcMs) / 6e4;
  }
  /* An ICS date-time value -> a Date in this device's time zone, or {date} for all-day values. */
  function icsWhen(prop) {
    if (!prop) return null;
    var v = prop.value, m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!m) return null;
    if (!m[4] || (prop.params.VALUE || '') === 'DATE') return { allDay: true, date: m[1] + '-' + m[2] + '-' + m[3] };
    var y = +m[1], mo = +m[2] - 1, d = +m[3], h = +m[4], mi = +m[5];
    var dt;
    if (m[7]) dt = new Date(Date.UTC(y, mo, d, h, mi));
    else {
      var tz = (prop.params.TZID || '').replace(/^"|"$/g, ''), iana = WINZONES[tz] || (/\//.test(tz) ? tz : '');
      var ok = false; try { if (iana) { new Intl.DateTimeFormat('en-GB', { timeZone: iana }); ok = true; } } catch (e) { ok = false; }
      if (ok) { var guess = Date.UTC(y, mo, d, h, mi), off = zoneOffset(iana, guess); dt = new Date(guess - off * 6e4); var off2 = zoneOffset(iana, dt.getTime()); if (off2 !== off) dt = new Date(guess - off2 * 6e4); }
      else dt = new Date(y, mo, d, h, mi);   // floating or unknown zone: take it as local time
    }
    return { allDay: false, dt: dt, date: iso(dt), time: pad(dt.getHours()) + ':' + pad(dt.getMinutes()) };
  }
  function parseICS(text) {
    var lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n'), events = [], cur = null, depth = [];
    lines.forEach(function (line) {
      if (/^BEGIN:/i.test(line)) { depth.push(line.slice(6).toUpperCase()); if (depth[depth.length - 1] === 'VEVENT') cur = { props: {} }; return; }
      if (/^END:/i.test(line)) { if (depth.pop() === 'VEVENT' && cur) { events.push(cur); cur = null; } return; }
      if (!cur || depth[depth.length - 1] !== 'VEVENT') return;
      var i = line.indexOf(':'); if (i < 0) return;
      var head = line.slice(0, i).split(';'), name = head[0].toUpperCase(), params = {};
      head.slice(1).forEach(function (p) { var j = p.indexOf('='); if (j > 0) params[p.slice(0, j).toUpperCase()] = p.slice(j + 1); });
      var prop = { value: line.slice(i + 1), params: params };
      (cur.props[name] = cur.props[name] || []).push(prop);
    });
    return events;
  }
  function icsText(v) { return (v || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim(); }
  function first(ev, k) { return ev.props[k] && ev.props[k][0]; }
  var WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  /* Does `d` (a local date) match the repeat rule that started on `s`? */
  function ruleHits(rule, s, d) {
    var a = parse(s), b = parse(d), iv = +(rule.INTERVAL || 1);
    var days = Math.round((b - a) / 864e5);
    if (days < 0) return false;
    var byday = (rule.BYDAY || '').split(',').filter(Boolean);
    switch (rule.FREQ) {
      case 'DAILY': return days % iv === 0 && (!byday.length || byday.some(function (x) { return WD[x.slice(-2)] === b.getDay(); }));
      case 'WEEKLY':
        var wk = Math.floor((Math.round((parse(monday(d)) - parse(monday(s))) / 864e5)) / 7);
        if (wk % iv) return false;
        return byday.length ? byday.some(function (x) { return WD[x.slice(-2)] === b.getDay(); }) : b.getDay() === a.getDay();
      case 'MONTHLY':
        var months = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
        if (months % iv) return false;
        if (rule.BYMONTHDAY) return rule.BYMONTHDAY.split(',').some(function (x) { var n = +x; var dim = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate(); return (n > 0 ? n : dim + n + 1) === b.getDate(); });
        if (byday.length) return byday.some(function (x) {
          var mm = x.match(/^([+-]?\d+)?([A-Z]{2})$/); if (!mm || WD[mm[2]] !== b.getDay()) return false;
          var n = +(mm[1] || rule.BYSETPOS || 0); if (!n) return true;
          var dim = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
          return n > 0 ? Math.ceil(b.getDate() / 7) === n : Math.floor((dim - b.getDate()) / 7) === -n - 1;
        });
        return b.getDate() === a.getDate();
      case 'YEARLY':
        return (b.getFullYear() - a.getFullYear()) % iv === 0 && b.getMonth() === a.getMonth() && b.getDate() === a.getDate();
    }
    return false;
  }
  function icsToPlans(text) {
    var raw = parseICS(text), from = addDays(today(), -7), to = addDays(today(), 200);
    var overrides = {}, out = [];
    raw.forEach(function (ev) { var r = first(ev, 'RECURRENCE-ID'); if (r) { var w = icsWhen(r); if (w) overrides[icsText((first(ev, 'UID') || {}).value) + '|' + w.date] = ev; } });
    function plan(ev, date, uid, spanDays) {
      var st = icsWhen(first(ev, 'DTSTART')), en = icsWhen(first(ev, 'DTEND'));
      if (!st) return null;
      if ((first(ev, 'STATUS') || {}).value === 'CANCELLED' || /^canceled:|^cancelled:/i.test(icsText((first(ev, 'SUMMARY') || {}).value))) return null;
      var title = icsText((first(ev, 'SUMMARY') || {}).value) || 'Busy';
      var cats = icsText((first(ev, 'CATEGORIES') || {}).value).split(',')[0];
      var busy = ((first(ev, 'X-MICROSOFT-CDO-BUSYSTATUS') || {}).value || '').toUpperCase();
      var p = { id: 'ol:' + uid + ':' + date, title: title, date: date, time: '', place: icsText((first(ev, 'LOCATION') || {}).value).replace(/^Microsoft Teams Meeting$/i, 'Teams'),
        tag: busy === 'OOF' || /\b(annual leave|leave|bank holiday|holiday|out of office|ooo)\b/i.test(title) ? 'Leave' : (cats || 'Work'), src: 'outlook', srcName: 'Outlook', feed: 'outlook' };
      if (busy === 'FREE' || busy === 'TENTATIVE') p.busy = busy.toLowerCase();
      if (st.allDay) { if (spanDays > 1) p.end = addDays(date, spanDays - 1); }
      else { p.time = st.time; if (en && !en.allDay && en.date === st.date) p.endTime = en.time; else if (en && !en.allDay && en.date > st.date) p.end = addDays(date, Math.round((parse(en.date) - parse(st.date)) / 864e5)); }
      return p;
    }
    raw.forEach(function (ev) {
      if (first(ev, 'RECURRENCE-ID')) return;   // handled through its series
      var uid = icsText((first(ev, 'UID') || {}).value) || uidFor(ev);
      var st = icsWhen(first(ev, 'DTSTART')), en = icsWhen(first(ev, 'DTEND'));
      if (!st) return;
      var span = st.allDay && en && en.allDay ? Math.max(1, Math.round((parse(en.date) - parse(st.date)) / 864e5)) : 1;
      var rr = first(ev, 'RRULE');
      if (!rr) {
        if (st.date > to || addDays(st.date, span - 1) < from) return;
        var one = plan(ev, st.date, uid, span); if (one) out.push(one); return;
      }
      if ((first(ev, 'STATUS') || {}).value === 'CANCELLED') return;   // a cancelled series takes its moved instances with it
      var rule = {}; rr.value.split(';').forEach(function (kv) { var q = kv.split('='); rule[q[0].toUpperCase()] = q[1]; });
      var until = rule.UNTIL ? icsWhen({ value: rule.UNTIL, params: {} }).date : to;
      var ex = {}; (ev.props.EXDATE || []).forEach(function (pr) { pr.value.split(',').forEach(function (v) { var w = icsWhen({ value: v, params: pr.params }); if (w) ex[w.date] = true; }); });
      var count = rule.COUNT ? +rule.COUNT : Infinity, n = 0, guard = 0;
      for (var d = st.date; d <= until && d <= to && n < count && guard < 4000; d = addDays(d, 1), guard++) {
        if (!ruleHits(rule, st.date, d)) continue;
        n++;
        if (d < from || ex[d]) continue;
        var o = overrides[uid + '|' + d];
        var p = o ? plan(o, (icsWhen(first(o, 'DTSTART')) || {}).date || d, uid, span) : plan(ev, d, uid, span);
        if (p) { if (o) p.id = 'ol:' + uid + ':' + d; out.push(p); }
      }
    });
    return out;
  }
  function uidFor(ev) { return 'x' + Math.abs(JSON.stringify(ev.props).split('').reduce(function (h, c) { return (h * 31 + c.charCodeAt(0)) | 0; }, 7)).toString(36); }
  /* Returns a sentence describing what happened. Outlook replaces the work diary loaded by hand earlier. */
  function importICS(text) {
    var plans = icsToPlans(text);
    if (!plans.length) return 'No events found in that calendar file between last week and 200 days ahead.';
    var oldDiary = S.events.filter(function (e) { return /^work-/.test(e.id); }).length;
    var before = S.events.filter(function (e) { return e.feed === 'outlook'; }).length;
    S.events = S.events.filter(function (e) { return e.feed !== 'outlook' && !/^work-/.test(e.id); }).concat(plans);
    LINKS.outlookAt = new Date().toISOString(); saveLinks();
    save();
    return (before ? 'Outlook updated: ' : 'Added ') + plural(plans.length, 'Outlook event', 'Outlook events') + '.' +
      (oldDiary ? ' Replaced the ' + oldDiary + ' work diary plans loaded earlier.' : '');
  }

  /* ------------------------------------------------------------------ Categories: four sources, four colours
     Work (Outlook and anything labelled work), Personal (everything you add or import yourself),
     Douglas (his XP app planner) and Dorothea (her Health app). Hiding a category is display-only:
     clash checks always look at everything. */
  function dorotheaName() { var D = readJSON(DH.data) || {}; return (D.child && (D.child.shortName || D.child.name)) || 'Dorothea'; }
  function cats() {
    return [{ id: 'work', label: 'Work' }, { id: 'personal', label: 'Personal' }, { id: 'douglas', label: 'Douglas' }, { id: 'dorothea', label: dorotheaName() }];
  }
  /* Who a plan is for. Your choice wins (one plan, or every plan with that title); otherwise a sensible guess:
     Outlook and labelled work -> Work; Douglas's planner by its "who"; the Health app -> Dorothea;
     titles naming a child -> that child; everything else -> Personal (yours). */
  function titleKey(t) { return String(t || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function catGuess(e) {
    if (e.feed === 'outlook' || baseWork(e)) return 'work';
    if (e.src === 'health') return 'dorothea';
    if (e.src === 'xp') return /^doro/i.test(e.who || '') ? 'dorothea' : /^dad$/i.test(e.who || '') ? 'personal' : 'douglas';
    if (/\bdoro(thea)?\b/i.test(e.title)) return 'dorothea';
    if (/\bdoug(las|ie)?\b/i.test(e.title)) return 'douglas';
    return 'personal';
  }
  function catOf(e) {
    return S.cats.byId[e.id] || S.cats.byTitle[titleKey(e.title)] || catGuess(e);
  }
  function chosenCat(e) { return S.cats.byId[e.id] || S.cats.byTitle[titleKey(e.title)] || ''; }
  function catLabel(id) { var c = cats().filter(function (x) { return x.id === id; })[0]; return c ? c.label : id; }
  if (!LINKS.hideCat) LINKS.hideCat = {};
  function shown() { return allEvents().filter(function (e) { return !LINKS.hideCat[catOf(e)]; }); }
  function catDot(c) { return '<i class="cat-dot cat-' + c + '" aria-hidden="true"></i>'; }
  /* Filter chips: tap to show or hide a category. `inRange` limits the counts (e.g. to the month on screen). */
  function catFilter(inRange) {
    var list = allEvents().filter(inRange || function () { return true; });
    return '<div class="cats" role="group" aria-label="Show categories">' + cats().map(function (c) {
      var n = list.filter(function (e) { return catOf(e) === c.id; }).length, on = !LINKS.hideCat[c.id];
      return '<button class="cat-chip cat-' + c.id + '" type="button" data-action="toggle-cat" data-c="' + c.id + '" aria-pressed="' + on + '"' +
        ' aria-label="' + (on ? 'Hide ' : 'Show ') + esc(c.label) + ', ' + n + '">' + catDot(c.id) + '<span>' + esc(c.label) + '</span><b>' + n + '</b></button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ Calendar: month, week by person, agenda */
  function calMonthStart() { return (state.calMonth || today().slice(0, 7)) + '-01'; }
  function monthAdd(m, n) { var d = parse(m + '-01'); d.setMonth(d.getMonth() + n); return iso(d).slice(0, 7); }
  function dayFlags(d) { var fl = flagsOn(d); return fl.some(function (f) { return f.sev === 'clash'; }) ? ' has-clash' : fl.length ? ' has-check' : ''; }

  function monthGrid() {
    var t = today(), m0 = calMonthStart(), month = m0.slice(0, 7);
    var gridStart = monday(m0), last = iso(new Date(parse(m0).getFullYear(), parse(m0).getMonth() + 1, 0));
    var weeks = Math.ceil((Math.round((parse(last) - parse(gridStart)) / 864e5) + 1) / 7);
    var evs = shown();
    if (state.selDay.slice(0, 7) !== month) state.selDay = month === t.slice(0, 7) ? t : m0;
    var cells = '';
    for (var i = 0; i < weeks * 7; i++) {
      var d = addDays(gridStart, i), on = evs.filter(function (e) { return occursOn(e, d); }).sort(byTimeOfDay);
      var fold = on.filter(foldable), rest = on.filter(function (e) { return fold.indexOf(e) < 0; });
      var chips = rest.map(function (e) {
        var cont = e.date < d;
        return '<span class="ev cat-' + catOf(e) + (cont ? ' cont' : '') + (e.time ? '' : ' allday') + '">' + (e.time && !cont ? '<time>' + esc(e.time) + '</time>' : '') + esc(e.title) + '</span>';
      });
      if (fold.length) chips.push('<span class="ev cat-work">Work · ' + fold.length + '</span>');
      var present = cats().filter(function (c) { return on.some(function (e) { return catOf(e) === c.id; }); });
      cells += '<button class="cal-day' + (d.slice(0, 7) !== month ? ' out' : '') + (d === t ? ' is-today' : '') + (d < t ? ' is-past' : '') + dayFlags(d) +
        '" type="button" data-action="cal-day" data-d="' + d + '" aria-pressed="' + (d === state.selDay) + '"' +
        ' aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })) + ', ' + plural(on.length, 'plan', 'plans') + '">' +
        '<span class="cal-num">' + parse(d).getDate() + '</span>' +
        '<span class="cal-dots">' + present.map(function (c) { return catDot(c.id); }).join('') + '</span>' +
        '<span class="cal-evs">' + chips.slice(0, 4).join('') + (chips.length > 4 ? '<span class="ev more">+' + (chips.length - 4) + ' more</span>' : '') + '</span></button>';
    }
    return '<section class="panel cal" aria-labelledby="h-month"><div class="dial-head"><h2 id="h-month" class="dial-range">' + esc(fmt(m0, { month: 'long', year: 'numeric' })) + '</h2>' +
        '<span class="dial-nav"><button class="key ghost sm" type="button" data-action="cal-month" data-n="-1" aria-label="Previous month">' + icon('left') + '</button>' +
        (month !== t.slice(0, 7) ? '<button class="pill-btn" type="button" data-action="cal-month" data-n="0">This month</button>' : '') +
        '<button class="key ghost sm" type="button" data-action="cal-month" data-n="1" aria-label="Next month">' + icon('right') + '</button></span></div>' +
        '<div class="cal-head" aria-hidden="true">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
        '<div class="cal-grid">' + cells + '</div></section>' +
      '<section class="panel sticky" aria-label="Selected day"><div id="agenda">' + agendaList(state.selDay) + '</div></section>';
  }

  /* Week by person: a row per day, a lane per category, so overlaps line up side by side. */
  function weekLanes() {
    var days = weekDays(), t = today(), cs = cats().filter(function (c) { return !LINKS.hideCat[c.id]; }), evs = shown();
    var headRow = '<div class="lane-row lane-head" style="--lanes:' + cs.length + '"><span></span>' + cs.map(function (c) { return '<span>' + catDot(c.id) + esc(c.label) + '</span>'; }).join('') + '</div>';
    var rows = days.map(function (d) {
      var on = evs.filter(function (e) { return occursOn(e, d); }).sort(byTimeOfDay);
      return '<div class="lane-row' + (d === t ? ' is-today' : '') + (d < t ? ' is-past' : '') + dayFlags(d) + '" style="--lanes:' + cs.length + '">' +
        '<button class="lane-day" type="button" data-action="lane-day" data-d="' + d + '" aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })) + '"><b>' + esc(fmt(d, { weekday: 'short' })) + '</b><span>' + parse(d).getDate() + '</span></button>' +
        cs.map(function (c) {
          var mine = on.filter(function (e) { return catOf(e) === c.id; });
          var fold = c.id === 'work' && !state.openWork[d] ? mine.filter(foldable) : [];
          var cells = mine.filter(function (e) { return fold.indexOf(e) < 0; }).map(function (e) {
            var fl = flagFor(e);
            return '<button class="lane-ev cat-' + c.id + (fl ? ' fl-' + fl : '') + (isPast(e, d) ? ' past' : '') + '" type="button" data-action="open-plan" data-id="' + esc(e.id) + '">' +
              (e.time && e.date === d ? '<time>' + esc(e.time) + '</time>' : '') + '<span>' + esc(e.title) + '</span></button>';
          });
          if (fold.length) {
            var end = hhmm(Math.max.apply(null, fold.map(function (e) { return window_(e)[1]; })));
            cells.push('<button class="lane-ev cat-work folded" type="button" data-action="open-work" data-d="' + d + '"><time>' + esc(fold.map(function (e) { return e.time; }).sort()[0]) + '–' + end + '</time><span>' + plural(fold.length, 'meeting', 'meetings') + '</span></button>');
          }
          return '<div class="lane">' + cells.join('') + '</div>';
        }).join('') + '</div>';
    }).join('');
    return '<section class="panel lanes" aria-labelledby="h-week"><div class="dial-head"><h2 id="h-week" class="dial-range">' + esc(weekRange(days)) + '</h2>' + weekNav() + '</div>' +
      '<div class="lane-grid">' + headRow + rows + '</div></section>';
  }

  /* Agenda: the next 14 days (or more), only days with something on. */
  function agendaRange() {
    var t = today(), out = '', shownDays = 0;
    for (var i = 0; i < state.agendaDays; i++) {
      var d = addDays(t, i);
      if (!shown().some(function (e) { return occursOn(e, d); })) continue;
      shownDays++;
      out += '<div class="agenda-block' + dayFlags(d) + '">' + agendaList(d) + '</div>';
    }
    return '<section class="panel" aria-label="Agenda">' + (shownDays ? out : empty('Nothing in the next ' + state.agendaDays + ' days.')) +
      '<button class="btn ghost more-days" type="button" data-action="more-days">Show 14 more days</button></section>';
  }

  /* Sort categories: every non-Outlook title once, so recurring entries are sorted in one tap. */
  function sorterSheet() {
    var seen = {}, rows = [];
    allEvents().filter(function (e) { return e.feed !== 'outlook' && !baseWork(e) && !isHoliday(e); }).forEach(function (e) {
      var k = titleKey(e.title); if (!k) return;
      if (!seen[k]) { seen[k] = { e: e, n: 0, src: e.src }; rows.push(seen[k]); }
      seen[k].n++;
    });
    rows.sort(function (a, b) { return (chosenCat(a.e) ? 1 : 0) - (chosenCat(b.e) ? 1 : 0) || (a.e.title < b.e.title ? -1 : 1); });
    return '<h2 id="sheet-title">Who’s it for?</h2><p class="hint">Choose once per title; every date with that title follows. Personal is just you: walks, haircuts, your own appointments.</p>' +
      '<ul class="list sorter">' + rows.map(function (r) {
        var cur = catOf(r.e);
        return '<li class="sort-row"><div class="row-body"><span class="row-title">' + esc(r.e.title) + '</span><span class="meta">' + plural(r.n, 'date', 'dates') +
          (r.src === 'xp' ? ' · Douglas’s planner' : r.src === 'health' ? ' · Health app' : '') + (chosenCat(r.e) ? '' : ' · <i>guessed</i>') + '</span></div>' +
          '<div class="segmented inline" role="group" aria-label="Who’s ' + esc(r.e.title) + ' for?">' + cats().filter(function (c) { return c.id !== 'work'; }).map(function (c) {
            return '<button type="button" class="cat-' + c.id + '" data-action="sort-cat" data-t="' + esc(titleKey(r.e.title)) + '" data-c="' + c.id + '" aria-pressed="' + (cur === c.id) + '" aria-label="' + esc(c.label) + '">' + catDot(c.id) + '<span>' + esc(c.label.slice(0, 4) === 'Pers' ? 'Me' : c.label.split(' ')[0]) + '</span></button>';
          }).join('') + '</div></li>';
      }).join('') + '</ul><div class="sheet-actions"><button class="btn" type="button" data-action="close-sheet">Done</button></div>';
  }
  function calendarView() {
    var modes = [['month', 'Month'], ['week', 'Week'], ['agenda', 'Agenda']];
    var body = state.calMode === 'week' ? weekLanes() : state.calMode === 'agenda' ? agendaRange() : '<div class="split cal-split">' + monthGrid() + '</div>';
    return head('Calendar', 'Work, personal, Douglas and ' + esc(dorotheaName()) + ' together.',
        '<button class="key signal" type="button" data-action="new-plan" aria-label="Add a plan">' + icon('plus') + '</button>') +
      '<div class="cal-tools"><div class="segmented" role="group" aria-label="Calendar view">' + modes.map(function (m) {
        return '<button type="button" data-action="cal-mode" data-m="' + m[0] + '" aria-pressed="' + (state.calMode === m[0]) + '">' + m[1] + '</button>';
      }).join('') + '</div>' + catFilter() + '<button class="link" type="button" data-action="open-sorter">Sort categories</button></div>' + body;
  }

  /* ------------------------------------------------------------------ Clash detection
     Work = a plan with a category label, or "(work)" in its title. Everything else is life.
     Each upcoming day is checked; results are cached until the next save. */
  var flagCache = null;
  var HOLIDAY = /^(christmas day|boxing day|new year.s day|good friday|easter monday)|bank holiday/i;
  function baseWork(e) { return !!e.tag || /\(work\)/i.test(e.title); }
  function isWork(e) { return catOf(e) === 'work'; }
  function isLeave(e) { return isWork(e) && (e.tag === 'Leave' || /\bleave\b/i.test(e.title)); }
  function isAway(e) { return isWork(e) && !isLeave(e) && (lastDay(e) !== e.date || /\btrip\b/i.test(e.title)); }
  function isBlock(e) {   // a block of time (e.g. a whole Tekever day) rather than a meeting
    if (/calendar block/i.test(e.title)) return true;
    return !!(e.time && e.endTime && mins(e.endTime) - mins(e.time) >= 360);
  }
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
      var firm = real.filter(function (e) { return e.busy !== 'free'; });   // free time can't be double-booked
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
            awayId: away.id, awayTitle: away.title, lifeTitle: L.title,
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
      var timedLife = away ? [] : life.filter(function (e) { return e.time; });   // when away, "needs cover" already says it
      for (var a = 0; a < timedLife.length; a++) for (var c = a + 1; c < timedLife.length; c++) {
        var A = timedLife[a], B = timedLife[c];
        if (catOf(A) !== catOf(B) && overlaps(A, B)) push({ key: 'two|' + A.id + '|' + B.id, pair: 'two|' + A.title + '|' + B.title, kind: 'two', sev: 'check', day: d,
          ids: [A.id, B.id], title: 'Two things at once: ' + A.title + ' and ' + B.title,
          detail: times(A) + ' (' + catLabel(catOf(A)).replace('Personal', 'you') + ') and ' + times(B) + ' (' + catLabel(catOf(B)).replace('Personal', 'you') + ')', hint: 'Needs two adults, or a lift sorted' });
      }
      for (var i = 0; i < firm.length; i++) for (var j = i + 1; j < firm.length; j++) {
        if (overlaps(firm[i], firm[j])) push({ key: 'dbl|' + firm[i].id + '|' + firm[j].id, pair: 'dbl|' + firm[i].title + '|' + firm[j].title, kind: 'double', sev: 'clash', day: d,
          ids: [firm[i].id, firm[j].id], title: 'Double-booked: ' + firm[i].title + ' and ' + firm[j].title, detail: times(firm[i]) + ' and ' + times(firm[j]), hint: 'Pick one, or send apologies' });
      }
    }
    /* Preplanning: a week's notice for birthdays and big numbers ("Douglas is 10", "Ames 40th") */
    ALL.filter(function (e) { return !isWork(e) && e.date >= t && e.date <= addDays(t, 60) && /birthday|\bbday\b|\b\d{1,3}(st|nd|rd|th)\b|\bis \d{1,3}\b/i.test(e.title); }).forEach(function (e) {
      var d0 = addDays(e.date, -7); if (d0 < t) d0 = t;
      push({ key: 'gift|' + e.id, kind: 'prep', sev: 'check', day: d0, ids: [e.id], title: 'Present for ' + e.title,
        detail: fmt(e.date, { weekday: 'short', day: 'numeric', month: 'short' }), hint: 'Preplanning: get a present or card' });
    });
    out.forEach(function (f) {   // leave flags gather every day of the leave into one
      if (f.kind !== 'leave') return;
      var real2 = f.items.filter(function (e) { return !isBlock(e); });
      f.title = plural(f.items.length, 'work commitment', 'work commitments') + ' during ' + f.leave.title;
      f.detail = names(real2.length ? real2 : f.items, 3);
    });
    flagAllCache = out;
    flagCache = out.filter(function (f) { return !S.ack[f.key] && !(f.pair && S.ack[f.pair]) && !(f.kind === 'check' && S.ack['check|' + f.title]); });
    return flagCache;
  }
  var flagAllCache = [];
  function flagsAll() { flags(); return flagAllCache; }
  function flagsOn(d) { return flags().filter(function (f) { return f.kind !== 'prep' && f.days.indexOf(d) > -1; }); }
  function flagFor(e) {
    var hit = flags().filter(function (f) { return f.ids.indexOf(e.id) > -1; });
    return hit.some(function (f) { return f.sev === 'clash'; }) ? 'clash' : hit.length ? 'check' : '';
  }
  function dayList(f) {
    var ds = f.days;
    if (ds.length === 1) return fmt(ds[0], { weekday: 'short', day: 'numeric', month: 'short' });
    return fmt(ds[0], { weekday: 'short', day: 'numeric' }) + ' – ' + fmt(ds[ds.length - 1], { weekday: 'short', day: 'numeric', month: 'short' });
  }
  /* ------------------------------------------------------------------ Heads up: flags grouped by cause, with decisions */
  var DECIDE = {
    family: ['I’ll do it', 'Mum', 'Nanny', 'Move it'],
    work: ['Declined', 'Moved', 'Keep'],
    prep: ['Done', 'On it']
  };
  function decideSet(f) { return /^(leave|holiday|double)$/.test(f.kind) ? 'work' : /^(deadline|prep)$/.test(f.kind) ? 'prep' : 'family'; }
  function ackOf(k) { var a = S.ack[k]; return !a ? null : typeof a === 'string' ? { v: 'Dismissed', at: a } : a; }
  function groupKey(f) { return f.kind === 'away' ? 'away|' + f.awayId : f.kind === 'check' ? 'check|' + f.title : f.pair || f.key; }
  function groups(list) {
    var map = {}, out = [];
    list.forEach(function (f) {
      var k = groupKey(f);
      if (!map[k]) { map[k] = { key: k, flags: [], away: f.kind === 'away' ? f : null }; out.push(map[k]); }
      map[k].flags.push(f);
    });
    out.forEach(function (g) {
      g.flags.sort(function (a, b) { return a.days[0] < b.days[0] ? -1 : 1; });
      g.first = g.flags[0].days[0];
      g.sev = g.flags.some(function (f) { return f.sev === 'clash'; }) ? 'clash' : 'check';
      g.pairs = g.flags[0].kind === 'check' ? [g.key] : g.flags.map(function (f) { return f.pair; }).filter(Boolean);
      g.recurring = !g.away && g.flags.length > 1;
      g.hint = g.flags[0].hint;
      if (g.away) g.title = 'While you’re away: ' + g.away.awayTitle;
      else if (g.flags.length > 1) g.title = g.flags[0].title;
      else g.title = '';
    });
    return out.sort(function (a, b) { return a.first < b.first ? -1 : a.first > b.first ? 1 : 0; });
  }
  /* "Soon" means the next 7 days: one wording everywhere. */
  function soonGroups() { var lim = addDays(today(), 6); return groups(flags()).filter(function (g) { return g.first <= lim; }); }
  function soonCount() { return soonGroups().reduce(function (n, g) { return n + g.flags.length; }, 0); }
  function soonClashes() { return soonGroups().reduce(function (n, g) { return n + g.flags.filter(function (f) { return f.sev === 'clash'; }).length; }, 0); }
  /* One wording everywhere: "3 clashes and 5 checks in the next 7 days" */
  function soonWords(tail) {
    var c = soonClashes(), k = soonCount() - c;
    if (!c && !k) return 'All clear ' + tail;
    return [c ? plural(c, 'clash', 'clashes') : '', k ? plural(k, 'check', 'checks') : ''].filter(Boolean).join(' and ') + ' ' + tail;
  }
  function untilLabel(d) {
    var n = Math.round((parse(d) - parse(today())) / 864e5);
    return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
  }
  function decideButtons(f) {
    return '<div class="decide" role="group" aria-label="' + (decideSet(f) === 'family' ? 'Who’s covering?' : 'What happened?') + '">' +
      DECIDE[decideSet(f)].map(function (v) { return '<button class="pill-btn" type="button" data-action="decide" data-k="' + esc(f.key) + '" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join('') + '</div>';
  }
  function flagItem(f, group) {
    var when = '<span class="flag-when"><b>' + esc(fmt(f.days[0], { day: 'numeric' })) + '</b><small>' + esc(fmt(f.days[0], { month: 'short' })) + '</small></span>';
    if (group && group.recurring)   // same thing on several dates: one line each, decided together above
      return '<li class="flag compact">' + when + '<div class="row-body"><span class="meta">' + esc(dayList(f)) + ' · ' + esc(untilLabel(f.days[0])) + (f.detail ? ' · ' + esc(f.detail) : '') + '</span></div></li>';
    if (group)   // a trip: one decision per family plan
      return '<li class="flag compact">' + when + '<div class="row-body"><span class="row-title">' + esc(f.lifeTitle || f.title) + '</span>' +
        '<span class="meta">' + esc(dayList(f)) + ' · ' + esc(untilLabel(f.days[0])) + '</span>' + decideButtons(f) + '</div></li>';
    return '<li class="flag sev-' + f.sev + '">' + when +
      '<div class="row-body"><span class="flag-head">' + flagTag(f.sev) + '<span class="row-title">' + esc(f.title) + '</span></span>' +
      '<span class="meta">' + esc(dayList(f)) + ' · ' + esc(untilLabel(f.days[0])) + (f.detail ? ' · ' + esc(f.detail) : '') + '</span>' +
      '<span class="flag-hint">' + esc(f.hint) + '</span>' + decideButtons(f) + '</div></li>';
  }
  function decideAll(g) {
    var keys = g.flags.map(function (f) { return f.key; }).join('\n');
    return '<div class="decide" role="group" aria-label="Same for all ' + g.flags.length + ' dates"><span class="decide-label">Same for all:</span>' +
      DECIDE[decideSet(g.flags[0])].map(function (v) { return '<button class="pill-btn" type="button" data-action="decide-all" data-k="' + esc(keys) + '" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join('') + '</div>';
  }
  function groupCard(g) {
    if (g.flags.length === 1 && !g.away) {
      var f = g.flags[0];
      return '<section class="hu-group"><ul class="list flags">' + flagItem(f) + '</ul>' +
        (f.pair ? '<button class="link" type="button" data-action="always" data-k="' + esc(f.pair) + '">Always fine: don’t flag this again</button>' : '') + '</section>';
    }
    var range = g.flags.length > 1 ? fmt(g.first, { weekday: 'short', day: 'numeric', month: 'short' }) + ' – ' + fmt(g.flags[g.flags.length - 1].days[0], { day: 'numeric', month: 'short' }) : dayList(g.flags[0]);
    return '<section class="hu-group"><div class="hu-head">' + flagTag(g.sev) + '<div><h3>' + esc(g.title) + '</h3>' +
        '<p class="meta">' + esc(range) + ' · ' + (g.away ? plural(g.flags.length, 'family plan needs', 'family plans need') + ' cover' : plural(g.flags.length, 'date', 'dates')) + '</p>' +
        '<p class="flag-hint">' + esc(g.hint) + '</p>' + (g.recurring ? decideAll(g) : '') + '</div></div>' +
      '<ul class="list flags">' + g.flags.map(function (f) { return flagItem(f, g); }).join('') + '</ul>' +
      (g.pairs.length ? '<button class="link" type="button" data-action="always" data-k="' + esc(g.pairs.join('\n')) + '">Always fine: don’t flag these again</button>' : '') + '</section>';
  }
  function sortedList() {
    var t = today();
    function ackKey(f) { return ackOf(f.key) ? f.key : f.pair && ackOf(f.pair) ? f.pair : f.kind === 'check' && ackOf('check|' + f.title) ? 'check|' + f.title : null; }
    var done = flagsAll().filter(function (f) { return ackKey(f) && f.days[f.days.length - 1] >= t; });
    if (!done.length) return '';
    return '<details class="panel sorted"' + (state.showSorted ? ' open' : '') + '><summary data-action="toggle-sorted">Sorted · ' + done.length + '</summary><ul class="list">' +
      done.map(function (f) {
        var k = ackKey(f), a = ackOf(k);
        return '<li class="row"><div class="row-body"><span class="row-title">' + esc(f.kind === 'away' ? f.lifeTitle : f.title) + '</span>' +
          '<span class="meta">' + esc(dayList(f)) + ' · <b>' + esc(a.v) + '</b></span></div>' +
          '<button class="pill-btn" type="button" data-action="unack" data-k="' + esc(k) + '">Undo</button></li>';
      }).join('') + '</ul></details>';
  }
  function headsUpView() {
    var t = today(), all = groups(flags());
    var bands = [['This week', t, addDays(t, 6)], ['Next week', addDays(t, 7), addDays(t, 13)], ['Later', addDays(t, 14), '9999']];
    var n = soonCount();
    var body = bands.map(function (b) {
      var gs = all.filter(function (g) { return g.first >= b[1] && g.first <= b[2]; });
      if (!gs.length) return '';
      var count = gs.reduce(function (s2, g) { return s2 + g.flags.length; }, 0);
      if (b[0] === 'Later') return '<details class="later"' + (state.showLater ? ' open' : '') + '><summary class="band" data-action="toggle-later">Later <span>' + count + '</span></summary>' + gs.map(groupCard).join('') + '</details>';
      return '<h2 class="band">' + b[0] + ' <span>' + count + '</span></h2>' + gs.map(groupCard).join('');
    }).join('');
    return head('Heads up', soonWords('in the next 7 days') + '.') +
      (all.length ? '' : '<section class="panel all-clear">' + icon('check') + '<h2>All clear</h2><p>No clashes or preplanning ahead. Anything new from Outlook or the family apps will show up here.</p></section>') +
      body + sortedList() +
      '<p class="hint">Clash: two things can’t both happen as planned. Check: probably fine, worth a moment’s thought.</p>';
  }
  /* A compact preview for The Hub: the soonest group, one line each. */
  function headsUpPreview() {
    var gs = soonGroups();
    if (!gs.length) return '<section class="panel hu-preview"><div class="panel-head"><h2>Heads up</h2><a class="link" href="#/headsup">Open</a></div><p class="all-clear-line">' + icon('check', 'tiny') + 'All clear for the next 7 days</p></section>';
    return '<section class="panel hu-preview"><div class="panel-head"><h2>Heads up</h2><a class="link" href="#/headsup">See all</a></div><p class="meta hu-count">' + esc(soonWords('in the next 7 days')) + '</p><ul class="list">' +
      gs.slice(0, 3).map(function (g) {
        var f = g.flags[0];
        return '<li class="row"><a class="row-main" href="#/headsup">' + flagTag(g.sev) + '<span class="row-title">' + esc(g.title || f.title) + '</span>' +
          '<span class="meta">' + esc(fmt(g.first, { weekday: 'short', day: 'numeric', month: 'short' })) + ' · ' + esc(untilLabel(g.first)) + (g.flags.length > 1 ? ' · ' + plural(g.flags.length, 'item', 'items') : '') + '</span></a></li>';
      }).join('') + '</ul></section>';
  }

  /* ------------------------------------------------------------------ The Hub: now and next */
  function nowNext() {
    var t = today(), m = nowMins(), evs = shown().filter(function (e) { return occursOn(e, t) && e.time && e.date === t && !isBlock(e); }).sort(byTimeOfDay);
    var cur = evs.filter(function (e) { return mins(e.time) <= m && window_(e)[1] > m; })[0];
    var next = evs.filter(function (e) { return mins(e.time) > m; })[0];
    var due = S.tasks.filter(function (x) { return !x.done && x.due && x.due <= t; });
    var top = soonGroups()[0];
    function line(label, main, sub, attrs) {
      return '<' + (attrs ? 'button type="button" ' + attrs : 'div') + ' class="nn-row"><span class="nn-label">' + label + '</span><span class="nn-main">' + main + '</span>' + (sub ? '<span class="nn-sub">' + sub + '</span>' : '') + '</' + (attrs ? 'button' : 'div') + '>';
    }
    var inMin = next ? mins(next.time) - m : 0;
    return '<section class="nownext" aria-label="Now and next">' +
      line('Now', cur ? catDot(catOf(cur)) + esc(cur.title) : 'Free', cur ? 'until ' + hhmm(window_(cur)[1]) : '', cur ? 'data-action="open-plan" data-id="' + esc(cur.id) + '"' : '') +
      line('Next', next ? catDot(catOf(next)) + esc(next.title) : 'Nothing else today', next ? esc(next.time) + ' · ' + (inMin < 60 ? 'in ' + inMin + ' min' : 'in ' + Math.round(inMin / 60) + ' h') : '', next ? 'data-action="open-plan" data-id="' + esc(next.id) + '"' : '') +
      (due.length ? line('To do', plural(due.length, 'to-do due', 'to-dos due'), due.some(function (x) { return x.due < t; }) ? '<span class="late">Overdue</span>' : 'today', 'data-action="go" data-to="thoughts"') : '') +
      line('Heads up', top ? flagTag(top.sev) + esc(top.title || top.flags[0].title) : icon('check', 'tiny') + 'All clear this week', top ? esc(untilLabel(top.first)) : '', 'data-action="go" data-to="headsup"') +
    '</section>';
  }
  function quickAdd() {
    return '<form class="quick" data-form="quick-task" autocomplete="off"><label class="visually-hidden" for="qt">Add a to-do for today</label>' +
      '<input id="qt" name="title" placeholder="Add a to-do for today" required>' +
      '<button class="key signal" type="submit" aria-label="Add to-do">' + icon('plus') + '</button></form>';
  }

  /* ------------------------------------------------------------------ Thoughts: to-dos and notes */
  function noteOrder(a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated > a.updated ? 1 : b.updated < a.updated ? -1 : 0); }
  function notePreview(n) { return n.body.replace(/\s+/g, ' ').trim().slice(0, 120); }
  function noteLine(n) {
    return '<li class="row note-line"><a class="row-main" href="#/thoughts/' + n.id + '"><span class="row-title">' + (n.pinned ? icon('pin', 'tiny') : '') + esc(n.title || 'Untitled') + '</span>' +
      '<span class="meta">' + esc(relDate(n.updated.slice(0, 10))) + (notePreview(n) ? ' · ' + esc(notePreview(n)) : '') + '</span></a></li>';
  }
  function thoughtResults(openId) {
    var q = state.query.toLowerCase(), hit = function (s) { return !q || s.toLowerCase().indexOf(q) > -1; };
    var open = S.tasks.filter(function (x) { return !x.done && hit(x.title + ' ' + (x.list || '')); }).sort(sortTasks);
    var done = S.tasks.filter(function (x) { return x.done && hit(x.title); });
    var notes = S.notes.filter(function (n) { return hit(n.title + ' ' + n.body); }).sort(noteOrder);
    var html = '<h2 class="band">To do <span>' + open.length + '</span></h2>' +
      (open.length ? '<ul class="list todo">' + open.map(taskRow).join('') + '</ul>' : empty(q ? 'No to-dos match.' : 'Nothing to do. Add one above.')) +
      (done.length ? '<details class="done-list"' + (state.showDone ? ' open' : '') + '><summary data-action="toggle-done">Done · ' + done.length + '</summary><ul class="list">' + done.map(taskRow).join('') + '</ul>' +
        '<button class="link" type="button" data-action="clear-done">Clear done to-dos</button></details>' : '') +
      '<h2 class="band">Notes <span>' + notes.length + '</span></h2>';
    if (!notes.length) return html + empty(q ? 'No notes match “' + esc(state.query) + '”.' : 'No notes yet. Tap New note to write one.');
    return html + '<ul class="list note-index">' + notes.map(function (n) {
      return '<li><a class="note-item' + (n.id === openId ? ' is-open' : '') + '" href="#/thoughts/' + n.id + '"' + (n.id === openId ? ' aria-current="true"' : '') + ' data-note="' + n.id + '">' +
        '<span class="note-top"><b data-note-title>' + (n.pinned ? icon('pin', 'tiny') : '') + esc(n.title || 'Untitled') + '</b><time>' + esc(relDate(n.updated.slice(0, 10))) + '</time></span>' +
        '<span class="note-prev" data-note-prev>' + esc(notePreview(n)) + '</span></a></li>';
    }).join('') + '</ul>';
  }
  function noteEditor(n) {
    return '<div class="editor">' +
      '<div class="editor-bar"><a class="key ghost sm back-btn" href="#/thoughts" aria-label="All thoughts">' + icon('back') + '</a>' +
        '<span class="saved" id="saved">Saved</span>' +
        '<button class="pill-btn" type="button" data-action="pin-note" data-id="' + n.id + '" aria-pressed="' + !!n.pinned + '">' + icon('pin', 'tiny') + (n.pinned ? 'Pinned' : 'Pin') + '</button>' +
        '<button class="del" type="button" data-action="delete-note" data-id="' + n.id + '" aria-label="Delete note">' + icon('trash') + '</button></div>' +
      '<label class="visually-hidden" for="nt">Title</label><input id="nt" class="note-title" placeholder="Title" value="' + esc(n.title) + '" data-input="note-title" data-id="' + n.id + '"' + (n.title ? '' : ' data-autofocus') + '>' +
      '<label class="visually-hidden" for="nb">Note</label><textarea id="nb" placeholder="Write anything…" data-input="note-body" data-id="' + n.id + '">' + esc(n.body) + '</textarea></div>';
  }
  function thoughtsView(arg) {
    var open = arg ? byId(S.notes, arg) : null;
    var lists = Array.from(new Set(S.tasks.map(function (x) { return x.list; }).filter(Boolean))).sort();
    var openCount = S.tasks.filter(function (x) { return !x.done; }).length;
    return '<div class="notes' + (arg ? ' has-open' : '') + '">' +
      '<div class="notes-list">' + head('Thoughts', plural(openCount, 'to-do', 'to-dos') + ' · ' + plural(S.notes.length, 'note', 'notes'),
          '<button class="key signal" type="button" data-action="new-note" aria-label="New note">' + icon('notes') + '</button>') +
        '<form class="compose" data-form="task" autocomplete="off">' +
          '<div class="quick"><label class="visually-hidden" for="tt">New to-do</label><input id="tt" name="title" required placeholder="Add a to-do">' +
            '<button class="key signal" type="submit" aria-label="Add to-do">' + icon('plus') + '</button></div>' +
          '<details class="more"><summary>Due date and list</summary><div class="form">' +
            '<label class="field"><span>Due</span><input type="date" name="due"></label>' +
            '<label class="field"><span>List</span><input name="list" list="lists" placeholder="e.g. Home"><datalist id="lists">' + lists.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label>' +
          '</div></details></form>' +
        '<label class="visually-hidden" for="nq">Search thoughts</label><input id="nq" class="search" type="search" placeholder="Search to-dos and notes" value="' + esc(state.query) + '" data-input="note-search" autocomplete="off">' +
        '<div id="note-results">' + thoughtResults(open && open.id) + '</div></div>' +
      '<div class="notes-editor">' + (open ? noteEditor(open) : '<div class="editor-empty"><p>' + (arg ? 'That note no longer exists.' : 'Pick a note, or start a new one.') + '</p></div>') + '</div></div>';
  }

  /* ------------------------------------------------------------------ Views */
  var VIEWS = {
    hub: function () {
      var t = today(), due = S.tasks.filter(function (x) { return !x.done && x.due && x.due <= t; }).length, n = soonCount();
      var sub = [plural(due, 'to-do due', 'to-dos due'), soonWords('in the next 7 days')].join(' · ');
      var notes = S.notes.slice().sort(noteOrder).slice(0, 3);
      return head(esc(fmt(t, { weekday: 'long', day: 'numeric', month: 'long' })), esc(sub)) + nowNext() + quickAdd() +
        '<div class="split">' +
          '<section class="panel" aria-label="Agenda">' + dial() + '<div id="agenda">' + agendaList(state.selDay, true) + '</div></section>' +
          '<div class="stack">' + headsUpPreview() +
            '<section class="panel"><div class="panel-head"><h2>Thoughts</h2><a class="link" href="#/thoughts">All</a></div>' +
              (notes.length ? '<ul class="list">' + notes.map(noteLine).join('') + '</ul>' : empty('No notes yet.')) + '</section>' +
          '</div></div>';
    },
    calendar: function () { return calendarView(); },
    thoughts: function (arg) { return thoughtsView(arg); },
    headsup: function () { return headsUpView(); },
    settings: function () {
      var counts = [plural(S.tasks.length, 'to-do', 'to-dos'), plural(S.events.length, 'plan', 'plans'), plural(S.notes.length, 'note', 'notes')].join(', ');
      var tp = themePref();
      return head('Settings') +
        '<section class="panel"><h2 id="h-look">Appearance</h2><div class="segmented inline" role="group" aria-labelledby="h-look">' +
          [['light', 'Light'], ['dark', 'Dark'], ['system', 'Match device']].map(function (o) {
            return '<button type="button" data-action="set-theme" data-t="' + o[0] + '" aria-pressed="' + (tp === o[0]) + '">' + o[1] + '</button>';
          }).join('') + '</div></section>' +
        '<section class="panel"><h2>Linked apps</h2><p>Activities from the family’s other apps on this phone appear in your calendar and are checked for clashes. They’re read live and never copied; change them in their own app.</p>' + linkStatus() + '</section>' +
        '<section class="panel"><h2>Add from a file</h2><p>Add an Outlook calendar file (.ics), or to-dos, plans and notes from a Life Organizer file, without replacing what’s already here. Loading a new Outlook file updates your work calendar.</p>' +
          '<div class="actions"><label class="btn ghost file-btn" data-action="picking">Choose a file<input type="file" class="file-in" data-input="merge" tabindex="-1"></label></div>' +
          '<form class="link-form" data-form="ics-url" autocomplete="off"><label class="field"><span>Or your Outlook calendar link</span>' +
            '<input name="url" type="url" inputmode="url" placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" value="' + esc(LINKS.icsUrl || '') + '"></label>' +
            '<button class="btn" type="submit">Update from link</button></form>' +
          '<p class="import-status" id="import-status" role="status">' + (LINKS.lastImport ? esc(LINKS.lastImport.msg) + ' <span>' + esc(relDate(iso(new Date(LINKS.lastImport.at)))) + ' at ' + esc(new Date(LINKS.lastImport.at).toTimeString().slice(0, 5)) + '</span>' : '') + '</p></section>' +
        '<section class="panel"><h2>Your data</h2><p>Everything is stored on this device only: ' + esc(counts) + '. Back up regularly, and use a backup to copy your data to another phone or computer.</p>' +
          '<div class="actions"><button class="btn" type="button" data-action="backup">Back up to a file</button>' +
          '<label class="btn ghost">Restore from a file<input type="file" accept="application/json,.json" data-input="restore" hidden></label></div></section>' +
        '<section class="panel"><h2>Install</h2><p><b>Android:</b> open the browser menu and choose <i>Install app</i> or <i>Add to Home screen</i>. <b>iPhone or iPad:</b> in Safari, Share → Add to Home Screen.</p></section>' +
        '<section class="panel"><h2>Start over</h2><p>Erase everything on this device. This can’t be undone, so back up first.</p><button class="btn danger" type="button" data-action="erase">Erase all data</button></section>' +
        '<p class="version">Version ' + APP_VERSION + ' · <button class="link" type="button" data-action="reload-app">Reload app</button></p>';
    }
  };

  /* ------------------------------------------------------------------ Sheet: view or edit one plan or to-do */
  function sheet() { return document.getElementById('sheet'); }
  function sheetOpen() { var s = sheet(); return !!(s && s.open); }
  function openSheet(html) {
    var s = sheet(); s.innerHTML = '<div class="sheet-body">' + html + '</div>';
    if (s.showModal) s.showModal(); else s.setAttribute('open', '');
    var f = s.querySelector('[data-autofocus]'); if (f && window.matchMedia('(pointer: fine)').matches) f.focus();
  }
  function closeSheet() { var s = sheet(); if (s.close) s.close(); else s.removeAttribute('open'); }
  function field(label, name, type, value, extra) {
    return '<label class="field' + (extra && extra.wide ? ' wide' : '') + '"><span>' + label + '</span><input name="' + name + '" type="' + type + '" value="' + esc(value || '') + '"' + (extra && extra.attrs ? ' ' + extra.attrs : '') + '></label>';
  }
  function catPicker(e) {
    var cur = catOf(e), same = allEvents().filter(function (x) { return titleKey(x.title) === titleKey(e.title); }).length;
    return '<div class="cat-pick"><span class="field-label">Who’s it for?</span><div class="segmented inline" role="group" aria-label="Who’s it for?">' +
      cats().map(function (c) { return '<button type="button" class="cat-' + c.id + '" data-action="set-cat" data-id="' + esc(e.id) + '" data-c="' + c.id + '" aria-pressed="' + (cur === c.id) + '">' + catDot(c.id) + esc(c.label) + '</button>'; }).join('') + '</div>' +
      (same > 1 ? '<label class="all-same"><input type="checkbox" id="cat-all" checked> All ' + same + ' plans called “' + esc(e.title) + '”</label>' : '') + '</div>';
  }
  function planSheet(e, dayForNew) {
    var isNew = !e; e = e || { title: '', date: dayForNew || state.selDay, time: '', endTime: '', place: '' };
    return '<form data-form="save-plan" data-id="' + esc(e.id || '') + '" autocomplete="off"><h2 id="sheet-title">' + (isNew ? 'New plan' : 'Edit plan') + '</h2><div class="form">' +
      field('What', 'title', 'text', e.title, { wide: true, attrs: 'required data-autofocus' }) +
      field('Date', 'date', 'date', e.date, { attrs: 'required' }) + field('Until', 'end', 'date', e.end || '') +
      field('Starts', 'time', 'time', e.time) + field('Ends', 'endTime', 'time', e.endTime) +
      field('Where', 'place', 'text', e.place, { wide: true }) + '</div>' + (isNew ? '' : catPicker(e)) +
      '<div class="sheet-actions"><button class="btn" type="submit">' + (isNew ? 'Add plan' : 'Save') + '</button>' +
      (isNew ? '' : '<button class="btn ghost danger-text" type="button" data-action="delete-plan" data-id="' + esc(e.id) + '">Delete</button>') +
      '<button class="link" type="button" data-action="close-sheet">Cancel</button></div></form>';
  }
  function readOnlySheet(e) {
    var src = e.feed === 'outlook' ? 'From your Outlook calendar. Change it in Outlook, then add the new calendar file.' :
      e.src === 'xp' ? 'From Douglas’s planner. Change it in the XP app.' : e.src === 'health' ? 'From ' + dorotheaName() + '’s Health app. Change it there.' : '';
    var fl = flags().filter(function (f) { return f.ids.indexOf(e.id) > -1; });
    return '<h2 id="sheet-title">' + catDot(catOf(e)) + esc(e.title) + '</h2>' +
      '<p class="sheet-when">' + esc(fmt(e.date, { weekday: 'long', day: 'numeric', month: 'long' })) + (lastDay(e) !== e.date ? ' – ' + esc(fmt(lastDay(e), { weekday: 'short', day: 'numeric', month: 'short' })) : '') + ' · ' + esc(times(e)) + '</p>' +
      (e.place ? '<p>' + esc(e.place) + '</p>' : '') +
      '<p class="meta">' + (e.tag && e.tag !== 'Work' ? esc(e.tag) + ' · ' : '') + (e.who && e.who !== catLabel(catOf(e)) && e.who !== 'Family' ? 'Planner says: ' + esc(e.who) : '') + '</p>' + catPicker(e) +
      (fl.length ? '<ul class="list sheet-flags">' + fl.map(function (f) { return '<li class="row">' + flagTag(f.sev) + '<span class="row-title">' + esc(f.title) + '</span></li>'; }).join('') + '</ul>' +
        '<a class="btn ghost" href="#/headsup" data-action="close-sheet">Decide in Heads up</a>' : '') +
      '<p class="hint">' + esc(src) + '</p><div class="sheet-actions"><button class="btn" type="button" data-action="close-sheet">Close</button></div>';
  }
  function taskSheet(t) {
    var lists = Array.from(new Set(S.tasks.map(function (x) { return x.list; }).filter(Boolean))).sort();
    return '<form data-form="save-task" data-id="' + esc(t.id) + '" autocomplete="off"><h2 id="sheet-title">Edit to-do</h2><div class="form">' +
      field('To-do', 'title', 'text', t.title, { wide: true, attrs: 'required data-autofocus' }) + field('Due', 'due', 'date', t.due) +
      field('List', 'list', 'text', t.list, { attrs: 'list="sheet-lists"' }) + '<datalist id="sheet-lists">' + lists.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist>' +
      '<label class="field"><span>Priority</span><select name="priority">' + [[2, 'Normal'], [1, 'High'], [3, 'Low']].map(function (p) { return '<option value="' + p[0] + '"' + ((t.priority || 2) === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="sheet-actions"><button class="btn" type="submit">Save</button><button class="btn ghost danger-text" type="button" data-action="delete-task" data-id="' + esc(t.id) + '">Delete</button>' +
      '<button class="link" type="button" data-action="close-sheet">Cancel</button></div></form>';
  }
  function findEvent(id) { return allEvents().filter(function (e) { return e.id === id; })[0]; }

  /* ------------------------------------------------------------------ Undo: any change made through change() can be taken back */
  var undoSnap = null;
  function change(msg, fn) {
    undoSnap = JSON.stringify(S); fn(); save(); render(); toast(msg, true);
  }

  /* ------------------------------------------------------------------ Events */
  document.addEventListener('submit', function (ev) {
    var form = ev.target, kind = form.getAttribute('data-form');
    if (!kind) return;
    ev.preventDefault();
    if (kind === 'ics-url') { fetchICS(form.elements.url.value); return; }
    var f = Object.fromEntries(new FormData(form));
    var title = (f.title || '').trim();
    if (!title) { toast('Type something first'); return; }
    if (kind === 'quick-task') { S.tasks.push({ id: uid(), title: title, due: today(), priority: 2, done: false, created: today() }); save(); render(); toast('Added to today'); return; }
    if (kind === 'task') { S.tasks.push({ id: uid(), title: title, due: f.due || '', priority: 2, list: (f.list || '').trim(), done: false, created: today() }); save(); render(); toast('Added'); return; }
    if (kind === 'save-task') {
      var t = byId(S.tasks, form.getAttribute('data-id')); if (!t) return;
      t.title = title; t.due = f.due || ''; t.list = (f.list || '').trim(); t.priority = +f.priority || 2;
      closeSheet(); save(); render(); toast('Saved'); return;
    }
    if (kind === 'save-plan') {
      var id = form.getAttribute('data-id'), e = id ? byId(S.events, id) : null, isNew = !e;
      if (isNew) { e = { id: uid() }; S.events.push(e); }
      e.title = title; e.date = f.date; e.place = (f.place || '').trim(); e.time = f.time || '';
      if (f.end && f.end > f.date) e.end = f.end; else delete e.end;
      if (f.time && f.endTime && f.endTime > f.time) e.endTime = f.endTime; else delete e.endTime;
      selectDay(f.date); closeSheet(); save(); render(); toast(isNew ? 'Plan added' : 'Saved'); return;
    }
  });

  /* Select a day, moving the week so the day is on the dial. */
  function selectDay(d) { state.selDay = d; state.weekStart = monday(d); }

  document.addEventListener('click', function (ev) {
    var dlg = sheet();
    if (dlg && ev.target === dlg) { closeSheet(); return; }   // tap outside the sheet
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), id = b.getAttribute('data-id'), k = b.getAttribute('data-k');
    switch (a) {
      case 'toggle-task': var t = byId(S.tasks, id); if (!t) return; t.done = !t.done; t.doneAt = t.done ? today() : null; break;
      case 'edit-task': var et = byId(S.tasks, id); if (et) openSheet(taskSheet(et)); return;
      case 'delete-task': closeSheet(); change('To-do deleted', function () { remove(S.tasks, id); }); return;
      case 'clear-done': change('Done to-dos cleared', function () { S.tasks = S.tasks.filter(function (x) { return !x.done; }); }); return;
      case 'toggle-done': ev.preventDefault(); state.showDone = !state.showDone; render(); return;
      case 'toggle-later': ev.preventDefault(); state.showLater = !state.showLater; render(); return;
      case 'decide-all':
        var va = b.getAttribute('data-v');
        change('Sorted all: ' + va, function () { k.split('\n').forEach(function (x) { S.ack[x] = { v: va, at: today() }; }); }); return;
      case 'toggle-sorted': ev.preventDefault(); state.showSorted = !state.showSorted; render(); return;
      case 'open-plan':
        var e = findEvent(id); if (!e) return;
        openSheet(e.src || e.feed ? readOnlySheet(e) : planSheet(e)); return;
      case 'new-plan': openSheet(planSheet(null, b.getAttribute('data-d') || state.selDay)); return;
      case 'delete-plan': closeSheet(); change('Plan deleted', function () { remove(S.events, id); }); return;
      case 'close-sheet': closeSheet(); flushRefresh(); return;
      case 'open-work': state.openWork[b.getAttribute('data-d')] = true; render(); return;
      case 'close-work': delete state.openWork[b.getAttribute('data-d')]; render(); return;
      case 'pick-day': pickDay(b); return;
      case 'lane-day': selectDay(b.getAttribute('data-d')); state.calMode = 'month'; state.calMonth = state.selDay.slice(0, 7); render(); return;
      case 'week':
        var n = +b.getAttribute('data-n');
        state.weekStart = n ? addDays(state.weekStart, n) : monday(today());
        state.selDay = weekDays().indexOf(today()) > -1 ? today() : state.weekStart;
        render(); return;
      case 'open-sorter': openSheet(sorterSheet()); return;
      case 'sort-cat':
        S.cats.byTitle[b.getAttribute('data-t')] = b.getAttribute('data-c'); save(); linkedCache = null; flagCache = null;
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        var gm = b.closest('.sort-row').querySelector('i'); if (gm) gm.parentNode.innerHTML = gm.parentNode.innerHTML.replace(' · <i>guessed</i>', '');
        refreshWaiting = true; return;
      case 'set-cat':
        var se = findEvent(id), all = document.getElementById('cat-all'), cv = b.getAttribute('data-c');
        if (!se) return;
        if (all && all.checked) { S.cats.byTitle[titleKey(se.title)] = cv; delete S.cats.byId[se.id]; } else S.cats.byId[se.id] = cv;
        save(); flagCache = null;
        b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        refreshWaiting = true; toast('Now under ' + catLabel(cv)); return;
      case 'cal-mode': state.calMode = b.getAttribute('data-m'); render(); return;
      case 'cal-day': state.selDay = b.getAttribute('data-d'); render();
        var ag = document.getElementById('agenda'); if (ag && window.matchMedia('(max-width: 599px)').matches) ag.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      case 'cal-month':
        var cm = +b.getAttribute('data-n');
        state.calMonth = cm ? monthAdd(calMonthStart().slice(0, 7), cm) : today().slice(0, 7);
        render(); return;
      case 'more-days': state.agendaDays += 14; render(); return;
      case 'go': location.hash = '#/' + b.getAttribute('data-to'); return;
      case 'decide':
        var v = b.getAttribute('data-v');
        change('Sorted: ' + v, function () { S.ack[k] = { v: v, at: today() }; }); return;
      case 'always':
        change('Won’t flag ' + (k.indexOf('\n') > -1 ? 'these' : 'this') + ' again', function () { k.split('\n').forEach(function (p) { S.ack[p] = { v: 'Always fine', at: today() }; }); }); return;
      case 'unack': change('Back in Heads up', function () { delete S.ack[k]; }); return;
      case 'undo':
        if (!undoSnap) return;
        S = normalise(JSON.parse(undoSnap)); undoSnap = null; save(); render(); toast('Undone'); return;
      case 'new-note':
        ev.preventDefault();
        var note = { id: uid(), title: '', body: '', updated: new Date().toISOString(), pinned: false };
        S.notes.push(note); save(); location.hash = '#/thoughts/' + note.id; return;
      case 'pin-note': var pn = byId(S.notes, id); if (pn) pn.pinned = !pn.pinned; break;
      case 'delete-note':
        undoSnap = JSON.stringify(S); remove(S.notes, id); save(); location.hash = '#/thoughts'; toast('Note deleted', true); return;
      case 'toggle-theme': setTheme(isDark() ? 'light' : 'dark'); if (route().name === 'settings') render(); return;
      case 'set-theme': setTheme(b.getAttribute('data-t')); render(); return;
      case 'picking':
        pickingSince = Date.now();
        try { sessionStorage.setItem('lo:picking', String(Date.now())); } catch (e2) { /* ignore */ }
        var st = document.getElementById('import-status'); if (st) { st.textContent = 'Opening file picker…'; st.classList.remove('bad'); }
        return;
      case 'reload-app':
        b.textContent = 'Reloading…';
        Promise.all(['./', 'index.html', 'app.js?v=' + APP_VERSION, 'styles.css'].map(function (u) { return fetch(u, { cache: 'reload' }).catch(function () {}); }))
          .then(function () { location.reload(); });
        return;
      case 'toggle-cat':
        var cid = b.getAttribute('data-c');
        if (LINKS.hideCat[cid]) delete LINKS.hideCat[cid]; else LINKS.hideCat[cid] = true;
        saveLinks(); render(); return;
      case 'fetch-planner': b.disabled = true; b.textContent = 'Checking…'; fetchPlanner(false); return;
      case 'backup': backup(); return;
      case 'erase': if (!confirm('Erase all your to-dos, plans and notes on this device?')) return; S = EMPTY(); toast('Everything erased'); break;
      default: return;
    }
    save(); render();
  });
  document.addEventListener('close', function (ev) { if (ev.target === sheet()) flushRefresh(); }, true);

  /* Picking a day moves the needle in place (so it glides) and swaps only the agenda. */
  function pickDay(b) {
    var d = b.getAttribute('data-d');
    state.selDay = d;
    var dialEl = b.closest('.dial');
    dialEl.style.setProperty('--sel', weekDays().indexOf(d));
    dialEl.querySelectorAll('.day').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    var tip = dialEl.querySelector('.tip'); if (tip) tip.textContent = tipText(d);
    var ag = document.getElementById('agenda');
    if (ag) { ag.innerHTML = agendaList(d, true); ag.style.animation = 'none'; void ag.offsetWidth; ag.style.animation = ''; }
  }

  var savedTimer;
  document.addEventListener('input', function (ev) {
    var el = ev.target, k = el.getAttribute('data-input');
    if (k === 'note-search') {
      state.query = el.value;
      document.getElementById('note-results').innerHTML = thoughtResults(route().arg);
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

  document.addEventListener('input', function (ev) {
    if (ev.target.getAttribute && ev.target.getAttribute('data-input') === 'merge') takeFile(ev.target);
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.getAttribute('data-input') === 'link-toggle') {
      var lk = ev.target.getAttribute('data-k');
      if (ev.target.checked) delete LINKS.off[lk]; else LINKS.off[lk] = true;
      saveLinks(); render(); toast(ev.target.checked ? 'Included' : 'Hidden from your plans'); return;
    }
    if (ev.target.getAttribute('data-input') === 'merge') { takeFile(ev.target); return; }
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

  /* Adding a file: shared by the file button (change and input events) and Update from link. */
  function flushRefresh() { if (refreshWaiting) { refreshWaiting = false; setTimeout(render, 0); } }
  function takeFile(input) {
    var f = input.files && input.files[0];
    pickingSince = 0;
    try { sessionStorage.removeItem('lo:picking'); } catch (e) { /* ignore */ }
    if (!f) { importStatus('No file came back from the picker. Try again, or use Update from link.', true); flushRefresh(); return; }
    if (input._last === f) return;   // change, input and the button's own listener can all fire
    input._last = f;
    importStatus('Reading ' + (f.name || 'file') + ' (' + Math.round(f.size / 1024) + ' KB)…');
    readFile(f).then(function (txt) { takeText(txt, f.name); })
      .catch(function (err) { importStatus('Couldn’t read that file' + (err && err.message ? ': ' + err.message : '') + '. Try downloading it again.', true); })
      .then(function () { setTimeout(function () { input.value = ''; input._last = null; }, 0); flushRefresh(); });
  }
  function takeText(txt, name) {
    return new Promise(function (done) { setTimeout(done, 30); }).then(function () {   // let “Reading…” paint first
      var msg;
      if (/^\uFEFF?\s*BEGIN:VCALENDAR/i.test(txt)) msg = importICS(txt);
      else {
        var d; try { d = JSON.parse(txt); } catch (e) { d = null; }
        if (!d || d.v !== 1) { importStatus('That isn’t a calendar (.ics) or Life Organizer file' + (name ? ' (' + name + ')' : '') + '.', true); return; }
        var n = merge(d); save();
        msg = n ? 'Added ' + plural(n, 'item', 'items') + '.' : 'Nothing new to add: everything in that file is already here.';
      }
      LINKS.lastImport = { at: new Date().toISOString(), msg: msg }; saveLinks();
      render(); toast(msg.split('.')[0]);
    });
  }
  function fetchICS(url) {
    url = url.trim().replace(/^webcal:/i, 'https:');
    if (!/^https:\/\/\S+$/i.test(url)) { importStatus('That doesn’t look like a calendar link. It should start with https:// and end in .ics', true); return; }
    LINKS.icsUrl = url; saveLinks();
    importStatus('Fetching your calendar…');
    fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Outlook answered ' + r.status + (r.status === 404 || r.status === 403 ? ': the link may not be published yet, or has been reset' : ''));
      return r.text();
    }).then(function (txt) { return takeText(txt, 'calendar link'); })
      .catch(function (err) {
        var blocked = err && /fetch|network|load failed/i.test(err.message || '');
        importStatus(blocked ? 'Outlook doesn’t let other websites fetch the calendar directly, so this route is blocked. Use Choose a file instead.' : 'Couldn’t fetch the calendar: ' + ((err && err.message) || 'unknown error') + '.', true);
      });
  }

  function readFile(f) {
    if (f.text) return f.text();
    return new Promise(function (ok, fail) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { fail(r.error); }; r.readAsText(f); });
  }
  function importStatus(msg, bad) {
    var el = document.getElementById('import-status');
    if (el) { el.textContent = msg; el.classList.toggle('bad', !!bad); }
    toast(msg.length > 60 ? msg.split('.')[0] : msg);
  }

  function backup() {
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'life-organizer-backup-' + today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Backup downloaded');
  }

  window.addEventListener('hashchange', function () { render(true); window.scrollTo(0, 0); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) { S = load(); refresh(); } if (e.key === THEME_KEY) applyTheme();
    if ([XP.shared, DH.data, DH.notes, XP.family].indexOf(e.key) > -1) refresh(); });
  window.addEventListener('focus', function () {   // pick up changes made in the other apps
    var ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.value) return;   // don't wipe a half-typed entry
    refresh();
  });
  if (familyCode() && navigator.onLine && (!LINKS.fetchedAt || Date.now() - Date.parse(LINKS.fetchedAt) > 3 * 36e5)) fetchPlanner(true);
  applyTheme();
  (function () {   // the app restarted while the file picker was open: the file never arrived
    var t = 0; try { t = +sessionStorage.getItem('lo:picking') || 0; sessionStorage.removeItem('lo:picking'); } catch (e) { /* ignore */ }
    if (t && Date.now() - t < 5 * 6e4) setTimeout(function () {
      if (route().name !== 'settings') location.hash = '#/settings';
      setTimeout(function () { importStatus('Life Organizer was restarted by your phone while the file picker was open, so the file didn’t arrive. Try Update from link, or close some apps and try again.', true); }, 50);
    }, 50);
  })();
  render();
})();
