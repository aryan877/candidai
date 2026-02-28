"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { DIMENSION_LABELS } from "@/lib/constants";
import type { ScoreDimension } from "@/types/interview";

interface ScoreRadarProps {
  scores: { dimension: ScoreDimension; score: number }[];
}

export default function ScoreRadar({ scores }: ScoreRadarProps) {
  const data = scores.map((s) => ({
    dimension: DIMENSION_LABELS[s.dimension] ?? s.dimension,
    score: s.score,
    fullMark: 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fill: "#52525b", fontSize: 10 }}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#a1a1aa"
          fill="#a1a1aa"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
