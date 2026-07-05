param(
  [switch]$Minify,
  [switch]$SyncStatic
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$hugoCache = Join-Path $repoRoot "tmp\\hugo_cache"
$npmCache = Join-Path $repoRoot "tmp\\npm-cache"
$pagefindOutput = Join-Path $repoRoot "public\\pagefind"

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

  if (Test-Path $pagefindOutput) {
    Remove-Item -LiteralPath $pagefindOutput -Recurse -Force
  }

  & npx --cache $npmCache pagefind --site public
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  if ($SyncStatic) {
    $staticPagefind = Join-Path $repoRoot "static\\pagefind"

    if (-not (Test-Path $pagefindOutput)) {
      throw "Pagefind output was not found at $pagefindOutput"
    }

    if (Test-Path $staticPagefind) {
      Remove-Item -LiteralPath $staticPagefind -Recurse -Force
    }

    Copy-Item -LiteralPath $pagefindOutput -Destination $staticPagefind -Recurse
  }
}
finally {
  Pop-Location
}
