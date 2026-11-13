const KEY = 'omgz-sample-habits';
const list = document.getElementById('list');
const form = document.getElementById('form');
const input = document.getElementById('input');
const ring = document.getElementById('ring');
const pctEl = document.getElementById('pct');

let items = JSON.parse(localStorage.getItem(KEY) || 'null') || [
  { id: 1, label: 'قراءة 20 صفحة', done: true },
  { id: 2, label: 'تمرين 15 دقيقة', done: false },
  { id: 3, label: 'مراجعة الكود', done: false },
];

function save() {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function render() {
  list.innerHTML = '';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'item' + (item.done ? ' done' : '');
    li.innerHTML = '<span class="check">' + (item.done ? '✓' : '') + '</span><span class="label"></span>';
    li.querySelector('.label').textContent = item.label;
    li.querySelector('.check').onclick = () => { item.done = !item.done; save(); render(); };
    list.appendChild(li);
  }
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  pctEl.textContent = pct + '%';
  ring.style.strokeDashoffset = String(327 - (327 * pct) / 100);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const label = input.value.trim();
  if (!label) return;
  items.push({ id: Date.now(), label, done: false });
  input.value = '';
  save();
  render();
});

render();
