const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

let keys = {};
let paused = false;
let preguntaActiva = false;
let preguntas = [];
let preguntasUsadas = [];
let score = 0;
let lives = 3;
let groundY = canvas.height - 50;
let lastSpawnX = 0;
let nextCheckpoint = 1000;
let checkpointGuardado = { x: 100, y: groundY - 64 };

const player = {
  x: 100,
  y: groundY - 64,
  width: 64,
  height: 64,
  dy: 0,
  grounded: true,
  direction: 'right',
  hitboxOffsetX: 12,
  hitboxOffsetY: 12,
  hitboxWidth: 40,
  hitboxHeight: 40
};

const blocks = [];
const enemies = [];
const coins = [];
const checkpoints = [];

fetch('preguntas.json')
  .then(res => res.json())
  .then(data => preguntas = data);

document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  canvas.requestFullscreen?.();
  generateWorldSegment();
  gameLoop();
});

document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

function detectCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function mostrarPreguntaTestVisual(callback) {
  preguntaActiva = true;

  const disponibles = preguntas
    .map((p, i) => ({ ...p, index: i }))
    .filter(p => !preguntasUsadas.includes(p.index));

  if (disponibles.length === 0) {
    preguntaActiva = false;
    return callback(false);
  }

  const pregunta = disponibles[Math.floor(Math.random() * disponibles.length)];
  preguntasUsadas.push(pregunta.index);

  const box = document.getElementById('question-box');
  const texto = document.getElementById('question-text');
  const opciones = document.getElementById('question-options');
  const overlay = document.getElementById('overlay-blocker');

  texto.textContent = pregunta.pregunta;
  opciones.innerHTML = '';
  box.classList.remove('hidden');
  overlay.style.display = 'block';

  pregunta.opciones.forEach((opcion, i) => {
    const btn = document.createElement('button');
    btn.textContent = opcion;
    btn.onclick = () => {
      box.classList.add('hidden');
      overlay.style.display = 'none';
      preguntaActiva = false;
      callback(i === pregunta.respuesta);
    };
    opciones.appendChild(btn);
  });
}

function generateWorldSegment() {
  const segmentStart = lastSpawnX;
  const segmentEnd = segmentStart + 1000;

  for (let i = segmentStart; i < segmentEnd; i += 100) {
    blocks.push({ x: i, y: groundY, width: 100, height: 50 });
  }

  if (segmentStart === 0) {
    blocks.push({ x: -100, y: groundY - 200, width: 100, height: 200 });
  }

  for (let i = segmentStart + 200; i < segmentEnd; i += 400) {
    blocks.push({ x: i, y: groundY - 88, width: 40, height: 88 });

    const platformY = groundY - 200;
    blocks.push({ x: i + 100, y: platformY, width: 200, height: 40 });

    enemies.push({
      x: i + 120,
      y: platformY - 64,
      width: 64,
      height: 64,
      dx: 2,
      active: true,
      patrolMin: i + 100,
      patrolMax: i + 300 - 64
    });

    coins.push({ x: i + 180, y: platformY - 40, width: 40, height: 40 });
  }

  for (let i = segmentStart + 300; i < segmentEnd; i += 500) {
    enemies.push({
      x: i,
      y: groundY - 64,
      width: 64,
      height: 64,
      dx: Math.random() < 0.5 ? -2 : 2,
      active: true
    });
  }

  if (segmentEnd >= nextCheckpoint) {
    checkpoints.push({
      x: segmentEnd - 100,
      y: groundY - 40,
      width: 40,
      height: 40,
      triggered: false,
      guardado: false
    });
    nextCheckpoint += 2000;
  }

  lastSpawnX = segmentEnd;
}

function updatePlayer() {
  if (keys['ArrowRight']) player.x += 4;
  if (keys['ArrowLeft']) player.x -= 4;

  player.dy += 1.2;
  player.y += player.dy;

  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.dy = 0;
    player.grounded = true;
  }

  if (keys['Space'] && player.grounded) {
    player.dy = -24;
    player.grounded = false;
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
    if (!en.active) return;

    en.x += en.dx;

    if (en.patrolMin !== undefined && en.patrolMax !== undefined) {
      if (en.x < en.patrolMin || en.x > en.patrolMax) {
        en.dx *= -1;
        en.x = Math.max(en.patrolMin, Math.min(en.x, en.patrolMax));
      }
    }

    blocks.forEach(block => {
      if (block.width === 40) {
        const enemyHitbox = {
          x: en.x,
          y: en.y,
          width: en.width,
          height: en.height
        };
        if (detectCollision(enemyHitbox, block)) {
          en.dx *= -1;
        }
      }
    });

    const playerHitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };

    const enemyHitbox = {
      x: en.x,
      y: en.y,
      width: en.width,
      height: en.height
    };

    if (detectCollision(playerHitbox, enemyHitbox)) {
      lives--;
      livesDisplay.textContent = lives;

      if (lives <= 0) {
        mostrarPreguntaTestVisual(correcta => {
          if (correcta) {
            alert("¡Correcto! Has ganado una vida extra.");
            lives = 1;
            livesDisplay.textContent = lives;
            player.x = 100;
            player.y = groundY - player.height;
          } else {
            alert("Has perdido. Recarga la página para intentarlo de nuevo.");
          }
        });
      } else {
        if (checkpointGuardado) {
          player.x = checkpointGuardado.x;
          player.y = checkpointGuardado.y;
        } else {
          player.x = 100;
          player.y = groundY - player.height;
        }
      }
    }
  });
}

function updateCoins() {
  coins.forEach((coin, i) => {
    const hitbox = {
      x: player.x + player.hitboxOffsetX,
      y: player.y + player.hitboxOffsetY,
      width: player.hitboxWidth,
      height: player.hitboxHeight
    };
    if (detectCollision(hitbox, coin)) {
      score += 5;
      scoreDisplay.textContent = score;
      coins.splice(i, 1);
    }
  });
}

function checkCheckpoints() {
  checkpoints.forEach(cp => {
    if (!cp.triggered && detectCollision(player, cp)) {
      cp.triggered = true;
      mostrarPreguntaTestVisual(correcta => {
        if (correcta) {
          alert("¡Progreso guardado!");
          cp.guardado = true;
          checkpointGuardado = { x: cp.x, y: cp.y };
        } else {
          alert("Respuesta incorrecta. Puedes seguir jugando, pero no se guardará tu progreso.");
        }
      });
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  ctx.fillStyle = 'gray';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = 'gold';
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.width, c.height));

  ctx.fillStyle = 'purple';
  checkpoints.forEach(cp => ctx.fillRect(cp.x, cp.y, cp.width, cp.height));

  ctx.fillStyle = 'red';
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.width, e.height));

  ctx.fillStyle = 'cyan';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.restore();
}

function gameLoop() {
  if (!paused && !preguntaActiva) {
    updatePlayer();
    updateEnemies();
    updateCoins();
    checkCheckpoints();
    draw();
  }
  requestAnimationFrame(gameLoop);
}
