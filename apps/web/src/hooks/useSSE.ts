'use client'

import { useEffect, useRef, useCallback } from 'react'

type SSEHandler = (data: any) => void

export function useSSE(handlers: Record<string, SSEHandler>, tokenKey = 'sale_token') {
  const esRef = useRef<EventSource | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const connect = useCallback(() => {
    const token = localStorage.getItem(tokenKey)
    if (!token) return

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
    const url = `${apiBase}/api/sse?token=${token}`

    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('connected', (e) => {
      console.log('[SSE] Connected:', JSON.parse(e.data))
    })

    // Daftarkan semua event handler
    const events = ['ticket_issued', 'ticket_called', 'ticket_serving', 'ticket_done', 'ticket_skipped']
    for (const event of events) {
      es.addEventListener(event, (e) => {
        const data = JSON.parse(e.data)
        handlersRef.current[event]?.(data)
      })
    }

    es.onerror = () => {
      es.close()
      // Reconnect setelah 3 detik
      setTimeout(connect, 3000)
    }
  }, [tokenKey])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
    }
  }, [connect])
}
