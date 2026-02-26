#!/usr/bin/env pwsh
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ArgsList
)

$ErrorActionPreference = "Stop"
$script = Join-Path (Get-Location).Path 'process/edsc/scripts/edsc.js'
if (-not (Test-Path $script)) {
  throw "Could not find EDSC CLI at '$script'. Run this command from repository root."
}

bun $script @ArgsList
exit $LASTEXITCODE
