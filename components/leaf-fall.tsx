"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { withBasePath } from "@/lib/base-path"

type FallingLeaf = {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  drift: number
  spin: number
}

const MAPLE_LEAF_ICON_SRC = withBasePath("/seasonal-icons/maple-leaf.png")

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
          <img src={MAPLE_LEAF_ICON_SRC} alt="" aria-hidden="true" className="h-full w-full object-contain" />
        </div>
      ))}
    </div>
  )
}
