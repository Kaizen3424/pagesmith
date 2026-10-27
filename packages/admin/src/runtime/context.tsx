/**
 * Runtime composition for the P1 admin: PAT lifecycle, GitHub read transport,
 * immutable snapshot cache, and React Query as the ONLY UI cache (ADR-0001/0002/0004).
 */

import type { AdminConfig, CapabilityProbeResult, FetchLike, TokenStore } from "@mycms/core"
import {
  GithubBackend,
  MemoryTokenStore,
  PatProvider,
  probeGithubCapabilities,
  SnapshotStore,
} from "@mycms/core"
import { createIdbTokenStore } from "@mycms/core/web"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { AdminMountOptions, AdminRepository, SupportContext } from "../admin/types"
import type { EntryIndex } from "./entry-index"
import { loadEntryIndex } from "./entry-index"

type AuthStatus = "loading" | "signedOut" | "signedIn"

interface RuntimeValue {
  readonly config: AdminConfig
  readonly support: SupportContext
  readonly repository: AdminRepository
  readonly auth: PatProvider
  readonly status: AuthStatus
  readonly probe: CapabilityProbeResult | undefined
  readonly bootNotice: string | undefined
  readonly backend: GithubBackend | undefined
  readonly snapshots: SnapshotStore
  readonly epoch: number
  readonly signIn: (token: string, remember: boolean) => Promise<CapabilityProbeResult>
  readonly signOut: () => Promise<void>
}

const RuntimeContext = createContext<RuntimeValue | undefined>(undefined)

interface AdminRuntimeProviderProps {
  readonly options: AdminMountOptions
  readonly children: ReactNode
}

export function AdminRuntimeProvider({ options, children }: AdminRuntimeProviderProps) {
  const queryClient = useQueryClient()
  const repository = options.repository
  const fetchLike = useMemo<FetchLike>(() => {
    if (options.fetch !== undefined) return options.fetch
    return globalThis.fetch.bind(globalThis) as unknown as FetchLike
  }, [options.fetch])

  const store = useMemo<TokenStore>(() => {
    if (options.tokenStore !== undefined) return options.tokenStore
    try {
      return createIdbTokenStore()
    } catch {
      return new MemoryTokenStore()
    }
  }, [options.tokenStore])

  const probe = useMemo(
    () => (token: string) =>
      probeGithubCapabilities({
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.branch,
        token,
        fetch: fetchLike,
        ...(repository.baseUrl === undefined ? {} : { baseUrl: repository.baseUrl }),
      }),
    [fetchLike, repository],
  )

  const auth = useMemo(() => new PatProvider({ store, probe }), [probe, store])
  const snapshots = useMemo(
    () => new SnapshotStore(),
    [repository.owner, repository.repo, repository.branch],
  )
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [probeResult, setProbeResult] = useState<CapabilityProbeResult | undefined>(undefined)
  const [bootNotice, setBootNotice] = useState<string | undefined>(undefined)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false
    void auth
      .restore()
      .then((result) => {
        if (cancelled) return
        if (result === undefined) {
          setStatus("signedOut")
          return
        }
        setProbeResult(result)
        setStatus("signedIn")
        setEpoch((value) => value + 1)
      })
      .catch(() => {
        if (cancelled) return
        setStatus("signedOut")
        setBootNotice(
          "The access key saved on this device could not be checked. Please sign in again.",
        )
      })
    return () => {
      cancelled = true
    }
  }, [auth])

  const signIn = async (token: string, remember: boolean): Promise<CapabilityProbeResult> => {
    const result = await auth.signIn(token, { remember })
    setProbeResult(result)
    setBootNotice(undefined)
    setStatus("signedIn")
    setEpoch((value) => value + 1)
    queryClient.clear()
    return result
  }

  const signOut = async (): Promise<void> => {
    await auth.signOut()
    snapshots.clear()
    queryClient.clear()
    setProbeResult(undefined)
    setStatus("signedOut")
    setEpoch((value) => value + 1)
  }

  const token = status === "signedIn" ? auth.getToken() : undefined
  const backend = useMemo(
    () =>
      token === undefined
        ? undefined
        : new GithubBackend({
            owner: repository.owner,
            repo: repository.repo,
            token,
            fetch: fetchLike,
            ...(repository.baseUrl === undefined ? {} : { baseUrl: repository.baseUrl }),
          }),
    [epoch, fetchLike, repository, token],
  )

  const value: RuntimeValue = {
    config: options.config,
    support: options.support,
    repository,
    auth,
    status,
    probe: probeResult,
    bootNotice,
    backend,
    snapshots,
    epoch,
    signIn,
    signOut,
  }

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}

export function useRuntime(): RuntimeValue {
  const value = useContext(RuntimeContext)
  if (value === undefined) throw new Error("useRuntime must be used inside AdminRuntimeProvider")
  return value
}

export function useSnapshot() {
  const { backend, repository, snapshots, epoch } = useRuntime()
  return useQuery({
    queryKey: ["snapshot", epoch, repository.owner, repository.repo, repository.branch],
    enabled: backend !== undefined,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      if (backend === undefined) throw new Error("not signed in")
      const ref = await backend.getRef(repository.branch)
      const head = ref.object.sha
      const cached = snapshots.getTree(head)
      const result = await backend.readTree(
        repository.branch,
        head,
        cached?.etag === undefined ? {} : { etag: cached.etag },
      )
      if (result.kind === "not-modified") {
        if (cached === undefined) throw new Error("tree cache miss on a 304 response")
        snapshots.advance(snapshots.headSha, head)
        return { head, tree: cached.tree }
      }
      snapshots.putTree(head, {
        tree: result.tree,
        ...(result.etag === undefined ? {} : { etag: result.etag }),
      })
      snapshots.advance(snapshots.headSha, head)
      return { head, tree: result.tree }
    },
  })
}

export function useEntryIndex() {
  const { config, backend, repository, epoch } = useRuntime()
  const snapshot = useSnapshot()
  const head = snapshot.data?.head
  const tree = snapshot.data?.tree
  return useQuery({
    queryKey: ["entries", epoch, repository.owner, repository.repo, repository.branch, head],
    enabled: backend !== undefined && tree !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: async (): Promise<EntryIndex> => {
      if (backend === undefined || tree === undefined) throw new Error("snapshot not ready")
      return loadEntryIndex({ config, tree, backend, branch: repository.branch })
    },
  })
}
