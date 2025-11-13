"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DiscussionThread } from "./DiscussionThread";
import { AnalysisSummary } from "./AnalysisSummary";

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
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [simulationId]);

  if (simulationStatus === "pending") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Simulation is pending. Results will appear here once it starts.
        </p>
      </div>
    );
  }

  if (simulationStatus === "running") {
    return (
      <div className="space-y-6">
        {results.length > 0 && <AnalysisSummary results={results} />}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Persona Reactions {results.length > 0 && `(${results.length})`}
            </h2>
            {isSubscribed && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <span className="mr-1.5">🟢</span> Live
              </Badge>
            )}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-3">
                Simulation is running... Waiting for reactions
              </p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : (
            <DiscussionThread results={results} />
          )}
        </div>
      </div>
    );
  }

  if (simulationStatus === "failed") {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">
          Simulation failed. No results available.
        </p>
      </div>
    );
  }

  // Completed
  return (
    <div className="space-y-6">
      {results.length > 0 && <AnalysisSummary results={results} />}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Persona Reactions ({results.length})
        </h2>
        {results.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No results found for this simulation.
          </p>
        ) : (
          <DiscussionThread results={results} />
        )}
      </div>
    </div>
  );
}
