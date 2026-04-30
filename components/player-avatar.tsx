"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"
import { getProxiedSteamAvatarUrl, getSteamAvatarFallbackUrl, resolveSteamAvatarUrl } from "@/lib/steam-avatar"

interface PlayerAvatarProps {
  steamId?: string | null
  nickname: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PlayerAvatar({ steamId, nickname, size = "md", className = "" }: PlayerAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [proxyAvatarUrl, setProxyAvatarUrl] = useState<string | null>(null)
  const [usingProxy, setUsingProxy] = useState(false)
  const [error, setError] = useState(false)

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  useEffect(() => {
    let isActive = true
    const normalizedSteamId = typeof steamId === "string" ? steamId.trim() : ""

    setError(false)
    setAvatarUrl(null)
    setProxyAvatarUrl(null)
    setUsingProxy(false)

    if (!normalizedSteamId) {
      setError(true)
      return () => {
        isActive = false
      }
    }

    resolveSteamAvatarUrl(normalizedSteamId).then((resolvedUrl) => {
      if (!isActive) {
        return
      }

      if (resolvedUrl) {
        setAvatarUrl(resolvedUrl)
        setProxyAvatarUrl(getProxiedSteamAvatarUrl(resolvedUrl))
        setError(false)
        return
      }

      setError(true)
    })

    return () => {
      isActive = false
    }
  }, [steamId])

  if (error || !avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-secondary flex items-center justify-center ${className}`}>
        <User className={`${iconSizes[size]} text-muted-foreground`} />
      </div>
    )
  }

  return (
    <img
      src={avatarUrl || getSteamAvatarFallbackUrl()}
      alt={nickname}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-christmas-gold/30 ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!usingProxy && proxyAvatarUrl) {
          setUsingProxy(true)
          setAvatarUrl(proxyAvatarUrl)
          return
        }

        setError(true)
      }}
    />
  )
}
