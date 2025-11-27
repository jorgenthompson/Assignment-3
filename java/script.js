// Simple 2D dodging game
// Hero on the left moves up/down to dodge lasers from ships on the right.

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
  heroY = (areaRect.height - heroRect.height) / 2;
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

  // Laser DOM element
  const laserEl = document.createElement("div");
  laserEl.classList.add("laser");

  // Color based on ship
  if (chosen === shipTop) {
    laserEl.classList.add("laser-blue");
  } else if (chosen === shipMiddle) {
    laserEl.classList.add("laser-green");
  } else {
    laserEl.classList.add("laser-red");
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

// Simple AABB collision check
function isColliding(rectA, rectB) {
  return !(
    rectA.right < rectB.left ||
    rectA.left > rectB.right ||
    rectA.bottom < rectB.top ||
    rectA.top > rectB.bottom
  );
}

// Main update loop (movement + collision)
function update() {
  if (!gameRunning) return;

  // Move hero based on keys
  const areaRect = gameArea.getBoundingClientRect();
  const heroRect = heroEl.getBoundingClientRect();

  if (keys.up) {
    heroY -= heroSpeed;
  }
  if (keys.down) {
    heroY += heroSpeed;
  }

  heroY = clamp(heroY, 0, areaRect.height - heroRect.height);
  heroEl.style.top = heroY + "px";

  // Update lasers
  const newLasers = [];
  const heroBounds = heroEl.getBoundingClientRect();

  lasers.forEach((laser) => {
    // Move left
    laser.x -= laserSpeed;
    laser.el.style.left = laser.x + "px";

    const laserRect = laser.el.getBoundingClientRect();

    // Check collision with hero
    if (isColliding(heroBounds, laserRect)) {
      // Hero hit: play small effect and end game
      heroEl.classList.remove("hit");
      void heroEl.offsetWidth; // restart animation
      heroEl.classList.add("hit");

      endGame("hit");
      // Remove the laser element
      if (laser.el.parentNode) {
        laser.el.parentNode.removeChild(laser.el);
      }
      return; // don't keep this laser
    }

    // Remove lasers that go off the left edge
    if (laserRect.right < areaRect.left) {
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
  }
});

resetBtn.addEventListener("click", () => {
  resetGame();
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
