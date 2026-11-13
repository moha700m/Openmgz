/* Openmgz frontend — zero dependencies, hash router, SSE build updates. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const I18N = {
  ar: {
    'brand.tag': 'مصنع IPA',
    'nav.home': 'الرئيسية', 'nav.projects': 'المشاريع', 'nav.builds': 'البناءات', 'nav.settings': 'الإعدادات',
    'home.eyebrow': 'iOS على GitHub Actions',
    'home.title': 'حوّل أي مشروع إلى تطبيق iOS.',
    'home.lead': 'ارفع أرشيف TAR.GZ، نحلّله، نبني واجهة iOS حقيقية، نشغّل GitHub Actions، ونعطيك IPA غير موقّع توقّعه بـ ESign.',
    'home.upload': 'ارفع مشروعًا', 'home.projects': 'المشاريع',
    'home.stats.projects': 'مشاريع', 'home.stats.builds': 'بناءات', 'home.stats.ok': 'ناجحة', 'home.stats.running': 'قيد التنفيذ',
    'home.recent': 'آخر البناءات', 'home.recentEmpty': 'لا يوجد بناء بعد.',
    'home.projectsTitle': 'المشاريع', 'home.projectsEmpty': 'ارفع أول أرشيف لتظهر هنا.',
    'projects.title': 'المشاريع', 'projects.lead': 'كل مشروع محلّل ومصنّف. اضغط لعرض التحليل والبناء.',
    'projects.empty': 'لا مشاريع بعد.', 'projects.cta': 'ارفع أرشيفًا',
    'project.back': 'المشاريع',
    'project.tab.overview': 'نظرة عامة', 'project.tab.build': 'البناء', 'project.tab.files': 'الملفات', 'project.tab.settings': 'الإعدادات',
    'project.why': 'لماذا هذه الاستراتيجية؟',
    'project.evidence': 'الأدلة', 'project.warnings': 'ملاحظات وحدود',
    'project.screens': 'شاشات مكتشفة (تقديري)', 'project.screensEmpty': 'لم نجد شاشات واضحة.',
    'project.preview': 'معاينة داخل إطار iPhone',
    'project.previewNote': 'المعاينة تعرض مخرجات البناء إن وُجدت، وإلا الملفات المصدرية.',
    'project.refresh': 'تحديث',
    'project.files.empty': 'لا ملفات.',
    'project.delete': 'حذف المشروع', 'project.deleteConfirm': 'حذف المشروع وكل بناءاته؟',
    'project.saved': 'تم الحفظ',
    'project.type': 'النوع', 'project.strategy': 'الاستراتيجية', 'project.filesCount': 'الملفات', 'project.size': 'الحجم',
    'project.entry': 'نقطة الدخول', 'project.scheme': 'Scheme', 'project.confidence': 'الثقة',
    'build.start': 'ابنِ IPA', 'build.building': 'جارٍ البناء…', 'build.queued': 'في الانتظار',
    'build.hint': 'يُدفع الكود إلى فرع مؤقت ثم يُشغَّل workflow على macOS. الناتج IPA غير موقّع.',
    'build.unsupported': 'هذا المشروع غير مدعوم للبناء التلقائي.',
    'build.needPush': 'المستودع عام — البناء سينشر كود المشروع فيه.',
    'build.allowPush': 'اسمح بالدفع إلى مستودع عام (كود المشروع سيصبح مرئيًا)',
    'build.noToken': 'أضف GITHUB_TOKEN في ملف .env على الخادم أولًا.',
    'build.latest': 'آخر بناء', 'build.open': 'فتح',
    'build.status.queued': 'في الانتظار', 'build.status.in_progress': 'قيد التنفيذ',
    'build.status.completed': 'اكتمل', 'build.status.failed': 'فشل',
    'build.download': 'تنزيل IPA', 'build.logs': 'السجل', 'build.runOnGithub': 'عرض على GitHub',
    'build.steps': 'الخطوات', 'build.noSteps': 'بانتظار بدء الـ workflow…',
    'build.ipaReady': 'الـ IPA جاهز', 'build.ipaMissing': 'لا يوجد IPA لهذا البناء.',
    'build.started': 'بدأ', 'build.finished': 'انتهى',
    'builds.title': 'البناءات', 'builds.lead': 'سجل كل عمليات البناء.', 'builds.empty': 'لا بناءات بعد.',
    'settings.title': 'الإعدادات', 'settings.lead': 'الاتصال بـ GitHub وحدود الخادم.',
    'settings.github': 'GitHub', 'settings.token': 'التوكن', 'settings.tokenOk': 'مضبوط', 'settings.tokenMissing': 'غير مضبوط',
    'settings.repo': 'المستودع', 'settings.branch': 'الفرع الافتراضي', 'settings.visibility': 'الخصوصية',
    'settings.public': 'عام', 'settings.private': 'خاص',
    'settings.tokenHelp': 'أنشئ Fine-grained token بصلاحيات: Contents (read/write)، Actions (read/write)، Workflows. ضعه في .env باسم GITHUB_TOKEN وأعد تشغيل الخادم.',
    'settings.limits': 'الحدود', 'settings.archive': 'أقصى حجم أرشيف', 'settings.extracted': 'أقصى حجم بعد الاستخراج',
    'settings.workflow': 'ملف الـ workflow',
    'settings.prefs': 'التفضيلات', 'settings.theme': 'المظهر', 'settings.dark': 'داكن', 'settings.light': 'فاتح',
    'settings.lang': 'اللغة',
    'upload.title': 'ارفع مشروعًا', 'upload.drop': 'اختر ملف .tar.gz أو اسحبه هنا',
    'upload.hint': 'حد أقصى {mb} ميجابايت · يُستخرج محليًا ولا يُرسل لأي خدمة.',
    'upload.name': 'اسم المشروع (اختياري)', 'upload.namePh': 'مثال: متجر الجوال',
    'upload.start': 'حلّل المشروع', 'upload.analyzing': 'جارٍ الاستخراج والتحليل…', 'upload.uploading': 'جارٍ الرفع…',
    'common.cancel': 'إلغاء', 'common.close': 'إغلاق', 'common.loading': 'جارٍ التحميل…',
    'common.retry': 'إعادة المحاولة', 'common.copy': 'نسخ', 'common.copied': 'تم النسخ',
    'common.unsupported': 'غير مدعوم', 'common.supported': 'مدعوم',
    'toast.uploaded': 'تم تحليل المشروع', 'toast.buildStarted': 'بدأ البناء', 'toast.error': 'حدث خطأ',
  },
  en: {
    'brand.tag': 'IPA Factory',
    'nav.home': 'Home', 'nav.projects': 'Projects', 'nav.builds': 'Builds', 'nav.settings': 'Settings',
    'home.eyebrow': 'iOS on GitHub Actions',
    'home.title': 'Turn any project into an iOS app.',
    'home.lead': 'Upload a TAR.GZ, we analyze it, generate a real iOS shell, run GitHub Actions, and hand you an unsigned IPA ready for ESign.',
    'home.upload': 'Upload a project', 'home.projects': 'Projects',
    'home.stats.projects': 'Projects', 'home.stats.builds': 'Builds', 'home.stats.ok': 'Succeeded', 'home.stats.running': 'Running',
    'home.recent': 'Recent builds', 'home.recentEmpty': 'No builds yet.',
    'home.projectsTitle': 'Projects', 'home.projectsEmpty': 'Upload your first archive to see it here.',
    'projects.title': 'Projects', 'projects.lead': 'Every project analyzed and classified. Tap to inspect and build.',
    'projects.empty': 'No projects yet.', 'projects.cta': 'Upload an archive',
    'project.back': 'Projects',
    'project.tab.overview': 'Overview', 'project.tab.build': 'Build', 'project.tab.files': 'Files', 'project.tab.settings': 'Settings',
    'project.why': 'Why this strategy?',
    'project.evidence': 'Evidence', 'project.warnings': 'Notes & limits',
    'project.screens': 'Detected screens (heuristic)', 'project.screensEmpty': 'No clear screens found.',
    'project.preview': 'Live iPhone preview',
    'project.previewNote': 'Preview serves the built output when present, otherwise the raw source.',
    'project.refresh': 'Refresh',
    'project.files.empty': 'No files.',
    'project.delete': 'Delete project', 'project.deleteConfirm': 'Delete this project and its builds?',
    'project.saved': 'Saved',
    'project.type': 'Type', 'project.strategy': 'Strategy', 'project.filesCount': 'Files', 'project.size': 'Size',
    'project.entry': 'Entry', 'project.scheme': 'Scheme', 'project.confidence': 'Confidence',
    'build.start': 'Build IPA', 'build.building': 'Building…', 'build.queued': 'Queued',
    'build.hint': 'Code is pushed to a temporary branch, then a macOS workflow builds it. The result is unsigned.',
    'build.unsupported': 'This project has no automatic build strategy.',
    'build.needPush': 'This repository is public — building will publish the project source into it.',
    'build.allowPush': 'Allow pushing to a public repository (project source becomes visible)',
    'build.noToken': 'Set GITHUB_TOKEN in the server .env first.',
    'build.latest': 'Latest build', 'build.open': 'Open',
    'build.status.queued': 'Queued', 'build.status.in_progress': 'Running',
    'build.status.completed': 'Completed', 'build.status.failed': 'Failed',
    'build.download': 'Download IPA', 'build.logs': 'Logs', 'build.runOnGithub': 'View on GitHub',
    'build.steps': 'Steps', 'build.noSteps': 'Waiting for the workflow to start…',
    'build.ipaReady': 'IPA ready', 'build.ipaMissing': 'No IPA for this build.',
    'build.started': 'Started', 'build.finished': 'Finished',
    'builds.title': 'Builds', 'builds.lead': 'Every build ever run.', 'builds.empty': 'No builds yet.',
    'settings.title': 'Settings', 'settings.lead': 'GitHub connection and server limits.',
    'settings.github': 'GitHub', 'settings.token': 'Token', 'settings.tokenOk': 'Configured', 'settings.tokenMissing': 'Missing',
    'settings.repo': 'Repository', 'settings.branch': 'Default branch', 'settings.visibility': 'Visibility',
    'settings.public': 'Public', 'settings.private': 'Private',
    'settings.tokenHelp': 'Create a fine-grained token with Contents (read/write), Actions (read/write) and Workflows. Put it in .env as GITHUB_TOKEN and restart the server.',
    'settings.limits': 'Limits', 'settings.archive': 'Max archive', 'settings.extracted': 'Max extracted',
    'settings.workflow': 'Workflow file',
    'settings.prefs': 'Preferences', 'settings.theme': 'Theme', 'settings.dark': 'Dark', 'settings.light': 'Light',
    'settings.lang': 'Language',
    'upload.title': 'Upload a project', 'upload.drop': 'Choose a .tar.gz or drop it here',
    'upload.hint': 'Max {mb} MB · extracted locally, never sent to a third party.',
    'upload.name': 'Project name (optional)', 'upload.namePh': 'e.g. Mobile Store',
    'upload.start': 'Analyze project', 'upload.analyzing': 'Extracting and analyzing…', 'upload.uploading': 'Uploading…',
    'common.cancel': 'Cancel', 'common.close': 'Close', 'common.loading': 'Loading…',
    'common.retry': 'Retry', 'common.copy': 'Copy', 'common.copied': 'Copied',
    'common.unsupported': 'Unsupported', 'common.supported': 'Supported',
    'toast.uploaded': 'Project analyzed', 'toast.buildStarted': 'Build started', 'toast.error': 'Something went wrong',
  },
};

const state = {
  lang: localStorage.getItem('omgz.lang') || 'ar',
  theme: localStorage.getItem('omgz.theme') || 'dark',
  route: { view: 'home', id: null },
  projects: [],
  builds: [],
  project: null,
  build: null,
  health: null,
  repo: null,
  stats: null,
  tab: 'overview',
  busy: false,
  logs: '',
};

const t = (key, vars = {}) => {
  let s = I18N[state.lang][key] ?? I18N.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
};

/* ------------------------------ utils ------------------------------ */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtBytes = (n) => {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(state.lang === 'ar' ? 'ar' : 'en', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

const relTime = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (diff < 60) return state.lang === 'ar' ? 'الآن' : 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}${state.lang === 'ar' ? ' د' : 'm'}`;
  if (diff < 86400) return `${Math.round(diff / 3600)}${state.lang === 'ar' ? ' س' : 'h'}`;
  return `${Math.round(diff / 86400)}${state.lang === 'ar' ? ' ي' : 'd'}`;
};

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.code = data.code;
    err.status = res.status;
    throw err;
  }
  return data;
}

function toast(message, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = message;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, 3600);
  setTimeout(() => el.remove(), 4000);
}

const typeEmoji = {
  'ios-native': '⌘', 'ios-workspace': '⌘', flutter: '🐦', 'react-native': '⚛', capacitor: '⚡',
  ionic: '⚡', nextjs: '▲', 'web-spa': '◈', 'static-web': '▤', swiftpm: '⌘', 'node-app': '⬢', unknown: '?',
};

const statusChip = (status) => {
  const map = { completed: 'ok', failed: 'bad', in_progress: 'run', queued: 'warn' };
  return `<span class="chip ${map[status] || ''}"><i class="dot"></i>${esc(t(`build.status.${status}`) || status)}</span>`;
};

/* ------------------------------ shell ------------------------------ */

function applyPrefs() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  $('#langToggle').textContent = state.lang === 'ar' ? 'EN' : 'ع';
  $$('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

function markNav(view) {
  $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === view));
}

/* ------------------------------ views ------------------------------ */

function viewHome() {
  const s = state.stats || { projects: 0, builds: 0, succeeded: 0, running: 0 };
  const recent = state.builds.slice(0, 4);
  const projects = state.projects.slice(0, 5);

  return `
  <section class="page-head">
    <div class="eyebrow">${t('home.eyebrow')}</div>
  </section>

  <section class="hero">
    <h1>${t('home.title')}</h1>
    <p class="lead">${t('home.lead')}</p>
    <div class="actions">
      <button class="btn primary" data-action="upload">＋ ${t('home.upload')}</button>
      <a class="btn ghost" href="#/projects">${t('home.projects')}</a>
    </div>
  </section>

  <section class="section">
    <div class="stats">
      <div class="stat"><div class="k">${t('home.stats.projects')}</div><div class="v">${s.projects}</div></div>
      <div class="stat"><div class="k">${t('home.stats.builds')}</div><div class="v">${s.builds}</div></div>
      <div class="stat"><div class="k">${t('home.stats.ok')}</div><div class="v">${s.succeeded}<small>${s.builds ? ' / ' + s.builds : ''}</small></div></div>
      <div class="stat"><div class="k">${t('home.stats.running')}</div><div class="v">${s.running}</div></div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('home.recent')}</h2><a href="#/builds">${t('nav.builds')} →</a></div>
    <div class="stack">
      ${recent.length ? recent.map(buildRow).join('') : `<div class="empty"><div class="big">⚙</div><p>${t('home.recentEmpty')}</p></div>`}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('home.projectsTitle')}</h2><a href="#/projects">${t('nav.projects')} →</a></div>
    <div class="stack">
      ${projects.length ? projects.map(projectRow).join('') : `<div class="empty"><div class="big">▤</div><p>${t('home.projectsEmpty')}</p>
        <button class="btn" data-action="upload">${t('home.upload')}</button></div>`}
    </div>
  </section>`;
}

function projectRow(p) {
  return `
  <div class="prow" data-action="open-project" data-id="${p.id}">
    <div class="picon">${typeEmoji[p.projectType] || '▤'}</div>
    <div class="pmeta">
      <div class="n">${esc(p.name)}</div>
      <div class="s">${esc(p.projectType)} · ${esc(p.strategy || '—')} · ${relTime(p.updatedAt)}</div>
    </div>
    <div class="pend">›</div>
  </div>`;
}

function buildRow(b) {
  return `
  <div class="prow" data-action="open-build" data-id="${b.id}">
    <div class="picon">${b.status === 'completed' ? '✓' : b.status === 'failed' ? '!' : '◌'}</div>
    <div class="pmeta">
      <div class="n">${esc(b.appName || b.projectName)}</div>
      <div class="s">${esc(b.strategy)} · ${relTime(b.createdAt)}</div>
    </div>
    ${statusChip(b.status)}
  </div>`;
}

function viewProjects() {
  return `
  <section class="page-head"><h1>${t('projects.title')}</h1><p class="lead">${t('projects.lead')}</p></section>
  <div class="stack">
    ${state.projects.length ? state.projects.map(projectRow).join('') : `<div class="empty"><div class="big">▤</div><p>${t('projects.empty')}</p>
      <button class="btn primary" data-action="upload">${t('projects.cta')}</button></div>`}
  </div>`;
}

function viewProject() {
  const p = state.project;
  if (!p) return `<div class="empty"><p>${t('common.loading')}</p></div>`;
  const a = p.analysis || {};
  const supported = a.supported;
  const chips = [
    supported ? `<span class="chip ok">${t('common.supported')}</span>` : `<span class="chip bad">${t('common.unsupported')}</span>`,
    `<span class="chip accent">${esc(a.strategy || '—')}</span>`,
    `<span class="chip">${esc(a.projectType || 'unknown')}</span>`,
    `<span class="chip">${Math.round((a.confidence || 0) * 100)}% ${t('project.confidence')}</span>`,
  ].join('');

  return `
  <div class="page-head" style="padding-bottom:0"><a href="#/projects" class="chip">‹ ${t('project.back')}</a></div>
  <div class="detail-head">
    <div class="picon">${typeEmoji[a.projectType] || '▤'}</div>
    <div class="meta">
      <h1>${esc(p.name)}</h1>
      <div class="sub">${fmtDate(p.createdAt)} · ${p.fileCount} ${t('project.filesCount')}</div>
      <div class="chips">${chips}</div>
    </div>
  </div>

  <div class="tabs">
    ${['overview', 'build', 'files', 'settings'].map((tab) => `
      <button class="${state.tab === tab ? 'active' : ''}" data-action="tab" data-tab="${tab}">${t(`project.tab.${tab}`)}</button>`).join('')}
  </div>

  <div class="section">${renderTab(p, a)}</div>`;
}

function renderTab(p, a) {
  if (state.tab === 'overview') return tabOverview(p, a);
  if (state.tab === 'build') return tabBuild(p, a);
  if (state.tab === 'files') return tabFiles();
  return tabSettings(p);
}

function tabOverview(p, a) {
  const hints = a.bundleHints || {};
  const preview = p.previewAvailable
    ? `<div class="phone-wrap"><div class="phone"><iframe src="/preview/${p.id}/index.html" title="preview"></iframe></div></div>
       <div class="row" style="justify-content:center"><button class="btn small" data-action="refresh-preview">${t('project.refresh')}</button></div>
       <p class="lead" style="text-align:center;font-size:12px;margin-top:8px">${t('project.previewNote')}</p>`
    : '';

  return `
  <div class="card">
    <h3>${t('project.why')}</h3>
    <p class="lead" style="font-size:14px;color:var(--text-2)">${esc(a.reason || '')}</p>
  </div>

  <div class="grid two" style="margin-top:12px">
    <div class="card">
      <h3>${t('project.evidence')}</h3>
      <div class="evidence">
        ${(a.evidence || []).map((e) => `<div class="e"><code>${esc(e.file)}</code><span class="note">${esc(e.note)}</span></div>`).join('') || '<span class="note">—</span>'}
      </div>
    </div>
    <div class="card">
      <h3>${t('project.strategy')}</h3>
      <dl class="kv">
        <dt>${t('project.type')}</dt><dd>${esc(a.projectType)}</dd>
        <dt>${t('project.strategy')}</dt><dd>${esc(a.strategy)}</dd>
        <dt>${t('project.filesCount')}</dt><dd>${a.stats?.files ?? '—'}</dd>
        <dt>${t('project.size')}</dt><dd>${fmtBytes(a.stats?.bytes)}</dd>
        ${hints.entry !== null && hints.entry !== undefined ? `<dt>${t('project.entry')}</dt><dd class="mono">${esc(hints.entry || '/')}</dd>` : ''}
        ${hints.scheme ? `<dt>${t('project.scheme')}</dt><dd class="mono">${esc(hints.scheme)}</dd>` : ''}
      </dl>
    </div>
  </div>

  ${(a.warnings || []).length ? `<div class="card" style="margin-top:12px">
    <h3>${t('project.warnings')}</h3>
    <div class="note-list">${a.warnings.map((w) => `<div class="note">⚠ <span>${esc(w)}</span></div>`).join('')}</div>
  </div>` : ''}

  <div class="card" style="margin-top:12px">
    <h3>${t('project.screens')}</h3>
    <div class="chips">
      ${(a.screens || []).length ? a.screens.map((s) => `<span class="chip">${esc(s)}</span>`).join('') : `<span class="note">${t('project.screensEmpty')}</span>`}
    </div>
  </div>

  ${preview ? `<div class="card" style="margin-top:12px"><h3>${t('project.preview')}</h3>${preview}</div>` : ''}`;
}

function tabBuild(p, a) {
  const latest = state.builds.find((b) => b.projectId === p.id);
  const disabled = !a.supported || !state.health?.hasToken || state.busy;
  const needPublic = state.repo && state.repo.private === false && !p.settings?.allowPublicPush;

  return `
  <div class="card">
    <h3>${t('project.tab.build')}</h3>
    <p class="lead" style="font-size:13px">${t('build.hint')}</p>

    ${!state.health?.hasToken ? `<div class="note bad" style="margin-top:10px">🔑 ${t('build.noToken')}</div>` : ''}
    ${!a.supported ? `<div class="note bad" style="margin-top:10px">✕ ${t('build.unsupported')} ${esc(a.reason || '')}</div>` : ''}
    ${needPublic ? `<div class="note" style="margin-top:10px">⚠ ${t('build.needPush')}</div>
      <label class="switch" style="margin-top:8px">
        <span style="font-size:12.5px">${t('build.allowPush')}</span>
        <input type="checkbox" data-action="allow-public" ${p.settings?.allowPublicPush ? 'checked' : ''} />
      </label>` : ''}

    <button class="btn primary block" style="margin-top:14px" data-action="build" data-id="${p.id}" ${disabled ? 'disabled' : ''}>
      ${state.busy ? t('build.building') : `${t('build.start')} →`}
    </button>
  </div>

  ${latest ? `<div class="card" style="margin-top:12px">
    <div class="section-head" style="margin-bottom:8px"><h3>${t('build.latest')}</h3>${statusChip(latest.status)}</div>
    <div class="kv">
      <dt>${t('build.started')}</dt><dd>${fmtDate(latest.createdAt)}</dd>
      <dt>${t('project.strategy')}</dt><dd>${esc(latest.strategy)}</dd>
    </div>
    ${latest.ipa ? `<div class="note" style="margin-top:10px;background:rgba(52,211,153,.07);border-color:rgba(52,211,153,.25);color:#b9f4dd">✓ ${t('build.ipaReady')} · ${fmtBytes(latest.ipa.size)}</div>` : ''}
    <div class="row" style="margin-top:12px">
      <button class="btn small" data-action="open-build" data-id="${latest.id}">${t('build.open')}</button>
      ${latest.ipa ? `<a class="btn small primary" href="/api/builds/${latest.id}/ipa">${t('build.download')}</a>` : ''}
    </div>
  </div>` : ''}`;
}

function tabFiles() {
  return `<div class="card"><h3>${t('project.tab.files')}</h3><div id="fileList" class="evidence mono" style="font-size:12px">${t('common.loading')}</div></div>`;
}

async function loadFiles() {
  const el = $('#fileList');
  if (!el || !state.project) return;
  try {
    const { files } = await api(`/api/projects/${state.project.id}/files`);
    el.innerHTML = files.length
      ? files.map((f) => `<div class="e"><code>${esc(f.path)}</code><span class="note">${fmtBytes(f.size)}</span></div>`).join('')
      : `<span class="note">${t('project.files.empty')}</span>`;
  } catch (err) {
    el.innerHTML = `<div class="note bad">${esc(err.message)}</div>`;
  }
}

function tabSettings(p) {
  const s = p.settings || {};
  return `
  <div class="card">
    <h3>${t('project.tab.settings')}</h3>
    <div class="form" style="margin-top:10px">
      <div class="field"><label>${t('upload.name')}</label><input id="setName" value="${esc(p.name)}" /></div>
      <div class="field"><label>App name (iOS)</label><input id="setAppName" value="${esc(s.appName || '')}" /></div>
      <div class="field"><label>Bundle ID</label><input id="setBundle" value="${esc(s.bundleId || '')}" class="mono" /></div>
      <div class="field"><label>Version</label><input id="setVersion" value="${esc(s.version || '1.0')}" /></div>
      ${p.analysis?.strategy === 'xcode-build' || p.analysis?.strategy === 'rn-build' || p.analysis?.strategy === 'capacitor-build'
        ? `<div class="field"><label>Scheme</label><input id="setScheme" value="${esc(s.scheme || '')}" /></div>` : ''}
      ${p.analysis?.strategy === 'web-wrapper'
        ? `<div class="field"><label>Build command</label><input id="setBuildCmd" value="${esc(s.buildCommand || '')}" class="mono" />
             <small>${t('build.hint')}</small></div>
           <div class="field"><label>Output directory</label><input id="setOutput" value="${esc(s.outputDir || '')}" class="mono" /></div>` : ''}
      <button class="btn primary" data-action="save-settings" data-id="${p.id}">${t('project.saved')}</button>
    </div>
    <hr style="border:0;border-top:1px solid var(--border);margin:18px 0" />
    <button class="btn danger block" data-action="delete-project" data-id="${p.id}">${t('project.delete')}</button>
  </div>`;
}

function viewBuilds() {
  return `
  <section class="page-head"><h1>${t('builds.title')}</h1><p class="lead">${t('builds.lead')}</p></section>
  <div class="stack">
    ${state.builds.length ? state.builds.map(buildRow).join('') : `<div class="empty"><div class="big">⚙</div><p>${t('builds.empty')}</p></div>`}
  </div>`;
}

function viewBuild() {
  const b = state.build;
  if (!b) return `<div class="empty"><p>${t('common.loading')}</p></div>`;
  const steps = b.steps || [];
  const done = steps.filter((s) => s.conclusion === 'success').length;
  const pct = b.status === 'completed' ? 100 : steps.length ? Math.round((done / steps.length) * 100) : b.runId ? 8 : 2;

  return `
  <div class="page-head" style="padding-bottom:0"><a href="#/builds" class="chip">‹ ${t('builds.title')}</a></div>
  <div class="detail-head">
    <div class="picon">${b.status === 'completed' ? '✓' : b.status === 'failed' ? '!' : '◌'}</div>
    <div class="meta">
      <h1>${esc(b.appName || b.projectName)}</h1>
      <div class="sub">${esc(b.strategy)} · ${fmtDate(b.createdAt)}</div>
      <div class="chips">${statusChip(b.status)}${b.ipa ? `<span class="chip ok">IPA ${fmtBytes(b.ipa.size)}</span>` : ''}</div>
    </div>
  </div>

  <div class="progress"><i style="width:${pct}%"></i></div>
  <div class="row" style="justify-content:space-between;font-size:12px;color:var(--dim)">
    <span>${steps.length ? `${done}/${steps.length}` : t('build.queued')}</span>
    <span>${b.runUrl ? `<a href="${b.runUrl}" target="_blank" rel="noreferrer">${t('build.runOnGithub')} ↗</a>` : ''}</span>
  </div>

  <div class="section stack">
    ${b.ipa ? `<a class="btn primary block" href="/api/builds/${b.id}/ipa">⬇ ${t('build.download')}</a>` : ''}
    ${b.error ? `<div class="note bad">✕ ${esc(b.error)}</div>` : ''}

    <div class="card">
      <h3>${t('build.steps')}</h3>
      ${steps.length ? `<div class="timeline">${steps.map((s) => {
        const cls = s.conclusion === 'success' ? 'done' : s.conclusion === 'failure' ? 'fail' : s.status === 'in_progress' ? 'active' : '';
        return `<div class="tl-step ${cls}"><div class="tl-dot"></div><div class="tl-body"><div class="t">${esc(s.name)}</div><div class="s">${esc(s.job || '')}</div></div></div>`;
      }).join('')}</div>` : `<p class="lead" style="font-size:12.5px">${t('build.noSteps')}</p>`}
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:8px"><h3>${t('build.logs')}</h3>
        <button class="btn small ghost" data-action="load-logs" data-id="${b.id}">${t('project.refresh')}</button></div>
      <pre class="logs" id="logs">${esc(state.logs || '—')}</pre>
    </div>
  </div>`;
}

function viewSettings() {
  const h = state.health || {};
  const r = state.repo || {};
  return `
  <section class="page-head"><h1>${t('settings.title')}</h1><p class="lead">${t('settings.lead')}</p></section>

  <div class="card">
    <h3>${t('settings.github')}</h3>
    <dl class="kv" style="margin-top:10px">
      <dt>${t('settings.repo')}</dt><dd class="mono">${esc(h.repo || r.fullName || '—')}</dd>
      <dt>${t('settings.token')}</dt><dd>${h.hasToken ? `<span class="chip ok">${t('settings.tokenOk')}</span>` : `<span class="chip bad">${t('settings.tokenMissing')}</span>`}</dd>
      <dt>${t('settings.visibility')}</dt><dd>${r.private === true ? t('settings.private') : r.private === false ? `<span class="chip warn">${t('settings.public')}</span>` : '—'}</dd>
      <dt>${t('settings.branch')}</dt><dd class="mono">${esc(r.defaultBranch || '—')}</dd>
      <dt>${t('settings.workflow')}</dt><dd class="mono">${esc(h.workflow || '—')}</dd>
    </dl>
    <div class="note" style="margin-top:12px">🔑 ${t('settings.tokenHelp')}</div>
  </div>

  <div class="card" style="margin-top:12px">
    <h3>${t('settings.limits')}</h3>
    <dl class="kv" style="margin-top:10px">
      <dt>${t('settings.archive')}</dt><dd>${h.limits?.maxArchiveMB || '—'} MB</dd>
      <dt>${t('settings.extracted')}</dt><dd>${h.limits?.maxExtractedMB || '—'} MB</dd>
    </dl>
  </div>

  <div class="card" style="margin-top:12px">
    <h3>${t('settings.prefs')}</h3>
    <div class="switch" style="margin-top:10px">
      <span>${t('settings.theme')} — ${state.theme === 'dark' ? t('settings.dark') : t('settings.light')}</span>
      <input type="checkbox" data-action="toggle-theme" ${state.theme === 'dark' ? 'checked' : ''} />
    </div>
    <div class="switch" style="margin-top:8px">
      <span>${t('settings.lang')} — ${state.lang === 'ar' ? 'العربية' : 'English'}</span>
      <button class="btn small" data-action="toggle-lang">${state.lang === 'ar' ? 'English' : 'العربية'}</button>
    </div>
  </div>`;
}

/* ------------------------------ sheet / upload ------------------------------ */

function openSheet(html) {
  $('#sheet').innerHTML = `<div class="grab"></div>${html}`;
  $('#sheet').classList.remove('hidden');
  $('#sheetBackdrop').classList.remove('hidden');
}

function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheetBackdrop').classList.add('hidden');
}

function openUpload() {
  const max = state.health?.limits?.maxArchiveMB || 120;
  openSheet(`
    <h2>${t('upload.title')}</h2>
    <div class="dropzone" id="dropzone" data-action="pick-file">
      <div class="icon">⬆</div>
      <div>${t('upload.drop')}</div>
      <div class="hint">${t('upload.hint', { mb: max })}</div>
    </div>
    <div class="field" style="margin-top:14px">
      <label>${t('upload.name')}</label>
      <input id="upName" placeholder="${t('upload.namePh')}" />
    </div>
    <div id="upStatus" class="hint" style="margin-top:8px"></div>
    <div class="progress hidden" id="upProgressWrap"><i id="upProgress"></i></div>
    <div class="row" style="margin-top:16px">
      <button class="btn ghost block" data-action="close-sheet">${t('common.cancel')}</button>
      <button class="btn primary block" data-action="start-upload" disabled id="startUpload">${t('upload.start')}</button>
    </div>
  `);
  state.pickedFile = null;
}

function pickFile() {
  $('#filePicker').click();
}

async function startUpload() {
  const file = state.pickedFile;
  if (!file) return;
  const name = $('#upName')?.value?.trim() || '';
  const btn = $('#startUpload');
  const bar = $('#upProgress');
  const wrap = $('#upProgressWrap');
  const status = $('#upStatus');
  btn.disabled = true;
  wrap.classList.remove('hidden');
  status.textContent = t('upload.uploading');

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/projects?name=${encodeURIComponent(name)}`);
  xhr.setRequestHeader('content-type', 'application/gzip');
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
      bar.style.width = `${pct}%`;
      if (pct > 95) status.textContent = t('upload.analyzing');
    }
  };
  xhr.onload = async () => {
    bar.style.width = '100%';
    if (xhr.status >= 200 && xhr.status < 300) {
      const data = JSON.parse(xhr.responseText);
      closeSheet();
      toast(t('toast.uploaded'), 'ok');
      await loadState();
      location.hash = `#/project/${data.project.id}`;
    } else {
      let msg = xhr.statusText;
      try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* ignore */ }
      status.textContent = msg;
      toast(msg, 'bad');
      btn.disabled = false;
    }
  };
  xhr.onerror = () => {
    status.textContent = 'Network error';
    btn.disabled = false;
  };
  xhr.send(file);
}

/* ------------------------------ data + actions ------------------------------ */

async function loadState() {
  const [s, p] = await Promise.all([api('/api/state'), api('/api/projects')]);
  state.health = s;
  state.stats = s.stats;
  state.builds = s.builds || [];
  state.projects = p.projects || [];
  $('#repoBadge').textContent = s.repo;
}

async function loadProject(id) {
  const { project } = await api(`/api/projects/${id}`);
  state.project = project;
  if (!state.builds.length) {
    const { builds } = await api('/api/builds');
    state.builds = builds;
  }
}

async function loadBuild(id) {
  const { build } = await api(`/api/builds/${id}`);
  state.build = build;
}

async function render() {
  const { view, id } = state.route;
  markNav(view === 'project' ? 'projects' : view === 'build' ? 'builds' : view);
  const app = $('#app');

  try {
    if (view === 'home') {
      await loadState();
      app.innerHTML = viewHome();
    } else if (view === 'projects') {
      await loadState();
      app.innerHTML = viewProjects();
    } else if (view === 'project') {
      await loadState();
      await loadProject(id);
      app.innerHTML = viewProject();
      if (state.tab === 'files') loadFiles();
    } else if (view === 'builds') {
      await loadState();
      app.innerHTML = viewBuilds();
    } else if (view === 'build') {
      await loadBuild(id);
      if (!state.builds.length) {
        const { builds } = await api('/api/builds');
        state.builds = builds;
      }
      app.innerHTML = viewBuild();
    } else if (view === 'settings') {
      await loadState();
      state.repo = await api('/api/repo').catch(() => null);
      app.innerHTML = viewSettings();
    } else {
      app.innerHTML = viewHome();
    }
  } catch (err) {
    app.innerHTML = `<div class="empty"><div class="big">!</div><p>${esc(err.message)}</p>
      <button class="btn" data-action="reload">${t('common.retry')}</button></div>`;
  }
}

function parseRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [view, id] = hash.split('/');
  state.route = { view: view || 'home', id: id || null };
}

async function saveProjectSettings(id) {
  const body = {
    name: $('#setName')?.value?.trim(),
    appName: $('#setAppName')?.value?.trim(),
    bundleId: $('#setBundle')?.value?.trim(),
    version: $('#setVersion')?.value?.trim(),
  };
  if ($('#setScheme')) body.scheme = $('#setScheme').value.trim();
  if ($('#setBuildCmd')) body.buildCommand = $('#setBuildCmd').value.trim();
  if ($('#setOutput')) body.outputDir = $('#setOutput').value.trim();

  await api(`/api/projects/${id}`, { method: 'PATCH', body });
  toast(t('project.saved'), 'ok');
  await loadProject(id);
  render();
}

async function startBuild(id) {
  state.busy = true;
  render();
  try {
    const { build } = await api(`/api/projects/${id}/build`, { method: 'POST' });
    toast(t('toast.buildStarted'), 'ok');
    location.hash = `#/build/${build.id}`;
  } catch (err) {
    if (err.code === 'public_repo') {
      toast(err.message, 'bad');
    } else {
      toast(err.message, 'bad');
    }
  } finally {
    state.busy = false;
  }
}

async function togglePublic(id, value) {
  await api(`/api/projects/${id}`, { method: 'PATCH', body: { allowPublicPush: value } });
  await loadProject(id);
  render();
}

async function loadLogs(id) {
  const { logs } = await api(`/api/builds/${id}/logs`);
  state.logs = logs || '—';
  const el = $('#logs');
  if (el) el.textContent = state.logs;
  else render();
}

/* ------------------------------ events ------------------------------ */

document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  try {
    if (action === 'upload') return openUpload();
    if (action === 'pick-file') return pickFile();
    if (action === 'close-sheet') return closeSheet();
    if (action === 'start-upload') return startUpload();
    if (action === 'open-project') { state.tab = 'overview'; location.hash = `#/project/${id}`; return; }
    if (action === 'open-build') { state.logs = ''; location.hash = `#/build/${id}`; return; }
    if (action === 'tab') { state.tab = target.dataset.tab; return render(); }
    if (action === 'build') return startBuild(id);
    if (action === 'save-settings') return saveProjectSettings(id);
    if (action === 'delete-project') {
      if (!confirm(t('project.deleteConfirm'))) return;
      await api(`/api/projects/${id}`, { method: 'DELETE' });
      location.hash = '#/projects';
      return;
    }
    if (action === 'load-logs') return loadLogs(id);
    if (action === 'reload') return render();
    if (action === 'toggle-lang') {
      state.lang = state.lang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('omgz.lang', state.lang);
      applyPrefs();
      return render();
    }
    if (action === 'refresh-preview') {
      const frame = $('.phone iframe');
      if (frame) frame.src = frame.src.split('?')[0] + `?t=${Date.now()}`;
      return;
    }
  } catch (err) {
    toast(err.message, 'bad');
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset.action === 'allow-public') {
    togglePublic(state.project.id, e.target.checked).catch((err) => toast(err.message, 'bad'));
  }
  if (e.target.dataset.action === 'toggle-theme') {
    state.theme = e.target.checked ? 'dark' : 'light';
    localStorage.setItem('omgz.theme', state.theme);
    applyPrefs();
    render();
  }
});

$('#filePicker').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  state.pickedFile = file;
    if (dz) dz.innerHTML = `<div class="icon">✓</div><div>${esc(file.name)}</div><div class="hint">${fmtBytes(file.size)}</div>`;
  const btn = $('#startUpload');
  if (btn) btn.disabled = false;
});

document.addEventListener('dragover', (e) => {
  if (!e.target.closest('#dropzone')) return;
  e.preventDefault();
  $('#dropzone')?.classList.add('over');
});
document.addEventListener('dragleave', (e) => {
  if (!e.target.closest('#dropzone')) return;
  $('#dropzone')?.classList.remove('over');
});
document.addEventListener('drop', (e) => {
  const zone = e.target.closest('#dropzone');
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove('over');
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  state.pickedFile = file;
  zone.innerHTML = `<div class="icon">✓</div><div>${esc(file.name)}</div><div class="hint">${fmtBytes(file.size)}</div>`;
  const btn = $('#startUpload');
  if (btn) btn.disabled = false;
});

$('#sheetBackdrop').addEventListener('click', closeSheet);
$('#uploadFab').addEventListener('click', openUpload);
$('#themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('omgz.theme', state.theme);
  applyPrefs();
  render();
});
$('#langToggle').addEventListener('click', () => {
  state.lang = state.lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('omgz.lang', state.lang);
  applyPrefs();
  render();
});

window.addEventListener('hashchange', () => {
  parseRoute();
  render();
});

/* live build updates */
function connectEvents() {
  const es = new EventSource('/api/events');
  es.onmessage = (e) => {
    try {
      const evt = JSON.parse(e.data);
      if (evt.type !== 'build' || !evt.build) return;
      const b = evt.build;
      const idx = state.builds.findIndex((x) => x.id === b.id);
      if (idx >= 0) state.builds[idx] = b;
      else state.builds.unshift(b);

      if (state.route.view === 'build' && state.build?.id === b.id) {
        state.build = { ...state.build, ...b };
        render();
      } else if (['home', 'builds', 'project'].includes(state.route.view)) {
        if (state.route.view === 'home') {
          api('/api/state').then((s) => { state.stats = s.stats; state.builds = s.builds; }).catch(() => {});
        }
        render();
      }
    } catch { /* ignore */ }
  };
  es.onerror = () => {
    es.close();
    setTimeout(connectEvents, 5000);
  };
}

/* ------------------------------ boot ------------------------------ */

applyPrefs();
parseRoute();
render().then(() => connectEvents());
