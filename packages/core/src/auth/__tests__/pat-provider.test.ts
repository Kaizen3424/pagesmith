import { describe, expect, it } from "vitest"
import { MemoryTokenStore, PatProvider } from ".."
import type { CapabilityProbeResult } from "../types"
import { CapabilityProbeError } from "../types"

const PROBE: CapabilityProbeResult = {
  repo: "ok",
  protectionAdmin: "missing",
  checksRead: "forbidden",
  rateLimit: { limit: 5000, remaining: 4999, resetAt: "2027-01-15T08:00:00.000Z" },
}

describe("PatProvider token lifecycle (ADR-0002 / INV-A04)", () => {
  it("probes before accepting a key and persists only on explicit consent", async () => {
    const store = new MemoryTokenStore()
    const seen: string[] = []
    const provider = new PatProvider({
      store,
      probe: async (token) => {
        seen.push(token)
        return PROBE
      },
    })
    await provider.signIn("  github_pat_one  ", { remember: false })
    expect(seen).toEqual(["github_pat_one"])
    expect(provider.getToken()).toBe("github_pat_one")
    expect(await store.read()).toBeUndefined()

    await provider.signIn("github_pat_two", { remember: true })
    expect(await store.read()).toBe("github_pat_two")
    expect(provider.getToken()).toBe("github_pat_two")
  })

  it("wipes on sign-out and rejects empty keys", async () => {
    const store = new MemoryTokenStore()
    const provider = new PatProvider({ store, probe: async () => PROBE })
    await provider.signIn("github_pat_one", { remember: true })
    await provider.signOut()
    expect(provider.getToken()).toBeUndefined()
    expect(await store.read()).toBeUndefined()
    await expect(provider.signIn("   ")).rejects.toThrow(/empty/)
  })

  it("restores + re-probes on bootstrap and wipes on failure", async () => {
    const store = new MemoryTokenStore()
    await store.write("github_pat_stored")
    const fail = false
    const provider = new PatProvider({
      store,
      probe: async () => {
        if (fail) throw new CapabilityProbeError("AUTH_EXPIRED", "expired")
        return PROBE
      },
    })
    const restored = await provider.restore()
    expect(restored).toEqual(PROBE)
    expect(provider.getToken()).toBe("github_pat_stored")

    const second = new PatProvider({
      store,
      probe: async () => {
        throw new CapabilityProbeError("AUTH_EXPIRED", "expired")
      },
    })
    await expect(second.restore()).rejects.toMatchObject({ code: "AUTH_EXPIRED" })
    expect(second.getToken()).toBeUndefined()
    expect(await store.read()).toBeUndefined()
    expect(fail).toBe(false)
  })

  it("re-probes on 401/403/422 and wipes when the re-probe fails", async () => {
    const store = new MemoryTokenStore()
    let calls = 0
    const provider = new PatProvider({
      store,
      probe: async () => {
        calls += 1
        if (calls >= 2) throw new CapabilityProbeError("SCOPE", "lost scope")
        return PROBE
      },
    })
    await provider.signIn("github_pat_one", { remember: true })
    await expect(provider.reprobe()).rejects.toMatchObject({ code: "SCOPE" })
    expect(provider.getToken()).toBeUndefined()
    expect(await store.read()).toBeUndefined()
  })

  it("never exposes a probe result through the token store", async () => {
    const writes: unknown[] = []
    const store = {
      read: async () => undefined,
      write: async (token: string) => {
        writes.push(token)
      },
      clear: async () => undefined,
    }
    const provider = new PatProvider({ store, probe: async () => PROBE })
    await provider.signIn("github_pat_one", { remember: true })
    expect(writes).toEqual(["github_pat_one"])
  })
})
