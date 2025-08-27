/* -------------------------
   Dark Mode Toggle
------------------------- */
document.getElementById('mode-btn').addEventListener('click', () => { 
  document.body.classList.toggle('dark'); 
});

import { showSTL } from './stlShow.js';


/* -------------------------
   Determine Base Path
------------------------- */
const repoName = ""

/* -------------------------
   Projects
------------------------- */
fetch(`/projects/projects.json`)
  .then(r => r.json())
  .then(projects => {
    buildTopProjects(projects);

    // Exclude the top 3 projects for the river
    const riverProjects = projects.slice(3);
    buildBrickRiver(riverProjects);
  });

/* -------------------------
   Top Projects (Inline Display)
------------------------- */
function buildTopProjects(projects) {
  const top = document.getElementById('top-projects-container');
  top.innerHTML = '';
  const chosen = projects.slice(0, 3); // first 3 projects

  chosen.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'top-card';
    if(index === 0) card.classList.add('first-card');

    // Wrap all content above footer in card-content
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.style.display = 'flex';
    cardContent.style.flexDirection = 'column';
    cardContent.style.gap = '0.6rem';
    cardContent.style.flexGrow = '1';

    // Title
    const title = document.createElement('div');
    title.className = 'tile-title';
    title.textContent = p.title;
    cardContent.appendChild(title);

    // Summary
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'tile-desc';
    summaryDiv.style.fontWeight = 'normal';
    summaryDiv.style.fontSize = '0.85rem';
    summaryDiv.style.margin = '0.5rem 0 1rem 0';
    summaryDiv.style.opacity = '0.85';
    summaryDiv.textContent = p.summary || "";
    cardContent.appendChild(summaryDiv);

    // Description (if exists)
    if (p.description) {
      const desc = document.createElement('p');
      desc.textContent = p.description;
      desc.style.fontWeight = 'normal';
      desc.style.marginBottom = '1rem';
      cardContent.appendChild(desc);
    }

    // Media container
    const mediaContainer = document.createElement('div');
    mediaContainer.style.display = 'flex';
    mediaContainer.style.flexDirection = 'column';
    mediaContainer.style.gap = '0.6rem';

    if (p.image) {
      const img = document.createElement('img');
      img.src = p.image;
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.maxHeight = '200px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '12px';
      mediaContainer.appendChild(img);
    }

    if (p.video) {
      const vidWrapper = document.createElement('div');
      vidWrapper.className = 'video-container';
      vidWrapper.innerHTML = p.video; // insert iframe
      vidWrapper.style.width = '100%';
      vidWrapper.style.overflow = 'hidden';
      vidWrapper.style.display = 'flex';
      vidWrapper.style.justifyContent = 'center';
      cardContent.appendChild(vidWrapper);
    }

    if (p.stl) {
      const stlWrapper = document.createElement('div');
      stlWrapper.className = 'stl-container';
      stlWrapper.id = `stl-${index}`; // unique ID per tile
      stlWrapper.style.width = '100%';
      stlWrapper.style.height = '300px';
      stlWrapper.style.borderRadius = '12px';
      mediaContainer.appendChild(stlWrapper);

      // Load STL after the container exists
      import('./stlShow.js').then(module => {
        module.showSTL(stlWrapper.id, p.stl);
      });
    }




    cardContent.appendChild(mediaContainer);
    card.appendChild(cardContent);

    // Footer container: Links + Tools
    const footerContainer = document.createElement('div');
    footerContainer.style.display = 'flex';
    footerContainer.style.flexDirection = 'column';
    footerContainer.style.gap = '0.5rem';
    footerContainer.style.marginTop = 'auto'; // push to bottom
    footerContainer.style.alignItems = 'flex-start';

    // Link button
    if (p.link) {
      const linkBtn = document.createElement('a');
      linkBtn.href = p.link;
      linkBtn.target = '_blank';
      linkBtn.textContent = 'Learn More';
      linkBtn.style.cssText = `
        display:inline-block;
        padding:6px 10px;
        background:#007bff;
        color:#fff;
        border-radius:6px;
        text-decoration:none;
        font-size:0.9rem;
        width: fit-content;
      `;
      footerContainer.appendChild(linkBtn);
    }

    // Tools container
    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'tile-tools';
    toolsContainer.style.display = 'flex';
    toolsContainer.style.gap = '0.3rem';
    (p.tools || []).forEach(toolFile => {
      const img = document.createElement('img');
      img.src = `/assets/images/tools/${toolFile}`;
      img.alt = toolFile.replace('.svg','');
      img.style.width = '24px';
      img.style.height = '24px';
      toolsContainer.appendChild(img);
    });

    footerContainer.appendChild(toolsContainer);
    card.appendChild(footerContainer);

    top.appendChild(card);
  });
}



/* -------------------------
   Brick River All Projects
------------------------- */
function buildBrickRiver(projects) {
  const container = document.getElementById('flowing-projects-container');
  container.innerHTML = '';

  const perRow = 4;
  const rows = chunk(projects, perRow);

  rows.forEach((rowItems, i) => {
    const row = document.createElement('div');
    row.className = 'flow-row';

    const track = document.createElement('div');
    track.className = 'flow-track';
    track.dataset.paused = 'false';
    track.dataset.speed = 0.04 + i*0.01;
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
  el.style.display = 'flex';
  el.style.flexDirection = 'column';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'tile-title';
  titleDiv.textContent = p.title;
  el.appendChild(titleDiv);

  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'tile-desc';
  summaryDiv.textContent = p.summary || "";
  summaryDiv.style.fontSize = '0.95rem';
  summaryDiv.style.opacity = '0.85';
  summaryDiv.style.marginBottom = 'auto';
  el.appendChild(summaryDiv);

  const toolsContainer = document.createElement('div');
  toolsContainer.style.display = 'flex';
  toolsContainer.style.alignItems = 'center';
  toolsContainer.style.gap = '0.3rem';
  toolsContainer.style.fontStyle = 'italic';
  toolsContainer.style.marginTop = '2rem';

  (p.tools || []).forEach(toolFile => {
    const img = document.createElement('img');
    img.src = '/assets/images/tools/${toolFile}';
    img.alt = toolFile.replace('.svg','');
    img.style.width = '24px';
    img.style.height = '24px';
    toolsContainer.appendChild(img);
  });

  el.appendChild(toolsContainer);

  // Popup listener for river projects only
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

