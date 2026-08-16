import React, { useMemo, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LEVEL_COLORS = [
  '#161b22', // Level 0 - no activity
  '#0e4429', // Level 1 - low
  '#006d32', // Level 2 - medium
  '#26a641', // Level 3 - high
  '#39d353', // Level 4 - very high
];

const LEVEL_TOOLTIP = ['No activity', '1-2 activities', '3-5 activities', '6-10 activities', '11+ activities'];

const CELL = 12; // cell size + gap
const PAD_LEFT = 38;
const PAD_TOP = 20;

function getColorLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ContributionHeatmap({ activityData = {}, year = new Date().getFullYear() }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const heatmapData = useMemo(() => {
    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);
    const startDay = firstDayOfYear.getDay();
    const today = new Date();

    const cells = [];
    let currentDate = new Date(firstDayOfYear);
    currentDate.setDate(currentDate.getDate() - startDay);

    const totalWeeks = Math.ceil((lastDayOfYear - currentDate) / (7 * 86400000)) + 1;

    for (let week = 0; week < totalWeeks; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const count = activityData[dateStr] || 0;
        const isCurrentYear = currentDate.getFullYear() === year;
        const isFuture = currentDate > today;

        weekData.push({
          date: new Date(currentDate),
          dateStr,
          count,
          level: getColorLevel(count),
          isCurrentYear,
          isFuture,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      cells.push(weekData);
    }

    return cells;
  }, [activityData, year]);

  const monthPositions = useMemo(() => {
    const positions = {};
    heatmapData.forEach((week, weekIndex) => {
      week.forEach((cell, dayIndex) => {
        if (cell.isCurrentYear && dayIndex === 0) {
          const month = cell.date.getMonth();
          if (positions[month] === undefined || weekIndex < positions[month]) {
            positions[month] = weekIndex;
          }
        }
      });
    });
    return positions;
  }, [heatmapData]);

  const totalActivities = useMemo(
    () => Object.values(activityData).reduce((sum, n) => sum + n, 0),
    [activityData]
  );

  const width = heatmapData.length * CELL + PAD_LEFT + 10;
  const height = 7 * CELL + PAD_TOP + 10;

  const handleMouseMove = (e) => {
    if (!hoveredCell || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = svgRef.current.viewBox.baseVal.width / rect.width;
    const scaleY = svgRef.current.viewBox.baseVal.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setTooltip({ x, y });
  };

  return (
    <div className="p-5 bg-[#151821] border border-[#1F2330] rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#3cff14]" />
          <h3 className="text-[#A4ACBC] text-[11px] font-bold tracking-widest uppercase">Activity Heatmap</h3>
        </div>
        <div className="flex items-center gap-3">
          {totalActivities > 0 && (
            <span className="text-[#A4ACBC] text-[10px]">
              {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} in {year}
            </span>
          )}
          <span className="text-[#A4ACBC] text-[10px]">{year}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          className="block min-w-[520px]"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredCell(null);
            setTooltip(null);
          }}
        >
          <defs>
            <style>{`
              .heatmap-cell { transition: opacity 0.15s ease; }
              .heatmap-cell:hover { opacity: 0.8; cursor: pointer; }
              .heatmap-label { font-family: 'Space Grotesk', sans-serif; font-size: 10px; fill: #A4ACBC; }
            `}</style>
          </defs>

          <g transform={`translate(${PAD_LEFT}, ${PAD_TOP})`}>
            {/* Day labels */}
            {DAYS.map((day, i) => (
              <text
                key={day}
                x="-8"
                y={i * CELL + 8}
                className="heatmap-label"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {day}
              </text>
            ))}

            {/* Month labels */}
            {Object.entries(monthPositions).map(([month, week]) => (
              <text
                key={month}
                x={week * CELL + 2}
                y="-8"
                className="heatmap-label"
                textAnchor="start"
              >
                {MONTHS[parseInt(month)]}
              </text>
            ))}

            {/* Heatmap cells */}
            {heatmapData.map((week, weekIndex) => (
              <g key={weekIndex}>
                {week.map((cell, dayIndex) => (
                  <rect
                    key={`${weekIndex}-${dayIndex}`}
                    x={weekIndex * CELL + 1}
                    y={dayIndex * CELL + 1}
                    width="10"
                    height="10"
                    rx="2"
                    ry="2"
                    fill={LEVEL_COLORS[cell.level]}
                    data-date={cell.dateStr}
                    data-count={cell.count}
                    onMouseEnter={() => setHoveredCell(cell)}
                    className="heatmap-cell"
                    style={{ opacity: cell.isFuture ? 0.3 : 1 }}
                  />
                ))}
              </g>
            ))}

            {/* Tooltip */}
            {hoveredCell && !hoveredCell.isFuture && tooltip && (
              <foreignObject
                x={Math.max(0, Math.min(tooltip.x + 16, width - 240))}
                y={Math.max(0, tooltip.y - 78)}
                width="240"
                height="62"
                pointerEvents="none"
              >
                <div className="bg-[#0D0F18] border border-[#3cff14]/50 rounded-lg px-3 py-2 text-white shadow-xl">
                  <p className="font-bold text-[13px]">{formatDate(hoveredCell.date)}</p>
                  <p className="text-[#A4ACBC] text-xs mt-0.5">
                    {hoveredCell.count} {hoveredCell.count === 1 ? 'activity' : 'activities'} • {LEVEL_TOOLTIP[hoveredCell.level]}
                  </p>
                </div>
              </foreignObject>
            )}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-[#A4ACBC] text-[10px]">Less</span>
        <div className="flex gap-1">
          {LEVEL_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded"
              style={{ backgroundColor: color }}
              title={LEVEL_TOOLTIP[i]}
            />
          ))}
        </div>
        <span className="text-[#A4ACBC] text-[10px]">More</span>
      </div>
    </div>
  );
}