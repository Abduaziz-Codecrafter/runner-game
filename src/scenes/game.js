import k from "../kaplayCtx";
import { makeSonic } from "../entities/sonic";
import { makeMotobug } from "../entities/motobug";
import { makeRing } from "../entities/ring";

// Constants
const BG_WIDTH = 1920;
const BG_SCALE = 2;
const PLATFORM_WIDTH = 1280;
const PLATFORM_SCALE = 4;
const INITIAL_GAME_SPEED = 300;
const GAME_SPEED_INCREMENT = 50;
const GAME_SPEED_MAX = 3000;
const BG_SCROLL_FACTOR = 0.05;
const GROUND_Y_POSITION = 832;
const SCORE_FONT = "mania";
const SCORE_SIZE = 72;
const SCORE_POSITION = { x: 20, y: 20 };
const ENEMY_SPAWN_RANGE = [0.5, 2.5];
const RING_SPAWN_RANGE = [0.5, 3];
const ENTITY_EXIT_THRESHOLD = -100; // Adjust as needed

export default function game() {
  // Sound and Physics Initialization
  const citySfx = k.play("city", { volume: 0.08, loop: true });
  k.setGravity(3100);

  // Background Setup
  const bgPieces = [
    k.add([
      k.sprite("chemical-bg"),
      k.pos(0, 0),
      k.scale(BG_SCALE),
      k.opacity(0.8),
    ]),
    k.add([
      k.sprite("chemical-bg"),
      k.pos(BG_WIDTH, 0),
      k.scale(BG_SCALE),
      k.opacity(0.8),
    ]),
  ];

  // Platforms Setup (Retained from Original Code)
  const platformWidth = 1280;
  const platforms = [
    k.add([k.sprite("platforms"), k.pos(0, 450), k.scale(PLATFORM_SCALE)]),
    k.add([
      k.sprite("platforms"),
      k.pos(platformWidth, 450),
      k.scale(PLATFORM_SCALE),
    ]),
  ];

  // Scoring System
  let score = 0;
  let scoreMultiplier = 0;

  const scoreText = k.add([
    k.text(`SCORE: ${score}`, { font: SCORE_FONT, size: SCORE_SIZE }),
    k.pos(SCORE_POSITION.x, SCORE_POSITION.y),
  ]);

  // Player Setup
  const sonic = makeSonic(k.vec2(200, 745));
  sonic.setControls();
  sonic.setEvents();

  // Collision Handlers
  sonic.onCollide("enemy", handleEnemyCollision);
  sonic.onCollide("ring", handleRingCollision);

  // Debounce Flag to Prevent Rapid Collisions
  let canCollide = true;

  function handleEnemyCollision(enemy) {
    if (!canCollide) return;
    canCollide = false;

    if (!sonic.isGrounded()) {
      // Enemy Defeated Logic
      k.play("destroy", { volume: 0.1 });
      k.play("hyper-ring", { volume: 0.1 });
      k.destroy(enemy);
      sonic.play("jump");
      sonic.jump();
      scoreMultiplier = scoreMultiplier > 0 ? scoreMultiplier + 1 : 1;
      score += 10 * scoreMultiplier;
      updateScoreUI();

      sonic.ringCollectUI.text =
        scoreMultiplier === 1 ? "10" : `x${scoreMultiplier}`;
      k.wait(1, () => {
        sonic.ringCollectUI.text = "";
      });
    } else {
      // Game Over Logic
      k.play("hurt", { volume: 0.1 });
      k.setData("current-score", score);
      k.go("gameover", citySfx);
    }

    // Reset Debounce Flag
    k.wait(0.5, () => {
      canCollide = true;
    });
  }

  function handleRingCollision(ring) {
    if (!canCollide) return;
    canCollide = false;

    // Ring Collected Logic
    k.play("ring", { volume: 0.1 });
    k.destroy(ring);
    score++;
    updateScoreUI();
    sonic.ringCollectUI.text = "+1";
    k.wait(1, () => {
      sonic.ringCollectUI.text = "";
    });

    // Reset Debounce Flag
    k.wait(0.5, () => {
      canCollide = true;
    });
  }

  function updateScoreUI() {
    scoreText.text = `SCORE: ${score}`;
  }

  // Game Speed Control
  let gameSpeed = INITIAL_GAME_SPEED;
  k.loop(1, () => {
    gameSpeed = Math.min(gameSpeed + GAME_SPEED_INCREMENT, GAME_SPEED_MAX);
  });

  // Entity Pools for Performance Optimization
  const enemyPool = [];
  const ringPool = [];

  function getMotobug() {
    return enemyPool.length > 0
      ? enemyPool.pop()
      : makeMotobug(k.vec2(1950, 773));
  }

  function recycleMotobug(motobug) {
    enemyPool.push(motobug);
    k.destroy(motobug);
  }

  function getRing() {
    return ringPool.length > 0 ? ringPool.pop() : makeRing(k.vec2(1950, 745));
  }

  function recycleRing(ring) {
    ringPool.push(ring);
    k.destroy(ring);
  }

  // Spawning Functions
  function spawnMotobug() {
    const motobug = getMotobug();
    motobug.onUpdate(() => {
      motobug.move(-gameSpeed, 0);
      if (motobug.pos.x < ENTITY_EXIT_THRESHOLD) {
        recycleMotobug(motobug);
      }
    });

    const waitTime = k.rand(...ENEMY_SPAWN_RANGE);
    k.wait(waitTime, spawnMotobug);
  }

  function spawnRing() {
    const ring = getRing();
    ring.onUpdate(() => {
      ring.move(-gameSpeed, 0);
      if (ring.pos.x < ENTITY_EXIT_THRESHOLD) {
        recycleRing(ring);
      }
    });

    const waitTime = k.rand(...RING_SPAWN_RANGE);
    k.wait(waitTime, spawnRing);
  }

  spawnMotobug();
  spawnRing();

  // Ground Setup
  k.add([
    k.rect(1920, 300),
    k.opacity(0),
    k.area(),
    k.pos(0, GROUND_Y_POSITION),
    k.body({ isStatic: true }),
  ]);

  // Background and Platform Scrolling
  k.onUpdate(() => {
    // Reset scoreMultiplier if grounded
    if (sonic.isGrounded()) scoreMultiplier = 0;

    // Scroll Background
    bgPieces.forEach((bg) => bg.move(-gameSpeed * BG_SCROLL_FACTOR, 0));
    if (bgPieces[1].pos.x < -BG_WIDTH) {
      bgPieces[0].moveTo(bgPieces[1].pos.x + BG_WIDTH * 2, 0);
      bgPieces.push(bgPieces.shift());
    }

    // Scroll Platforms (Original Code Retained)
    platforms.forEach((platform) => platform.move(-gameSpeed, 0));
    if (platforms[1].pos.x < -PLATFORM_WIDTH * PLATFORM_SCALE) {
      platforms[0].moveTo(platforms[1].pos.x + PLATFORM_WIDTH * PLATFORM_SCALE * 2, 450);
      platforms.push(platforms.shift());
    }
  });
}
