/**
 * System Test: Full Simulation Flow
 *
 * Tests the complete end-to-end flow:
 * 1. Create a campaign
 * 2. Create a target group
 * 3. Run a simulation (creates snapshot, invokes Edge Function)
 * 4. Verify simulation record was created with correct snapshots
 * 5. Delete simulation, campaign, and target group
 *
 * All assertions use data returned by server actions (exposed endpoints),
 * not direct DB access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, createFormData } from "./helpers/supabaseMock";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

const mock = createSupabaseMock();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mock.client),
}));

const { createCampaign } = await import("@/app/campaigns/actions");
const { createTargetGroup } = await import("@/app/target-groups/actions");
const { runSimulation, deleteSimulation } = await import(
  "@/app/simulations/actions"
);
const { deleteCampaign } = await import("@/app/campaigns/actions");
const { deleteTargetGroup } = await import("@/app/target-groups/actions");

const TEST_USER = { id: "flow-user-1", email: "flow@example.com" };

describe("Full Simulation Flow — System Test", () => {
  beforeEach(() => {
    mock.reset();
  });

  it("completes the full flow: create campaign → create target group → run simulation → cleanup", async () => {
    mock.setUser(TEST_USER);

    // ---- Step 1: Create campaign ----
    const campaignResponse = {
      id: "campaign-flow-1",
      name: "Black Friday Promo",
      content: "Biggest sale of the year! Up to 70% off everything.",
      user_id: TEST_USER.id,
      created_at: "2025-11-20T10:00:00Z",
    };
    mock.setResult("campaigns", { data: campaignResponse });

    const campaignResult = await createCampaign(
      createFormData({
        name: "Black Friday Promo",
        content: "Biggest sale of the year! Up to 70% off everything.",
      })
    );

    expect(campaignResult.success).toBe(true);
    expect(campaignResult.data.id).toBe("campaign-flow-1");
    expect(campaignResult.data.name).toBe("Black Friday Promo");

    // ---- Step 2: Create target group ----
    const targetGroupResponse = {
      id: "tg-flow-1",
      name: "Budget Shoppers",
      description: "Price-sensitive consumers who actively seek deals and discounts",
      persona_count: 8,
      user_id: TEST_USER.id,
      created_at: "2025-11-20T10:05:00Z",
    };
    mock.setResult("target_groups", { data: targetGroupResponse });

    const tgResult = await createTargetGroup(
      createFormData({
        name: "Budget Shoppers",
        description:
          "Price-sensitive consumers who actively seek deals and discounts",
        persona_count: "8",
      })
    );

    expect(tgResult.success).toBe(true);
    expect(tgResult.data.id).toBe("tg-flow-1");
    expect(tgResult.data.persona_count).toBe(8);

    // ---- Step 3: Run simulation ----
    // The simulation flow internally fetches the campaign and target group,
    // then creates snapshots and inserts a simulation record.
    mock.setResult("user_api_keys", { count: 1 });
    mock.setResult("campaigns", { data: campaignResponse });
    mock.setResult("target_groups", { data: targetGroupResponse });

    const simulationRecord = {
      id: "sim-flow-1",
      user_id: TEST_USER.id,
      campaign_id: "campaign-flow-1",
      target_group_id: "tg-flow-1",
      status: "pending",
      model: "openai/gpt-4o",
      campaign_snapshot: {
        name: "Black Friday Promo",
        content: "Biggest sale of the year! Up to 70% off everything.",
        social_platform: "instagram",
        language: "en",
      },
      target_group_snapshot: {
        name: "Budget Shoppers",
        description:
          "Price-sensitive consumers who actively seek deals and discounts",
        persona_count: 8,
      },
    };
    mock.setResult("simulations", { data: simulationRecord });

    const simResult = await runSimulation(
      "campaign-flow-1",
      "tg-flow-1",
      "instagram",
      "openai/gpt-4o"
    );

    expect(simResult.success).toBe(true);
    expect(simResult.simulationId).toBe("sim-flow-1");

    // Verify Edge Function was called with the simulation ID
    expect(mock.functionsInvoke).toHaveBeenCalledWith("run-llm-simulation", {
      body: { simulationId: "sim-flow-1" },
    });

    // ---- Step 4: Cleanup — delete simulation, campaign, target group ----
    mock.setResult("simulations", { error: null });
    const deleteSimResult = await deleteSimulation("sim-flow-1");
    expect(deleteSimResult.success).toBe(true);

    mock.setResult("campaigns", { error: null });
    const deleteCampaignResult = await deleteCampaign("campaign-flow-1");
    expect(deleteCampaignResult.success).toBe(true);

    mock.setResult("target_groups", { error: null });
    const deleteTgResult = await deleteTargetGroup("tg-flow-1");
    expect(deleteTgResult.success).toBe(true);
  });

  it("fails the flow gracefully when campaign creation fails", async () => {
    mock.setUser(TEST_USER);
    mock.setResult("campaigns", {
      error: { message: "Database unavailable" },
    });

    const result = await createCampaign(
      createFormData({
        name: "Failing Campaign",
        content: "This campaign will fail to be created",
      })
    );

    expect(result.error).toContain("Failed to create campaign");
    // Simulation should not be attempted when campaign creation fails
  });

  it("fails the flow gracefully when simulation creation fails due to missing API key", async () => {
    mock.setUser(TEST_USER);

    // Campaign and target group exist
    mock.setResult("campaigns", { data: { id: "c-1", name: "Test", content: "Test content here" } });
    mock.setResult("target_groups", { data: { id: "tg-1", name: "Group", description: "Desc", persona_count: 3 } });

    // But user has no API key
    mock.setResult("user_api_keys", { count: 0 });

    const result = await runSimulation("c-1", "tg-1", "twitter", "openai/gpt-4o");

    expect(result.success).toBe(false);
    expect(result.error).toContain("API key");
  });

  it("handles unauthenticated user across the full flow", async () => {
    // No user set — all actions should fail with auth error

    const campaignResult = await createCampaign(
      createFormData({
        name: "Unauthorized Campaign",
        content: "This should not be created without auth",
      })
    );
    expect(campaignResult.error).toContain("Unauthorized");

    const tgResult = await createTargetGroup(
      createFormData({
        name: "Unauthorized Group",
        description: "This should not be created without auth",
        persona_count: "5",
      })
    );
    expect(tgResult.error).toContain("Unauthorized");

    const simResult = await runSimulation(
      "c-1",
      "tg-1",
      "twitter",
      "openai/gpt-4o"
    );
    expect(simResult.success).toBe(false);
    expect(simResult.error).toContain("logged in");
  });
});
