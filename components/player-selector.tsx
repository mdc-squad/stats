"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { PlayerAvatar } from "@/components/player-avatar"
import type { Player } from "@/lib/data-utils"

interface PlayerSelectorProps {
  players: Player[]
  selected: string[]
  onSelectionChange: (ids: string[]) => void
  placeholder?: string
}

export function PlayerSelector({
  players,
  selected,
  onSelectionChange,
  placeholder = "Выбрать игроков...",
}: PlayerSelectorProps) {
  const [open, setOpen] = useState(false)

  const togglePlayer = (playerId: string) => {
    if (selected.includes(playerId)) {
      onSelectionChange(selected.filter((id) => id !== playerId))
    } else {
      onSelectionChange([...selected, playerId])
    }
  }

  const selectedPlayers = players.filter((p) => selected.includes(p.player_id))

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent border-christmas-gold/30 text-christmas-snow hover:bg-christmas-gold/10"
          >
            {selected.length > 0 ? `Выбрано: ${selected.length}` : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск игрока..." />
            <CommandList>
              <CommandEmpty>Игрок не найден</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    if (selected.length === players.length) {
                      onSelectionChange([])
                    } else {
                      onSelectionChange(players.map((p) => p.player_id))
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.length === players.length ? "opacity-100 text-christmas-green" : "opacity-0",
                    )}
                  />
                  Выбрать всех
                </CommandItem>
                {players.map((player) => (
                  <CommandItem
                    key={player.player_id}
                    value={player.nickname}
                    onSelect={() => togglePlayer(player.player_id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(player.player_id) ? "opacity-100 text-christmas-green" : "opacity-0",
                      )}
                    />
                    <PlayerAvatar steamId={player.steam_id} nickname={player.nickname} size="sm" className="mr-2" />
                    <span>{player.nickname}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{player.totals.events} игр</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPlayers.slice(0, 10).map((player) => (
            <Badge
              key={player.player_id}
              variant="secondary"
              className="text-xs bg-christmas-gold/10 text-christmas-snow border-christmas-gold/30"
            >
              {player.nickname}
              <button className="ml-1 hover:text-christmas-red" onClick={() => togglePlayer(player.player_id)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedPlayers.length > 10 && (
            <Badge variant="outline" className="text-xs border-christmas-gold/30 text-christmas-gold">
              +{selectedPlayers.length - 10}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
