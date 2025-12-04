// Simple 2D dodging game
// Hero on the left moves up/down to dodge lasers from ships on the right.

const overlay = document.getElementById("overlay");
const gameArea = document.getElementById("game-area");
const heroEl = document.getElementById("hero");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const messageEl = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

const shipTop = document.querySelector(".ship-top");
const shipMiddle = document.querySelector(".ship-middle");
const shipBottom = document.querySelector(".ship-bottom");

let gameRunning = false;
let frameId = null;
let timerId = null;
let spawnId = null;

let heroY = 0;              // current top position (px inside game area)
let heroSpeed = 4;          // movement speed (px per frame)
let lasers = [];            // { el, x, y }
let laserSpeed = 6;         // px per frame
let score = 0;
let timeLeft = 60;          // seconds

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
  heroY = (areaRect.height - heroRect.height) / 2; // true vertical center
  heroEl.style.top = heroY + "px";
}

// Reset game state without starting it
function resetGame() {
  // Stop loops/intervals
  cancelAnimationFrame(frameId);
  clearInterval(timerId);
  clearInterval(spawnId);

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

  // Timer (countdown every second)
  timerId = setInterval(() => {
    if (!gameRunning) return;
    timeLeft -= 1;
    timeEl.textContent = timeLeft;

    // small score for surviving
    score += 1;
    scoreEl.textContent = score;

    if (timeLeft <= 0) {
      endGame("time");
    }
  }, 1000);

  // Spawn lasers from the ships
  spawnId = setInterval(spawnLaser, 900); // every 0.9s

  // Start the animation loop
  frameId = requestAnimationFrame(update);
}

// End the run
function endGame(reason) {
  gameRunning = false;
  clearInterval(timerId);
  clearInterval(spawnId);
  cancelAnimationFrame(frameId);

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
  const edgeMargin = 10; // pixels of padding from top/bottom
  heroY = clamp(
    heroY,
    edgeMargin,
    areaRect.height - heroHeight - edgeMargin
  );
  heroEl.style.top = heroY + "px";

  // ---- Compute hero bounds in LOCAL (game-area) coords ----
  const hitbox = heroEl.querySelector(".hitbox");
  const heroTop = hitbox.offsetTop + heroY;
  const heroBottom = heroTop + hitbox.offsetHeight;
  const heroLeft = hitbox.offsetLeft + heroEl.offsetLeft;
  const heroRight = heroLeft + hitbox.offsetWidth;


  // ---- Update lasers ----
  const newLasers = [];

  lasers.forEach((laser) => {
    // Move left in local coords
    laser.x -= laserSpeed;
    laser.el.style.left = laser.x + "px";

    const laserTop = laser.y;
    const laserBottom = laser.y + laser.el.offsetHeight;
    const laserLeft = laser.x;
    const laserRight = laser.x + laser.el.offsetWidth;

    // ---- Local AABB collision check ----
    const overlap = !(
      laserRight < heroLeft ||
      laserLeft > heroRight ||
      laserBottom < heroTop ||
      laserTop > heroBottom
    );

    if (overlap) {
      // Hero hit: play small effect and end game
      heroEl.classList.remove("hit");
      void heroEl.offsetWidth; // restart animation
      heroEl.classList.add("hit");

      endGame("hit");

      if (laser.el.parentNode) {
        laser.el.parentNode.removeChild(laser.el);
      }
      return; // don't keep this laser
    }

    // ---- Remove lasers that go off the LEFT edge ----
    if (laserRight < 0) {
      // Count a successful dodge
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
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    keys.up = true;
  }
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    keys.down = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
    keys.up = false;
  }
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
    keys.down = false;
  }
});

startBtn.addEventListener("click", () => {
  if (!gameRunning) {
    startGame();
    overlay.classList.add("no-overlay");  // TURN OFF overlay when game starts
  }
});


resetBtn.addEventListener("click", () => {
  resetGame();
  overlay.classList.remove("no-overlay");  // TURN ON overlay after reset
});


// Clicking in game area also starts game if stopped
gameArea.addEventListener("click", () => {
  if (!gameRunning) {
    startGame();
  }
});

// When the page loads, set initial hero position and message
window.addEventListener("load", () => {
  positionHeroCenter();
  messageEl.textContent = "Press Start, then dodge the lasers!";
});
