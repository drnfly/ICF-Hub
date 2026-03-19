import React, { useMemo } from "react";

function normalizeWalls(walls) {
  if (!walls?.length) return [];

  const points = walls.flatMap((wall) => {
    const start = wall.start || [0, 0, 0];
    const end = wall.end || [0, 0, 0];
    return [
      { x: Number(start[0]) || 0, y: Number(start[1]) || 0 },
      { x: Number(end[0]) || 0, y: Number(end[1]) || 0 }
    ];
  });

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = 300 / Math.max(width, height);

  return walls.map((wall) => {
    const start = wall.start || [0, 0, 0];
    const end = wall.end || [0, 0, 0];

    const sx = ((Number(start[0]) || 0) - minX) * scale + 30;
    const sy = ((Number(start[1]) || 0) - minY) * scale + 30;
    const ex = ((Number(end[0]) || 0) - minX) * scale + 30;
    const ey = ((Number(end[1]) || 0) - minY) * scale + 30;

    return {
      id: wall.id,
      heightFt: Number(wall.height_ft) || 10,
      sx,
      sy,
      ex,
      ey
    };
  });
}

export default function Takeoff3DViewer({ model3d }) {
  const walls = useMemo(() => model3d?.walls || [], [model3d]);
  const projectedWalls = useMemo(() => normalizeWalls(walls), [walls]);

  if (!walls.length) {
    return (
      <div className="h-[360px] rounded-md border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
        3D wall layout will appear after analysis.
      </div>
    );
  }

  return (
    <div className="h-[360px] rounded-md overflow-hidden border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-200 p-4">
      <div className="h-full w-full rounded-md border border-zinc-300 bg-white/80 backdrop-blur-sm relative overflow-hidden">
        <svg viewBox="0 0 360 360" className="w-full h-full">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e4e4e7" strokeWidth="1" />
            </pattern>
            <linearGradient id="wallStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="360" height="360" fill="url(#grid)" />

          {projectedWalls.map((wall) => (
            <g key={wall.id}>
              <line
                x1={wall.sx}
                y1={wall.sy}
                x2={wall.ex}
                y2={wall.ey}
                stroke="url(#wallStroke)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <line
                x1={wall.sx}
                y1={wall.sy - Math.max(wall.heightFt * 0.8, 6)}
                x2={wall.ex}
                y2={wall.ey - Math.max(wall.heightFt * 0.8, 6)}
                stroke="#fb923c"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.7"
              />
              <line
                x1={wall.sx}
                y1={wall.sy}
                x2={wall.sx}
                y2={wall.sy - Math.max(wall.heightFt * 0.8, 6)}
                stroke="#fdba74"
                strokeWidth="2"
              />
              <line
                x1={wall.ex}
                y1={wall.ey}
                x2={wall.ex}
                y2={wall.ey - Math.max(wall.heightFt * 0.8, 6)}
                stroke="#fdba74"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>

        <div className="absolute left-3 bottom-3 bg-white/90 border border-zinc-200 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">
          Isometric Wall Preview
        </div>
      </div>
    </div>
  );
}
