"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type SimulationStatus = "pending" | "running" | "completed" | "failed";

interface CampaignSnapshot {
  name: string;
  content: string;
  social_platform?: string;
}

interface TargetGroupSnapshot {
  name: string;
  description: string;
  persona_count: number;
}

interface SimulationResultsProps {
  simulationId: string;
  initialResults: SimulationResult[];
  simulationStatus: SimulationStatus;
  createdAt: string;
  model: string | null;
  personaCount: number;
  campaignSnapshot: CampaignSnapshot;
  targetGroupSnapshot: TargetGroupSnapshot;
}

const FAST_MODELS = new Set([
  "xai/grok-3-mini-fast",
  "openai/gpt-4o-mini",
]);

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "xai/grok-3-mini-fast": "Grok 3 Mini Fast",
  "xai/grok-3-fast": "Grok 3 Fast",
  "openai/gpt-4o-mini": "GPT-4o Mini",
  "openai/gpt-4o": "GPT-4o",
};

function estimateDurationSeconds(
  model: string | null,
  personaCount: number
): number {
  const isFast = model ? FAST_MODELS.has(model) : false;
  const base = isFast ? 5 : 10;
  const perPersona = isFast ? 0.5 : 1.2;
  return Math.ceil(base + perPersona * personaCount);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function SimulationResults({
  simulationId,
  initialResults,
  simulationStatus,
  createdAt,
  model,
  personaCount,
  campaignSnapshot,
  targetGroupSnapshot,
}: SimulationResultsProps) {
  const router = useRouter();
  const [results, setResults] = useState<SimulationResult[]>(initialResults);
  const [status, setStatus] = useState<SimulationStatus>(simulationStatus);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasRefreshed = useRef(false);

  const handleExportJson = useCallback(() => {
    const exportData = {
      simulation_id: simulationId,
      exported_at: new Date().toISOString(),
      campaign: campaignSnapshot,
      target_group: targetGroupSnapshot,
      model,
      results_count: results.length,
      results: results.map(({ persona_name, content, sentiment, relevance_score, toxicity_score }) => ({
        persona_name,
        content,
        sentiment,
        relevance_score,
        toxicity_score,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulation-${simulationId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [simulationId, campaignSnapshot, targetGroupSnapshot, model, results]);

  const estimatedSeconds = estimateDurationSeconds(model, personaCount);
  const isActive = status === "pending" || status === "running";
  const progress = Math.min((elapsedSeconds / estimatedSeconds) * 100, 100);
  const isOverEstimate = elapsedSeconds > estimatedSeconds * 1.3;
  const isSeverelyOver =
    elapsedSeconds > estimatedSeconds * 3 || elapsedSeconds > 180;

  // Elapsed timer
  useEffect(() => {
    if (!isActive) return;

    const startTime = new Date(createdAt).getTime();

    const update = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt, isActive]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    const resultsChannel = supabase
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
          setResults((prev) => {
            if (prev.some((r) => r.id === newResult.id)) return prev;
            return [...prev, newResult];
          });
        }
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setIsSubscribed(true);
      });

    const statusChannel = supabase
      .channel(`simulation_status:${simulationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "simulations",
          filter: `id=eq.${simulationId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: SimulationStatus })
            .status;
          if (newStatus) setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(statusChannel);
    };
  }, [simulationId]);

  // Polling: check both status AND results every 3s while active
  useEffect(() => {
    if (!isActive) return;

    const supabase = createClient();

    const poll = async () => {
      const [statusRes, resultsRes] = await Promise.all([
        supabase
          .from("simulations")
          .select("status")
          .eq("id", simulationId)
          .single(),
        supabase
          .from("simulation_results")
          .select("*")
          .eq("simulation_id", simulationId)
          .order("created_at", { ascending: true }),
      ]);

      if (statusRes.data?.status && statusRes.data.status !== status) {
        setStatus(statusRes.data.status as SimulationStatus);
      }

      if (resultsRes.data && resultsRes.data.length > results.length) {
        setResults(resultsRes.data as SimulationResult[]);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [simulationId, status, isActive, results.length]);

  // When simulation finishes, refresh the server-rendered page (hero section, status badge)
  useEffect(() => {
    if (isActive || hasRefreshed.current) return;
    if (simulationStatus === status) return;

    hasRefreshed.current = true;
    router.refresh();
  }, [status, isActive, simulationStatus, router]);

  // Loading state: active with no results yet
  if (isActive && results.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {status === "pending"
                  ? "Preparing Simulation..."
                  : "Generating Persona Reactions..."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {personaCount} personas &middot;{" "}
                {model
                  ? MODEL_DISPLAY_NAMES[model] || model
                  : "Unknown model"}
              </p>
            </div>

            <div className="w-full max-w-md space-y-2">
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-linear ${
                    isSeverelyOver
                      ? "bg-destructive"
                      : isOverEstimate
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Elapsed: {formatDuration(elapsedSeconds)}</span>
                <span>Estimated: ~{formatDuration(estimatedSeconds)}</span>
              </div>
            </div>

            {isSeverelyOver && (
              <p className="text-sm text-destructive">
                This is taking unusually long. The simulation may have
                encountered an issue. Try refreshing the page.
              </p>
            )}

            {!isSeverelyOver && isOverEstimate && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Taking longer than expected. The model may be processing a
                complex request.
              </p>
            )}

            {isSubscribed && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <span className="mr-1.5">●</span> Live
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Running with results streaming in
  if (status === "running" && results.length > 0) {
    return (
      <div className="space-y-6">
        <AnalysisSummary results={results} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Persona Reactions ({results.length})
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                Export JSON
              </Button>
              {isSubscribed && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  <span className="mr-1.5">●</span> Live
                </Badge>
              )}
            </div>
          </div>
          <DiscussionThread results={results} />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-destructive font-medium">Simulation failed.</p>
        {elapsedSeconds > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Failed after {formatDuration(elapsedSeconds)}
          </p>
        )}
      </div>
    );
  }

  // Completed
  return (
    <div className="space-y-6">
      {results.length > 0 && <AnalysisSummary results={results} />}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Persona Reactions ({results.length})
          </h2>
          {results.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              Export JSON
            </Button>
          )}
        </div>
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
