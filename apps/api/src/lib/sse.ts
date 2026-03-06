import { randomUUID } from 'crypto'
import type { ServerResponse } from 'http'

export interface SSEClient {
  id: string
  locationId: number
  role: string
  response: ServerResponse
}

class SSEManager {
  private clients = new Map<string, SSEClient>()

  add(client: SSEClient) {
    this.clients.set(client.id, client)
  }

  remove(id: string) {
    this.clients.delete(id)
  }

  /** Kirim event ke semua client di lokasi tertentu */
  broadcast(locationId: number, event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of this.clients.values()) {
      if (client.locationId === locationId) {
        try {
          client.response.write(payload)
        } catch {
          this.remove(client.id)
        }
      }
    }
  }

  /** Kirim ke role tertentu di lokasi tertentu */
  broadcastToRole(locationId: number, role: string, event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of this.clients.values()) {
      if (client.locationId === locationId && client.role === role) {
        try {
          client.response.write(payload)
        } catch {
          this.remove(client.id)
        }
      }
    }
  }

  clientCount(locationId: number): number {
    let count = 0
    for (const client of this.clients.values()) {
      if (client.locationId === locationId) count++
    }
    return count
  }
}

export const sseManager = new SSEManager()
export { randomUUID }
