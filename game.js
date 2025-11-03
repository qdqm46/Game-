// 🎮 Elementos principales del juego
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

// 🧠 Variables globales
let keys = {};
let paused = false;
let debugMode = false;
let score = 0;
let lives = 3;
let dying = false;
let deathTimer = 0;
let lastSpawnX = 0;
let nextCheckpoint = 100000;
let checkpointsResueltos = 0;
let lastCheckpoint = { x: 50, y: 0 };

// 📏 Altura dinámica del suelo
let groundY;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  groundY = canvas.height - 50;
  if (lastCheckpoint.y === 0) {
    lastCheckpoint.y = groundY - 248;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 🧍 Configuración del jugador
const player = {
  x: lastCheckpoint.x,
  y: lastCheckpoint.y,
  width: 248,
  height: 248,
  dy: 0,
  grounded: true,
  attack: false,
  direction: 'right',
  hitboxOffsetX: 80,
  hitboxOffsetY: 60,
  hitboxWidth: 88,
  hitboxHeight: 128
};

// 🖼️ Carga de imágenes
const playerRightImg = new Image();
playerRightImg.src = 'assets/player-right.png';
const playerLeftImg = new Image();
playerLeftImg.src = 'assets/player-left.png';
const enemyRightImg = new Image();
enemyRightImg.src = 'assets/enemy-right.png';
const enemyLeftImg = new Image();
enemyLeftImg.src = 'assets/enemy-left.png';

// 🧱 Elementos del mundo
let blocks = [];
let enemies = [];
let coins = [];
let checkpoints = [];

// ❓ Banco de preguntas
let questionBank = [];
let usedQuestions = new Set();

// 📦 Cargar preguntas
fetch('questions.json')
  .then(res => res.json())
  .then(data => {
    questionBank = data;
  });

// 🧠 Cargar progreso guardado
const savedCheckpoint = localStorage.getItem('lastCheckpoint');
if (savedCheckpoint) {
  lastCheckpoint = JSON.parse(savedCheckpoint);
  player.x = lastCheckpoint.x;
  player.y = lastCheckpoint.y;
}

// ▶️ Botón de inicio
document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  fetchLeaderboardFromGitHub();
  generateWorldSegment();
  gameLoop();
});

// 🎹 Captura de teclas
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// 🕹️ Acciones del jugador
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && player.grounded && !dying) {
    player.dy = -28;
    player.grounded = false;
  }
  if (e.code === 'KeyF') {
    player.attack = true;
    setTimeout(() => player.attack = false, 300);
  }
  if (e.code === 'KeyP') paused = !paused;
  if (e.code === 'F5') {
    e.preventDefault();
    debugMode = !debugMode;
  }
});

// 🔍 Colisión entre objetos
function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
function generateWorldSegment() {
  const segmentStart = lastSpawnX;
  const segmentEnd = segmentStart + 800;

  // Suelo
  for (let i = segmentStart; i < segmentEnd; i += 40) {
    blocks.push({ x: i, y: groundY - 40, width: 40, height: 40 });
  }

  // Obstáculos altos en el cielo
  for (let i = segmentStart + 400; i < segmentEnd; i += 800) {
    if (Math.random() < 0.3) {
      const skyY = groundY - 600 - Math.floor(Math.random() * 200);
      blocks.push({ x: i, y: skyY, width: 100, height: 40 });
      coins.push({ x: i + 40, y: skyY - 40, width: 20, height: 20, value: 10 });
    }
  }

  // Enemigos en el suelo (muy separados)
  for (let i = segmentStart + 600; i < segmentEnd; i += 1200) {
    if (Math.random() < 0.4) {
      enemies.push({
        x: i,
        y: groundY - 248,
        width: 248,
        height: 248,
        hitboxOffsetX: 80,
        hitboxOffsetY: 60,
        hitboxWidth: 88,
        hitboxHeight: 128,
        hp: 1,
        dx: 1,
        active: true
      });
    }
  }

  // Checkpoints cada 100,000 píxeles
  if (segmentEnd >= nextCheckpoint && questionBank.length > usedQuestions.size) {
    const available = questionBank.filter(q => !usedQuestions.has(q.question));
    if (available.length > 0) {
      const q = available[Math.floor(Math.random() * available.length)];
      usedQuestions.add(q.question);
      checkpoints.push({
        x: segmentEnd,
        y: groundY - 60,
        width: 60,
        height: 60,
        question: q.question,
        answer: q.answer,
        triggered: false,
        value: 30
      });
      nextCheckpoint += 100000;
    }
  }

  lastSpawnX = segmentEnd;
}

function updatePlayer() {
  if (keys['ArrowRight']) {
    player.x += 4;
    player.direction = 'right';
  }
  if (keys['ArrowLeft']) {
    player.x -= 4;
    player.direction = 'left';
  }

  player.dy += 1.2;
  player.y += player.dy;

  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.dy = 0;
    player.grounded = true;
  }

  blocks.forEach(block => {
    const hitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };

    if (
      player.dy < 0 &&
      hitbox.y <= block.y + block.height &&
      hitbox.y + hitbox.height > block.y + block.height &&
      hitbox.x < block.x + block.width &&
      hitbox.x + hitbox.width > block.x
    ) {
      player.dy = 0;
      player.y = block.y + block.height - player.hitboxOffsetY;
    }

    if (
      player.dy >= 0 &&
      hitbox.y + hitbox.height >= block.y &&
      hitbox.y < block.y &&
      hitbox.x < block.x + block.width &&
      hitbox.x + hitbox.width > block.x
    ) {
      player.y = block.y - player.hitboxOffsetY - player.hitboxHeight;
      player.dy = 0;
      player.grounded = true;
    }
  });

  if (player.x + canvas.width > lastSpawnX - 400) {
    generateWorldSegment();
  }
}

function updateEnemies() {
  enemies.forEach(en => {
    if (!en.active || dying) return;

    const distance = Math.abs(en.x - player.x);
    const speed = 2;

    if (distance < 300) {
      en.dx = player.x > en.x ? 1 : -1;
    }

    const nextX = en.x + (en.dx > 0 ? en.width : -5);
    const nextY = en.y + en.height - 5;
    const blocked = blocks.some(block =>
      nextX < block.x + block.width &&
      nextX + 5 > block.x &&
      nextY < block.y + block.height &&
      nextY + 5 > block.y
    );

    if (blocked) en.dx *= -1;
    en.x += en.dx * speed;

    const playerHitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };

    const enemyHitbox = {
      x: en.x + en.hitboxOffsetX,
      y: en.y + en.hitboxOffsetY,
      width: en.hitboxWidth,
      height: en.hitboxHeight
    };

    if (detectCollision(playerHitbox, enemyHitbox) && !dying) {
      lives--;
      livesDisplay.textContent = lives;
      dying = true;
      deathTimer = 0;
      const penalty = Math.floor(player.x / 1000) * 100;
      score = Math.max(0, score - penalty);
      scoreDisplay.textContent = score;
    }
  });

  enemies = enemies.filter(en => en.hp > 0);
}

function updateCoins() {
  coins = coins.filter(coin => {
    if (detectCollision(player, coin)) {
      score += coin.value || 10;
      scoreDisplay.textContent = score;
      return false;
    }
    return true;
  });
}

function checkCheckpoints() {
  checkpoints.forEach(cp => {
    if (!cp.triggered && detectCollision(player, cp)) {
      cp.triggered = true;
      const respuesta = prompt(cp.question);
      if (respuesta && respuesta.toLowerCase() === cp.answer.toLowerCase()) {
        alert("¡Progreso guardado!");
        score += cp.value || 30;
        scoreDisplay.textContent = score;
        lastCheckpoint = { x: cp.x, y: cp.y - player.height };
        localStorage.setItem('lastCheckpoint', JSON.stringify(lastCheckpoint));
        checkpointsResueltos++;
        if (checkpointsResueltos % 5 === 0) {
          lives++;
          livesDisplay.textContent = lives;
        }
      } else {
        alert("Respuesta incorrecta.");
      }
    }
  });
}

function handleDeathAnimation() {
  deathTimer++;
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);
  ctx.globalAlpha = Math.max(0, 1 - deathTimer / 60);
  const img = player.direction === 'right' ? playerRightImg : playerLeftImg;
  ctx.drawImage(img, player.x, player.y, player.width, player.height);
  ctx.restore();

  if (deathTimer >= 60) {
    dying = false;
    if (lives <= 0) {
      showGameOver();
    } else {
      player.x = lastCheckpoint.x;
      player.y = lastCheckpoint.y;
      player.dy = 0;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  const img = player.direction === 'right' ? playerRightImg : playerLeftImg;
  if (!dying) ctx.drawImage(img, player.x, player.y, player.width, player.height);

  ctx.fillStyle = 'gray';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = 'gold';
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.width, c.height));

  enemies.forEach(e => {
    const eImg = e.dx >= 0 ? enemyRightImg : enemyLeftImg;
    ctx.drawImage(eImg, e.x, e.y, e.width, e.height);
  });

  ctx.fillStyle = 'purple';
  checkpoints.forEach(cp => ctx.fillRect(cp.x, cp.y, cp.width, cp.height));

  ctx.restore();
}

function gameLoop() {
  if (!paused) {
    if (dying) {
      draw();
      handleDeathAnimation();
    } else {
      updatePlayer();
      updateEnemies();
      updateCoins();
      checkCheckpoints();
      draw();
    }
  }
  requestAnimationFrame(gameLoop);
}
