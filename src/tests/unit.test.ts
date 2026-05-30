import { describe, it, expect } from "vitest";
import { customAlphabet } from "nanoid";

// --- Helpers (copied from index.tsx so we can test them in isolation) ---

const generateSlug = customAlphabet(
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  6
);

const RESERVED_SLUGS = ["api", "dashboard", "admin", "login", "register", "r"];

function isValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidCustomSlug(slug: string) {
  return /^[a-zA-Z0-9-]{3,50}$/.test(slug);
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

// --- Tests ---

describe("Slug generation", () => {
  it("generates a slug of exactly 6 characters", () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(6);
  });

  it("generates unique slugs on successive calls", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));
    expect(slugs.size).toBe(100);
  });

  it("slug only contains allowed characters", () => {
    const slug = generateSlug();
    expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("does not contain look-alike characters (0, O, I, l, 1)", () => {
    const slugs = Array.from({ length: 200 }, () => generateSlug()).join("");
    expect(slugs).not.toMatch(/[0OIl1]/);
  });
});

describe("URL validation", () => {
  it("accepts a valid https URL", () => {
    expect(isValidUrl("https://www.google.com")).toBe(true);
  });

  it("accepts a valid http URL", () => {
    expect(isValidUrl("http://example.com/path?q=1")).toBe(true);
  });

  it("rejects a URL without protocol", () => {
    expect(isValidUrl("www.google.com")).toBe(false);
  });

  it("rejects an ftp URL", () => {
    expect(isValidUrl("ftp://files.example.com")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejects plain text", () => {
    expect(isValidUrl("not a url at all")).toBe(false);
  });
});

describe("Custom slug validation", () => {
  it("accepts a valid slug with letters and numbers", () => {
    expect(isValidCustomSlug("my-link-123")).toBe(true);
  });

  it("rejects a slug shorter than 3 characters", () => {
    expect(isValidCustomSlug("ab")).toBe(false);
  });

  it("rejects a slug longer than 50 characters", () => {
    expect(isValidCustomSlug("a".repeat(51))).toBe(false);
  });

  it("rejects a slug with special characters", () => {
    expect(isValidCustomSlug("my link!")).toBe(false);
  });
});

describe("Reserved slug detection", () => {
  it("blocks reserved slug 'admin'", () => {
    expect(isReservedSlug("admin")).toBe(true);
  });

  it("blocks reserved slug 'dashboard'", () => {
    expect(isReservedSlug("dashboard")).toBe(true);
  });

  it("allows a non-reserved slug", () => {
    expect(isReservedSlug("my-brand")).toBe(false);
  });

  it("is case-insensitive for reserved slugs", () => {
    expect(isReservedSlug("ADMIN")).toBe(true);
  });
});

describe("Link expiry", () => {
  it("returns false for a null expiry date", () => {
    expect(isExpired(null)).toBe(false);
  });

  it("returns true for a past expiry date", () => {
    expect(isExpired("2020-01-01T00:00:00Z")).toBe(true);
  });

  it("returns false for a future expiry date", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    expect(isExpired(future)).toBe(false);
  });
});