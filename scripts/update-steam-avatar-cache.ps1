$ErrorActionPreference = "Stop"

$apiUrl = "https://api.hungryfishteam.org/gas/mdc/players?publish=true"
$repoRoot = Split-Path -Parent $PSScriptRoot
$avatarDir = Join-Path $repoRoot "public\steam-avatars"
$manifestPath = Join-Path $repoRoot "lib\steam-avatar-cache.json"
$steamId64Offset = [System.Numerics.BigInteger]::Parse("76561197960265728")

New-Item -ItemType Directory -Force -Path $avatarDir | Out-Null

function Invoke-CurlText {
  param(
    [string]$Url,
    [int]$TimeoutSec = 35
  )

  $output = & curl.exe -L --silent --show-error --max-time $TimeoutSec $Url 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $null
  }

  return ($output -join "`n")
}

function Invoke-CurlFile {
  param(
    [string]$Url,
    [string]$OutFile,
    [int]$TimeoutSec = 30
  )

  & curl.exe -L --silent --show-error --max-time $TimeoutSec --output $OutFile $Url 2>$null
  return $LASTEXITCODE -eq 0
}

function ConvertTo-AccountId {
  param([string]$SteamId)

  try {
    $steamId64 = [System.Numerics.BigInteger]::Parse($SteamId)
    $accountId = $steamId64 - $steamId64Offset
    if ($accountId -le [System.Numerics.BigInteger]::Zero) {
      return $null
    }

    return $accountId.ToString()
  } catch {
    return $null
  }
}

function Get-AvatarUrl {
  param([string]$SteamId)

  $accountId = ConvertTo-AccountId -SteamId $SteamId
  if (-not $accountId) {
    return $null
  }

  $miniProfileProxyUrl = "https://r.jina.ai/http://steamcommunity.com/miniprofile/$accountId/json"
  try {
    $text = Invoke-CurlText -Url $miniProfileProxyUrl -TimeoutSec 35
    $match = [regex]::Match($text, '"avatar_url"\s*:\s*"([^"]+)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($match.Success) {
      $avatarUrl = $match.Groups[1].Value.Replace('\/', '/')
      if ($avatarUrl -match "^https://avatars\.[a-z0-9-]+\.steamstatic\.com/.+\.(jpg|jpeg|png|webp)$") {
        return $avatarUrl
      }
    }
  } catch {
    # Fall through to the full profile proxy below.
  }

  $profileProxyUrl = "https://r.jina.ai/http://steamcommunity.com/profiles/$SteamId"
  try {
    $text = Invoke-CurlText -Url $profileProxyUrl -TimeoutSec 45
    $match = [regex]::Match($text, "https://avatars\.[a-z0-9-]+\.steamstatic\.com/[^`"')\s]+_full\.(jpg|jpeg|png|webp)", [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($match.Success) {
      return $match.Value
    }
  } catch {
    return $null
  }

  return $null
}

function Save-Avatar {
  param(
    [string]$SteamId,
    [string]$AvatarUrl
  )

  $extension = [System.IO.Path]::GetExtension(([Uri]$AvatarUrl).AbsolutePath).ToLowerInvariant()
  if (-not $extension -or @(".jpg", ".jpeg", ".png", ".webp") -notcontains $extension) {
    $extension = ".jpg"
  }

  $fileName = "$SteamId$extension"
  $filePath = Join-Path $avatarDir $fileName

  try {
    if (-not (Invoke-CurlFile -Url $AvatarUrl -OutFile $filePath -TimeoutSec 30)) {
      throw "curl failed"
    }
    $file = Get-Item -LiteralPath $filePath
    if ($file.Length -le 0) {
      Remove-Item -LiteralPath $filePath -Force
      return $null
    }

    return "/steam-avatars/$fileName"
  } catch {
    $proxyValue = $AvatarUrl -replace '^https?://', ''
    $proxyUrl = "https://images.weserv.nl/?url=$([Uri]::EscapeDataString($proxyValue))"
    try {
      if (-not (Invoke-CurlFile -Url $proxyUrl -OutFile $filePath -TimeoutSec 30)) {
        throw "curl failed"
      }
      $file = Get-Item -LiteralPath $filePath
      if ($file.Length -gt 0) {
        return "/steam-avatars/$fileName"
      }
    } catch {
      # Remove the incomplete file below.
    } finally {
      if (Test-Path -LiteralPath $filePath) {
        $file = Get-Item -LiteralPath $filePath
        if ($file.Length -le 0) {
          Remove-Item -LiteralPath $filePath -Force
        }
      }
    }

    if (Test-Path -LiteralPath $filePath) {
      $file = Get-Item -LiteralPath $filePath
      if ($file.Length -le 0) {
        Remove-Item -LiteralPath $filePath -Force
      }
    }
    return $null
  }
}

$payload = Invoke-RestMethod -Uri $apiUrl -Method Get -TimeoutSec 60
$players = @($payload.players)
$steamIds = $players |
  ForEach-Object { [string]$_.steam_id } |
  Where-Object { $_ -match "^\d{17}$" } |
  Sort-Object -Unique

$manifest = [ordered]@{}
$index = 0

foreach ($steamId in $steamIds) {
  $index += 1
  Write-Host "[$index/$($steamIds.Count)] $steamId"
  $avatarUrl = Get-AvatarUrl -SteamId $steamId
  if (-not $avatarUrl) {
    Write-Warning "Avatar URL not found for $steamId"
    continue
  }

  $localPath = Save-Avatar -SteamId $steamId -AvatarUrl $avatarUrl
  if (-not $localPath) {
    Write-Warning "Avatar download failed for $steamId"
    continue
  }

  $manifest[$steamId] = $localPath
}

$json = $manifest | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($manifestPath, "$json`n", [System.Text.UTF8Encoding]::new($false))

Write-Host "Saved $($manifest.Count) avatars to $avatarDir"
