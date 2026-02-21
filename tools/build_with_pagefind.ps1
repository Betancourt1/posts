param(
  [switch]$Minify
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$hugoCache = Join-Path $repoRoot "tmp\\hugo_cache"
$npmCache = Join-Path $repoRoot "tmp\\npm-cache"

Push-Location $repoRoot
try {
  New-Item -ItemType Directory -Force -Path $hugoCache, $npmCache | Out-Null
  $env:HUGO_CACHEDIR = $hugoCache

  $hugoBinary = Join-Path $repoRoot "tools\\hugo\\hugo.exe"
  $hugoArgs = @()
  if ($Minify) {
    $hugoArgs = @("--gc", "--minify")
  }

  if (Test-Path $hugoBinary) {
    & $hugoBinary @hugoArgs
  } else {
    & hugo @hugoArgs
  }

  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & npx.cmd --cache $npmCache pagefind --site public
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}
