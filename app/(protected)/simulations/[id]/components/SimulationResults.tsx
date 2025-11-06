"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimulationResult {
  id: string;
  persona_name: string;
  content: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance_score: number | null;
  toxicity_score: number | null;
  created_at: string;
}

interface SimulationResultsProps {
  simulationId: string;
  initialResults: SimulationResult[];
  simulationStatus: "pending" | "running" | "completed" | "failed";
}

function getSentimentBadge(sentiment: SimulationResult["sentiment"]) {
  const variants: Record<
    SimulationResult["sentiment"],
    { variant: "default" | "secondary" | "destructive"; label: string; color: string }
  > = {
    positive: { variant: "default", label: "Positive", color: "text-green-600" },
    neutral: { variant: "secondary", label: "Neutral", color: "text-gray-600" },
    negative: { variant: "destructive", label: "Negative", color: "text-red-600" },
  };

  const config = variants[sentiment];
  return (
    <Badge variant={config.variant}>
      <span className={config.color}>{config.label}</span>
    </Badge>
  );
}

export function SimulationResults({
  simulationId,
  initialResults,
  simulationStatus,
}: SimulationResultsProps) {
  const [results, setResults] = useState<SimulationResult[]>(initialResults);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to new INSERT events for this simulation
    const channel = supabase
      .channel(`simulation_results:${simulationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "simulation_results",
          filter: `simulation_id=eq.${simulationId}`,
        },
        (payload) => {
          console.log("New result received via Realtime:", payload);
          const newResult = payload.new as SimulationResult;

          // Add new result to the list
          setResults((prev) => {
            // Check if result already exists (avoid duplicates)
            if (prev.some((r) => r.id === newResult.id)) {
              return prev;
            }
            return [...prev, newResult];
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("Unsubscribing from Realtime");
      supabase.removeChannel(channel);
    };
  }, [simulationId]);

  if (simulationStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Persona Reactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Simulation is pending. Results will appear here once the simulation starts.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (simulationStatus === "running") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Persona Reactions</CardTitle>
            {isSubscribed && (
              <Badge variant="outline" className="text-green-600">
                🟢 Live
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">
                Simulation is running... Waiting for results
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Receiving results in real-time... ({results.length} received)
              </p>
              {results.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (simulationStatus === "failed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Persona Reactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-8">
            Simulation failed. No results available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Completed
  return (
    <Card>
      <CardHeader>
        <CardTitle>Persona Reactions ({results.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No results found for this simulation.
          </p>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <ResultCard key={result.id} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultCard({ result }: { result: SimulationResult }) {
  return (
    <div className="border rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-lg">{result.persona_name}</h4>
          <p className="text-xs text-muted-foreground">
            {new Date(result.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {getSentimentBadge(result.sentiment)}
      </div>

      <p className="text-sm whitespace-pre-wrap leading-relaxed">
        {result.content}
      </p>

      <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
        {result.relevance_score !== null && (
          <div>
            <span className="font-medium">Relevance:</span>{" "}
            {(result.relevance_score * 100).toFixed(0)}%
          </div>
        )}
        {result.toxicity_score !== null && (
          <div>
            <span className="font-medium">Toxicity:</span>{" "}
            {(result.toxicity_score * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}
