import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "../helpers/supabaseMock";

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

const { runSimulation, deleteSimulation } = await import(
  "@/app/simulations/actions"
);

const TEST_USER = { id: "user-789", email: "sim@example.com" };

const MOCK_CAMPAIGN = {
  id: "campaign-1",
  name: "Summer Sale",
  content: "Get 50% off on all products!",
  user_id: TEST_USER.id,
};

const MOCK_TARGET_GROUP = {
  id: "tg-1",
  name: "Young Adults",
  description: "People aged 18-25 interested in technology",
  persona_count: 5,
  user_id: TEST_USER.id,
};

describe("Simulation Server Actions — Integration Tests", () => {
  beforeEach(() => {
    mock.reset();
  });

  // ---------- runSimulation ----------
  describe("runSimulation", () => {
    it("returns error when user is not authenticated", async () => {
      const result = await runSimulation(
        "campaign-1",
        "tg-1",
        "twitter",
        "openai/gpt-4o"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("logged in");
    });

    it("returns error when user has no API key for selected provider", async () => {
      mock.setUser(TEST_USER);
      // user_api_keys count = 0 → no key
      mock.setResult("user_api_keys", { count: 0 });

      const result = await runSimulation(
        "campaign-1",
        "tg-1",
        "twitter",
        "openai/gpt-4o"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key");
    });

    it("returns error when campaign is not found", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("user_api_keys", { count: 1 });
      mock.setResult("campaigns", { data: null, error: { message: "Not found" } });

      const result = await runSimulation(
        "nonexistent-campaign",
        "tg-1",
        "twitter",
        "openai/gpt-4o"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Campaign not found");
    });

    it("returns error when target group is not found", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("user_api_keys", { count: 1 });
      mock.setResult("campaigns", { data: MOCK_CAMPAIGN });
      mock.setResult("target_groups", { data: null, error: { message: "Not found" } });

      const result = await runSimulation(
        "campaign-1",
        "nonexistent-tg",
        "twitter",
        "openai/gpt-4o"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Target group not found");
    });

    it("creates simulation and returns simulationId on success", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("user_api_keys", { count: 1 });
      mock.setResult("campaigns", { data: MOCK_CAMPAIGN });
      mock.setResult("target_groups", { data: MOCK_TARGET_GROUP });
      mock.setResult("simulations", {
        data: { id: "sim-1", status: "pending" },
      });

      const result = await runSimulation(
        "campaign-1",
        "tg-1",
        "twitter",
        "openai/gpt-4o"
      );

      expect(result.success).toBe(true);
      expect(result.simulationId).toBe("sim-1");
    });

    it("invokes Edge Function after creating simulation", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("user_api_keys", { count: 1 });
      mock.setResult("campaigns", { data: MOCK_CAMPAIGN });
      mock.setResult("target_groups", { data: MOCK_TARGET_GROUP });
      mock.setResult("simulations", {
        data: { id: "sim-42", status: "pending" },
      });

      await runSimulation("campaign-1", "tg-1", "instagram", "xai/grok-3-fast");

      expect(mock.functionsInvoke).toHaveBeenCalledWith("run-llm-simulation", {
        body: { simulationId: "sim-42" },
      });
    });

    it("returns error when simulation insert fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("user_api_keys", { count: 1 });
      mock.setResult("campaigns", { data: MOCK_CAMPAIGN });
      mock.setResult("target_groups", { data: MOCK_TARGET_GROUP });
      mock.setResult("simulations", {
        data: null,
        error: { message: "Insert failed" },
      });

      const result = await runSimulation(
        "campaign-1",
        "tg-1",
        "twitter",
        "openai/gpt-4o"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to create simulation");
    });

    it("passes language parameter to simulation", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("user_api_keys", { count: 1 });
      mock.setResult("campaigns", { data: MOCK_CAMPAIGN });
      mock.setResult("target_groups", { data: MOCK_TARGET_GROUP });
      mock.setResult("simulations", {
        data: { id: "sim-cs", status: "pending" },
      });

      const result = await runSimulation(
        "campaign-1",
        "tg-1",
        "facebook",
        "openai/gpt-4o-mini",
        "cs"
      );

      expect(result.success).toBe(true);
      expect(result.simulationId).toBe("sim-cs");
    });
  });

  // ---------- deleteSimulation ----------
  describe("deleteSimulation", () => {
    it("returns error when user is not authenticated", async () => {
      const result = await deleteSimulation("sim-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("deletes simulation successfully", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("simulations", { error: null });

      const result = await deleteSimulation("sim-1");

      expect(result.success).toBe(true);
    });

    it("returns error when Supabase delete fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("simulations", {
        error: { message: "Simulation not found" },
      });

      const result = await deleteSimulation("sim-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to delete simulation");
    });
  });
});
