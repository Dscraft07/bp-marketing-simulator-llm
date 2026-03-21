import { describe, it, expect } from "vitest";
import { campaignSchema } from "@/lib/validation/campaignSchema";

describe("campaignSchema", () => {
  it("accepts valid campaign data", () => {
    const result = campaignSchema.safeParse({
      name: "Summer Sale 2025",
      content: "Get 50% off on all summer products. Limited time offer!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts name at minimum length (3 chars)", () => {
    const result = campaignSchema.safeParse({
      name: "abc",
      content: "This is valid campaign content.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts name at maximum length (255 chars)", () => {
    const result = campaignSchema.safeParse({
      name: "a".repeat(255),
      content: "This is valid campaign content.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts content at minimum length (10 chars)", () => {
    const result = campaignSchema.safeParse({
      name: "Test Campaign",
      content: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 3 characters", () => {
    const result = campaignSchema.safeParse({
      name: "ab",
      content: "Valid campaign content here.",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 3");
    }
  });

  it("rejects name longer than 255 characters", () => {
    const result = campaignSchema.safeParse({
      name: "a".repeat(256),
      content: "Valid campaign content here.",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("255");
    }
  });

  it("rejects content shorter than 10 characters", () => {
    const result = campaignSchema.safeParse({
      name: "Test Campaign",
      content: "Short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 10");
    }
  });

  it("rejects missing name field", () => {
    const result = campaignSchema.safeParse({
      content: "Valid campaign content here.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing content field", () => {
    const result = campaignSchema.safeParse({
      name: "Test Campaign",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = campaignSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
