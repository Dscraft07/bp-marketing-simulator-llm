"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <>
        {results.length > 0 && <AnalysisSummary results={results} />}
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
              <div>
                <p className="text-sm text-muted-foreground mb-6">
                  Receiving results in real-time... ({results.length} received)
                </p>
                <DiscussionThread results={results} />
              </div>
            )}
          </CardContent>
        </Card>
      </>
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
    <>
      {results.length > 0 && <AnalysisSummary results={results} />}
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
            <DiscussionThread results={results} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
