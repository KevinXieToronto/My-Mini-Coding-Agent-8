/**
 * In-memory registries the gateway builds once at boot and reads on the hot path.
 *
 * Channels and providers get real contracts in Tutorials 06 and 07; for now these are the
 * seams that prove the gateway owns prepared facts rather than rediscovering them.
 */
export interface ChannelRuntime {
  id: string
  start(): Promise<void>
  stop(): Promise<void>
}

export interface ProviderRuntime {
  id: string
}

export class Registry<T extends { id: string }> {
  private readonly items = new Map<string, T>()

  register(item: T): void {
    if (this.items.has(item.id)) {
      throw new Error(`Duplicate registration for id "${item.id}"`)
    }
    this.items.set(item.id, item)
  }

  get(id: string): T | undefined {
    return this.items.get(id)
  }

  all(): readonly T[] {
    return [...this.items.values()]
  }
}
