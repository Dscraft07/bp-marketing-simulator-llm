import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name merge utility)", () => {
  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class name", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes (falsy values are excluded)", () => {
    expect(cn("base", false && "hidden", null, undefined, "visible")).toBe(
      "base visible"
    );
  });

  it("resolves Tailwind conflicts — last conflicting class wins", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles array of class names", () => {
    expect(cn(["px-4", "py-2"])).toBe("px-4 py-2");
  });

  it("handles object syntax from clsx", () => {
    expect(cn({ "font-bold": true, hidden: false })).toBe("font-bold");
  });

  it("merges complex Tailwind variants correctly", () => {
    const result = cn(
      "bg-white dark:bg-gray-900",
      "hover:bg-gray-100",
      "bg-black"
    );
    expect(result).toBe("dark:bg-gray-900 hover:bg-gray-100 bg-black");
  });
});
