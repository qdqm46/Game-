const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');

let keys = {};
let score = 0;
let lives = 3;
let groundY = canvas.height - 50;

const player = {
  x: 100,
  y: groundY - 64,
  width: 64,
  height: 64,
  dy: 0,
  grounded: true
};

const blocks = [];
const enemies = [];

document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-menu').style.display = 'none';
  canvas.requestFullscreen?.();
  generateWorld();
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

function generateWorld() {
  for (let i = 0; i < canvas.width * 2; i += 100) {
    blocks.push({ x: i, y: groundY, width: 100, height: 50 });
  }

  blocks.push({ x: 400, y: groundY - 150, width: 200, height: 40 });

  enemies.push({ x: 600, y: groundY - 64, width: 64, height: 64, dx: 2 });
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
    if (detectCollision(player, block)) {
      if (player.dy >= 0) {
        player.y = block.y - player.height;
        player.dy = 0;
        player.grounded = true;
      }
    }
  });
}

function updateEnemies() {
  enemies.forEach(en => {
    en.x += en.dx;

    blocks.forEach(block => {
      if (block.width === 40 && detectCollision(en, block)) {
        en.dx *= -1;
      }
    });

    if (detectCollision(player, en)) {
      lives--;
      livesDisplay.textContent = lives;
      player.x = 100;
      player.y = groundY - player.height;
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-player.x + canvas.width / 2, 0);

  ctx.fillStyle = 'gray';
  blocks.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

  ctx.fillStyle = 'red';
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.width, e.height));

  ctx.fillStyle = 'cyan';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.restore();
}

function gameLoop() {
  updatePlayer();
  updateEnemies();
  draw();
  requestAnimationFrame(gameLoop);
}
