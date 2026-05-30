import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

test.describe("Scissor E2E Tests", () => {
  test("1. Homepage loads correctly", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText("Short links, big impact")).toBeVisible();
    await expect(page.getByPlaceholder("https://your-very-long-url.com/path")).toBeVisible();
    await expect(page.getByRole("button", { name: "Shorten" })).toBeVisible();
  });

  test("2. Shorten a valid URL produces a short link", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByPlaceholder("https://your-very-long-url.com/path").fill("https://www.github.com");
    await page.getByRole("button", { name: "Shorten" }).click();
    await expect(page.getByText("/r/")).toBeVisible({ timeout: 10000 });
  });

  test("3. URL input rejects empty submission", async ({ page }) => {
    await page.goto(BASE_URL);
    // The input has required attribute — form won't submit without a value
    const input = page.getByPlaceholder("https://your-very-long-url.com/path");
    await expect(input).toHaveAttribute("required");
  });

  test("4. Custom slug input is present and accepts text", async ({ page }) => {
    await page.goto(BASE_URL);
    const slugInput = page.getByPlaceholder("custom-slug (optional)");
    await expect(slugInput).toBeVisible();
    await slugInput.fill("my-brand");
    await expect(slugInput).toHaveValue("my-brand");
  });
test("5. Custom slug is lowercased automatically", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    const slugInput = page.getByPlaceholder("custom-slug (optional)");
    await slugInput.click();
    await slugInput.pressSequentially("MyBrand", { delay: 50 });
    await expect(slugInput).toHaveValue("mybrand");
  });

  test("6. Expiry date picker is visible and accepts a date", async ({ page }) => {
    await page.goto(BASE_URL);
    const dateInput = page.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await dateInput.fill(future.toISOString().slice(0, 16));
    await expect(dateInput).not.toHaveValue("");
  });

  test("7. Sign in page loads with email and Google options", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.getByText("Welcome to Scissor")).toBeVisible();
    await expect(page.getByText("Sign in with Google")).toBeVisible();
    await expect(page.getByPlaceholder("Your email address")).toBeVisible();
  });

  test("8. Dashboard redirects to login when not authenticated", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(`${BASE_URL}/login`, { timeout: 5000 });
  });

  test("9. Expiry date can be set and link is created", async ({ page }) => {
    await page.goto(BASE_URL);
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await page.getByPlaceholder("https://your-very-long-url.com/path").fill("https://www.example.com");
    await page.locator('input[type="datetime-local"]').fill(future.toISOString().slice(0, 16));
    await page.getByRole("button", { name: "Shorten" }).click();
    await expect(page.getByText("/r/")).toBeVisible({ timeout: 10000 });
  });

  test("10. Sign in and Dashboard buttons visible in header", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });
});