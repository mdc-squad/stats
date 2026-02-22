"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  className?: string
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden border-christmas-gold/20", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-christmas-red/5 to-christmas-green/5" />
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-christmas-gold uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-christmas-snow">{value}</p>
            {subtitle && (
              <p
                className={cn(
                  "text-xs",
                  trend === "up" && "text-christmas-green",
                  trend === "down" && "text-christmas-red",
                  trend === "neutral" && "text-muted-foreground",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {icon && <div className="text-christmas-gold opacity-80">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
