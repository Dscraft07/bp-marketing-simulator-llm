import { describe, it, expect } from "vitest";
import { targetGroupSchema } from "@/lib/validation/targetGroupSchema";

describe("targetGroupSchema", () => {
  it("accepts valid target group data", () => {
    const result = targetGroupSchema.safeParse({
      name: "Young Professionals",
      description: "Adults aged 25-35 working in tech industry",
      persona_count: 10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts name at minimum length (3 chars)", () => {
    const result = targetGroupSchema.safeParse({
      name: "abc",
      description: "A valid target group description.",
      persona_count: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts name at maximum length (255 chars)", () => {
    const result = targetGroupSchema.safeParse({
      name: "a".repeat(255),
      description: "A valid target group description.",
      persona_count: 5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts description at minimum length (10 chars)", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "1234567890",
      persona_count: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts persona_count at minimum (1)", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "A valid target group description.",
      persona_count: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts persona_count at maximum (100)", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "A valid target group description.",
      persona_count: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 3 characters", () => {
    const result = targetGroupSchema.safeParse({
      name: "ab",
      description: "A valid target group description.",
      persona_count: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 3");
    }
  });

  it("rejects name longer than 255 characters", () => {
    const result = targetGroupSchema.safeParse({
      name: "a".repeat(256),
      description: "A valid target group description.",
      persona_count: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("255");
    }
  });

  it("rejects description shorter than 10 characters", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "Short",
      persona_count: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 10");
    }
  });

  it("rejects persona_count less than 1", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "A valid target group description.",
      persona_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects persona_count greater than 100", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "A valid target group description.",
      persona_count: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer persona_count", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "A valid target group description.",
      persona_count: 5.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name field", () => {
    const result = targetGroupSchema.safeParse({
      description: "A valid target group description.",
      persona_count: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description field", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      persona_count: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing persona_count field", () => {
    const result = targetGroupSchema.safeParse({
      name: "Test Group",
      description: "A valid target group description.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = targetGroupSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
