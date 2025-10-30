import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SimulationPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Simulation {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  finished_at: string | null;
  error_message: string | null;
  model: string | null;
  temperature: number | null;
  campaign_snapshot: {
    name: string;
    content: string;
  };
  target_group_snapshot: {
    name: string;
    description: string;
    persona_count: number;
  };
}

async function getSimulation(id: string): Promise<Simulation | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Simulation;
}

function getStatusBadge(status: Simulation["status"]) {
  const variants: Record<
    Simulation["status"],
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    running: { variant: "default", label: "Running" },
    completed: { variant: "outline", label: "Completed" },
    failed: { variant: "destructive", label: "Failed" },
  };

  const config = variants[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default async function SimulationPage({ params }: SimulationPageProps) {
  const { id } = await params;
  const simulation = await getSimulation(id);

  if (!simulation) {
    notFound();
  }

  const createdDate = new Date(simulation.created_at).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const finishedDate = simulation.finished_at
    ? new Date(simulation.finished_at).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Simulation Details</h1>
          {getStatusBadge(simulation.status)}
        </div>
        <p className="text-muted-foreground">
          Created on {createdDate}
          {finishedDate && ` • Finished on ${finishedDate}`}
        </p>
      </div>

      {simulation.error_message && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{simulation.error_message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">
                {simulation.campaign_snapshot.name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Content
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {simulation.campaign_snapshot.content}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Target Group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">
                {simulation.target_group_snapshot.name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Description
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {simulation.target_group_snapshot.description}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Persona Count
              </p>
              <p className="text-lg font-semibold">
                {simulation.target_group_snapshot.persona_count}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulation Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Model</p>
            <p className="text-sm">{simulation.model || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Temperature
            </p>
            <p className="text-sm">{simulation.temperature ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <p className="text-sm capitalize">{simulation.status}</p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for results */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Persona Reactions</CardTitle>
        </CardHeader>
        <CardContent>
          {simulation.status === "pending" && (
            <p className="text-muted-foreground text-center py-8">
              Simulation is pending. Results will appear here once the simulation
              starts.
            </p>
          )}
          {simulation.status === "running" && (
            <p className="text-muted-foreground text-center py-8">
              Simulation is currently running. Results will appear here once
              completed.
            </p>
          )}
          {simulation.status === "failed" && (
            <p className="text-destructive text-center py-8">
              Simulation failed. No results available.
            </p>
          )}
          {simulation.status === "completed" && (
            <p className="text-muted-foreground text-center py-8">
              Results will be displayed here. (Implementation pending)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
