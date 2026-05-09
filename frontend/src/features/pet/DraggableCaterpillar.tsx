import { useEffect, useRef, useState } from "react";
import { CaterpillarSvg } from "./CaterpillarSvg";
import { usePetStore } from "../../stores/usePetStore";

const WIDTH = 80;
const WALK_SPEED = 0.6; // px per RAF frame (~36px/s at 60fps)

export function DraggableCaterpillar() {
  const mood = usePetStore((s) => s.stats.mood);
  const reactionEmoji = usePetStore((s) => s.reactionEmoji);

  const containerRef = useRef<HTMLDivElement>(null);
  // Use refs for hot-path values to avoid stale closures inside RAF
  const xRef = useRef(32);
  const yRef = useRef<number | null>(null); // null until mounted (read innerHeight then)
  const dirRef = useRef(1); // 1 = walking right, -1 = walking left
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // `dir` state is only used for the SVG flip — updated at bounce points
  const [dir, setDir] = useState(1);

  // Initialise y after mount (safe for SSR / unit tests)
  useEffect(() => {
    if (yRef.current === null) {
      // Place near bottom of viewport, above the 64px tab bar
      yRef.current = window.innerHeight - 100;
      if (containerRef.current) {
        containerRef.current.style.top = `${yRef.current}px`;
      }
    }
  }, []);

  // RAF walking loop — mutates style directly for smooth 60fps without re-renders
  useEffect(() => {
    let rafId: number;

    function tick() {
      if (!isDraggingRef.current && containerRef.current) {
        const maxX = window.innerWidth - WIDTH;
        xRef.current += WALK_SPEED * dirRef.current;

        if (xRef.current >= maxX) {
          xRef.current = maxX;
          dirRef.current = -1;
          setDir(-1);
        } else if (xRef.current <= 0) {
          xRef.current = 0;
          dirRef.current = 1;
          setDir(1);
        }

        containerRef.current.style.left = `${xRef.current}px`;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Capture so pointermove/up fire even outside the element
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
    containerRef.current.style.top = `${yRef.current}px`;
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
          top: yRef.current ?? window.innerHeight - 100,
          width: WIDTH,
          zIndex: 40,
          touchAction: "none",
          userSelect: "none",
          cursor: "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Wrap SVG in a div for directional flip without affecting reaction emoji */}
        <div style={{ transform: dir === -1 ? "scaleX(-1)" : undefined }}>
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
