"use client"

import { Users } from "lucide-react"
import { withBasePath } from "@/lib/base-path"
import { cn } from "@/lib/utils"

interface RoleIconProps {
  role?: string | null
  className?: string
}

const ROLE_ICON_PATHS: Record<string, string> = {
  "squad-leader": "/squad-role-icons/squad-leader.png",
  medic: "/squad-role-icons/medic.png",
  grenadier: "/squad-role-icons/grenadier.png",
  rifleman: "/squad-role-icons/rifleman.png",
  lat: "/squad-role-icons/lat.png",
  hat: "/squad-role-icons/hat.png",
  "automatic-rifleman": "/squad-role-icons/automatic-rifleman.png",
  "machine-gunner": "/squad-role-icons/machine-gunner.png",
  marksman: "/squad-role-icons/marksman.png",
  sniper: "/squad-role-icons/sniper.png",
  scout: "/squad-role-icons/scout.png",
  raider: "/squad-role-icons/raider.png",
  "combat-engineer": "/squad-role-icons/combat-engineer.png",
  sapper: "/squad-role-icons/sapper.png",
  "lead-crewman": "/squad-role-icons/lead-crewman.png",
  crewman: "/squad-role-icons/crewman.png",
  "lead-pilot": "/squad-role-icons/lead-pilot.png",
  pilot: "/squad-role-icons/pilot.png",
  unarmed: "/squad-role-icons/unarmed.png",
}

const ROLE_ICON_ALIASES: Record<string, string> = {
  sl: "squad-leader",
  сл: "squad-leader",
  squadleader: "squad-leader",
  squadlead: "squad-leader",
  sectionleader: "squad-leader",
  cellleader: "squad-leader",
  seniorrifleman: "squad-leader",
  медик: "medic",
  medic: "medic",
  гп: "grenadier",
  гранатомет: "grenadier",
  гранатометчик: "grenadier",
  grenadier: "grenadier",
  стрелок: "rifleman",
  rifleman: "rifleman",
  lat: "lat",
  лат: "lat",
  легкийпт: "lat",
  легкийантитанк: "lat",
  легкаятруба: "lat",
  lightantitank: "lat",
  hat: "hat",
  хат: "hat",
  тяжелыйпт: "hat",
  тяжелыйантитанк: "hat",
  тяжелыйтандем: "hat",
  тандем: "hat",
  heavyantitank: "hat",
  пулеметчик: "machine-gunner",
  тяжелыйпулемет: "machine-gunner",
  тяжелыйпулеметчик: "machine-gunner",
  тпулемет: "machine-gunner",
  тпулеметчик: "machine-gunner",
  machinegunner: "machine-gunner",
  легкийпулемет: "automatic-rifleman",
  легкийпулеметчик: "automatic-rifleman",
  лпулемет: "automatic-rifleman",
  лпулеметчик: "automatic-rifleman",
  automaticrifleman: "automatic-rifleman",
  снайпер: "sniper",
  sniper: "sniper",
  марксмен: "marksman",
  marksman: "marksman",
  разведчик: "scout",
  scout: "scout",
  рейдер: "raider",
  raider: "raider",
  инженер: "combat-engineer",
  боевойинженер: "combat-engineer",
  combatengineer: "combat-engineer",
  engineer: "combat-engineer",
  сапер: "sapper",
  саперподрывник: "sapper",
  sapper: "sapper",
  slкрюмен: "lead-crewman",
  слкрюмен: "lead-crewman",
  leadcrewman: "lead-crewman",
  крюмен: "crewman",
  crewman: "crewman",
  slпилот: "lead-pilot",
  слпилот: "lead-pilot",
  leadpilot: "lead-pilot",
  пилот: "pilot",
  pilot: "pilot",
  безкита: "unarmed",
  безкит: "unarmed",
  unarmed: "unarmed",
  recruit: "unarmed",
  cast: "cast",
  caster: "cast",
  каст: "cast",
  кастер: "cast",
}

function normalizeRoleKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]/gi, "")
}

export function RoleIcon({ role, className }: RoleIconProps) {
  const normalizedRole = normalizeRoleKey(role)
  const iconKey = ROLE_ICON_ALIASES[normalizedRole]

  if (iconKey === "cast") {
    return <Users className={cn("h-4 w-4 shrink-0", className)} aria-hidden="true" />
  }

  const src = iconKey ? withBasePath(ROLE_ICON_PATHS[iconKey]) : null

  if (!src) {
    return <Users className={cn("h-4 w-4 shrink-0", className)} aria-hidden="true" />
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={cn("h-4 w-4 shrink-0 rounded-[2px] object-contain", className)}
    />
  )
}
