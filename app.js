/* Life Organizer — app logic
   Plain JavaScript, no build step. Everything you enter is saved in this browser's localStorage
   on this device only. Use Settings → Back up / Restore to move data between devices.
   Sections: Today, Tasks, Habits, Plans (dated events), Notes, Settings. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ Storage */
  var KEY = 'lo:data:v1';
  var EMPTY = function () { return { v: 1, tasks: [], habits: [], events: [], notes: [] }; };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var d = raw ? JSON.parse(raw) : null;
      return normalise(d);
    } catch (e) { return EMPTY(); }
  }
  function normalise(d) {
    var base = EMPTY();
    if (!d || typeof d !== 'object') return base;
    ['tasks', 'habits', 'events', 'notes'].forEach(function (k) {
      base[k] = Array.isArray(d[k]) ? d[k] : [];
    });
    return base;
  }
  var S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save — storage may be full'); }
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
  function today() { return iso(new Date()); }
  function addDays(isoStr, n) {
    var p = isoStr.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n); return iso(d);
  }
  function fmtDate(isoStr, opts) {
    if (!isoStr) return '';
    var p = isoStr.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var t = today();
    if (isoStr === t) return 'Today';
    if (isoStr === addDays(t, 1)) return 'Tomorrow';
    if (isoStr === addDays(t, -1)) return 'Yesterday';
    return d.toLocaleDateString('en-GB', opts || { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function remove(list, id) { var i = list.findIndex(function (x) { return x.id === id; }); if (i > -1) list.splice(i, 1); }
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  var PRIORITY = { 1: 'High', 2: 'Normal', 3: 'Low' };

  /* ------------------------------------------------------------------ Routing */
  var ROUTES = [
    { id: 'today', label: 'Today', icon: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' },
    { id: 'tasks', label: 'Tasks', icon: 'M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
    { id: 'habits', label: 'Habits', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { id: 'plans', label: 'Plans', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z' },
    { id: 'notes', label: 'Notes', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5' },
    { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h2M18 12h2M12 4v2M12 18v2' }
  ];
  function icon(path) { return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>'; }

  var state = { taskFilter: 'open', editingNote: null, noteQuery: '' };

  function route() {
    var h = (location.hash || '#/today').replace(/^#\//, '').split('/');
    return { name: ROUTES.some(function (r) { return r.id === h[0]; }) ? h[0] : 'today', arg: h[1] };
  }

  function renderNav() {
    var cur = route().name;
    var html = ROUTES.map(function (r) {
      return '<a href="#/' + r.id + '"' + (r.id === cur ? ' aria-current="page"' : '') + '>' + icon(r.icon) + '<span>' + r.label + '</span></a>';
    }).join('');
    document.getElementById('nav').innerHTML = html;
    document.getElementById('tabbar').innerHTML = html;
  }

  function render(navigated) {
    renderNav();
    var r = route();
    var main = document.getElementById('main');
    main.innerHTML = VIEWS[r.name](r.arg);
    // Only move focus to a field when arriving on a page, so ticking items doesn't pop the keyboard.
    var auto = navigated && main.querySelector('[data-autofocus]');
    if (auto && window.matchMedia('(pointer: fine)').matches) auto.focus();
    else if (navigated) main.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ Shared pieces */
  function taskRow(t) {
    var overdue = !t.done && t.due && t.due < today();
    return '<li class="row' + (t.done ? ' done' : '') + '">' +
      '<button class="check" data-action="toggle-task" data-id="' + t.id + '" aria-pressed="' + !!t.done + '" aria-label="' + (t.done ? 'Mark not done: ' : 'Mark done: ') + esc(t.title) + '"></button>' +
      '<div class="row-body"><span class="row-title">' + esc(t.title) + '</span>' +
      '<span class="meta">' +
        (t.due ? '<span class="chip' + (overdue ? ' warn' : '') + '">' + (overdue ? 'Overdue · ' : '') + esc(fmtDate(t.due)) + '</span>' : '') +
        (t.priority === 1 ? '<span class="chip hot">High</span>' : '') +
        (t.list ? '<span class="chip soft">' + esc(t.list) + '</span>' : '') +
      '</span></div>' +
      '<button class="icon-btn" data-action="delete-task" data-id="' + t.id + '" aria-label="Delete task: ' + esc(t.title) + '">×</button></li>';
  }
  function sortTasks(a, b) {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    var ad = a.due || '9999', bd = b.due || '9999';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.priority || 2) - (b.priority || 2);
  }
  function habitStreak(h) {
    var n = 0, d = today();
    if (!h.log[d]) d = addDays(d, -1);
    while (h.log[d]) { n++; d = addDays(d, -1); }
    return n;
  }
  function eventRow(e) {
    return '<li class="row"><div class="when"><b>' + esc(fmtDate(e.date)) + '</b>' + (e.time ? '<span>' + esc(e.time) + '</span>' : '') + '</div>' +
      '<div class="row-body"><span class="row-title">' + esc(e.title) + '</span>' +
      (e.place ? '<span class="meta">' + esc(e.place) + '</span>' : '') + '</div>' +
      '<button class="icon-btn" data-action="delete-event" data-id="' + e.id + '" aria-label="Delete plan: ' + esc(e.title) + '">×</button></li>';
  }
  function sortEvents(a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1; }
  function empty(msg) { return '<p class="empty">' + msg + '</p>'; }

  /* ------------------------------------------------------------------ Views */
  var VIEWS = {
    today: function () {
      var t = today();
      var due = S.tasks.filter(function (x) { return (!x.done && x.due && x.due <= t) || (x.done && x.doneAt === t); }).sort(sortTasks);
      var toDo = due.filter(function (x) { return !x.done; }).length;
      var doneToday = S.tasks.filter(function (x) { return x.done && x.doneAt === t; }).length;
      var plans = S.events.filter(function (e) { return e.date >= t && e.date <= addDays(t, 6); }).sort(sortEvents);
      var habitsLeft = S.habits.filter(function (h) { return !h.log[t]; }).length;
      var hour = new Date().getHours();
      var hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
      return '<header class="page-head"><p class="eyebrow">' + esc(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })) + '</p><h1>' + hello + '</h1></header>' +
        '<form class="quick" data-form="quick-task"><label class="visually-hidden" for="qt">Add a task for today</label>' +
        '<input id="qt" name="title" placeholder="Add something to do today…" autocomplete="off" required><button class="btn">Add</button></form>' +
        '<div class="stats">' +
          '<div class="stat"><b>' + toDo + '</b><span>to do today</span></div>' +
          '<div class="stat"><b>' + doneToday + '</b><span>done today</span></div>' +
          '<div class="stat"><b>' + habitsLeft + '</b><span>habits left</span></div>' +
        '</div>' +
        '<section class="card"><h2>Due today</h2>' + (due.length ? '<ul class="list">' + due.map(taskRow).join('') + '</ul>' : empty('Nothing due. Add a task above or plan ahead in <a href="#/tasks">Tasks</a>.')) + '</section>' +
        '<section class="card"><h2>Habits</h2>' + (S.habits.length ? habitGrid(1) : empty('No habits yet. <a href="#/habits">Start one</a>.')) + '</section>' +
        '<section class="card"><h2>Next 7 days</h2>' + (plans.length ? '<ul class="list">' + plans.map(eventRow).join('') + '</ul>' : empty('No plans this week. <a href="#/plans">Add one</a>.')) + '</section>';
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
      return '<header class="page-head"><h1>Tasks</h1></header>' +
        '<form class="card form" data-form="task">' +
          '<label class="field wide"><span>Task</span><input name="title" required autocomplete="off" placeholder="What needs doing?" data-autofocus></label>' +
          '<label class="field"><span>Due</span><input type="date" name="due"></label>' +
          '<label class="field"><span>Priority</span><select name="priority"><option value="2">Normal</option><option value="1">High</option><option value="3">Low</option></select></label>' +
          '<label class="field"><span>List</span><input name="list" list="lists" placeholder="e.g. Home, Work"><datalist id="lists">' + lists.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label>' +
          '<button class="btn">Add task</button></form>' +
        '<div class="filters" role="group" aria-label="Filter tasks">' + filters.map(function (p) {
          return '<button class="pill" data-action="filter" data-f="' + esc(p[0]) + '" aria-pressed="' + (f === p[0]) + '">' + esc(p[1]) + '</button>';
        }).join('') + '</div>' +
        '<section class="card">' + (shown.length ? '<ul class="list">' + shown.map(taskRow).join('') + '</ul>' : empty('No tasks here.')) +
        (f === 'done' && shown.length ? '<button class="linkish" data-action="clear-done">Clear completed tasks</button>' : '') + '</section>';
    },

    habits: function () {
      return '<header class="page-head"><h1>Habits</h1><p class="lede">Tick off each day. Streaks count consecutive days.</p></header>' +
        '<form class="quick" data-form="habit"><label class="visually-hidden" for="hn">New habit</label>' +
        '<input id="hn" name="name" placeholder="New habit, e.g. Walk 20 minutes" required autocomplete="off"><button class="btn">Add</button></form>' +
        '<section class="card">' + (S.habits.length ? habitGrid(7, true) : empty('Add a habit you want to build.')) + '</section>';
    },

    plans: function () {
      var t = today();
      var upcoming = S.events.filter(function (e) { return e.date >= t; }).sort(sortEvents);
      var past = S.events.filter(function (e) { return e.date < t; }).sort(sortEvents).reverse().slice(0, 10);
      return '<header class="page-head"><h1>Plans</h1><p class="lede">Appointments, birthdays, trips — anything with a date.</p></header>' +
        '<form class="card form" data-form="event">' +
          '<label class="field wide"><span>What</span><input name="title" required autocomplete="off" data-autofocus></label>' +
          '<label class="field"><span>Date</span><input type="date" name="date" required value="' + t + '"></label>' +
          '<label class="field"><span>Time</span><input type="time" name="time"></label>' +
          '<label class="field"><span>Where</span><input name="place" autocomplete="off"></label>' +
          '<button class="btn">Add plan</button></form>' +
        '<section class="card"><h2>Coming up</h2>' + (upcoming.length ? '<ul class="list">' + upcoming.map(eventRow).join('') + '</ul>' : empty('Nothing planned yet.')) + '</section>' +
        (past.length ? '<section class="card muted"><h2>Recent</h2><ul class="list">' + past.map(eventRow).join('') + '</ul></section>' : '');
    },

    notes: function (arg) {
      if (arg) return noteEditor(arg);
      var q = state.noteQuery.toLowerCase();
      var list = S.notes.filter(function (n) { return !q || (n.title + ' ' + n.body).toLowerCase().indexOf(q) > -1; })
        .sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updated > a.updated ? 1 : -1); });
      return '<header class="page-head row-head"><h1>Notes</h1><button class="btn" data-action="new-note">New note</button></header>' +
        '<label class="visually-hidden" for="nq">Search notes</label><input id="nq" class="search" type="search" placeholder="Search notes…" value="' + esc(state.noteQuery) + '" data-input="note-search">' +
        '<div class="notes-grid">' + (list.length ? list.map(function (n) {
          return '<a class="note-card" href="#/notes/' + n.id + '">' + (n.pinned ? '<span class="chip soft">Pinned</span>' : '') +
            '<b>' + esc(n.title || 'Untitled') + '</b><p>' + esc(n.body.slice(0, 160)) + '</p><span class="meta">' + esc(fmtDate(n.updated.slice(0, 10))) + '</span></a>';
        }).join('') : empty(q ? 'No notes match.' : 'No notes yet.')) + '</div>';
    },

    settings: function () {
      var counts = S.tasks.length + ' tasks, ' + S.habits.length + ' habits, ' + S.events.length + ' plans, ' + S.notes.length + ' notes';
      return '<header class="page-head"><h1>Settings</h1></header>' +
        '<section class="card"><h2>Your data</h2><p>Everything is stored on this device only (' + esc(counts) + '). Back up regularly, and use a backup to copy your data to another phone or computer.</p>' +
        '<div class="actions"><button class="btn" data-action="backup">Back up (download file)</button>' +
        '<label class="btn ghost">Restore from file<input type="file" accept="application/json,.json" data-input="restore" hidden></label></div></section>' +
        '<section class="card"><h2>Install</h2><p><b>iPhone/iPad:</b> open in Safari → Share → Add to Home Screen. <b>Android/desktop:</b> use your browser’s Install option.</p></section>' +
        '<section class="card danger"><h2>Start over</h2><p>Erase everything on this device. This cannot be undone.</p><button class="btn warn" data-action="erase">Erase all data</button></section>';
    }
  };

  function habitGrid(days, showDelete) {
    var t = today(), cols = [];
    for (var i = days - 1; i >= 0; i--) cols.push(addDays(t, -i));
    return '<ul class="list habits">' + S.habits.map(function (h) {
      var s = habitStreak(h);
      return '<li class="row"><div class="row-body"><span class="row-title">' + esc(h.name) + '</span><span class="meta">' + (s ? s + '-day streak' : 'No streak yet') + '</span></div>' +
        '<div class="days">' + cols.map(function (d) {
          var on = !!h.log[d];
          var label = fmtDate(d, { weekday: 'short' });
          return '<button class="day' + (on ? ' on' : '') + '" data-action="toggle-habit" data-id="' + h.id + '" data-d="' + d + '" aria-pressed="' + on + '" aria-label="' + esc(h.name) + ', ' + esc(fmtDate(d)) + '">' +
            (days > 1 ? '<small>' + esc(label === 'Today' ? 'Tdy' : label.slice(0, 3)) + '</small>' : '') + '</button>';
        }).join('') + '</div>' +
        (showDelete ? '<button class="icon-btn" data-action="delete-habit" data-id="' + h.id + '" aria-label="Delete habit: ' + esc(h.name) + '">×</button>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function noteEditor(id) {
    var n = byId(S.notes, id);
    if (!n) return empty('That note no longer exists. <a href="#/notes">Back to notes</a>.');
    return '<header class="page-head row-head"><a class="linkish" href="#/notes">← All notes</a>' +
      '<div class="actions"><button class="btn ghost" data-action="pin-note" data-id="' + n.id + '">' + (n.pinned ? 'Unpin' : 'Pin') + '</button>' +
      '<button class="btn warn" data-action="delete-note" data-id="' + n.id + '">Delete</button></div></header>' +
      '<div class="card editor"><label class="visually-hidden" for="nt">Title</label><input id="nt" class="note-title" placeholder="Title" value="' + esc(n.title) + '" data-input="note-title" data-id="' + n.id + '"' + (n.title ? '' : ' data-autofocus') + '>' +
      '<label class="visually-hidden" for="nb">Note</label><textarea id="nb" placeholder="Write anything…" data-input="note-body" data-id="' + n.id + '">' + esc(n.body) + '</textarea>' +
      '<p class="meta">Saved automatically</p></div>';
  }

  /* ------------------------------------------------------------------ Events */
  document.addEventListener('submit', function (ev) {
    var form = ev.target, kind = form.getAttribute('data-form');
    if (!kind) return;
    ev.preventDefault();
    var f = Object.fromEntries(new FormData(form));
    if (kind === 'quick-task') S.tasks.push({ id: uid(), title: f.title.trim(), due: today(), priority: 2, done: false, created: today() });
    if (kind === 'task') S.tasks.push({ id: uid(), title: f.title.trim(), due: f.due || '', priority: +f.priority || 2, list: (f.list || '').trim(), done: false, created: today() });
    if (kind === 'habit') S.habits.push({ id: uid(), name: f.name.trim(), created: today(), log: {} });
    if (kind === 'event') S.events.push({ id: uid(), title: f.title.trim(), date: f.date, time: f.time || '', place: (f.place || '').trim() });
    save(); render(); toast('Added');
    var first = document.querySelector('[data-form="' + kind + '"] input');
    if (first) first.focus();
  });

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action'), id = b.getAttribute('data-id');
    switch (a) {
      case 'toggle-task': var t = byId(S.tasks, id); t.done = !t.done; t.doneAt = t.done ? today() : null; break;
      case 'delete-task': remove(S.tasks, id); toast('Task deleted'); break;
      case 'clear-done': if (!confirm('Delete all completed tasks?')) return; S.tasks = S.tasks.filter(function (x) { return !x.done; }); break;
      case 'filter': state.taskFilter = b.getAttribute('data-f'); break;
      case 'toggle-habit': var h = byId(S.habits, id), d = b.getAttribute('data-d'); if (h.log[d]) delete h.log[d]; else h.log[d] = true; break;
      case 'delete-habit': if (!confirm('Delete this habit and its history?')) return; remove(S.habits, id); break;
      case 'delete-event': remove(S.events, id); toast('Plan deleted'); break;
      case 'new-note': var n = { id: uid(), title: '', body: '', updated: new Date().toISOString(), pinned: false }; S.notes.push(n); save(); location.hash = '#/notes/' + n.id; return;
      case 'pin-note': var pn = byId(S.notes, id); pn.pinned = !pn.pinned; break;
      case 'delete-note': if (!confirm('Delete this note?')) return; remove(S.notes, id); save(); location.hash = '#/notes'; return;
      case 'backup': backup(); return;
      case 'erase': if (!confirm('Erase all your tasks, habits, plans and notes on this device?')) return; S = EMPTY(); toast('Erased'); break;
      default: return;
    }
    save(); render();
  });

  document.addEventListener('input', function (ev) {
    var el = ev.target, k = el.getAttribute('data-input');
    if (k === 'note-search') {
      state.noteQuery = el.value; render();
      var s = document.getElementById('nq'); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
    }
    if (k === 'note-title' || k === 'note-body') {
      var n = byId(S.notes, el.getAttribute('data-id'));
      if (!n) return;
      n[k === 'note-title' ? 'title' : 'body'] = el.value;
      n.updated = new Date().toISOString(); save();
    }
  });

  document.addEventListener('change', function (ev) {
    if (ev.target.getAttribute('data-input') !== 'restore') return;
    var file = ev.target.files[0]; if (!file) return;
    file.text().then(function (txt) {
      var d = JSON.parse(txt);
      if (!d || d.v !== 1) throw new Error('bad');
      if (!confirm('Replace everything on this device with this backup?')) return;
      S = normalise(d); save(); render(); toast('Restored');
    }).catch(function () { toast('That file isn’t a Life Organizer backup'); });
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
