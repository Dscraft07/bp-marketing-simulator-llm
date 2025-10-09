import { createClient } from "@/lib/supabase/server";
import { CampaignsTable } from "./components/CampaignsTable";
import { TargetGroupsTable } from "./components/TargetGroupsTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Campaigns ({campaigns.length})</h2>
            <Button asChild size="sm">
              <Link href="/campaigns/new">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Link>
            </Button>
          </div>
          <CampaignsTable campaigns={campaigns} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Target Groups ({targetGroups.length})</h2>
            <Button asChild size="sm">
              <Link href="/target-groups/new">
                <Plus className="mr-2 h-4 w-4" />
                New Target Group
              </Link>
            </Button>
          </div>
          <TargetGroupsTable targetGroups={targetGroups} />
        </div>
      </div>
    </div>
  );
}
