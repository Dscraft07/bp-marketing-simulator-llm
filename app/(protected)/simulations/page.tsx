import { createClient } from "@/lib/supabase/server";
import { SimulationsTable } from "./components/SimulationsTable";

interface Simulation {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  finished_at: string | null;
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

async function getSimulations(): Promise<Simulation[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("simulations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch simulations:", error);
    return [];
  }

  return (data || []) as Simulation[];
}

export default async function SimulationsPage() {
  const simulations = await getSimulations();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Simulation History</h1>
        <p className="text-muted-foreground mt-2">
          View all your past simulations
        </p>
      </div>

      <SimulationsTable simulations={simulations} />
    </div>
  );
}
