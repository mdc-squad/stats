"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

type FallingLeaf = {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  drift: number
  spin: number
}

function LeafSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-full w-full">
      <path
        d="M12 1.8 10.5 6.8 7.8 4.4 8.2 8.8 4 7.9 6.6 11.2 2.2 12.4 6.4 14.4 4.5 18.1 8.9 16.8 10.8 21.8H13.2L15.1 16.8 19.5 18.1 17.6 14.4 21.8 12.4 17.4 11.2 20 7.9 15.8 8.8 16.2 4.4 13.5 6.8 12 1.8Z"
        fill="#facc15"
        stroke="#a16207"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path d="M12 7.4v12.1M7.5 12.1l4.5 3.2 4.5-3.2" stroke="#854d0e" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LeafFall() {
  const [leaves, setLeaves] = useState<FallingLeaf[]>([])

  useEffect(() => {
    setLeaves(
      Array.from({ length: 24 }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 10 + Math.random() * 9,
        size: 14 + Math.random() * 12,
        drift: Math.random() * 90 - 45,
        spin: Math.random() > 0.5 ? 1 : -1,
      })),
    )
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="autumn-leaf"
          style={
            {
              left: `${leaf.left}%`,
              width: `${leaf.size}px`,
              height: `${leaf.size}px`,
              animationDelay: `${leaf.delay}s`,
              animationDuration: `${leaf.duration}s`,
              "--leaf-drift": `${leaf.drift}px`,
              "--leaf-spin": leaf.spin,
            } as CSSProperties
          }
        >
          <LeafSvg />
        </div>
      ))}
    </div>
  )
}
