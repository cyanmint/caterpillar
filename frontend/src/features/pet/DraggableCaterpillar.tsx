import { useEffect, useRef, useState } from "react";
import { CaterpillarSvg } from "./CaterpillarSvg";
import { usePetStore } from "../../stores/usePetStore";

const SIZE = 140; // bounding box used for wall collision
const SPEED = 2.0; // px per RAF frame (~120px/s at 60fps)
// ~0.3% chance per frame to take a random 90-degree turn (~2–3 turns/min)
const RANDOM_TURN_CHANCE = 0.003;

// Cardinal directions in order: right, down, left, up (clockwise)
const DIRS = [
  { dx: 1,  dy: 0  }, // 0 right
  { dx: 0,  dy: 1  }, // 1 down
  { dx: -1, dy: 0  }, // 2 left
  { dx: 0,  dy: -1 }, // 3 up
] as const;

/** CSS transform that rotates the SVG to face the given direction index. */
function dirTransform(idx: number): string {
  // SVG faces right by default; rotate clockwise to face other directions
  return `rotate(${idx * 90}deg)`;
}

export function DraggableCaterpillar() {
  const mood = usePetStore((s) => s.stats.mood);
  const reactionEmoji = usePetStore((s) => s.reactionEmoji);

  const containerRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(40);
  const yRef = useRef<number | null>(null); // initialised after mount
  const dirIdxRef = useRef(0); // start moving right
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Only triggers a re-render when direction changes (not every frame)
  const [svgTransform, setSvgTransform] = useState(dirTransform(0));

  function applyDir(idx: number) {
    dirIdxRef.current = idx;
    setSvgTransform(dirTransform(idx));
  }

  // Place near the bottom of the viewport on first mount
  useEffect(() => {
    if (yRef.current === null) {
      yRef.current = window.innerHeight - 120;
      if (containerRef.current) {
        containerRef.current.style.top = `${yRef.current}px`;
      }
    }
  }, []);

  // RAF movement loop — writes style directly for smooth 60fps
  useEffect(() => {
    let rafId: number;

    function tick() {
      if (!isDraggingRef.current && containerRef.current) {
        const { dx, dy } = DIRS[dirIdxRef.current];
        const maxX = window.innerWidth - SIZE;
        const maxY = window.innerHeight - SIZE;

        let nx = xRef.current + dx * SPEED;
        let ny = (yRef.current ?? 0) + dy * SPEED;

        let hitX = false;
        let hitY = false;

        if (nx <= 0)    { nx = 0;    hitX = true; }
        else if (nx >= maxX) { nx = maxX; hitX = true; }
        if (ny <= 0)    { ny = 0;    hitY = true; }
        else if (ny >= maxY) { ny = maxY; hitY = true; }

        if (hitX || hitY) {
          // Snake-style: turn 90° into a direction that moves away from the wall(s)
          let newIdx: number;
          if (hitX && hitY) {
            // Corner: pick the axis that moves away from the nearest wall
            const goRight = nx <= 0;   // hit left wall → go right
            const goDown  = ny <= 0;   // hit top wall  → go down
            newIdx = Math.random() < 0.5
              ? (goRight ? 0 : 2)      // horizontal option
              : (goDown  ? 1 : 3);     // vertical option
          } else if (hitX) {
            // Hit left or right wall → turn up or down
            newIdx = Math.random() < 0.5 ? 1 : 3;
          } else {
            // Hit top or bottom wall → turn left or right
            newIdx = Math.random() < 0.5 ? 0 : 2;
          }
          applyDir(newIdx);
        } else if (Math.random() < RANDOM_TURN_CHANCE) {
          // Occasional random snake-style 90-degree turn while wandering
          const turn = Math.random() < 0.5 ? 1 : 3; // +90° or −90° relative
          applyDir((dirIdxRef.current + turn) % 4);
        }

        xRef.current = nx;
        yRef.current = ny;
        containerRef.current.style.left = `${nx}px`;
        containerRef.current.style.top  = `${ny}px`;
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - xRef.current,
      y: e.clientY - (yRef.current ?? 0),
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current || !containerRef.current) return;
    xRef.current = e.clientX - dragOffsetRef.current.x;
    yRef.current = e.clientY - dragOffsetRef.current.y;
    containerRef.current.style.left = `${xRef.current}px`;
    containerRef.current.style.top  = `${yRef.current}px`;
  }

  function onPointerUp() {
    isDraggingRef.current = false;
  }

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateY(-28px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-36px) scale(1.1); }
        }
        .reaction-burst { animation: floatUp 2s ease-out forwards; }
      `}</style>

      <div
        ref={containerRef}
        style={{
          position: "fixed",
          left: xRef.current,
          top: yRef.current ?? window.innerHeight - 120,
          width: SIZE,
          height: SIZE,
          zIndex: 40,
          touchAction: "none",
          userSelect: "none",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Rotate SVG to face the direction of travel; transition gives a snake-pivot feel */}
        <div style={{ transform: svgTransform, width: "100%", transformOrigin: "center", transition: "transform 0.15s ease" }}>
          <CaterpillarSvg mood={mood} className="w-full h-auto drop-shadow" />
        </div>

        {reactionEmoji && (
          <span
            key={reactionEmoji + String(Date.now())}
            className="reaction-burst absolute -top-6 left-1/2 -translate-x-1/2 text-2xl pointer-events-none select-none"
          >
            {reactionEmoji}
          </span>
        )}
      </div>
    </>
  );
}
