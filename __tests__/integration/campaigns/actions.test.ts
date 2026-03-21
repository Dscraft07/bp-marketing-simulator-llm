import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, createFormData } from "../helpers/supabaseMock";

// Mock Next.js server dependencies
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

// Import after mocks are set up
const { createCampaign, updateCampaign, deleteCampaign } = await import(
  "@/app/campaigns/actions"
);

const TEST_USER = { id: "user-123", email: "test@example.com" };

describe("Campaign Server Actions — Integration Tests", () => {
  beforeEach(() => {
    mock.reset();
  });

  // ---------- createCampaign ----------
  describe("createCampaign", () => {
    it("returns error when user is not authenticated", async () => {
      const formData = createFormData({
        name: "Test Campaign",
        content: "Some valid content here",
      });

      const result = await createCampaign(formData);

      expect(result.error).toContain("Unauthorized");
    });

    it("returns validation error for invalid data", async () => {
      mock.setUser(TEST_USER);

      const formData = createFormData({
        name: "ab", // too short
        content: "Short", // too short
      });

      const result = await createCampaign(formData);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("at least");
    });

    it("creates campaign and returns data on success", async () => {
      mock.setUser(TEST_USER);

      const campaignData = {
        id: "campaign-1",
        name: "Summer Sale 2025",
        content: "Get 50% off on all summer products!",
        user_id: TEST_USER.id,
        created_at: "2025-01-01T00:00:00Z",
      };
      mock.setResult("campaigns", { data: campaignData });

      const formData = createFormData({
        name: "Summer Sale 2025",
        content: "Get 50% off on all summer products!",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(campaignData);
      expect(result.data.name).toBe("Summer Sale 2025");
      expect(result.data.user_id).toBe(TEST_USER.id);
    });

    it("returns error when Supabase insert fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("campaigns", {
        error: { message: "Database connection failed" },
      });

      const formData = createFormData({
        name: "Test Campaign",
        content: "Valid content for testing purposes",
      });

      const result = await createCampaign(formData);

      expect(result.error).toContain("Failed to create campaign");
      expect(result.error).toContain("Database connection failed");
    });

    it("passes correct table name to Supabase", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("campaigns", { data: { id: "c-1" } });

      const formData = createFormData({
        name: "Test Campaign",
        content: "Valid content for testing purposes",
      });

      await createCampaign(formData);

      expect(mock.client.from).toHaveBeenCalledWith("campaigns");
    });
  });

  // ---------- updateCampaign ----------
  describe("updateCampaign", () => {
    it("returns error when user is not authenticated", async () => {
      const formData = createFormData({
        name: "Updated Campaign",
        content: "Updated valid content here",
      });

      const result = await updateCampaign("campaign-1", formData);

      expect(result.error).toContain("Unauthorized");
      expect(result.success).toBe(false);
    });

    it("returns validation error for invalid data", async () => {
      mock.setUser(TEST_USER);

      const formData = createFormData({
        name: "ab",
        content: "short",
      });

      const result = await updateCampaign("campaign-1", formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("updates campaign successfully", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("campaigns", { error: null });

      const formData = createFormData({
        name: "Updated Campaign Name",
        content: "Updated campaign content for testing",
      });

      const result = await updateCampaign("campaign-1", formData);

      expect(result.success).toBe(true);
      expect(mock.client.from).toHaveBeenCalledWith("campaigns");
    });

    it("returns error when Supabase update fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("campaigns", {
        error: { message: "Row not found" },
      });

      const formData = createFormData({
        name: "Updated Campaign",
        content: "Valid updated content here",
      });

      const result = await updateCampaign("campaign-1", formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update campaign");
    });
  });

  // ---------- deleteCampaign ----------
  describe("deleteCampaign", () => {
    it("returns error when user is not authenticated", async () => {
      const result = await deleteCampaign("campaign-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("deletes campaign successfully", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("campaigns", { error: null });

      const result = await deleteCampaign("campaign-1");

      expect(result.success).toBe(true);
      expect(mock.client.from).toHaveBeenCalledWith("campaigns");
    });

    it("returns error when Supabase delete fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("campaigns", {
        error: { message: "Foreign key constraint" },
      });

      const result = await deleteCampaign("campaign-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to delete campaign");
    });
  });
});
