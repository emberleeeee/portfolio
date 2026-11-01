/* Prototype shell: top bar, design notes, drawer, phone frame, toasts. Depends on React and window.Fieldhouse. */
(function () {
  var h = React.createElement, useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
  var F = window.Fieldhouse;

  function Shell(p) {
    var mq = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches;
    var st = useState(!mq), notesOpen = st[0], setNotes = st[1];
    return h('div', { className: 'px-shell' },
      h('header', { className: 'px-bar' },
        h('a', { href: p.backHref, 'aria-label': 'Back to the ' + p.title + ' case study' }, h(F.Icon, { name: 'ArrowLeft', size: 16 }), h('span', null, 'Case study')),
        h('div', { className: 'px-title' }, h('strong', null, p.title), h('span', null, p.subtitle)),
        h('span', { className: 'px-badge' }, 'Interactive prototype'),
        h('div', { className: 'px-tools' }, p.tools,
          h('button', { type: 'button', className: 'px-link', 'aria-expanded': notesOpen, 'aria-controls': 'px-notes', onClick: function () { setNotes(!notesOpen); } },
            h(F.Icon, { name: notesOpen ? 'X' : 'Note', size: 16 }), h('span', { className: 'px-hide-sm' }, notesOpen ? 'Hide notes' : 'Design notes'), h('span', { className: 'px-sr px-show-sm' }, notesOpen ? 'Hide notes' : 'Design notes')))),
      h('div', { className: 'px-body' },
        h('main', { className: 'px-stage', id: 'px-stage' }, p.children),
        notesOpen ? h('aside', { className: 'px-notes', id: 'px-notes', 'aria-label': 'Design notes' },
          h('h2', null, 'Design notes'), h('p', null, p.notesIntro),
          p.notes.map(function (n) { return h('div', { key: n.title, className: 'px-note' + (p.hot === n.id ? ' is-hot' : '') }, h('h3', null, n.title), h('p', null, n.body), n.tryIt ? h('span', { className: 'px-try' }, h('b', null, 'Try it: '), n.tryIt) : null, n.extra ? h('div', { style: { marginTop: 8 } }, n.extra) : null); }),
          h('p', { className: 'px-disclaimer' }, 'Names, teams and amounts are illustrative. Built with the Fieldhouse design system; behavior reflects the shipped design intent, not production code.')) : null));
  }

  function Drawer(p) {
    var ref = useRef(null);
    useEffect(function () {
      if (!p.open) return;
      var prev = document.activeElement;
      if (ref.current) ref.current.focus();
      function onKey(e) { if (e.key === 'Escape' && p.onClose) p.onClose(); }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
    }, [p.open]);
    if (!p.open) return null;
    return h(React.Fragment, null,
      h('div', { className: 'px-drawer-scrim', onMouseDown: p.onClose }),
      h('div', { className: 'px-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'px-drawer-title', tabIndex: -1, ref: ref },
        h('div', { className: 'px-drawer__head' }, h('h2', { id: 'px-drawer-title' }, p.title), h(F.IconButton, { type: 'ghost', icon: 'X', label: 'Close review', onClick: p.onClose })),
        h('div', { className: 'px-drawer__body' }, p.children),
        p.footer ? h('div', { className: 'px-drawer__foot' }, p.footer) : null));
  }

  function Phone(p) {
    return h('div', { className: 'px-phone', role: 'region', 'aria-label': p.label || 'Mobile screen' }, h('div', { className: 'px-phone__screen', id: p.id }, p.children));
  }

  function useToasts() {
    var st = useState([]), list = st[0], set = st[1];
    function push(t) { var id = Math.random(); set(function (l) { return l.concat([Object.assign({ id: id }, t)]); }); setTimeout(function () { set(function (l) { return l.filter(function (x) { return x.id !== id; }); }); }, t.duration || 4500); }
    var host = h('div', { className: 'px-toast-host' }, list.map(function (t) { return h(F.Snackbar, { key: t.id, status: t.status || 'success', action: t.action, onClose: function () { set(function (l) { return l.filter(function (x) { return x.id !== t.id; }); }); } }, t.text); }));
    return [host, push];
  }

  function money(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  window.Proto = { Shell: Shell, Drawer: Drawer, Phone: Phone, useToasts: useToasts, money: money };
})();
