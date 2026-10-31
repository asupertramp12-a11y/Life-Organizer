/* Life Organizer — app logic
   Plain JavaScript, no build step. Everything you enter is saved in this browser's localStorage
   on this device only. Use Settings → Back up / Restore to move data between devices.
   Sections: Today, Plans (dated events), Notes, Tasks, Habits, Settings. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ Storage */
  var KEY = 'lo:data:v1';
  var EMPTY = function () { return { v: 1, tasks: [], habits: [], events: [], notes: [] }; };

  function normalise(d) {
    var base = EMPTY();
    if (!d || typeof d !== 'object') return base;
    ['tasks', 'habits', 'events', 'notes'].forEach(function (k) { base[k] = Array.isArray(d[k]) ? d[k] : []; });
    base.habits.forEach(function (h) { if (!h.log || typeof h.log !== 'object') h.log = {}; });
    return base;
  }
  function load() {
    try { var raw = localStorage.getItem(KEY); return normalise(raw ? JSON.parse(raw) : null); }
    catch (e) { return EMPTY(); }
  }
  var S = load();
  function save() {
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

  var state = { taskFilter: 'open', noteQuery: '', selDay: today(), weekStart: today() };

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
    document.getElementById('tabbar').innerHTML = ROUTES.map(function (r) { return navLink(r, cur); }).join('');
  }
  function render(navigated) {
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
      '<div class="head-actions">' + (action || '') +
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
  function sortEvents(a, b) { var x = a.date + (a.time || ''), y = b.date + (b.time || ''); return x < y ? -1 : x > y ? 1 : 0; }
  function eventRow(e) {
    return '<li class="row plan"><span class="time">' + (e.time ? esc(e.time) : 'All day') + '</span>' +
      '<div class="row-body"><span class="row-title">' + esc(e.title) + '</span>' + (e.place ? '<span class="meta">' + esc(e.place) + '</span>' : '') + '</div>' +
      del('delete-event', e.id, 'plan: ' + e.title) + '</li>';
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
        (state.weekStart !== t ? '<button class="pill-btn" type="button" data-action="week" data-n="0">Today</button>' : '') +
        '<button class="key ghost sm" type="button" data-action="week" data-n="7" aria-label="Next 7 days">' + icon('right') + '</button></span></div>' +
      '<div class="scale" role="group" aria-label="Choose a day">' +
        days.map(function (d) {
          var n = S.events.filter(function (e) { return e.date === d; }).length;
          return '<button class="day' + (d === t ? ' is-today' : '') + '" type="button" data-action="pick-day" data-d="' + d + '" aria-pressed="' + (d === state.selDay) + '" aria-label="' + esc(fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })) + (n ? ', ' + plural(n, 'plan', 'plans') : '') + '">' +
            '<span class="dots">' + (n ? '<i></i>'.repeat(Math.min(n, 3)) : '') + '</span>' +
            '<span class="dname">' + esc(fmt(d, { weekday: 'short' })) + '</span><span class="dnum">' + parse(d).getDate() + '</span></button>';
        }).join('') +
        '<span class="needle" aria-hidden="true"></span>' +
      '</div></div>';
  }
  function agenda(day, plansOnly) {
    var t = today();
    var plans = S.events.filter(function (e) { return e.date === day; }).sort(sortEvents);
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

  /* ------------------------------------------------------------------ Views */
  var VIEWS = {
    today: function () {
      var t = today();
      var open = S.tasks.filter(function (x) { return !x.done && x.due && x.due <= t; }).length;
      var plansToday = S.events.filter(function (e) { return e.date === t; }).length;
      var habitsLeft = S.habits.filter(function (h) { return !h.log[t]; }).length;
      var sub = [plural(open, 'task due', 'tasks due'), plural(plansToday, 'plan', 'plans')]
        .concat(S.habits.length ? [plural(habitsLeft, 'habit', 'habits') + ' to go'] : []).join(' · ');
      var notes = S.notes.slice().sort(noteOrder).slice(0, 3);
      var undated = S.tasks.filter(function (x) { return !x.done && !x.due; }).sort(sortTasks).slice(0, 4);
      return head(esc(fmt(t, { weekday: 'long', day: 'numeric', month: 'long' })), esc(sub)) +
        quickAdd() +
        '<div class="split">' +
          '<section class="panel" aria-labelledby="h-agenda"><h2 id="h-agenda">Agenda</h2>' + dial() + '<div id="agenda">' + agenda(state.selDay) + '</div></section>' +
          '<div class="stack">' +
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
      var upcoming = S.events.filter(function (e) { return e.date >= t; }).sort(sortEvents);
      var past = S.events.filter(function (e) { return e.date < t; }).sort(sortEvents).reverse().slice(0, 8);
      var groups = [], cur = null;
      upcoming.forEach(function (e) { if (!cur || cur.date !== e.date) { cur = { date: e.date, items: [] }; groups.push(cur); } cur.items.push(e); });
      return head('Plans', 'Appointments, birthdays, trips: anything with a date.') +
        '<form class="compose" data-form="event" autocomplete="off">' +
          '<div class="quick"><label class="visually-hidden" for="pt">New plan</label>' +
            '<input id="pt" name="title" required placeholder="' + esc(planPrompt(state.selDay)) + '" data-autofocus>' +
            '<button class="key signal" type="submit" aria-label="Add plan">' + icon('plus') + '</button></div>' +
          '<details class="more"><summary>Date, time and place</summary><div class="form">' +
            '<label class="field"><span>Date</span><input type="date" name="date" required value="' + esc(state.selDay) + '"></label>' +
            '<label class="field"><span>Time</span><input type="time" name="time"></label>' +
            '<label class="field wide"><span>Where</span><input name="place" placeholder="Optional"></label>' +
          '</div></details></form>' +
        '<section class="panel" aria-labelledby="h-week"><h2 id="h-week">Week</h2>' + dial() + '<div id="agenda" data-plans-only>' + agenda(state.selDay, true) + '</div></section>' +
        '<section class="panel" aria-labelledby="h-up"><h2 id="h-up">Coming up</h2>' +
          (groups.length ? groups.map(function (g) {
            var rel = relDate(g.date), named = rel === 'Today' || rel === 'Tomorrow';
            return '<div class="date-group"><h3 class="date-label"><span class="big">' + parse(g.date).getDate() + '</span><span>' + esc(named ? rel : fmt(g.date, { weekday: 'long' })) + '<small>' + esc(fmt(g.date, { month: 'long', year: 'numeric' })) + '</small></span></h3>' +
              '<ul class="list">' + g.items.map(eventRow).join('') + '</ul></div>';
          }).join('') : empty('Nothing planned yet. Add your first plan above.')) + '</section>' +
        (past.length ? '<section class="panel quiet" aria-labelledby="h-past"><h2 id="h-past">Recent</h2><ul class="list">' + past.map(function (e) {
          return '<li class="row plan"><span class="time">' + esc(fmt(e.date, { day: 'numeric', month: 'short' })) + '</span><div class="row-body"><span class="row-title">' + esc(e.title) + '</span></div>' + del('delete-event', e.id, 'plan: ' + e.title) + '</li>';
        }).join('') + '</ul></section>' : '');
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
      return head('Settings') +
        '<section class="panel"><h2>Your data</h2><p>Everything is stored on this device only: ' + esc(counts) + '. Back up regularly, and use a backup to copy your data to another phone or computer.</p>' +
          '<div class="actions"><button class="btn" type="button" data-action="backup">Back up to a file</button>' +
          '<label class="btn ghost">Restore from a file<input type="file" accept="application/json,.json" data-input="restore" hidden></label></div></section>' +
        '<section class="panel"><h2>Install</h2><p><b>Android:</b> open the browser menu and choose <i>Install app</i> or <i>Add to Home screen</i>. <b>iPhone or iPad:</b> in Safari, Share → Add to Home Screen.</p></section>' +
        '<section class="panel"><h2>Start over</h2><p>Erase everything on this device. This can’t be undone, so back up first.</p><button class="btn danger" type="button" data-action="erase">Erase all data</button></section>';
    }
  };

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
    if (kind === 'event') { S.events.push({ id: uid(), title: title, date: f.date, time: f.time || '', place: (f.place || '').trim() }); selectDay(f.date); }
    save(); render(); toast('Added');
    var first = document.querySelector('[data-form="' + kind + '"] input');
    if (first && window.matchMedia('(pointer: fine)').matches) first.focus();
  });

  /* Select a day, moving the 7-day window so the day is on the dial. */
  function selectDay(d) {
    state.selDay = d;
    if (weekDays().indexOf(d) < 0) state.weekStart = (d >= today() && d <= addDays(today(), 6)) ? today() : d;
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
        state.weekStart = n ? addDays(state.weekStart, n) : today();
        state.selDay = n ? state.weekStart : today();
        render(); return;
      case 'new-note':
        ev.preventDefault();
        var note = { id: uid(), title: '', body: '', updated: new Date().toISOString(), pinned: false };
        S.notes.push(note); save(); location.hash = '#/notes/' + note.id; return;
      case 'pin-note': var pn = byId(S.notes, id); if (pn) pn.pinned = !pn.pinned; break;
      case 'delete-note':
        if (!confirm('Delete this note?')) return;
        remove(S.notes, id); save(); location.hash = '#/notes'; toast('Note deleted'); return;
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

  document.addEventListener('change', function (ev) {
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
  window.addEventListener('storage', function (e) { if (e.key === KEY) { S = load(); render(); } });
  render();
})();
