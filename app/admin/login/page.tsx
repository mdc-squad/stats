"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DISCORD_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: "Этот Discord-аккаунт не имеет доступа к админ-панели.",
  invalid_state: "Сессия авторизации истекла, попробуйте войти через Discord ещё раз.",
  discord_error: "Не удалось войти через Discord. Попробуйте ещё раз.",
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const discordError = searchParams.get("error")

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(discordError ? DISCORD_ERROR_MESSAGES[discordError] ?? "Ошибка входа." : null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setError(payload?.error ?? "Неверный логин или пароль.")
        return
      }

      router.push("/admin")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-christmas-gold/20 bg-card/60">
        <CardHeader>
          <CardTitle className="text-center text-xl">Вход в админ-панель</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-christmas-red/40 bg-christmas-red/10 px-3 py-2 text-sm text-christmas-red">
              {error}
            </div>
          )}

          <Button asChild className="w-full" variant="outline">
            <a href="/api/admin/discord-login">Войти через Discord</a>
          </Button>

          <div className="relative py-2 text-center text-xs text-muted-foreground">
            <span className="bg-card/60 px-2">или</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">Логин</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Входим..." : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
