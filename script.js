/* -------------------------
   Dark Mode Toggle
------------------------- */
document.getElementById('mode-btn').addEventListener('click', () => { 
  document.body.classList.toggle('dark'); 
});

/* -------------------------
   Projects
------------------------- */
fetch('projects/projects.json')
  .then(r => r.json())
  .then(projects => {
    buildTopProjects(projects);
    buildBrickRiver(projects);
  })
  .catch(err => console.error('projects.json load error:', err));

/* -------------------------
   Top Projects
------------------------- */
function buildTopProjects(projects) {
  const top = document.getElementById('top-projects-container');
  top.innerHTML = '';
  const chosen = projects.slice(0, 2);

  chosen.forEach(p => {
    const card = document.createElement('div');
    card.className = 'top-card';

    // Title
    const title = document.createElement('div');
    title.className = 'tile-title';
    title.textContent = p.title;

    // Description (non-bold)
    const desc = document.createElement('div');
    desc.className = 'tile-desc';
    desc.style.fontWeight = 'normal';
    desc.textContent = p.description;

    // Tools container
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tile-tools';
    const allowedTools = ["Python","NumPy","Pandas","OpenCV","Matplotlib","PyTorch","TensorFlow","Keras"];
    p.tools.forEach(toolName => {
      if(allowedTools.includes(toolName)) {
        const img = document.createElement('img');
        img.className = 'tool-icon';
        img.src = `assets/images/tools/${toolName}.svg`;
        img.alt = toolName;
        toolsContainer.appendChild(img);
      }
    });

    card.append(title, desc, toolsContainer);
    top.appendChild(card);

    // Clickable popup
    card.addEventListener('click', () => openProjectPopup(p));
  });
}

/* -------------------------
   Popup Function
------------------------- */
function openProjectPopup(proj, rowTrack = null) {
  if (rowTrack) rowTrack.dataset.paused = 'true';

  const overlay = document.createElement('div');
  overlay.id = 'popup-overlay';
  overlay.style.cssText = `
    position: fixed; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center;
    z-index:1000;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background: #fff; padding: 20px; border-radius: 12px; max-width: 80%; max-height: 80%; overflow-y: auto;
  `;

  const title = document.createElement('h2');
  title.textContent = proj.title;
  popup.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent = proj.description;
  desc.style.fontWeight = 'normal';
  popup.appendChild(desc);

  if (proj.image) {
    const img = document.createElement('img');
    img.src = proj.image;
    img.style.width = '100%';
    popup.appendChild(img);
  } else if (proj.video) {
    const vid = document.createElement('video');
    vid.src = proj.video;
    vid.controls = true;
    vid.style.width = '100%';
    popup.appendChild(vid);
  }

  if (proj.link) {
    const btn = document.createElement('a');
    btn.href = proj.link;
    btn.target = "_blank";
    btn.textContent = "Learn More";
    btn.style.cssText = `
      display:inline-block; margin-top:10px; padding:8px 12px; background:#007bff; color:#fff;
      border-radius:6px; text-decoration:none;
    `;
    popup.appendChild(btn);
  }

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.remove();
      if (rowTrack) rowTrack.dataset.paused = 'false';
    }
  });

  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

/* -------------------------
   Brick River All Projects
------------------------- */
function buildBrickRiver(projects) {
  const container = document.getElementById('flowing-projects-container');
  container.innerHTML = '';

  const perRow = 5;
  const rows = chunk(projects, perRow);

  rows.forEach((rowItems, i) => {
    const row = document.createElement('div');
    row.className = 'flow-row';

    const track = document.createElement('div');
    track.className = 'flow-track';
    track.dataset.paused = 'false';
    track.dataset.speed = 0.08 + i*0.02; // slowed down scrolling
    track.dataset.direction = i % 2 === 0 ? 'ltr' : 'rtl';
    rowItems.forEach(p => track.appendChild(createProjectCard(p)));
    rowItems.forEach(p => track.appendChild(createProjectCard(p)));
    row.appendChild(track);
    container.appendChild(row);
  });

  animateRows();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function createProjectCard(p) {
  const el = document.createElement('div');
  el.className = 'tile';

  el.innerHTML = `
    <div class="tile-title">${p.title}</div>
    <div class="tile-desc" style="font-weight:normal;">${p.description}</div>
    <div class="tile-tools"></div>
  `;

  const toolsContainer = el.querySelector('.tile-tools');
  const allowedTools = ["Python","NumPy","Pandas","OpenCV","Matplotlib","PyTorch","TensorFlow","Keras"];
  p.tools.forEach(toolName => {
    if(allowedTools.includes(toolName)) {
      const img = document.createElement('img');
      img.className = 'tool-icon';
      img.src = `assets/images/tools/${toolName}.svg`;
      img.alt = toolName;
      toolsContainer.appendChild(img);
    }
  });

  el.addEventListener('click', () => {
    const parentTrack = el.closest('.flow-track');
    openProjectPopup(p, parentTrack);
  });

  return el;
}

/* -------------------------
   JS Row Animation
------------------------- */
function animateRows() {
  const tracks = document.querySelectorAll('.flow-track');
  let lastTime = performance.now();

  function step(time) {
    const delta = time - lastTime;
    lastTime = time;

    tracks.forEach(track => {
      if (track.dataset.paused === 'true') return;

      const speed = parseFloat(track.dataset.speed);
      let x = parseFloat(track.dataset.x || 0);

      x += (track.dataset.direction === 'ltr' ? 1 : -1) * speed * delta;

      const trackWidth = track.scrollWidth / 2;
      if (x > 0) x -= trackWidth;
      if (x < -trackWidth) x += trackWidth;

      track.style.transform = `translateX(${x}px)`;
      track.dataset.x = x;
    });

    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
