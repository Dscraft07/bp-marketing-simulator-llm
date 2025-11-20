import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./components/DashboardClient";

interface Campaign {
  id: string;
  name: string;
  content: string;
  social_platform: string;
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

  return <DashboardClient campaigns={campaigns} targetGroups={targetGroups} />;
}
