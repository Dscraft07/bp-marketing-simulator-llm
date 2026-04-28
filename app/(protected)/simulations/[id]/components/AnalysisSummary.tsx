"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimulationResult {
  id: string;
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number | null;
  toxicity_score: number | null;
  purchase_intent: number | null;
  diversity_score: number | null;
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

  const resultsWithPurchaseIntent = results.filter((r) => r.purchase_intent !== null);
  const averagePurchaseIntent =
    resultsWithPurchaseIntent.length > 0
      ? resultsWithPurchaseIntent.reduce((sum, r) => sum + (r.purchase_intent || 0), 0) /
        resultsWithPurchaseIntent.length
      : null;

  const resultsWithDiversity = results.filter((r) => r.diversity_score !== null);
  const averageDiversity =
    resultsWithDiversity.length > 0
      ? resultsWithDiversity.reduce((sum, r) => sum + (r.diversity_score || 0), 0) /
        resultsWithDiversity.length
      : null;

  const COLORS = {
    Positive: "#22c55e", // green-500
    Neutral: "#94a3b8", // slate-400
    Negative: "#ef4444", // red-500
  };

  return (
    <div className="space-y-4">
      {/* Summary Metrics - Compact Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Total Reactions
          </p>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>

        {averageRelevance !== null && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Avg. Relevance
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {(averageRelevance * 100).toFixed(0)}%
              </p>
              <Badge variant="outline" className="text-xs">
                {averageRelevance >= 0.7
                  ? "High"
                  : averageRelevance >= 0.4
                  ? "Medium"
                  : "Low"}
              </Badge>
            </div>
          </div>
        )}

        {averageToxicity !== null && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Avg. Toxicity
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {(averageToxicity * 100).toFixed(0)}%
              </p>
              <Badge variant="outline" className="text-xs">
                {averageToxicity <= 0.2
                  ? "Low"
                  : averageToxicity <= 0.5
                  ? "Medium"
                  : "High"}
              </Badge>
            </div>
          </div>
        )}

        {averagePurchaseIntent !== null && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Avg. Purchase Intent
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {(averagePurchaseIntent * 100).toFixed(0)}%
              </p>
              <Badge variant="outline" className="text-xs">
                {averagePurchaseIntent >= 0.7
                  ? "High"
                  : averagePurchaseIntent >= 0.4
                  ? "Medium"
                  : "Low"}
              </Badge>
            </div>
          </div>
        )}

        {averageDiversity !== null && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-pink-50 to-background dark:from-pink-950/20">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Avg. Diversity
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">
                {(averageDiversity * 100).toFixed(0)}%
              </p>
              <Badge variant="outline" className="text-xs">
                {averageDiversity >= 0.7
                  ? "High"
                  : averageDiversity >= 0.4
                  ? "Medium"
                  : "Low"}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Distribution - Compact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Sentiment bars */}
          <div className="space-y-2">
            {sentimentData.map((item) => (
              <div key={item.sentiment} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor: COLORS[item.sentiment as keyof typeof COLORS],
                      }}
                    />
                    <span className="font-medium">{item.sentiment}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: COLORS[item.sentiment as keyof typeof COLORS],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
