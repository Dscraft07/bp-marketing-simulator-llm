import { describe, it, expect } from "vitest";
import { apiKeySchema } from "@/lib/validation/apiKeySchema";

describe("apiKeySchema", () => {
  it("accepts valid openai provider with API key", () => {
    const result = apiKeySchema.safeParse({
      provider: "openai",
      apiKey: "sk-test-key-123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid xai provider with API key", () => {
    const result = apiKeySchema.safeParse({
      provider: "xai",
      apiKey: "xai-key-456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unsupported provider", () => {
    const result = apiKeySchema.safeParse({
      provider: "anthropic",
      apiKey: "some-key",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty API key", () => {
    const result = apiKeySchema.safeParse({
      provider: "openai",
      apiKey: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing API key field", () => {
    const result = apiKeySchema.safeParse({
      provider: "openai",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing provider field", () => {
    const result = apiKeySchema.safeParse({
      apiKey: "some-key",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = apiKeySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
