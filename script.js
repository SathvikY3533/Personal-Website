// -------------------------
// Dark Mode
// -------------------------
document.getElementById('mode-btn').addEventListener('click', ()=>{ 
  document.body.classList.toggle('dark'); 
});

// -------------------------
// Projects
// -------------------------
fetch('./projects/projects.json')
  .then(r => {
    if (!r.ok) throw new Error(`HTTP error! Status: ${r.status}`);
    return r.json();
  })
  .then(projects => {
    console.log('Loaded projects:', projects);
    buildTopProjects(projects);
    buildBrickRiver(projects);
  })
  .catch(err => {
    console.error('projects.json load error:', err);
    document.getElementById('top-projects-container').innerHTML = 'Failed to load projects.';
    document.getElementById('flowing-projects-container').innerHTML = 'Failed to load projects.';
  });

function buildTopProjects(projects){
  const top = document.getElementById('top-projects-container');
  top.innerHTML = '';
  const chosen = projects.slice(0, 2);
  chosen.forEach(p => {
    const card = document.createElement('div');
    card.className = 'top-card';
    card.textContent = p.title;
    top.appendChild(card);
  });
}

function buildBrickRiver(projects){
  const container = document.getElementById('flowing-projects-container');
  container.innerHTML = '';
  const perRow = 5;
  const rows = chunk(projects, perRow);

  rows.forEach((rowItems, i) => {
    const row = document.createElement('div');
    row.className = 'flow-row ' + (i%2===0?'left-to-right':'right-to-left');
    const track = document.createElement('div');
    track.className = 'flow-track';
    track.style.setProperty('--dur', `${42+i*6}s`);
    rowItems.forEach(p => track.appendChild(createTile(p)));
    rowItems.forEach(p => track.appendChild(createTile(p)));
    row.appendChild(track);
    container.appendChild(row);
  });
}

function chunk(arr, size){
  const out = [];
  for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}

function createTile(p){
  const el = document.createElement('div');
  el.className='tile';
  el.innerHTML=`<div class="t">${p.title}</div>`;
  return el;
}

// -------------------------
// 3D STL Viewer (Three.js ES Modules)
// -------------------------
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/STLLoader.js';

function init3DViewer() {
  const container = document.getElementById('3d-viewer');
  const width = container.clientWidth;
  const height = container.clientHeight;

  container.innerHTML = 'Loading 3D model...';

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f4f4);
  const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
  camera.position.set(0, 0, 150);

  // Lights
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1,1,1);
  scene.add(dirLight);
  const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambLight);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // STL Loader
  const loader = new STLLoader();
  loader.load(
    './assets/models/test_ism_robot.stl',
    geometry => {
      const material = new THREE.MeshPhongMaterial({ color: 0x0077ff, shininess: 80 });
      const mesh = new THREE.Mesh(geometry, material);

      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      mesh.position.sub(center);

      scene.add(mesh);

      container.innerHTML = ''; // remove loading text

      function animate() {
        requestAnimationFrame(animate);
        mesh.rotation.y += 0.004;
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
    },
    xhr => {
      container.innerHTML = `Loading 3D model... ${Math.floor((xhr.loaded/xhr.total)*100)}%`;
    },
    err => {
      console.error('STL load error:', err);
      container.innerHTML = 'Failed to load 3D model.';
    }
  );
}

window.addEventListener('load', init3DViewer);
window.addEventListener('resize', init3DViewer);
