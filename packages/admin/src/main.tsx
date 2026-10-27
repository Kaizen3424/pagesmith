import { mountAdmin } from "./admin/mount"
import "./styles/tokens.css"

/**
 * Entry. Real config/support values arrive with the host app at P1/P6; the
 * shell mounts against placeholder values until then (demo purposes only).
 */
const rootEl = document.getElementById("root")
if (rootEl === null) {
  const message = "root host element missing"
  throw new Error(message)
}

mountAdmin(rootEl, {
  config: { schemaVersion: 1, collections: [] },
  support: { name: "Milan" },
})
