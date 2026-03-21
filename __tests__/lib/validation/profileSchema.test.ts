import { describe, it, expect } from "vitest";
import { profileSchema } from "@/lib/validation/profileSchema";

describe("profileSchema", () => {
  it("accepts a valid username", () => {
    const result = profileSchema.safeParse({ username: "john_doe" });
    expect(result.success).toBe(true);
  });

  it("accepts username with hyphens", () => {
    const result = profileSchema.safeParse({ username: "john-doe-123" });
    expect(result.success).toBe(true);
  });

  it("accepts username at minimum length (3 chars)", () => {
    const result = profileSchema.safeParse({ username: "abc" });
    expect(result.success).toBe(true);
  });

  it("accepts username at maximum length (50 chars)", () => {
    const result = profileSchema.safeParse({
      username: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects username shorter than 3 characters", () => {
    const result = profileSchema.safeParse({ username: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 3");
    }
  });

  it("rejects username longer than 50 characters", () => {
    const result = profileSchema.safeParse({
      username: "a".repeat(51),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("50");
    }
  });

  it("rejects username with spaces", () => {
    const result = profileSchema.safeParse({ username: "john doe" });
    expect(result.success).toBe(false);
  });

  it("rejects username with special characters", () => {
    const result = profileSchema.safeParse({ username: "john@doe!" });
    expect(result.success).toBe(false);
  });

  it("rejects empty username", () => {
    const result = profileSchema.safeParse({ username: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing username field", () => {
    const result = profileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
