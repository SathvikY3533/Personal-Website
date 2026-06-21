/* =========================================================
   Dark Mode Toggle
========================================================= */
document.getElementById('mode-btn').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

/* =========================================================
   Load Projects
========================================================= */
let allProjects = [];

fetch(`/projects/projects.json`)
  .then(r => r.json())
  .then(data => {
    allProjects = data.map(normalizeProject);

    const featured = allProjects.filter(p => p.featured);
    const topList = featured.length > 0 ? featured : allProjects.slice(0, 3);

    buildTopProjects(topList);
    buildProjectIndex(allProjects);
  })
  .catch(err => {
    console.error('Failed to load projects.json', err);
  });

/* -------------------------------------------------------
   Backward-compatible normalization
------------------------------------------------------- */
function normalizeProject(p) {
  if (Array.isArray(p.media)) return p;

  const media = [];
  if (p.image) media.push({ type: 'image', src: p.image });

  if (p.video) {
    if (typeof p.video === 'string' && p.video.includes('<iframe')) {
      const match = p.video.match(/src=["']([^"']+)["']/);
      if (match) media.push({ type: 'video-youtube', src: match[1] });
    } else if (typeof p.video === 'string') {
      media.push({ type: 'video-local', src: p.video });
    }
  }

  if (p.stl) media.push({ type: 'stl', src: p.stl });

  return { ...p, media };
}

/* -------------------------------------------------------
   Tool pill rendering
------------------------------------------------------- */
function buildToolPill(tool) {
  const pill = document.createElement('span');
  pill.className = 'tool-pill';

  if (tool.endsWith('.svg')) {
    const img = document.createElement('img');
    img.src = `/assets/images/tools/${tool}`;
    img.alt = tool.replace('.svg', '');
    img.loading = 'lazy';
    pill.appendChild(img);
    pill.appendChild(document.createTextNode(tool.replace('.svg', '')));
  } else {
    pill.appendChild(document.createTextNode(tool));
  }
  return pill;
}

function buildToolsRow(tools) {
  const row = document.createElement('div');
  row.className = 'tile-tools';
  (tools || []).forEach(t => row.appendChild(buildToolPill(t)));
  return row;
}

/* =========================================================
   Top Projects (Featured)
========================================================= */
function buildTopProjects(projects) {
  const container = document.getElementById('top-projects-container');
  container.innerHTML = '';

  projects.slice(0, 3).forEach((p, index) => {
    container.appendChild(buildTopCard(p, index === 0));
  });
}

function buildTopCard(p, isFirst) {
  const card = document.createElement('div');
  card.className = 'top-card' + (isFirst ? ' first-card' : '');
  card.addEventListener('click', () => openProjectModal(p));

  const cardContent = document.createElement('div');
  cardContent.className = 'card-content';

  if (p.date) {
    const date = document.createElement('div');
    date.className = 'tile-date';
    date.textContent = p.date;
    cardContent.appendChild(date);
  }

  const title = document.createElement('div');
  title.className = 'tile-title';
  title.textContent = p.title;
  cardContent.appendChild(title);

  if (p.role) {
    const role = document.createElement('div');
    role.className = 'tile-role';
    role.textContent = p.role;
    cardContent.appendChild(role);
  }

  if (p.summary) {
    const summary = document.createElement('p');
    summary.className = 'tile-desc';
    summary.textContent = p.summary;
    cardContent.appendChild(summary);
  }

  const firstMedia = p.media && p.media[0];
  if (firstMedia) {
    const mediaEl = buildInlineCardMedia(firstMedia, p);
    if (mediaEl) cardContent.appendChild(mediaEl);
  }

  card.appendChild(cardContent);

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  if (p.link) {
    const linkBtn = document.createElement('a');
    linkBtn.href = p.link;
    linkBtn.target = '_blank';
    linkBtn.rel = 'noopener';
    linkBtn.textContent = p.linkLabel || 'Learn More';
    linkBtn.addEventListener('click', e => e.stopPropagation());
    footer.appendChild(linkBtn);
  }

  footer.appendChild(buildToolsRow(p.tools));
  card.appendChild(footer);

  attachEditBubble(card, p);
  return card;
}

function buildInlineCardMedia(m, project) {
  switch (m.type) {
    case 'image': {
      const img = document.createElement('img');
      img.src = m.src;
      img.alt = m.caption || project.title;
      img.className = 'card-media-img';
      img.loading = 'lazy';
      return img;
    }
    case 'video-local': {
      const video = document.createElement('video');
      video.src = m.src;
      video.className = 'card-media-video';
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.controls = true;
      return video;
    }
    case 'video-youtube': {
      const wrap = document.createElement('div');
      wrap.className = 'video-container card-media-youtube';
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      wrap.appendChild(iframe);
      return wrap;
    }
    case 'stl': {
      const id = 'card-stl-' + Math.random().toString(36).slice(2, 9);
      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.className = 'card-media-stl';
      requestAnimationFrame(() => {
        import('./stlShow.js').then(mod => mod.showSTL(id, m.src));
      });
      return wrap;
    }
    default:
      return null;
  }
}

/* =========================================================
   Project Index — a compact, filterable grid (replaces the
   old one-per-row timeline, which made the page too long).
   Cards wrap into multiple columns; a filter bar above lets
   you narrow the grid down by date/era. Chronological info
   isn't lost — it's just a tag + filter instead of forcing
   one project per row.
========================================================= */
function buildProjectIndex(projects) {
  const sorted = sortByDateDesc(projects);
  buildFilterBar(sorted);
  buildIndexGrid(sorted);
}

function buildFilterBar(sorted) {
  const bar = document.getElementById('filter-bar');
  bar.innerHTML = '';

  const dates = [];
  sorted.forEach(p => {
    if (p.date && !dates.includes(p.date)) dates.push(p.date);
  });

  const allChip = makeFilterChip('All', true);
  allChip.addEventListener('click', () => setFilter(null, allChip));
  bar.appendChild(allChip);

  dates.forEach(date => {
    const chip = makeFilterChip(date, false);
    chip.addEventListener('click', () => setFilter(date, chip));
    bar.appendChild(chip);
  });

  function setFilter(date, activeChip) {
    Array.from(bar.children).forEach(c => c.classList.remove('active'));
    activeChip.classList.add('active');
    document.querySelectorAll('.spec-card').forEach(card => {
      card.classList.toggle('is-hidden', !!date && card.dataset.date !== date);
    });
  }
}

function makeFilterChip(label, active) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'filter-chip' + (active ? ' active' : '');
  chip.textContent = label;
  return chip;
}

function buildIndexGrid(sorted) {
  const container = document.getElementById('index-container');
  container.innerHTML = '';
  container.className = 'project-grid';

  sorted.forEach(p => {
    const card = document.createElement('div');
    card.className = 'spec-card';
    if (p.date) card.dataset.date = p.date;
    card.addEventListener('click', () => openProjectModal(p));

    if (p.date) {
      const date = document.createElement('div');
      date.className = 'tile-date';
      date.textContent = p.date;
      card.appendChild(date);
    }

    const title = document.createElement('div');
    title.className = 'tile-title';
    title.textContent = p.title;
    card.appendChild(title);

    if (p.role) {
      const role = document.createElement('div');
      role.className = 'tile-role';
      role.textContent = p.role;
      card.appendChild(role);
    }

    const summary = document.createElement('div');
    summary.className = 'tile-desc';
    summary.textContent = p.summary || '';
    card.appendChild(summary);

    card.appendChild(buildToolsRow(p.tools));

    attachEditBubble(card, p);
    container.appendChild(card);
  });
}

function sortByDateDesc(projects) {
  const withYear = [];
  const withoutYear = [];
  projects.forEach(p => {
    const match = (p.date || '').match(/(\d{4})(?!.*\d{4})/);
    if (match) withYear.push({ p, year: parseInt(match[1], 10) });
    else withoutYear.push(p);
  });
  withYear.sort((a, b) => b.year - a.year);
  return [...withYear.map(x => x.p), ...withoutYear];
}

/* =========================================================
   Unified Project Modal
========================================================= */
let activeModal = null;
let activeModalKeyHandler = null;

function closeModal() {
  if (!activeModal) return;
  const overlay = activeModal;
  activeModal = null;
  overlay.classList.remove('active');
  if (activeModalKeyHandler) {
    document.removeEventListener('keydown', activeModalKeyHandler);
    activeModalKeyHandler = null;
  }
  setTimeout(() => overlay.remove(), 220);
}

function openOverlayShell(extraClass) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  const card = document.createElement('div');
  card.className = 'modal-card' + (extraClass ? ' ' + extraClass : '');
  overlay.appendChild(card);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  activeModal = overlay;
  activeModalKeyHandler = e => { if (e.key === 'Escape') closeModal(); };
  document.addEventListener('keydown', activeModalKeyHandler);

  return card;
}

function buildModalHeader({ title, role, date }) {
  const header = document.createElement('div');
  header.className = 'modal-header';

  const left = document.createElement('div');
  if (date) {
    const dateEl = document.createElement('div');
    dateEl.className = 'modal-date';
    dateEl.textContent = date;
    left.appendChild(dateEl);
  }
  const h2 = document.createElement('h2');
  h2.className = 'modal-title';
  h2.textContent = title;
  left.appendChild(h2);

  if (role) {
    const sub = document.createElement('div');
    sub.className = 'modal-role';
    sub.textContent = role;
    left.appendChild(sub);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', closeModal);

  header.appendChild(left);
  header.appendChild(closeBtn);
  return header;
}

function openProjectModal(project) {
  const card = openOverlayShell();
  card.appendChild(buildModalHeader(project));

  const body = document.createElement('div');
  body.className = 'modal-body';

  if (project.media && project.media.length > 0) {
    body.appendChild(buildMediaGallery(project.media, project));
  }

  if (project.description) {
    const desc = document.createElement('p');
    desc.className = 'modal-description';
    desc.textContent = project.description;
    body.appendChild(desc);
  } else if (project.summary) {
    const desc = document.createElement('p');
    desc.className = 'modal-description';
    desc.textContent = project.summary;
    body.appendChild(desc);
  }

  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  footer.appendChild(buildToolsRow(project.tools));

  if (project.link) {
    const a = document.createElement('a');
    a.href = project.link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'modal-link';
    a.textContent = (project.linkLabel || 'Learn More') + ' ↗';
    footer.appendChild(a);
  }

  body.appendChild(footer);
  card.appendChild(body);
}

/* -------------------------------------------------------
   Media Gallery
------------------------------------------------------- */
function buildMediaGallery(mediaItems, project) {
  const gallery = document.createElement('div');
  gallery.className = 'media-gallery';

  const viewport = document.createElement('div');
  viewport.className = 'gallery-viewport';

  const captionEl = document.createElement('div');
  captionEl.className = 'gallery-caption';
  captionEl.textContent = (mediaItems[0] && mediaItems[0].caption) || '';

  let current = 0;

  const itemEls = mediaItems.map((m, i) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'gallery-item' + (i === 0 ? ' active' : '');
    viewport.appendChild(itemDiv);
    if (i === 0) renderMediaInto(itemDiv, m, project);
    return itemDiv;
  });

  gallery.appendChild(viewport);
  gallery.appendChild(captionEl);

  if (mediaItems.length > 1) {
    const nav = document.createElement('div');
    nav.className = 'gallery-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'gallery-btn';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.setAttribute('aria-label', 'Previous media');

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'gallery-dots';
    const dotEls = mediaItems.map((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Go to media ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'gallery-btn';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.setAttribute('aria-label', 'Next media');

    function goTo(index) {
      itemEls[current].classList.remove('active');
      dotEls[current].classList.remove('active');
      current = (index + mediaItems.length) % mediaItems.length;
      itemEls[current].classList.add('active');
      dotEls[current].classList.add('active');
      captionEl.textContent = mediaItems[current].caption || '';

      if (!itemEls[current].dataset.rendered) {
        renderMediaInto(itemEls[current], mediaItems[current], project);
      }
    }

    prevBtn.addEventListener('click', () => goTo(current - 1));
    nextBtn.addEventListener('click', () => goTo(current + 1));

    nav.appendChild(prevBtn);
    nav.appendChild(dotsWrap);
    nav.appendChild(nextBtn);
    gallery.appendChild(nav);
  }

  return gallery;
}

function renderMediaInto(container, m, project) {
  container.dataset.rendered = 'true';

  switch (m.type) {
    case 'image': {
      const img = document.createElement('img');
      img.src = m.src;
      img.alt = m.caption || project.title;
      container.appendChild(img);
      break;
    }
    case 'video-local': {
      const video = document.createElement('video');
      video.src = m.src;
      video.controls = true;
      video.playsInline = true;
      container.appendChild(video);
      break;
    }
    case 'video-youtube': {
      const wrap = document.createElement('div');
      wrap.className = 'youtube-wrap';
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      wrap.appendChild(iframe);
      container.appendChild(wrap);
      break;
    }
    case 'stl': {
      const id = 'modal-stl-' + Math.random().toString(36).slice(2, 9);
      const wrap = document.createElement('div');
      wrap.id = id;
      wrap.className = 'gallery-stl';
      container.appendChild(wrap);
      requestAnimationFrame(() => {
        import('./stlShow.js').then(mod => mod.showSTL(id, m.src));
      });
      break;
    }
    case 'sketchfab': {
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.className = 'gallery-iframe';
      iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
      container.appendChild(iframe);
      break;
    }
    case 'pcb-iframe':
    case 'iframe': {
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.className = 'gallery-iframe';
      container.appendChild(iframe);
      break;
    }
    default:
      break;
  }
}

/* =========================================================
   Owner-only Add / Edit Project tooling
   - A near-invisible dot in the bottom-right corner of the
     page (add a new project) and of every project card (edit
     that project).
   - Both are gated behind a password prompt. NOTE: this is a
     casual deterrent, not real security — the check runs in
     client-side JS that anyone can view in the page source.
   - Submitting opens a pre-filled GitHub Issue using YOUR
     logged-in GitHub session (no token ever touches the
     browser). A GitHub Action in this repo
     (.github/workflows/manage-projects.yml) reads the issue
     and commits the change to projects/projects.json
     automatically, then closes the issue.
========================================================= */
const ADD_PROJECT_PASSWORD = '7898';
const GITHUB_REPO = 'SathvikY3533/Personal-Website';

const TOOL_ICON_NAMES = [
  '3DPrinting', 'Arduino', 'CPlusPlus', 'CSS3', 'CSV',
  'Firebase', 'Fusion360', 'HTML5', 'Java', 'JavaScript',
  'Keras', 'Matplotlib', 'NumPy', 'OpenAI', 'OpenCV',
  'Pandas', 'PCBDesign', 'PyTorch', 'Python', 'ROS',
  'Soldering', 'Swift', 'TensorFlow', 'Xcode', 'scikit-learn',
  // ECE / embedded / robotics additions
  'KiCad', 'Altium', 'EagleCAD', 'JetsonNano', 'IsaacSim',
  'RaspberryPi', 'STM32', 'ESP32', 'MATLAB', 'SolidWorks',
  'Multisim', 'Linux', 'Git'
];

// A few tools genuinely have no logo to source (protocols,
// generic instruments, or brands with no public icon) — these
// stay as plain text tags via the freeform tag input.
const SUGGESTED_TAGS = [
  'JLCPCB', 'Oscilloscope', 'I2C/SPI', 'FreeRTOS'
];

const MEDIA_TYPE_OPTIONS = [
  { value: 'image', label: 'Image', placeholder: '/assets/images/my-project.jpg' },
  { value: 'video-local', label: 'Video (local .mp4)', placeholder: '/assets/videos/demo.mp4' },
  { value: 'video-youtube', label: 'YouTube embed', placeholder: 'https://www.youtube.com/embed/VIDEO_ID' },
  { value: 'stl', label: 'STL 3D model', placeholder: '/assets/models/part.stl' },
  { value: 'sketchfab', label: 'Sketchfab embed', placeholder: 'https://sketchfab.com/models/MODEL_ID/embed' },
  { value: 'pcb-iframe', label: 'PCB design / web embed', placeholder: 'https://your-pcb-viewer-url.com' },
];

function initAddProjectFab() {
  const fab = document.createElement('button');
  fab.className = 'fab-add';
  fab.setAttribute('aria-label', 'Owner tools');
  fab.addEventListener('click', () => openPasswordPrompt(() => openProjectForm()));
  document.body.appendChild(fab);
}

// Tiny edit dot attached to the bottom-right corner of a project card.
function attachEditBubble(cardEl, project) {
  cardEl.style.position = cardEl.style.position || 'relative';
  const dot = document.createElement('button');
  dot.className = 'edit-bubble';
  dot.setAttribute('aria-label', 'Edit this project');
  dot.addEventListener('click', e => {
    e.stopPropagation();
    openPasswordPrompt(() => openProjectForm(project));
  });
  cardEl.appendChild(dot);
}

function openPasswordPrompt(onSuccess) {
  const card = openOverlayShell('password-modal-card');
  card.appendChild(buildModalHeader({ title: 'Owner access' }));

  const body = document.createElement('div');
  body.className = 'modal-body';

  const form = document.createElement('div');
  form.className = 'password-form';

  const input = document.createElement('input');
  input.type = 'password';
  input.inputMode = 'numeric';
  input.maxLength = 12;
  input.placeholder = '••••';
  input.autocomplete = 'off';

  const error = document.createElement('div');
  error.className = 'password-error';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.textContent = 'Unlock';

  function attempt() {
    if (input.value === ADD_PROJECT_PASSWORD) {
      onSuccess();
    } else {
      error.textContent = 'Incorrect password';
      form.classList.remove('password-shake');
      requestAnimationFrame(() => form.classList.add('password-shake'));
      input.value = '';
      input.focus();
    }
  }

  submitBtn.addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });

  form.appendChild(input);
  form.appendChild(error);
  form.appendChild(submitBtn);
  body.appendChild(form);
  card.appendChild(body);

  requestAnimationFrame(() => input.focus());
}

function field(labelText, inputEl, inline) {
  const group = document.createElement('div');
  group.className = 'form-group' + (inline ? ' form-row-inline' : '');
  const label = document.createElement('label');
  label.textContent = labelText;
  if (inputEl.id) label.htmlFor = inputEl.id;
  if (inline) {
    group.appendChild(inputEl);
    group.appendChild(label);
  } else {
    group.appendChild(label);
    group.appendChild(inputEl);
  }
  return group;
}

function addMediaEntry(container, prefill) {
  const entry = document.createElement('div');
  entry.className = 'media-entry';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-media';
  removeBtn.innerHTML = '&#10005;';
  removeBtn.setAttribute('aria-label', 'Remove this media item');
  removeBtn.addEventListener('click', () => entry.remove());

  const typeSelect = document.createElement('select');
  typeSelect.className = 'media-type-select';
  MEDIA_TYPE_OPTIONS.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    typeSelect.appendChild(o);
  });
  if (prefill && prefill.type) typeSelect.value = prefill.type;

  const srcInput = document.createElement('input');
  srcInput.type = 'text';
  srcInput.className = 'media-src-input';
  srcInput.placeholder = MEDIA_TYPE_OPTIONS[0].placeholder;
  if (prefill && prefill.src) srcInput.value = prefill.src;

  typeSelect.addEventListener('change', () => {
    const opt = MEDIA_TYPE_OPTIONS.find(o => o.value === typeSelect.value);
    srcInput.placeholder = opt ? opt.placeholder : 'URL or file path';
  });

  const captionInput = document.createElement('input');
  captionInput.type = 'text';
  captionInput.className = 'media-caption-input';
  captionInput.placeholder = 'Caption (optional)';
  if (prefill && prefill.caption) captionInput.value = prefill.caption;

  entry.appendChild(removeBtn);
  entry.appendChild(typeSelect);
  entry.appendChild(srcInput);
  entry.appendChild(captionInput);
  container.appendChild(entry);
}

// Builds a GitHub "new issue" URL pre-filled with a fenced JSON block,
// and opens it in a new tab using the visitor's own logged-in GitHub
// session. No credentials of any kind are embedded in this code.
function openGithubIssue(titlePrefix, titleText, payloadObj) {
  const issueTitle = `${titlePrefix} ${titleText || 'Untitled'}`;
  const body = [
    '_Auto-generated by the site\'s project form. A GitHub Action will read the JSON block below and apply it automatically — please don\'t edit it by hand._',
    '',
    '```json',
    JSON.stringify(payloadObj, null, 2),
    '```',
  ].join('\n');
  const url = `https://github.com/${GITHUB_REPO}/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank', 'noopener');
}

/* -------------------------------------------------------
   Shared Add / Edit project form.
   Pass an existing project object to pre-fill it for editing;
   call with no arguments to create a brand new one.
------------------------------------------------------- */
function openProjectForm(existingProject) {
  const isEdit = !!existingProject;
  const card = openOverlayShell('add-modal-card');
  card.appendChild(buildModalHeader({ title: isEdit ? 'Edit Project' : '+ New Project' }));

  const body = document.createElement('div');
  body.className = 'modal-body';

  const form = document.createElement('div');
  form.className = 'add-form';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'e.g. Autonomous Line-Following Robot';
  if (isEdit) titleInput.value = existingProject.title || '';
  form.appendChild(field('Title *', titleInput));

  const dateRow = document.createElement('div');
  dateRow.className = 'form-grid-2';
  const dateInput = document.createElement('input');
  dateInput.type = 'text';
  dateInput.placeholder = 'e.g. Spring 2026 or 2026';
  if (isEdit) dateInput.value = existingProject.date || '';
  dateRow.appendChild(field('Date', dateInput));
  const roleInput = document.createElement('input');
  roleInput.type = 'text';
  roleInput.placeholder = 'e.g. Personal Project';
  if (isEdit) roleInput.value = existingProject.role || '';
  dateRow.appendChild(field('Role / Context', roleInput));
  form.appendChild(dateRow);

  const summaryInput = document.createElement('textarea');
  summaryInput.placeholder = 'Short 1-2 sentence summary shown on project cards...';
  if (isEdit) summaryInput.value = existingProject.summary || '';
  form.appendChild(field('Summary (card preview)', summaryInput));

  const descriptionInput = document.createElement('textarea');
  descriptionInput.placeholder = 'Full write-up shown when someone opens the project...';
  if (isEdit) descriptionInput.value = existingProject.description || '';
  form.appendChild(field('Full Description (popup)', descriptionInput));

  const linkRow = document.createElement('div');
  linkRow.className = 'form-grid-2';
  const linkInput = document.createElement('input');
  linkInput.type = 'text';
  linkInput.placeholder = 'https://...';
  if (isEdit) linkInput.value = existingProject.link || '';
  linkRow.appendChild(field('External Link URL', linkInput));
  const linkLabelInput = document.createElement('input');
  linkLabelInput.type = 'text';
  linkLabelInput.placeholder = 'e.g. View on GitHub';
  if (isEdit) linkLabelInput.value = existingProject.linkLabel || '';
  linkRow.appendChild(field('Link Button Label', linkLabelInput));
  form.appendChild(linkRow);

  const featuredChk = document.createElement('input');
  featuredChk.type = 'checkbox';
  featuredChk.id = 'ap-featured';
  if (isEdit) featuredChk.checked = !!existingProject.featured;
  form.appendChild(field('Feature this project at the top', featuredChk, true));

  // Curated icon-backed tools
  const existingTools = (isEdit && existingProject.tools) || [];
  const toolsGroup = document.createElement('div');
  toolsGroup.className = 'form-group';
  const toolsLabel = document.createElement('label');
  toolsLabel.textContent = 'Tools & Technologies (with icons)';
  toolsGroup.appendChild(toolsLabel);
  const toolsGrid = document.createElement('div');
  toolsGrid.className = 'tools-checkbox-grid';
  TOOL_ICON_NAMES.forEach(tool => {
    const wrap = document.createElement('label');
    wrap.className = 'tool-check';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = tool + '.svg';
    if (existingTools.includes(tool + '.svg')) chk.checked = true;
    const img = document.createElement('img');
    img.src = `/assets/images/tools/${tool}.svg`;
    img.alt = tool;
    wrap.appendChild(chk);
    wrap.appendChild(img);
    wrap.appendChild(document.createTextNode(tool));
    toolsGrid.appendChild(wrap);
  });
  toolsGroup.appendChild(toolsGrid);
  form.appendChild(toolsGroup);

  // Freeform tags
  const tagsGroup = document.createElement('div');
  tagsGroup.className = 'form-group';
  const tagsLabel = document.createElement('label');
  tagsLabel.textContent = 'Other Tools / Tags (no icon needed — e.g. KiCad, Jetson Nano, IsaacSim)';
  tagsGroup.appendChild(tagsLabel);

  const customTags = existingTools.filter(t => !t.endsWith('.svg'));
  const tagsListEl = document.createElement('div');
  tagsListEl.className = 'custom-tags-list';

  function renderTagChips() {
    tagsListEl.innerHTML = '';
    customTags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'custom-tag-chip';
      chip.appendChild(document.createTextNode(tag));
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.innerHTML = '&#10005;';
      removeBtn.addEventListener('click', () => {
        customTags.splice(i, 1);
        renderTagChips();
      });
      chip.appendChild(removeBtn);
      tagsListEl.appendChild(chip);
    });
  }
  renderTagChips();

  const tagsRow = document.createElement('div');
  tagsRow.className = 'custom-tags-row';
  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.placeholder = 'Type a tool name and press Add...';
  const tagAddBtn = document.createElement('button');
  tagAddBtn.type = 'button';
  tagAddBtn.textContent = 'Add';

  function addTag(value) {
    const v = (value || tagInput.value).trim();
    if (!v || customTags.includes(v)) return;
    customTags.push(v);
    renderTagChips();
    tagInput.value = '';
    tagInput.focus();
  }

  tagAddBtn.addEventListener('click', () => addTag());
  tagInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  });

  tagsRow.appendChild(tagInput);
  tagsRow.appendChild(tagAddBtn);
  tagsGroup.appendChild(tagsRow);

  const suggestWrap = document.createElement('div');
  suggestWrap.className = 'custom-tags-list';
  suggestWrap.style.marginTop = '0.6rem';
  SUGGESTED_TAGS.forEach(tag => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'custom-tag-chip';
    chip.style.cursor = 'pointer';
    chip.textContent = '+ ' + tag;
    chip.addEventListener('click', () => addTag(tag));
    suggestWrap.appendChild(chip);
  });
  tagsGroup.appendChild(suggestWrap);
  tagsGroup.appendChild(tagsListEl);
  form.appendChild(tagsGroup);

  // Media items
  const mediaGroup = document.createElement('div');
  mediaGroup.className = 'form-group';
  const mediaLabel = document.createElement('label');
  mediaLabel.textContent = 'Media (images, videos, 3D models, PCB embeds...)';
  mediaGroup.appendChild(mediaLabel);

  const mediaEntries = document.createElement('div');
  mediaEntries.className = 'media-entries';
  mediaGroup.appendChild(mediaEntries);

  const addMediaBtn = document.createElement('button');
  addMediaBtn.type = 'button';
  addMediaBtn.className = 'add-media-btn';
  addMediaBtn.textContent = '+ Add Media Item';
  addMediaBtn.addEventListener('click', () => addMediaEntry(mediaEntries));
  mediaGroup.appendChild(addMediaBtn);
  form.appendChild(mediaGroup);

  if (isEdit && existingProject.media && existingProject.media.length) {
    existingProject.media.forEach(m => addMediaEntry(mediaEntries, m));
  } else {
    addMediaEntry(mediaEntries);
  }

  // Generate / copy / submit
  const genBtn = document.createElement('button');
  genBtn.type = 'button';
  genBtn.className = 'gen-json-btn';
  genBtn.textContent = 'Generate JSON';

  const jsonOutput = document.createElement('pre');
  jsonOutput.className = 'json-output';
  jsonOutput.style.display = 'none';

  const actionRow = document.createElement('div');
  actionRow.style.display = 'none';
  actionRow.style.gap = '0.6rem';
  actionRow.style.flexWrap = 'wrap';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copy JSON';

  const submitIssueBtn = document.createElement('button');
  submitIssueBtn.type = 'button';
  submitIssueBtn.className = 'gen-json-btn';
  submitIssueBtn.textContent = isEdit ? 'Submit Update via GitHub Issue →' : 'Submit via GitHub Issue →';

  let lastGenerated = null;

  function buildProjectObject() {
    const selectedTools = Array.from(toolsGrid.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
    const mediaRows = Array.from(mediaEntries.querySelectorAll('.media-entry'));
    const media = mediaRows.map(row => {
      const type = row.querySelector('.media-type-select').value;
      const src = row.querySelector('.media-src-input').value.trim();
      const caption = row.querySelector('.media-caption-input').value.trim();
      const item = { type, src };
      if (caption) item.caption = caption;
      return item;
    }).filter(m => m.src);

    const obj = {
      title: titleInput.value.trim() || 'Untitled Project',
    };
    if (dateInput.value.trim()) obj.date = dateInput.value.trim();
    if (roleInput.value.trim()) obj.role = roleInput.value.trim();
    if (featuredChk.checked) obj.featured = true;
    if (summaryInput.value.trim()) obj.summary = summaryInput.value.trim();
    if (descriptionInput.value.trim()) obj.description = descriptionInput.value.trim();
    if (linkInput.value.trim()) obj.link = linkInput.value.trim();
    if (linkLabelInput.value.trim()) obj.linkLabel = linkLabelInput.value.trim();

    const allTools = [...selectedTools, ...customTags];
    if (allTools.length) obj.tools = allTools;
    obj.media = media;
    return obj;
  }

  genBtn.addEventListener('click', () => {
    lastGenerated = buildProjectObject();
    jsonOutput.textContent = JSON.stringify(lastGenerated, null, 2);
    jsonOutput.style.display = 'block';
    actionRow.style.display = 'flex';
  });

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonOutput.textContent).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1800);
    });
  });

  submitIssueBtn.addEventListener('click', () => {
    const obj = lastGenerated || buildProjectObject();
    if (isEdit) {
      openGithubIssue('[edit-project]', obj.title, { originalTitle: existingProject.title, project: obj });
    } else {
      openGithubIssue('[new-project]', obj.title, obj);
    }
  });

  actionRow.appendChild(copyBtn);
  actionRow.appendChild(submitIssueBtn);

  const note = document.createElement('p');
  note.className = 'form-note';
  note.textContent = isEdit
    ? 'Submitting opens a pre-filled GitHub Issue in a new tab (you\'ll need to be logged into GitHub). A workflow in the repo applies the update and closes the issue automatically — usually live within a minute or two.'
    : 'Submitting opens a pre-filled GitHub Issue in a new tab (you\'ll need to be logged into GitHub). A workflow in the repo adds it to projects.json and closes the issue automatically — usually live within a minute or two.';

  form.appendChild(genBtn);
  form.appendChild(jsonOutput);
  form.appendChild(actionRow);
  form.appendChild(note);

  body.appendChild(form);
  card.appendChild(body);
}

initAddProjectFab();
