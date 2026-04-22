"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MultiValueFilterOption {
  value: string
  label: string
  meta?: string
}

interface MultiValueFilterProps {
  options: MultiValueFilterOption[]
  selected: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  allLabel?: string
}

export function MultiValueFilter({
  options,
  selected,
  onSelectionChange,
  placeholder = "Выбрать значения...",
  searchPlaceholder = "Поиск...",
  emptyLabel = "Ничего не найдено",
  allLabel = "Выбрать все",
}: MultiValueFilterProps) {
  const [open, setOpen] = useState(false)

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const optionByValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const selectedOptions = useMemo(
    () => selected.map((value) => optionByValue.get(value)).filter((option): option is MultiValueFilterOption => !!option),
    [optionByValue, selected],
  )

  const toggleValue = (value: string) => {
    if (selectedSet.has(value)) {
      onSelectionChange(selected.filter((entry) => entry !== value))
      return
    }

    onSelectionChange([...selected, value])
  }

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onSelectionChange([])
      return
    }

    onSelectionChange(options.map((option) => option.value))
  }

  const clearSelection = () => {
    onSelectionChange([])
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between !border-christmas-gold/35 !bg-background/50 text-christmas-snow hover:!border-christmas-gold/60 hover:!bg-christmas-gold/10 hover:text-christmas-gold"
          >
            {selected.length > 0 ? `Выбрано: ${selected.length}` : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full border-christmas-gold/35 bg-card/95 p-0" align="start">
          <Command className="bg-transparent text-christmas-snow">
            <CommandInput placeholder={searchPlaceholder} className="text-christmas-snow" />
            <CommandList className="scrollbar-gold">
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                <CommandItem className="text-christmas-snow data-[selected=true]:bg-christmas-gold/10 data-[selected=true]:text-christmas-gold" onSelect={handleSelectAll}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      options.length > 0 && selected.length === options.length ? "opacity-100 text-christmas-green" : "opacity-0",
                    )}
                  />
                  {allLabel}
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.value} ${option.label} ${option.meta ?? ""}`}
                    onSelect={() => toggleValue(option.value)}
                    className="text-christmas-snow data-[selected=true]:bg-christmas-gold/10 data-[selected=true]:text-christmas-gold"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSet.has(option.value) ? "opacity-100 text-christmas-green" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                    {option.meta && <span className="ml-auto text-xs text-muted-foreground">{option.meta}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.slice(0, 8).map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="text-xs bg-christmas-gold/10 text-christmas-snow border-christmas-gold/30"
            >
              {option.label}
              <button type="button" className="ml-1 hover:text-christmas-red" onClick={() => toggleValue(option.value)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedOptions.length > 8 && (
            <Badge variant="outline" className="text-xs border-christmas-gold/30 text-christmas-gold">
              +{selectedOptions.length - 8}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:bg-background/60 hover:text-christmas-snow"
            onClick={clearSelection}
          >
            Сброс
          </Button>
        </div>
      )}
    </div>
  )
}
