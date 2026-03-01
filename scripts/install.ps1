param(
  [ValidateSet("install", "uninstall")]
  [string]$Action = "install"
)

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$anvilSrc = (Resolve-Path -LiteralPath (Join-Path $repoRoot "bin/anvil.cmd")).Path

$prefix = if ($env:ANVIL_PREFIX) { $env:ANVIL_PREFIX } else { Join-Path $HOME ".local" }
$binDir = if ($env:ANVIL_BINDIR) { $env:ANVIL_BINDIR } else { Join-Path $prefix "bin" }
$anvilDest = if ($env:ANVIL_DEST) { $env:ANVIL_DEST } else { Join-Path $binDir "anvil.cmd" }

$managedMarker = ":: managed-by: anvil scripts/install.ps1"

function Install-Anvil {
  New-Item -ItemType Directory -Path $binDir -Force | Out-Null

  $content = @(
    $managedMarker,
    "@echo off",
    "call `"$anvilSrc`" %*"
  ) -join "`r`n"

  Set-Content -LiteralPath $anvilDest -Value $content -Encoding Ascii
  Write-Output "Installed $anvilDest -> $anvilSrc"
}

function Test-ManagedSymlink {
  param(
    [string]$Path,
    [string]$ExpectedTarget
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return $false
  }

  $item = Get-Item -LiteralPath $Path -Force
  if (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    return $false
  }

  $target = $item.Target
  if ($target -is [array]) {
    $target = $target[0]
  }
  if ([string]::IsNullOrWhiteSpace([string]$target)) {
    return $false
  }

  try {
    $resolvedTarget = (Resolve-Path -LiteralPath $target -ErrorAction Stop).Path
  } catch {
    $resolvedTarget = [string]$target
  }

  return $resolvedTarget -eq $ExpectedTarget
}

function Test-ManagedWrapper {
  param(
    [string]$Path,
    [string]$Marker
  )

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return $false
  }

  try {
    $firstLine = Get-Content -LiteralPath $Path -TotalCount 1 -ErrorAction Stop
  } catch {
    return $false
  }

  return $firstLine -eq $Marker
}

function Uninstall-Anvil {
  if (Test-ManagedWrapper -Path $anvilDest -Marker $managedMarker -or
      Test-ManagedSymlink -Path $anvilDest -ExpectedTarget $anvilSrc) {
    Remove-Item -LiteralPath $anvilDest -Force
    Write-Output "Removed $anvilDest"
    return
  }

  if (Test-Path -LiteralPath $anvilDest) {
    Write-Error "Refusing to remove non-managed target $anvilDest"
    exit 1
  }

  Write-Output "No install found at $anvilDest"
}

switch ($Action) {
  "install" {
    Install-Anvil
  }
  "uninstall" {
    Uninstall-Anvil
  }
}
