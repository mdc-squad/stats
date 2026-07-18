"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function DiscordCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("Отсутствует токен авторизации.")
      return
    }

    let cancelled = false
    fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (cancelled) return
        if (!response.ok) {
          setError("Не удалось завершить вход.")
          return
        }
        window.history.replaceState(null, "", "/admin/discord-callback")
        router.replace("/admin")
        router.refresh()
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось завершить вход.")
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <p className={error ? "text-christmas-red" : "text-muted-foreground"}>
        {error ?? "Завершаем вход через Discord..."}
      </p>
    </div>
  )
}

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={null}>
      <DiscordCallbackHandler />
    </Suspense>
  )
}
