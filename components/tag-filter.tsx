"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Filter, X, ChevronDown } from "lucide-react"

interface TagFilterProps {
  tags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export function TagFilter({ tags, selectedTags, onTagsChange }: TagFilterProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const clearAll = () => {
    onTagsChange([])
  }

  const selectAll = () => {
    onTagsChange([...tags])
  }

  const activeCount = selectedTags.length
  const totalCount = tags.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-christmas-gold/30 hover:border-christmas-gold hover:bg-christmas-gold/10 text-christmas-snow bg-transparent"
        >
          <Filter className="w-4 h-4 text-christmas-gold" />
          <span className="text-sm">Теги</span>
          <Badge
            variant="secondary"
            className="ml-1 h-5 px-1.5 text-xs bg-christmas-green/20 text-christmas-green border-0"
          >
            {activeCount}/{totalCount}
          </Badge>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-card border-christmas-gold/20" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-christmas-gold">Фильтр по тегам</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-6 px-2">
                Все
              </Button>
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-6 px-2">
                  <X className="w-3 h-3 mr-1" />
                  Сброс
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105",
                  selectedTags.includes(tag)
                    ? "bg-christmas-green text-christmas-snow border-christmas-green"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-christmas-gold hover:text-christmas-gold",
                )}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
