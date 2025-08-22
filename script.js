document.getElementById('mode-btn').addEventListener('click', ()=>{ document.body.classList.toggle('dark'); });

fetch('projects/projects.json')
  .then(r => r.json())
  .then(projects => {
    buildTopProjects(projects);
    buildBrickRiver(projects);
  })
  .catch(err => console.error('projects.json load error:', err));

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

/* 3D STL Viewer */
function init3DViewer(){
  const container = document.getElementById('3d-viewer');
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f4f4);

  const camera = new THREE.PerspectiveCamera(45,width/height,0.1,1000);
  camera.position.set(0,0,150);

  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(width,height);
  container.innerHTML='';
  container.appendChild(renderer.domElement);

  const light1 = new THREE.DirectionalLight(0xffffff,0.8);
  light1.position.set(1,1,1);
  scene.add(light1);
  const light2 = new THREE.AmbientLight(0xffffff,0.5);
  scene.add(light2);

  const loader = new THREE.STLLoader();
  loader.load('assets/models/test_ism_robot.stl', function(geometry){
    const material = new THREE.MeshPhongMaterial({color:0x0077ff, shininess:80});
    const mesh = new THREE.Mesh(geometry,material);
    geometry.center();
    scene.add(mesh);

    function animate(){
      requestAnimationFrame(animate);
      mesh.rotation.y+=0.004;
      renderer.render(scene,camera);
    }
    animate();
  });
}

window.addEventListener('load', init3DViewer);
window.addEventListener('resize', init3DViewer);
