/**
 * The plugin loader: runs each manifest's register(api) to collect registrations.
 */
import type { Plugin } from "../plugin-sdk.js"
import {
  buildApi,
  createRegistrations,
  type LoadedRegistrations,
} from "./api.js"

export interface LoadResult extends LoadedRegistrations {
  loaded: { id: string; kind: string }[]
}

export function loadPlugins(plugins: readonly Plugin[]): LoadResult {
  const registrations = createRegistrations()
  const loaded: { id: string; kind: string }[] = []
  for (const plugin of plugins) {
    const api = buildApi(registrations, plugin.id)
    plugin.register(api)
    loaded.push({ id: plugin.id, kind: plugin.kind })
  }
  return { ...registrations, loaded }
}
