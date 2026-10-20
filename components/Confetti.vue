<template>
  <canvas
      ref="canvas"
      class="pointer-events-none fixed inset-0 z-50 h-full w-full"
      aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, type PropType } from "vue";

// One burst of confetti from both bottom corners, drawn on a canvas so it stays smooth on phones.
// Skipped entirely when the visitor asked for reduced motion.

const props = defineProps({
  // Defaults to the game's emerald/green/blue, plus yellow and pink so it reads as a party
  colours: {
    type: Array as PropType<string[]>,
    default: () => ['#047857', '#10b981', '#86efac', '#93c5fd', '#facc15', '#f472b6'],
  },
});

const PIECES = 150;
const GRAVITY = 0.3;
const DRAG = 0.985;
const MAX_FALL_SPEED = 3.5; // px per 60 Hz frame; makes the pieces flutter down instead of dropping
const MAX_DURATION = 7000;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colour: string;
  rotation: number;
  spin: number;
  tilt: number;
  tiltSpeed: number;
}

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
let frame = 0;

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function launch(fromLeft: boolean, width: number, height: number, colours: string[]): Piece {
  // Up and inwards at 55–80°, fast enough to reach 45–100% of the screen height
  const angle = random(55, 80) * Math.PI / 180;
  const speed = height * random(0.026, 0.04);

  return {
    x: fromLeft ? random(-10, 10) : width + random(-10, 10),
    y: height + random(0, 10),
    vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
    vy: -Math.sin(angle) * speed,
    size: random(7, 12),
    colour: colours[Math.floor(Math.random() * colours.length)]!,
    rotation: random(0, Math.PI * 2),
    spin: random(-0.2, 0.2),
    tilt: random(0, Math.PI * 2),
    tiltSpeed: random(0.05, 0.15),
  };
}

onMounted(() => {
  const element = canvas.value;
  const context = element?.getContext('2d');

  if (!element || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = window.devicePixelRatio || 1;
  element.width = width * ratio;
  element.height = height * ratio;
  context.scale(ratio, ratio);

  const pieces = Array.from({ length: PIECES }, (_, i) => launch(i % 2 === 0, width, height, props.colours));
  const start = performance.now();
  let last = start;

  function draw(now: number) {
    // Scale every step to a 60 Hz frame, so 120 Hz phones don't play it twice as fast
    const step = Math.min((now - last) / (1000 / 60), 3);
    last = now;

    context!.clearRect(0, 0, width, height);
    let visible = false;

    for (const piece of pieces) {
      piece.vy = Math.min((piece.vy + GRAVITY * step) * DRAG ** step, MAX_FALL_SPEED);
      piece.vx *= DRAG ** step;
      piece.tilt += piece.tiltSpeed * step;
      piece.rotation += piece.spin * step;
      piece.x += (piece.vx + Math.sin(piece.tilt) * 0.6) * step;
      piece.y += piece.vy * step;

      if (piece.y > height + 20) {
        continue;
      }
      visible = true;

      context!.save();
      context!.translate(piece.x, piece.y);
      context!.rotate(piece.rotation);
      context!.scale(1, Math.cos(piece.tilt)); // flips the piece over as it falls
      context!.fillStyle = piece.colour;
      context!.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      context!.restore();
    }

    if (visible && now - start < MAX_DURATION) {
      frame = requestAnimationFrame(draw);
    } else {
      context!.clearRect(0, 0, width, height);
    }
  }

  frame = requestAnimationFrame(draw);
});

onUnmounted(() => cancelAnimationFrame(frame));
</script>
