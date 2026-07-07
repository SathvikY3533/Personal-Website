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
let rawProjects = []; // un-normalized copy, used when saving edits locally

fetch(`/projects/projects.json`)
  .then(r => r.json())
  .then(data => {
    rawProjects = data;
    allProjects = data.map(normalizeProject);

    const featured = sortByDateDesc(allProjects.filter(p => p.featured));
    const topList = featured.length > 0 ? featured : sortByDateDesc(allProjects).slice(0, 3);

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

  projects.slice(0, 4).forEach((p, index) => {
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
    case 'sketchfab':
    case 'pcb-iframe': {
      const wrap = document.createElement('div');
      wrap.className = 'video-container card-media-youtube';
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      iframe.setAttribute('frameborder', '0');
      wrap.appendChild(iframe);
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
  // Projects with a "priority" number come first (1 = top, 2 = next, ...),
  // then everything else sorted by year (newest first), then undated ones.
  const prioritized = projects
    .filter(p => Number.isFinite(p.priority))
    .sort((a, b) => a.priority - b.priority);

  const rest = projects.filter(p => !Number.isFinite(p.priority));
  const withYear = [];
  const withoutYear = [];
  rest.forEach(p => {
    const match = (p.date || '').match(/(\d{4})(?!.*\d{4})/);
    if (match) withYear.push({ p, year: parseInt(match[1], 10) });
    else withoutYear.push(p);
  });
  withYear.sort((a, b) => b.year - a.year);
  return [...prioritized, ...withYear.map(x => x.p), ...withoutYear];
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
      const wrap = document.createElement('div');
      wrap.className = 'gallery-embed';
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.className = 'gallery-iframe';
      iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';
      wrap.appendChild(iframe);
      container.appendChild(wrap);
      break;
    }
    case 'pcb-iframe':
    case 'iframe': {
      const wrap = document.createElement('div');
      wrap.className = 'gallery-embed';
      const iframe = document.createElement('iframe');
      iframe.src = m.src;
      iframe.className = 'gallery-iframe';
      wrap.appendChild(iframe);
      container.appendChild(wrap);
      break;
    }
    default:
      break;
  }
}

/* =========================================================
   Local-only Add / Edit Project tooling
   - Only active when the site is opened on localhost via
     `python serve.py` — the buttons don't exist at all on
     the deployed (GitHub Pages) site.
   - A near-invisible dot in the bottom-right corner of the
     page (add a new project) and of every project card (edit
     that project).
   - Saving POSTs the updated projects array to /api/projects,
     which serve.py writes straight to projects/projects.json
     on disk. Changes stay local until you commit + push.
========================================================= */
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

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
  if (!IS_LOCAL) return; // editing tools only exist on localhost
  const fab = document.createElement('button');
  fab.className = 'fab-add';
  fab.setAttribute('aria-label', 'Owner tools');
  fab.addEventListener('click', () => openProjectForm());
  document.body.appendChild(fab);
}

// Tiny edit dot attached to the bottom-right corner of a project card.
function attachEditBubble(cardEl, project) {
  if (!IS_LOCAL) return; // editing tools only exist on localhost
  cardEl.style.position = cardEl.style.position || 'relative';
  const dot = document.createElement('button');
  dot.className = 'edit-bubble';
  dot.setAttribute('aria-label', 'Edit this project');
  dot.addEventListener('click', e => {
    e.stopPropagation();
    openProjectForm(project);
  });
  cardEl.appendChild(dot);
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

// POSTs the full updated projects array to the local dev server
// (serve.py), which writes it to projects/projects.json on disk.
// Returns a promise that resolves on success.
function saveProjectsToDisk(updatedArray) {
  return fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedArray),
  }).then(async r => {
    const res = await r.json().catch(() => ({}));
    if (!r.ok || !res.ok) throw new Error(res.error || `Server responded ${r.status}`);
    return res;
  });
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

  const priorityInput = document.createElement('input');
  priorityInput.type = 'number';
  priorityInput.min = '1';
  priorityInput.placeholder = 'Leave blank for automatic (newest first)';
  if (isEdit && Number.isFinite(existingProject.priority)) priorityInput.value = existingProject.priority;
  form.appendChild(field('Priority (1 = shown first, pushes everything else down)', priorityInput));

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

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'gen-json-btn';
  saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Project';

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
    if (priorityInput.value.trim() !== '' && Number.isFinite(Number(priorityInput.value))) {
      obj.priority = Number(priorityInput.value);
    }
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

  saveBtn.addEventListener('click', () => {
    const obj = buildProjectObject();
    const updated = rawProjects.slice();

    if (isEdit) {
      const idx = updated.findIndex(p => p.title === existingProject.title);
      if (idx === -1) {
        note.textContent = `⚠️ Could not find a project titled "${existingProject.title}" to update.`;
        return;
      }
      updated[idx] = obj;
    } else {
      updated.push(obj);
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    saveProjectsToDisk(updated)
      .then(() => {
        saveBtn.textContent = '✔ Saved!';
        note.textContent = 'Saved to projects/projects.json. Reloading...';
        setTimeout(() => location.reload(), 700);
      })
      .catch(err => {
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Project';
        note.textContent = `⚠️ Save failed: ${err.message}. Are you running the site with "python serve.py"? (Other servers like Live Server can't save files.)`;
      });
  });

  actionRow.appendChild(copyBtn);
  actionRow.appendChild(saveBtn);
  actionRow.style.display = 'flex';

  const note = document.createElement('p');
  note.className = 'form-note';
  note.textContent = 'Saves directly to projects/projects.json on your computer (requires the site to be running via "python serve.py"). Changes stay local until you commit and push to GitHub.';

  form.appendChild(genBtn);
  form.appendChild(jsonOutput);
  form.appendChild(actionRow);
  form.appendChild(note);

  body.appendChild(form);
  card.appendChild(body);
}

initAddProjectFab();
