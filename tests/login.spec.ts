import { test, expect } from "@playwright/test";

test.describe("Login — failed authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText("Invalid email or password")
    ).toBeVisible();
  });

  test("submit is blocked when email is empty", async ({ page }) => {
    await page.getByLabel("Password").fill("somepassword");

    // Button is disabled — no email means no submit
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeDisabled();
    await expect(page).toHaveURL("/login");
  });

  test("submit is blocked when password is empty", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");

    // Button is disabled — no password means no submit
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeDisabled();
    await expect(page).toHaveURL("/login");
  });

  test("submit button is disabled until both fields are filled", async ({
    page,
  }) => {
    const submitBtn = page.getByRole("button", { name: "Sign in" });

    // Both empty → disabled
    await expect(submitBtn).toBeDisabled();

    // Only email → still disabled
    await page.getByLabel("Email").fill("nobody@example.com");
    await expect(submitBtn).toBeDisabled();

    // Both filled → enabled
    await page.getByLabel("Password").fill("somepassword");
    await expect(submitBtn).toBeEnabled();
  });

  test("email field does not allow HTML injection", async ({ page }) => {
    const htmlPayloads = [
      '<script>window.__xss=true</script>',
      '<img src=x onerror="window.__xss=true">',
      '"><svg onload="window.__xss=true">',
    ];

    for (const payload of htmlPayloads) {
      await page.goto("/login");
      await page.getByLabel("Email").fill(payload);
      await page.getByLabel("Password").fill("somepassword");

      // Button is enabled (field is non-empty), but browser's type="email"
      // validation blocks submission — click it and verify nothing bad happens.
      await page.getByRole("button", { name: "Sign in" }).click();

      // No navigation — still on the login page
      await expect(page).toHaveURL("/login");

      // No script executed — the payload never ran as code
      const xssTriggered = await page.evaluate(
        () => (window as never as Record<string, unknown>).__xss
      );
      expect(xssTriggered).toBeUndefined();

      // No rogue img/svg injected as live markup (Next.js owns all <script> tags)
      const injectedElements = await page
        .locator("img[onerror], svg[onload]")
        .count();
      expect(injectedElements).toBe(0);
    }
  });

  test("login API rejects SQL injection payloads", async ({ request }) => {
    // Bypass the browser form and hit the API directly — this is where
    // SQL injection would actually matter. Verify the server returns 401
    // and never crashes (500) or grants access (200).
    const sqlPayloads = [
      "' OR '1'='1",
      "' OR 1=1--",
      "'; DROP TABLE users;--",
      "\" OR \"\"=\"",
      "admin'--",
    ];

    for (const payload of sqlPayloads) {
      const response = await request.post("/api/auth/login", {
        data: { email: payload, password: "somepassword" },
      });

      // Must be 401 (bad credentials) — not 200 (bypass) or 500 (crash)
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Invalid email or password");
    }
  });

  test("does not redirect on failed login", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/login");
  });
});
