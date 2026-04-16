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
  "\u0441\u043b": "squad-leader",
  squadleader: "squad-leader",
  squadlead: "squad-leader",
  sectionleader: "squad-leader",
  cellleader: "squad-leader",
  seniorrifleman: "squad-leader",
  med: "medic",
  medic: "medic",
  "\u043c\u0435\u0434\u0438\u043a": "medic",
  gp: "grenadier",
  "\u0433\u043f": "grenadier",
  "\u0433\u0440\u0430\u043d\u0430\u0442\u043e\u043c\u0435\u0442": "grenadier",
  "\u0433\u0440\u0430\u043d\u0430\u0442\u043e\u043c\u0435\u0442\u0447\u0438\u043a": "grenadier",
  grenadier: "grenadier",
  rif: "rifleman",
  rifleman: "rifleman",
  "\u0441\u0442\u0440\u0435\u043b\u043e\u043a": "rifleman",
  lat: "lat",
  "\u043b\u0430\u0442": "lat",
  "\u043b\u0435\u0433\u043a\u0438\u0439\u043f\u0442": "lat",
  "\u043b\u0435\u0433\u043a\u0438\u0439\u0430\u043d\u0442\u0438\u0442\u0430\u043d\u043a": "lat",
  "\u043b\u0435\u0433\u043a\u0430\u044f\u0442\u0440\u0443\u0431\u0430": "lat",
  lightantitank: "lat",
  hat: "hat",
  "\u0445\u0430\u0442": "hat",
  "\u0442\u044f\u0436\u0435\u043b\u044b\u0439\u043f\u0442": "hat",
  "\u0442\u044f\u0436\u0435\u043b\u044b\u0439\u0430\u043d\u0442\u0438\u0442\u0430\u043d\u043a": "hat",
  "\u0442\u0430\u043d\u0434\u0435\u043c": "hat",
  heavyantitank: "hat",
  ar: "automatic-rifleman",
  lmg: "automatic-rifleman",
  automaticrifleman: "automatic-rifleman",
  "\u043b\u043f\u0443\u043b\u0435\u043c\u0435\u0442": "automatic-rifleman",
  "\u043b\u043f\u0443\u043b\u0435\u043c\u0435\u0442\u0447\u0438\u043a": "automatic-rifleman",
  "\u043b\u0435\u0433\u043a\u0438\u0439\u043f\u0443\u043b\u0435\u043c\u0435\u0442": "automatic-rifleman",
  "\u043b\u0435\u0433\u043a\u0438\u0439\u043f\u0443\u043b\u0435\u043c\u0435\u0442\u0447\u0438\u043a": "automatic-rifleman",
  mg: "machine-gunner",
  machinegunner: "machine-gunner",
  "\u043f\u0443\u043b\u0435\u043c\u0435\u0442\u0447\u0438\u043a": "machine-gunner",
  "\u0442\u043f\u0443\u043b\u0435\u043c\u0435\u0442": "machine-gunner",
  "\u0442\u043f\u0443\u043b\u0435\u043c\u0435\u0442\u0447\u0438\u043a": "machine-gunner",
  "\u0442\u044f\u0436\u0435\u043b\u044b\u0439\u043f\u0443\u043b\u0435\u043c\u0435\u0442": "machine-gunner",
  "\u0442\u044f\u0436\u0435\u043b\u044b\u0439\u043f\u0443\u043b\u0435\u043c\u0435\u0442\u0447\u0438\u043a": "machine-gunner",
  marksman: "marksman",
  "\u043c\u0430\u0440\u043a\u0441\u043c\u0435\u043d": "marksman",
  sniper: "sniper",
  "\u0441\u043d\u0430\u0439\u043f\u0435\u0440": "sniper",
  scout: "scout",
  "\u0440\u0430\u0437\u0432\u0435\u0434\u0447\u0438\u043a": "scout",
  raider: "raider",
  "\u0440\u0435\u0439\u0434\u0435\u0440": "raider",
  combatengineer: "combat-engineer",
  engineer: "combat-engineer",
  "\u0438\u043d\u0436\u0435\u043d\u0435\u0440": "combat-engineer",
  "\u0431\u043e\u0435\u0432\u043e\u0439\u0438\u043d\u0436\u0435\u043d\u0435\u0440": "combat-engineer",
  sapper: "sapper",
  "\u0441\u0430\u043f\u0435\u0440": "sapper",
  "\u0441\u0430\u043f\u0435\u0440\u043f\u043e\u0434\u0440\u044b\u0432\u043d\u0438\u043a": "sapper",
  slcrewman: "lead-crewman",
  leadcrewman: "lead-crewman",
  "sl\u043a\u0440\u044e\u043c\u0435\u043d": "lead-crewman",
  "\u0441\u043b\u043a\u0440\u044e\u043c\u0435\u043d": "lead-crewman",
  crewman: "crewman",
  "\u043a\u0440\u044e\u043c\u0435\u043d": "crewman",
  slpilot: "lead-pilot",
  leadpilot: "lead-pilot",
  "sl\u043f\u0438\u043b\u043e\u0442": "lead-pilot",
  "\u0441\u043b\u043f\u0438\u043b\u043e\u0442": "lead-pilot",
  pilot: "pilot",
  "\u043f\u0438\u043b\u043e\u0442": "pilot",
  unarmed: "unarmed",
  recruit: "unarmed",
  "\u0431\u0435\u0437\u043a\u0438\u0442\u0430": "unarmed",
  "\u0431\u0435\u0437\u043a\u0438\u0442": "unarmed",
  cast: "cast",
  caster: "cast",
  "\u043a\u0430\u0441\u0442": "cast",
  "\u043a\u0430\u0441\u0442\u0435\u0440": "cast",
}

function normalizeRoleKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u0451/g, "\u0435")
    .replace(/[^a-z0-9\u0430-\u044f]/gi, "")
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
