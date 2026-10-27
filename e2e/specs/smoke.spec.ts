import { expect, test } from "@playwright/test"
import { installOriginAllowlist } from "../support/origin-allowlist"

test("playground smoke renders the FakeGithub harness (and the origin allowlist stays clean)", async ({
  baseURL,
  page,
}) => {
  const origins = await installOriginAllowlist(page, new URL(baseURL).origin)

  await page.goto("/")
  await expect(page.getByRole("heading", { name: "MyCMS playground" })).toBeVisible()
  await expect(page.getByText("FakeGithub harness (MSW)")).toBeVisible()
  await expect(page.getByText("target: fixture repo (offline)")).toBeVisible()

  expect(origins.violations()).toEqual([])
})
