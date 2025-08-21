const projects = [
  {
    title: "ROS 2 Arm Simulation",
    description: "A modular URDF/Xacro setup for joint control and Gazebo integration.",
    link: "https://github.com/sathvikyechuri/ros2-arm-sim"
  },
  {
    title: "ISM Research Site",
    description: "Embedded Wix site showcasing my ISM project.",
    link: "https://your-wix-url.wixsite.com"
  }
];

const board = document.getElementById("project-board");
const popup = document.getElementById("popup");
const popupTitle = document.getElementById("popup-title");
const popupDesc = document.getElementById("popup-description");
const popupLink = document.getElementById("popup-link");
const closeBtn = document.getElementById("close");

projects.forEach(project => {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.innerText = project.title;
  tile.onclick = () => {
    popupTitle.innerText = project.title;
    popupDesc.innerText = project.description;
    popupLink.href = project.link;
    popupLink.innerText = "View Project";
    popup.classList.remove("hidden");
  };
  board.appendChild(tile);
});

closeBtn.onclick = () => popup.classList.add("hidden");