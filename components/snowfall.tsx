"use client"

import { useEffect, useState } from "react"

export function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<{ id: number; left: number; delay: number; duration: number }[]>([])

  useEffect(() => {
    const flakes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 8,
    }))
    setSnowflakes(flakes)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  )
}
