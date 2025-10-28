import { useMemo } from "react";

interface CelebrationOverlayProps {
  active: boolean;
  seed: number | null;
}

export function CelebrationOverlay({
  active,
  seed,
}: CelebrationOverlayProps): JSX.Element | null {
  const pieces = useMemo(() => {
    if (!seed) return [];
    const random = mulberry32(seed);
    return Array.from({ length: 16 }, (_, index) => ({
      id: index,
      left: `${Math.round(random() * 100)}%`,
      delay: `${(random() * 0.6).toFixed(2)}s`,
      duration: `${1.4 + random() * 0.8}s`,
      rotation: `${random() * 360}deg`,
      scale: 0.6 + random() * 0.9,
      hue: Math.round(random() * 360),
    }));
  }, [seed]);

  if (!active || pieces.length === 0) {
    return null;
  }

  return (
    <>
      <style>
        {`@keyframes confetti-fall {
          0% { transform: translate3d(0, -20%, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate3d(0, 120%, 0) rotate(360deg); opacity: 0; }
        }`}
      </style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((piece) => (
          <span
            key={`${piece.id}-${seed}`}
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{
              left: piece.left,
              top: "-10%",
              background: `conic-gradient(from 0deg at 50% 50%, hsl(${piece.hue} 90% 70%), hsl(${(piece.hue + 60) % 360} 80% 55%))`,
              animation: `confetti-fall ${piece.duration} ease-in forwards`,
              animationDelay: piece.delay,
              transform: `rotate(${piece.rotation}) scale(${piece.scale})`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function mulberry32(seed: number): () => number {
  const base = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 1;
  let t = base >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
