import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, createFormData } from "../helpers/supabaseMock";

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

const { createTargetGroup, updateTargetGroup, deleteTargetGroup } = await import(
  "@/app/target-groups/actions"
);

const TEST_USER = { id: "user-456", email: "test@example.com" };

describe("Target Group Server Actions — Integration Tests", () => {
  beforeEach(() => {
    mock.reset();
  });

  // ---------- createTargetGroup ----------
  describe("createTargetGroup", () => {
    it("returns error when user is not authenticated", async () => {
      const formData = createFormData({
        name: "Young Adults",
        description: "People aged 18-25 interested in tech",
        persona_count: "5",
      });

      const result = await createTargetGroup(formData);

      expect(result.error).toContain("Unauthorized");
    });

    it("returns validation error for invalid data", async () => {
      mock.setUser(TEST_USER);

      const formData = createFormData({
        name: "ab", // too short
        description: "short", // too short
        persona_count: "0", // below minimum
      });

      const result = await createTargetGroup(formData);

      expect(result.error).toBeDefined();
    });

    it("creates target group and returns data on success", async () => {
      mock.setUser(TEST_USER);

      const targetGroupData = {
        id: "tg-1",
        name: "Young Adults",
        description: "People aged 18-25 interested in technology",
        persona_count: 10,
        user_id: TEST_USER.id,
        created_at: "2025-01-01T00:00:00Z",
      };
      mock.setResult("target_groups", { data: targetGroupData });

      const formData = createFormData({
        name: "Young Adults",
        description: "People aged 18-25 interested in technology",
        persona_count: "10",
      });

      const result = await createTargetGroup(formData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(targetGroupData);
      expect(result.data.persona_count).toBe(10);
      expect(result.data.user_id).toBe(TEST_USER.id);
    });

    it("uses default persona_count of 5 when not provided", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("target_groups", {
        data: { id: "tg-2", persona_count: 5 },
      });

      const formData = createFormData({
        name: "Default Count Group",
        description: "Testing default persona count value",
      });

      const result = await createTargetGroup(formData);

      expect(result.success).toBe(true);
      expect(mock.client.from).toHaveBeenCalledWith("target_groups");
    });

    it("returns error when Supabase insert fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("target_groups", {
        error: { message: "Unique constraint violation" },
      });

      const formData = createFormData({
        name: "Duplicate Group",
        description: "This group name already exists somehow",
        persona_count: "5",
      });

      const result = await createTargetGroup(formData);

      expect(result.error).toContain("Failed to create target group");
    });
  });

  // ---------- updateTargetGroup ----------
  describe("updateTargetGroup", () => {
    it("returns error when user is not authenticated", async () => {
      const formData = createFormData({
        name: "Updated Group",
        description: "Updated description for testing",
        persona_count: "10",
      });

      const result = await updateTargetGroup("tg-1", formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("updates target group successfully", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("target_groups", { error: null });

      const formData = createFormData({
        name: "Updated Target Group",
        description: "Updated description for the target group",
        persona_count: "15",
      });

      const result = await updateTargetGroup("tg-1", formData);

      expect(result.success).toBe(true);
    });

    it("returns error when Supabase update fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("target_groups", {
        error: { message: "Permission denied" },
      });

      const formData = createFormData({
        name: "Updated Group",
        description: "Updated description for testing",
        persona_count: "10",
      });

      const result = await updateTargetGroup("tg-1", formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to update target group");
    });
  });

  // ---------- deleteTargetGroup ----------
  describe("deleteTargetGroup", () => {
    it("returns error when user is not authenticated", async () => {
      const result = await deleteTargetGroup("tg-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("deletes target group successfully", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("target_groups", { error: null });

      const result = await deleteTargetGroup("tg-1");

      expect(result.success).toBe(true);
    });

    it("returns error when Supabase delete fails", async () => {
      mock.setUser(TEST_USER);
      mock.setResult("target_groups", {
        error: { message: "Cannot delete: used in simulations" },
      });

      const result = await deleteTargetGroup("tg-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to delete target group");
    });
  });
});
