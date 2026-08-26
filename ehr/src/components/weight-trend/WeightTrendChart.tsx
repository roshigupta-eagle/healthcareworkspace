"use client";

import React, { useState } from 'react';
import { formatWeight, toKg } from '@/lib/weightMath';
import type { WeightTrendEvent, WeightTrendGoal, WeightTrendMeasurement } from './weightTrendTypes';

type Props = {
  measurements: WeightTrendMeasurement[];
  goal?: WeightTrendGoal | null;
  displayUnit: 'kg' | 'lb';
  clinicalEvents?: WeightTrendEvent[];
  outlierIds?: Set<string>;
  chartOptions: {
    showGoal: boolean;
    showBaseline: boolean;
    showEvents: boolean;
    showSources: boolean;
    connectPoints: boolean;
    showLabels: boolean;
    showDataQualityFlags: boolean;
  };
  onPointClick: (m: WeightTrendMeasurement) => void;
  onEventClick: (e: WeightTrendEvent) => void;
};

type ChartPoint = { x: number; y: number; raw: WeightTrendMeasurement; index: number };

export default function WeightTrendChart({
  measurements = [],
  goal,
  displayUnit = 'kg',
  clinicalEvents = [],
  outlierIds,
  chartOptions,
  onPointClick,
  onEventClick,
}: Props) {
  const [hoverPoint, setHoverPoint] = useState<ChartPoint | null>(null);
  const [hoverEvent, setHoverEvent] = useState<WeightTrendEvent | null>(null);

  const points = [...measurements].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  if (!points || points.length === 0) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 mb-3">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 18h12l3-18H3z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Weight Observations Recorded</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Weight measurements recorded in clinic visits or patient smart devices will render here along with target goals and clinical event markers.
        </p>
      </div>
    );
  }

  const svgWidth = 900;
  const svgHeight = 340;
  const padX = 54;
  const padY = 48;

  const minX = new Date(points[0].occurredAt).getTime();
  const maxX = new Date(points[points.length - 1].occurredAt).getTime();

  const values = points.map((p) => toKg(Number(p.value), p.unit));
  if (goal?.targetWeight) values.push(Number(goal.targetWeight));

  const rawMinY = Math.min(...values);
  const rawMaxY = Math.max(...values);
  const paddingY = Math.max(1.5, (rawMaxY - rawMinY) * 0.15);
  const minY = Math.floor(rawMinY - paddingY);
  const maxY = Math.ceil(rawMaxY + paddingY);

  function getX(timeIso: string) {
    const t = new Date(timeIso).getTime();
    if (maxX === minX) return svgWidth / 2;
    return padX + ((t - minX) / (maxX - minX)) * (svgWidth - padX * 2);
  }

  function getY(val: number) {
    if (maxY === minY) return svgHeight / 2;
    return svgHeight - padY - ((val - minY) / (maxY - minY)) * (svgHeight - padY * 2);
  }

  // Generate SVG Path (y-position always uses the unit-normalized kg value; display text uses the original recorded value/unit)
  const coords = points.map((p, index) => ({
    x: getX(p.occurredAt),
    y: getY(toKg(Number(p.value), p.unit)),
    raw: p,
    index,
  }));

  let pathD = '';
  if (coords.length === 1) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
  } else if (!chartOptions.connectPoints) {
    pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  } else {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  const areaD =
    coords.length > 1
      ? `${pathD} L ${coords[coords.length - 1].x} ${svgHeight - padY} L ${coords[0].x} ${svgHeight - padY} Z`
      : '';

  // Grid lines
  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => minY + (i * (maxY - minY)) / gridSteps);

  const baselinePoint = points[0];
  const visibleEvents = clinicalEvents.filter((event) => {
    const eventTime = Date.parse(event.date);
    return Number.isFinite(eventTime) && eventTime >= minX && eventTime <= maxX;
  });

  return (
    <div className="weight-trend-chart relative w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[650px] select-none"
          role="img"
          aria-label="Interactive patient weight trend chart"
        >
          <defs>
            <linearGradient id="tealAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="goalLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {gridValues.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={padX}
                  x2={svgWidth - padX}
                  y1={y}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />
                <text
                  x={padX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  className="fill-slate-400 font-medium tabular-nums"
                >
                  {formatWeight(val, 'kg', displayUnit, 0)}
                </text>
              </g>
            );
          })}

          {/* Date X-Axis labels */}
          {points.map((p, idx) => {
            const x = getX(p.occurredAt);
            const dateLabel = new Date(p.occurredAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
            return (
              <g key={p.id || idx}>
                <line x1={x} x2={x} y1={svgHeight - padY} y2={svgHeight - padY + 6} stroke="#CBD5E1" strokeWidth="1" />
                <text
                  x={x}
                  y={svgHeight - padY + 20}
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-slate-500 font-semibold"
                >
                  {dateLabel}
                </text>
              </g>
            );
          })}

          {/* Target Goal Line */}
          {chartOptions.showGoal && goal?.targetWeight != null && (
            <g key="goal-line">
              <line
                x1={padX}
                x2={svgWidth - padX}
                y1={getY(goal.targetWeight)}
                y2={getY(goal.targetWeight)}
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <rect
                x={svgWidth - padX - 110}
                y={getY(goal.targetWeight) - 13}
                width="100"
                height="22"
                rx="6"
                fill="#ECFDF5"
                stroke="#A7F3D0"
                strokeWidth="1"
              />
              <text
                x={svgWidth - padX - 60}
                y={getY(goal.targetWeight) + 2}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#047857"
              >
                Goal · {formatWeight(Number(goal.targetWeight), 'kg', displayUnit)}
              </text>
            </g>
          )}

          {/* Baseline Line */}
          {chartOptions.showBaseline && baselinePoint && (
            <g key="baseline-line">
              <line
                x1={getX(baselinePoint.occurredAt)}
                x2={getX(baselinePoint.occurredAt)}
                y1={padY}
                y2={svgHeight - padY}
                stroke="#0284C7"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <rect
                x={getX(baselinePoint.occurredAt) - 45}
                y={padY - 24}
                width="90"
                height="20"
                rx="6"
                fill="#E0F2FE"
                stroke="#BAE6FD"
                strokeWidth="1"
              />
              <text
                x={getX(baselinePoint.occurredAt)}
                y={padY - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#0369A1"
              >
                Baseline · {formatWeight(Number(baselinePoint.value), baselinePoint.unit, displayUnit)}
              </text>
            </g>
          )}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#tealAreaGrad)" />}

          {/* Main Trend Line */}
          {coords.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#0F766E"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-xs"
            />
          )}

          {/* Clinical Event Markers along the Bottom */}
          {chartOptions.showEvents &&
            visibleEvents.map((evt, idx) => {
              const ex = getX(evt.date);
              const ey = svgHeight - padY - 12;
              return (
                <g
                  key={evt.id || idx}
                  className="cursor-pointer group"
                  onClick={() => onEventClick(evt)}
                  onMouseEnter={() => setHoverEvent(evt)}
                  onMouseLeave={() => setHoverEvent(null)}
                >
                  <circle cx={ex} cy={ey} r="10" fill="#7C3AED" className="opacity-90 group-hover:scale-125 transition-transform" />
                  <circle cx={ex} cy={ey} r="12" fill="none" stroke="#C4B5FD" strokeWidth="1.5" />
                  <path d={`M ${ex - 4} ${ey} h 8 M ${ex} ${ey - 4} v 8`} stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              );
            })}

          {/* Measurement Data Points */}
          {coords.map((c, idx) => {
            const isLatest = idx === coords.length - 1;
            const isHovered = hoverPoint?.raw?.id === c.raw.id;

            return (
              <g
                key={c.raw.id || idx}
                className="cursor-pointer"
                onClick={() => onPointClick(c.raw)}
                onMouseEnter={() => setHoverPoint(c)}
                onMouseLeave={() => setHoverPoint(null)}
              >
                {/* Data-quality outlier ring — statistical flag only, never hides the point */}
                {outlierIds?.has(c.raw.id) && (
                  <circle cx={c.x} cy={c.y} r={isHovered ? 15 : 12} fill="none" stroke="#D97706" strokeWidth="2" strokeDasharray="3 2" />
                )}

                {/* Glow ring on hover / latest */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 12 : isLatest ? 9 : 6}
                  fill={isLatest ? '#0F766E' : '#FFFFFF'}
                  stroke="#0F766E"
                  strokeWidth={isLatest ? 3 : 2.5}
                  className="transition-all duration-150 shadow-xs"
                />

                {/* Latest Marker Badge */}
                {isLatest && (
                  <g>
                    <rect
                      x={c.x - 48}
                      y={c.y - 32}
                      width="96"
                      height="20"
                      rx="6"
                      fill="#0F766E"
                      className="shadow-sm"
                    />
                    <text
                      x={c.x}
                      y={c.y - 18}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="#FFFFFF"
                    >
                      Latest · {formatWeight(Number(c.raw.value), c.raw.unit, displayUnit)}
                    </text>
                  </g>
                )}

                {/* Point Data Label if toggled */}
                {chartOptions.showLabels && !isLatest && (
                  <text
                    x={c.x}
                    y={c.y - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    className="fill-slate-700"
                  >
                    {formatWeight(Number(c.raw.value), c.raw.unit, displayUnit)}
                  </text>
                )}
                {chartOptions.showSources && (
                  <text x={c.x} y={c.y + 22} textAnchor="middle" fontSize="9" className="fill-slate-500 font-medium">
                    {(c.raw.source || 'clinic').replace('-', ' ')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Hover Tooltip */}
      {hoverPoint && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white rounded-xl px-3.5 py-2.5 shadow-xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${(hoverPoint.x / svgWidth) * 100}%`,
            top: `${(hoverPoint.y / svgHeight) * 100 - 10}%`,
          }}
        >
          <div className="font-bold text-teal-300 text-sm">
            {formatWeight(Number(hoverPoint.raw.value), hoverPoint.raw.unit, displayUnit)}
          </div>
          <div className="text-[10px] text-slate-300">
            {new Date(hoverPoint.raw.occurredAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
            })}{' '}
            · <span className="capitalize">{hoverPoint.raw.source || 'clinic'}</span>
          </div>
          <div className="text-[10px] text-slate-300">Status: {hoverPoint.raw.status || (hoverPoint.raw.enteredInError ? 'Entered in Error' : 'Final')}</div>
          {hoverPoint.index > 0 && <div className="text-[10px] text-slate-300">Change: {formatWeight(toKg(Number(hoverPoint.raw.value), hoverPoint.raw.unit) - toKg(Number(points[hoverPoint.index - 1].value), points[hoverPoint.index - 1].unit), 'kg', displayUnit)} vs previous</div>}
          <div className="text-[10px] text-slate-400">Recorded by: {hoverPoint.raw.recorder?.name || 'Dr. Aris Thorne'}</div>
          <div className="text-[10px] text-teal-400 font-semibold pt-0.5">Click to view full observation details</div>
        </div>
      )}

      {hoverEvent && (
        <div
          className="absolute z-20 pointer-events-none bg-violet-950 text-white rounded-xl px-3.5 py-2.5 shadow-xl text-xs space-y-1 transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${(getX(hoverEvent.date) / svgWidth) * 100}%`,
            top: `${((svgHeight - padY - 20) / svgHeight) * 100}%`,
          }}
        >
          <div className="font-bold text-violet-300 text-xs">{hoverEvent.title}</div>
          <div className="text-[10px] text-violet-200">{hoverEvent.category} · {hoverEvent.actor}</div>
          <div className="text-[10px] text-slate-300 italic">{hoverEvent.details}</div>
          <div className="text-[10px] text-violet-400 font-semibold pt-0.5">Click to open clinical thread</div>
        </div>
      )}
    </div>
  );
}