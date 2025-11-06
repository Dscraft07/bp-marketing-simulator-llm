"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface SimulationResult {
  id: string;
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number | null;
  toxicity_score: number | null;
  created_at: string;
}

interface AnalysisSummaryProps {
  results: SimulationResult[];
}

interface SentimentData {
  sentiment: string;
  count: number;
  percentage: string;
}

export function AnalysisSummary({ results }: AnalysisSummaryProps) {
  if (results.length === 0) {
    return null;
  }

  // Calculate sentiment distribution
  const sentimentCounts = results.reduce(
    (acc, result) => {
      acc[result.sentiment] = (acc[result.sentiment] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sentimentData: SentimentData[] = [
    {
      sentiment: "Positive",
      count: sentimentCounts.positive || 0,
      percentage: ((((sentimentCounts.positive || 0) / results.length) * 100).toFixed(1)),
    },
    {
      sentiment: "Neutral",
      count: sentimentCounts.neutral || 0,
      percentage: ((((sentimentCounts.neutral || 0) / results.length) * 100).toFixed(1)),
    },
    {
      sentiment: "Negative",
      count: sentimentCounts.negative || 0,
      percentage: ((((sentimentCounts.negative || 0) / results.length) * 100).toFixed(1)),
    },
  ];

  // Calculate average scores
  const resultsWithRelevance = results.filter((r) => r.relevance_score !== null);
  const averageRelevance =
    resultsWithRelevance.length > 0
      ? resultsWithRelevance.reduce((sum, r) => sum + (r.relevance_score || 0), 0) /
        resultsWithRelevance.length
      : null;

  const resultsWithToxicity = results.filter((r) => r.toxicity_score !== null);
  const averageToxicity =
    resultsWithToxicity.length > 0
      ? resultsWithToxicity.reduce((sum, r) => sum + (r.toxicity_score || 0), 0) /
        resultsWithToxicity.length
      : null;

  const COLORS = {
    Positive: "#22c55e", // green-500
    Neutral: "#94a3b8", // slate-400
    Negative: "#ef4444", // red-500
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total Reactions
            </p>
            <p className="text-3xl font-bold">{results.length}</p>
          </div>

          {averageRelevance !== null && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Avg. Relevance
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">
                  {(averageRelevance * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {averageRelevance >= 0.7
                    ? "High"
                    : averageRelevance >= 0.4
                    ? "Medium"
                    : "Low"}
                </p>
              </div>
            </div>
          )}

          {averageToxicity !== null && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Avg. Toxicity
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">
                  {(averageToxicity * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  {averageToxicity <= 0.2
                    ? "Low"
                    : averageToxicity <= 0.5
                    ? "Medium"
                    : "High"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sentiment Distribution Chart */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="sentiment"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Bar dataKey="count" name="Number of Reactions" radius={[8, 8, 0, 0]}>
                {sentimentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.sentiment as keyof typeof COLORS]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Percentage breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {sentimentData.map((item) => (
              <div
                key={item.sentiment}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: COLORS[item.sentiment as keyof typeof COLORS],
                  }}
                />
                <span className="font-medium">{item.sentiment}:</span>
                <span className="text-muted-foreground">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
