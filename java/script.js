const overlay = document.getElementById("overlay");
const gameArea = document.getElementById("game-area");
const heroEl = document.getElementById("hero");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const messageEl = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

const bgVideo = document.getElementById("bg-video");

const shipTop = document.querySelector(".ship-top");
const shipMiddle = document.querySelector(".ship-middle");
const shipBottom = document.querySelector(".ship-bottom");

let gameRunning = false;
let frameId = null;
let timerId = null;
let spawnId = null;

let heroY = 0;              
let heroSpeed = 4;             
const baseHeroSpeed = 4;       
const heroSpeedStep = 1.5;     
let lasers = [];            
let laserSpeed = 6;         
const baseLaserSpeed = 6;   
const laserSpeedStep = 2;  
let spawnRate = 900;           
const baseSpawnRate = 900;    
const minSpawnRate = 250;     
let score = 0;
let timeLeft = 60;         

// For keyboard control
const keys = {
  up: false,
  down: false,
};

// ----- Helper functions -----
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Initialize hero position to vertical center
function positionHeroCenter() {
  const areaRect = gameArea.getBoundingClientRect();
  const heroRect = heroEl.getBoundingClientRect();
  heroY = (areaRect.height - heroRect.height) / 2; 
  heroEl.style.top = heroY + "px";
}

// Reset game state without starting it
function resetGame() {
  // Stop loops/intervals
  cancelAnimationFrame(frameId);
  clearInterval(timerId);
  clearInterval(spawnId);
  overlay.classList.remove("no-overlay");

  // Stop and rewind video
  if (bgVideo) {
    bgVideo.pause();
    bgVideo.currentTime = 0;
  }

  score = 0;
  timeLeft = 60;
  laserSpeed = baseLaserSpeed;   
  heroSpeed = baseHeroSpeed;     
  gameRunning = false;

  // Remove any lasers
  lasers.forEach((l) => {
    if (l.el && l.el.parentNode) {
      l.el.parentNode.removeChild(l.el);
    }
  });
  lasers = [];

  score = 0;
  timeLeft = 60;
  gameRunning = false;

  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  messageEl.textContent = "Press Start to begin.";

  // Reset hero position
  heroEl.classList.remove("hit");
  positionHeroCenter();

  // Buttons
  startBtn.disabled = false;
  resetBtn.disabled = true;
}

// Start a new run
function startGame() {
  resetGame();
  gameRunning = true;
  startBtn.disabled = true;
  resetBtn.disabled = false;
  messageEl.textContent = "Dodge the lasers!";
  overlay.classList.add("no-overlay");

   // Start video from the beginning and play
   if (bgVideo) {
    bgVideo.currentTime = 0;   
    bgVideo.play();           
  }

  // Timer (countdown every second)
  timerId = setInterval(() => {
    if (!gameRunning) return;
  
    timeLeft -= 1;
    timeEl.textContent = timeLeft;
  
    // score for surviving
    score += 1;
    scoreEl.textContent = score;
  
    // ---------- DIFFICULTY RAMP ----------
    const elapsed = 60 - timeLeft;                   
    const difficultyStep = Math.floor(elapsed / 10); 
  
    laserSpeed = baseLaserSpeed + difficultyStep * laserSpeedStep;
    heroSpeed  = baseHeroSpeed  + difficultyStep * heroSpeedStep;
    spawnRate = Math.max(
      minSpawnRate,
      baseSpawnRate - difficultyStep * 150   
    );
  
    if (timeLeft <= 0) {
      endGame("time");
    }
  }, 1000);
  
  

  // Spawn lasers from the ships
  spawnLoop();

  // Start the animation loop
  frameId = requestAnimationFrame(update);
}

// End the run
function endGame(reason) {
  gameRunning = false;
  clearInterval(timerId);
  clearInterval(spawnId);
  cancelAnimationFrame(frameId);

  // Pause video on game over
  if (bgVideo) {
    bgVideo.pause();
  }

  if (reason === "hit") {
    messageEl.textContent = "You got hit! Final score: " + score + ". Press Reset or Start to try again.";
  } else {
    messageEl.textContent = "Time's up! Final score: " + score + ". Press Reset or Start to play again.";
  }
}

// Spawn a laser from a random ship row
function spawnLaser() {
  if (!gameRunning) return;

  // Pick one of the three ships
  const ships = [shipTop, shipMiddle, shipBottom];
  const chosen = ships[Math.floor(Math.random() * ships.length)];
  const areaRect = gameArea.getBoundingClientRect();
  const shipRect = chosen.getBoundingClientRect();

  const laserEl = document.createElement("img");
  laserEl.classList.add("laser");

  if (chosen === shipTop) {
    laserEl.src = "assets/images/laser_blue.svg";
  } else if (chosen === shipMiddle) {
    laserEl.src = "assets/images/laser_green.svg";
  } else {
    laserEl.src = "assets/images/laser_red.svg";
  }


  // Position: just in front of the ship
  const startX = shipRect.left - areaRect.left - shipRect.width * 0.1;
  const startY = shipRect.top - areaRect.top + shipRect.height * 0.4;

  laserEl.style.left = startX + "px";
  laserEl.style.top = startY + "px";

  gameArea.appendChild(laserEl);

  // Track in state
  lasers.push({
    el: laserEl,
    x: startX,
    y: startY,
  });
}

function spawnLoop() {
  if (!gameRunning) return;

  spawnLaser();              

  spawnId = setTimeout(spawnLoop, spawnRate); 
}


// Main update loop (movement + collision)
function update() {
  if (!gameRunning) return;

  const areaRect = gameArea.getBoundingClientRect();

  // ---- Move hero (inside game-area coordinates) ----
  const heroHeight = heroEl.offsetHeight;

  if (keys.up) {
    heroY -= heroSpeed;
  }
  if (keys.down) {
    heroY += heroSpeed;
  }

  // Clamp hero so they stay fully inside game area
  const edgeMargin = 10; 
  heroY = clamp(heroY, edgeMargin, areaRect.height - heroHeight - edgeMargin);
  heroEl.style.top = heroY + "px";

    // ---- Compute hero hitbox bounds in VIEWPORT coords ----
  const hitbox = heroEl.querySelector(".hitbox");
  const heroRect = hitbox.getBoundingClientRect();

  // ---- Update lasers ----
  const newLasers = [];

  lasers.forEach((laser) => {
    // Move left in local coords, still using x for layout
    laser.x -= laserSpeed;
    laser.el.style.left = laser.x + "px";

    // Laser rect in VIEWPORT coords
    const laserRect = laser.el.getBoundingClientRect();

    // ---- AABB collision check in VIEWPORT coords ----
    const overlap = !(
      laserRect.right < heroRect.left ||
      laserRect.left > heroRect.right ||
      laserRect.bottom < heroRect.top ||
      laserRect.top > heroRect.bottom
    );

    if (overlap) {
      heroEl.classList.remove("hit");
      void heroEl.offsetWidth;
      heroEl.classList.add("hit");

      endGame("hit");

      if (laser.el.parentNode) {
        laser.el.parentNode.removeChild(laser.el);
      }
      return;
    }

    // Remove lasers that go off the LEFT edge of the game area
    if (laserRect.right < gameArea.getBoundingClientRect().left) {
      score += 5;
      scoreEl.textContent = score;

      if (laser.el.parentNode) {
        laser.el.parentNode.removeChild(laser.el);
      }
      return;
    }

    newLasers.push(laser);
  });


  lasers = newLasers;

  // Continue loop
  frameId = requestAnimationFrame(update);
}


// ----- Event listeners -----
window.addEventListener("keydown", (e) => {
  // ----- SPACE: start game if not running -----
  if ((e.code === "Space" || e.key === " ") && !gameRunning) {
    e.preventDefault();      
    startGame();
    return;                  
  }

  // ----- MOVE UP: ArrowUp or W -----
  if (
    e.key === "ArrowUp" ||
    e.key === "Up" ||
    e.code === "ArrowUp" ||
    e.key === "w" ||
    e.key === "W"
  ) {
    e.preventDefault();
    keys.up = true;
  }

  // ----- MOVE DOWN: ArrowDown or S -----
  if (
    e.key === "ArrowDown" ||
    e.key === "Down" ||       
    e.code === "ArrowDown" ||
    e.key === "s" ||
    e.key === "S"
  ) {
    e.preventDefault();
    keys.down = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (
    e.key === "ArrowUp" ||
    e.key === "Up" ||
    e.code === "ArrowUp" ||
    e.key === "w" ||
    e.key === "W"
  ) {
    keys.up = false;
  }

  if (
    e.key === "ArrowDown" ||
    e.key === "Down" ||
    e.code === "ArrowDown" ||
    e.key === "s" ||
    e.key === "S"
  ) {
    keys.down = false;
  }
});


startBtn.addEventListener("click", () => {
  if (!gameRunning) {
    startGame();
  }
});

resetBtn.addEventListener("click", () => {
  resetGame();
});




// When the page loads, set initial hero position and message
window.addEventListener("load", () => {
  positionHeroCenter();
  messageEl.textContent = "Press Start, then dodge the lasers!";
  // Pause video on initial load
  if (bgVideo) {
    bgVideo.pause();
    bgVideo.currentTime = 0;
  }
});
