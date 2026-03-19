import React, { useMemo } from "react";

const LOW_HEIGHT_COLOR = [37, 99, 235];
const HIGH_HEIGHT_COLOR = [239, 68, 68];

function getHeightColor(heightFt, minHeight, maxHeight) {
  if (!Number.isFinite(heightFt)) return "#f59e0b";

  const span = Math.max(maxHeight - minHeight, 0.0001);
  const ratio = Math.min(Math.max((heightFt - minHeight) / span, 0), 1);

  const r = Math.round(LOW_HEIGHT_COLOR[0] + (HIGH_HEIGHT_COLOR[0] - LOW_HEIGHT_COLOR[0]) * ratio);
  const g = Math.round(LOW_HEIGHT_COLOR[1] + (HIGH_HEIGHT_COLOR[1] - LOW_HEIGHT_COLOR[1]) * ratio);
  const b = Math.round(LOW_HEIGHT_COLOR[2] + (HIGH_HEIGHT_COLOR[2] - LOW_HEIGHT_COLOR[2]) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

function mapWallsToOverlay(walls) {
  if (!walls?.length) return [];

  const points = walls.flatMap((wall) => {
    const start = wall.start || [0, 0];
    const end = wall.end || [0, 0];
    return [
      { x: Number(start[0]) || 0, y: Number(start[1]) || 0 },
      { x: Number(end[0]) || 0, y: Number(end[1]) || 0 }
    ];
  });

  const heights = walls
    .map((wall) => Number(wall.height_ft))
    .filter((value) => Number.isFinite(value) && value > 0);

  const minHeight = heights.length ? Math.min(...heights) : 0;
  const maxHeight = heights.length ? Math.max(...heights) : 0;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  return walls.map((wall, index) => {
    const start = wall.start || [0, 0];
    const end = wall.end || [0, 0];

    const sx = ((Number(start[0]) || 0) - minX) / spanX;
    const sy = ((Number(start[1]) || 0) - minY) / spanY;
    const ex = ((Number(end[0]) || 0) - minX) / spanX;
    const ey = ((Number(end[1]) || 0) - minY) / spanY;

    const heightFt = Number(wall.height_ft) || 0;

    return {
      id: wall.id || `W${index + 1}`,
      color: getHeightColor(heightFt, minHeight, maxHeight),
      sx,
      sy,
      ex,
      ey,
      openings: wall.openings || [],
      linear_feet: wall.linear_feet,
      net_sqft: wall.net_sqft,
      height_ft: heightFt
    };
  });
}

function OpeningMarker({ x, y, color }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points="0,-8 7,6 -7,6" fill={color} opacity="0.85" />
    </g>
  );
}

export default function PlanOverlayViewer({ imageUrl, walls, summary }) {
  const overlayWalls = useMemo(() => mapWallsToOverlay(walls || []), [walls]);

  if (!imageUrl) {
    return (
      <div className="h-[460px] border border-dashed border-zinc-300 rounded-md flex items-center justify-center text-sm text-zinc-500">
        Plan overlay preview will appear after analysis.
      </div>
    );
  }

  return (
    <div className="border border-zinc-300 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">Plan Overlay</h3>
        {summary && <span className="text-xs text-zinc-500">{summary.total_linear_feet} ft total wall length</span>}
      </div>

      <div className="relative rounded-md overflow-hidden border border-zinc-300 bg-zinc-100">
        <img src={imageUrl} alt="Uploaded floor plan" className="w-full h-auto block" />

        <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full">
          {overlayWalls.map((wall) => {
            const x1 = 80 + wall.sx * 840;
            const y1 = 80 + wall.sy * 840;
            const x2 = 80 + wall.ex * 840;
            const y2 = 80 + wall.ey * 840;

            const labelX = (x1 + x2) / 2;
            const labelY = (y1 + y2) / 2;

            const openingMarkers = wall.openings.map((opening, idx) => {
              const totalLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) || 1;
              const offsetRatio = Math.min(Math.max((opening.offset_ft || 0) / (wall.linear_feet || 1), 0.05), 0.95);
              const ox = x1 + (x2 - x1) * offsetRatio;
              const oy = y1 + (y2 - y1) * offsetRatio;
              const nx = -(y2 - y1) / totalLength;
              const ny = (x2 - x1) / totalLength;
              return {
                key: `${wall.id}-${idx}`,
                x: ox + nx * 14,
                y: oy + ny * 14
              };
            });

            return (
              <g key={wall.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={wall.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.95"
                />
                <circle cx={x1} cy={y1} r="6" fill={wall.color} />
                <circle cx={x2} cy={y2} r="6" fill={wall.color} />
                <rect x={labelX - 28} y={labelY - 13} width="56" height="22" fill="white" opacity="0.85" rx="3" />
                <text x={labelX} y={labelY + 2} fontSize="13" textAnchor="middle" fill={wall.color} fontWeight="700">{wall.id}</text>

                {openingMarkers.map((marker) => (
                  <OpeningMarker key={marker.key} x={marker.x} y={marker.y} color={wall.color} />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs">
        <div className="border border-zinc-200 bg-zinc-50 p-3">
          <p className="font-semibold text-zinc-700 mb-2 uppercase tracking-wide">Legend</p>
          <div className="mb-3">
            <div className="h-2 rounded bg-gradient-to-r from-blue-600 to-red-500" />
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Lower wall height</span>
              <span>Higher wall height</span>
            </div>
          </div>
          <ul className="space-y-1">
            {overlayWalls.map((wall) => (
              <li key={`legend-${wall.id}`} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 inline-block" style={{ backgroundColor: wall.color }} />
                  {wall.id}
                </span>
                <span className="text-zinc-600">{wall.height_ft} ft • {wall.linear_feet} ft • {wall.net_sqft} sqft</span>
              </li>
            ))}
          </ul>
        </div>

        {summary && (
          <div className="border border-zinc-200 bg-zinc-50 p-3">
            <p className="font-semibold text-zinc-700 mb-2 uppercase tracking-wide">Overlay Summary</p>
            <div className="space-y-1 text-zinc-600">
              <p>Total Linear Feet: <span className="font-semibold text-zinc-800">{summary.total_linear_feet}</span></p>
              <p>Net Wall Sqft: <span className="font-semibold text-zinc-800">{summary.net_wall_sqft}</span></p>
              <p>Openings: <span className="font-semibold text-zinc-800">{summary.opening_count}</span></p>
              <p>Ceiling Height: <span className="font-semibold text-zinc-800">{summary.ceiling_height_ft} ft</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
