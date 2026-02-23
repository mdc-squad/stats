"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"

interface PlayerAvatarProps {
  steamId: string
  nickname: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function PlayerAvatar({ steamId, nickname, size = "md", className = "" }: PlayerAvatarProps) {
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

  const normalizedSteamId = steamId.trim()
  const avatarUrl = normalizedSteamId ? `/api/steam/avatar/${normalizedSteamId}` : null

  useEffect(() => {
    setError(false)
  }, [avatarUrl])

  if (error || !avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-secondary flex items-center justify-center ${className}`}>
        <User className={`${iconSizes[size]} text-muted-foreground`} />
      </div>
    )
  }

  return (
    <img
      src={avatarUrl || "/placeholder.svg"}
      alt={nickname}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-christmas-gold/30 ${className}`}
      onError={() => setError(true)}
    />
  )
}
