"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CurrentUser {
  adminUserId: number
  displayName: string
  role: string
}

const NAV_ITEMS = [
  { href: "/admin/events", label: "Матчи", roles: ["SuperAdmin", "Editor"] },
  { href: "/admin/lineups", label: "Лайнап", roles: ["SuperAdmin", "Editor"] },
  { href: "/admin/players", label: "Игроки", roles: ["SuperAdmin", "Editor"] },
  { href: "/admin/squads", label: "Отряды", roles: ["SuperAdmin", "Editor"] },
  { href: "/admin/dictionaries", label: "Справочники", roles: ["SuperAdmin", "Editor"] },
  { href: "/admin/users", label: "Пользователи", roles: ["SuperAdmin"] },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublicPage = pathname === "/admin/login" || pathname === "/admin/discord-callback"

  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(!isPublicPage)

  useEffect(() => {
    if (isPublicPage) return
    let cancelled = false

    fetch("/api/admin/rest/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (cancelled) return
        if (!response.ok) {
          router.replace("/admin/login")
          return
        }
        setUser(await response.json())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isPublicPage, router])

  if (isPublicPage) {
    return <>{children}</>
  }

  const handleLogout = async () => {
    await fetch("/api/admin/session", { method: "DELETE" })
    router.replace("/admin/login")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/dictionaries" className="mr-4 font-semibold text-christmas-snow">
              MDC Admin
            </Link>
            {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-christmas-gold/20 text-christmas-gold"
                    : "text-muted-foreground hover:text-christmas-snow",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {user.displayName} · {user.role}
            </span>
            <Button size="sm" variant="outline" onClick={handleLogout}>
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
