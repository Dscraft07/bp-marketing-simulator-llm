import { createClient } from "@/lib/supabase/server";

interface Campaign {
  id: string;
  name: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface TargetGroup {
  id: string;
  name: string;
  description: string;
  persona_count: number;
  user_id: string;
  created_at: string;
}

async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch campaigns:", error);
    return [];
  }

  return data;
}

async function getTargetGroups(): Promise<TargetGroup[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("target_groups")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch target groups:", error);
    return [];
  }

  return data;
}

export default async function DashboardPage() {
  const [campaigns, targetGroups] = await Promise.all([
    getCampaigns(),
    getTargetGroups(),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome to your dashboard</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Campaigns ({campaigns.length})</h2>
          <div className="space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-muted-foreground">No campaigns yet</p>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{campaign.name}</h3>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Target Groups ({targetGroups.length})</h2>
          <div className="space-y-2">
            {targetGroups.length === 0 ? (
              <p className="text-muted-foreground">No target groups yet</p>
            ) : (
              targetGroups.map((group) => (
                <div key={group.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{group.name}</h3>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
