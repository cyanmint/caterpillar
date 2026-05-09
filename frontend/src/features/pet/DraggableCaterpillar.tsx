import { useEffect, useMemo, useRef, useState } from "react";
import { CaterpillarSvg } from "./CaterpillarSvg";
import { moodConfig } from "./CaterpillarSvg";
import { usePetStore } from "../../stores/usePetStore";

const HEAD_SIZE = 140;
const SPEED = 2.0; // px per RAF frame (~120px/s @60fps)
const RANDOM_TURN_CHANCE = 0.003;
const SAFE_MARGIN = 90; // keep head center away from hard screen edges
const CORNER_BUFFER = 120; // steer away before entering corner traps
const SEGMENT_GAP = 26; // distance between snake segments

// right, down, left, up
const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
] as const;

type Vec = { x: number; y: number };

type RenderState = {
  head: Vec;
  dirIdx: number;
  body: Vec[];
};

function angleForDir(dirIdx: number): number {
  // CaterpillarSvg head points left at baseline, so add 180° to make head face travel direction
  return 180 + dirIdx * 90;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointAlongHistory(history: Vec[], distanceFromHead: number): Vec {
  if (history.length === 0) return { x: 0, y: 0 };
  if (distanceFromHead <= 0) return history[0];

  let remaining = distanceFromHead;
  for (let i = 1; i < history.length; i++) {
    const a = history[i - 1];
    const b = history[i];
    const d = dist(a, b);
    if (d >= remaining) {
      const t = remaining / d;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
    remaining -= d;
  }

  return history[history.length - 1];
}

function chooseWallTurn(
  dirIdx: number,
  x: number,
  y: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): number {
  const nearTop = y <= minY + CORNER_BUFFER;
  const nearBottom = y >= maxY - CORNER_BUFFER;
  const nearLeft = x <= minX + CORNER_BUFFER;
  const nearRight = x >= maxX - CORNER_BUFFER;

  // hit horizontal walls while moving horizontally => turn vertically (corner-safe choice)
  if (dirIdx === 0 || dirIdx === 2) {
    if (nearTop) return 1; // down
    if (nearBottom) return 3; // up
    return y < (minY + maxY) / 2 ? 1 : 3;
  }

  // hit vertical walls while moving vertically => turn horizontally (corner-safe choice)
  if (nearLeft) return 0; // right
  if (nearRight) return 2; // left
  return x < (minX + maxX) / 2 ? 0 : 2;
}

export function DraggableCaterpillar() {
  const mood = usePetStore((s) => s.stats.mood);
  const reactionEmoji = usePetStore((s) => s.reactionEmoji);
  const segmentCount = usePetStore((s) => s.segments);

  const dragHandleRef = useRef<HTMLDivElement>(null);

  const headRef = useRef<Vec>({ x: SAFE_MARGIN + 40, y: SAFE_MARGIN + 40 });
  const dirIdxRef = useRef(0);
  const queuedTurnRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<Vec>({ x: 0, y: 0 });
  const historyRef = useRef<Vec[]>([]);

  const [render, setRender] = useState<RenderState>({
    head: headRef.current,
    dirIdx: dirIdxRef.current,
    body: [],
  });

  const bodySizes = useMemo(
    () => Array.from({ length: segmentCount }, (_, i) => Math.max(26, 56 - i * 2)),
    [segmentCount],
  );

  useEffect(() => {
    const start: Vec = {
      x: Math.max(SAFE_MARGIN + 40, window.innerWidth * 0.25),
      y: Math.max(SAFE_MARGIN + 40, window.innerHeight * 0.65),
    };

    headRef.current = start;
    historyRef.current = Array.from({ length: Math.max(120, segmentCount * 20) }, () => start);
    setRender({
      head: start,
      dirIdx: dirIdxRef.current,
      body: Array.from({ length: segmentCount }, (_, i) => pointAlongHistory(historyRef.current, (i + 1) * SEGMENT_GAP)),
    });
  }, [segmentCount]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      let next: number | null = null;
      if (key === "arrowright" || key === "d") next = 0;
      else if (key === "arrowdown" || key === "s") next = 1;
      else if (key === "arrowleft" || key === "a") next = 2;
      else if (key === "arrowup" || key === "w") next = 3;

      if (next === null) return;
      e.preventDefault();

      // Snake rule: no instant reverse 180°
      if ((next + 2) % 4 === dirIdxRef.current) return;
      queuedTurnRef.current = next;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let rafId = 0;

    function tick() {
      const minX = SAFE_MARGIN;
      const minY = SAFE_MARGIN;
      const maxX = window.innerWidth - SAFE_MARGIN;
      const maxY = window.innerHeight - SAFE_MARGIN;

      if (!isDraggingRef.current) {
        // manual turn has priority
        if (queuedTurnRef.current !== null) {
          dirIdxRef.current = queuedTurnRef.current;
          queuedTurnRef.current = null;
        } else if (Math.random() < RANDOM_TURN_CHANCE) {
          // occasional auto-turn, still no 180° reversal
          const delta = Math.random() < 0.5 ? 1 : 3;
          dirIdxRef.current = (dirIdxRef.current + delta) % 4;
        }

        const { dx, dy } = DIRS[dirIdxRef.current];

        let nx = headRef.current.x + dx * SPEED;
        let ny = headRef.current.y + dy * SPEED;

        const hitX = nx <= minX || nx >= maxX;
        const hitY = ny <= minY || ny >= maxY;

        if (hitX || hitY) {
          nx = clamp(nx, minX, maxX);
          ny = clamp(ny, minY, maxY);

          // choose a corner-safe perpendicular turn
          dirIdxRef.current = chooseWallTurn(dirIdxRef.current, nx, ny, minX, maxX, minY, maxY);
        }

        headRef.current = { x: nx, y: ny };
      }

      // prepend head position to movement history
      historyRef.current.unshift(headRef.current);

      const maxHistoryDistance = (segmentCount + 4) * SEGMENT_GAP;
      let accumulated = 0;
      let trimIndex = historyRef.current.length;
      for (let i = 1; i < historyRef.current.length; i++) {
        accumulated += dist(historyRef.current[i - 1], historyRef.current[i]);
        if (accumulated > maxHistoryDistance) {
          trimIndex = i + 1;
          break;
        }
      }
      if (trimIndex < historyRef.current.length) {
        historyRef.current.length = trimIndex;
      }

      const body = Array.from({ length: segmentCount }, (_, i) =>
        pointAlongHistory(historyRef.current, (i + 1) * SEGMENT_GAP),
      );

      setRender({
        head: headRef.current,
        dirIdx: dirIdxRef.current,
        body,
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [segmentCount]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - headRef.current.x,
      y: e.clientY - headRef.current.y,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingRef.current) return;

    const minX = SAFE_MARGIN;
    const minY = SAFE_MARGIN;
    const maxX = window.innerWidth - SAFE_MARGIN;
    const maxY = window.innerHeight - SAFE_MARGIN;

    headRef.current = {
      x: clamp(e.clientX - dragOffsetRef.current.x, minX, maxX),
      y: clamp(e.clientY - dragOffsetRef.current.y, minY, maxY),
    };

    // dragging writes path history too so body follows the drag path naturally
    historyRef.current.unshift(headRef.current);
  }

  function onPointerUp() {
    isDraggingRef.current = false;
  }

  const bodyColor = moodConfig[mood].bodyColor;

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
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {/* Draw tail first, near-head last for snake-like overlap */}
        {[...render.body].reverse().map((p, revIdx) => {
          const idx = render.body.length - 1 - revIdx;
          const size = bodySizes[idx] ?? 28;
          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: size,
                height: size,
                borderRadius: "9999px",
                transform: "translate(-50%, -50%)",
                background: bodyColor,
                border: "2px solid #15803d",
                opacity: 0.92,
              }}
            />
          );
        })}

        <div
          style={{
            position: "absolute",
            left: render.head.x,
            top: render.head.y,
            width: HEAD_SIZE,
            transform: `translate(-50%, -50%) rotate(${angleForDir(render.dirIdx)}deg)`,
            transformOrigin: "center",
            transition: "transform 0.12s linear",
          }}
        >
          <CaterpillarSvg mood={mood} className="w-full h-auto drop-shadow" />
        </div>

        {reactionEmoji && (
          <span
            key={reactionEmoji + String(Date.now())}
            className="reaction-burst absolute text-2xl pointer-events-none select-none"
            style={{ left: render.head.x, top: render.head.y - HEAD_SIZE * 0.55, transform: "translateX(-50%)" }}
          >
            {reactionEmoji}
          </span>
        )}

        {/* Invisible drag handle at head */}
        <div
          ref={dragHandleRef}
          style={{
            position: "absolute",
            left: render.head.x,
            top: render.head.y,
            width: HEAD_SIZE,
            height: HEAD_SIZE,
            transform: "translate(-50%, -50%)",
            pointerEvents: "auto",
            touchAction: "none",
            cursor: "grab",
            background: "transparent",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
    </>
  );
}
