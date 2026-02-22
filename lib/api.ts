import { type MDCData, type GameEvent, type PlayerEventStat, type Player, type Clan } from "./data-utils"

const API_BASE = "https://api.hungryfishteam.org/gas/mdc"

export async function fetchAllData(): Promise<MDCData> {
  const response = await fetch(`${API_BASE}/all`, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}

export async function fetchEvents(): Promise<GameEvent[]> {
  const response = await fetch(`${API_BASE}/events`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function fetchPlayers(): Promise<Player[]> {
  const response = await fetch(`${API_BASE}/players`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function fetchPlayerEventStats(): Promise<PlayerEventStat[]> {
  const response = await fetch(`${API_BASE}/playersevents`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function fetchClans(): Promise<Clan[]> {
  const response = await fetch(`${API_BASE}/clans`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function fetchDictionaries(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}/dictionaries`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}
