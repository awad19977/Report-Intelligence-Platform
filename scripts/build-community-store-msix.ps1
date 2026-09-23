param(
  [Parameter(Mandatory = $true)][string]$IdentityName,
  [Parameter(Mandatory = $true)][string]$Publisher,
  [Parameter(Mandatory = $true)][string]$PublisherDisplayName,
  [string]$Version = "0.1.0.0",
  [string]$OutputDirectory = "artifacts/store"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($IdentityName -notmatch '^[A-Za-z0-9][A-Za-z0-9.-]{2,49}$') {
  throw "IdentityName must be the exact Partner Center package identity name."
}
if ($Version -notmatch '^\d+\.\d+\.\d+\.\d+$') {
  throw "Version must contain four numeric components (for example 0.1.0.0)."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packageRoot = Join-Path $repoRoot 'distributions/crystal-worker-community-win32-x64'
$workerBin = Join-Path $packageRoot 'bin'
$workerExe = Join-Path $workerBin 'CrystalWorker.exe'
if (-not (Test-Path -LiteralPath $workerExe -PathType Leaf)) {
  throw "Worker binary is missing. Run npm run stage:community-worker first."
}

node (Join-Path $packageRoot 'verify-package.cjs')
if ($LASTEXITCODE -ne 0) { throw "Worker package verification failed." }

$makeAppx = Get-ChildItem -LiteralPath 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter makeappx.exe -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match '\\x64\\makeappx\.exe$' } |
  Sort-Object FullName -Descending |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $makeAppx) { throw "Windows SDK MakeAppx.exe (x64) was not found." }

$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("rip-store-msix-" + [guid]::NewGuid().ToString('N'))
$stageBin = Join-Path $stage 'bin'
$stageAssets = Join-Path $stage 'Assets'
New-Item -ItemType Directory -Path $stageBin, $stageAssets -Force | Out-Null

try {
  Get-ChildItem -LiteralPath $workerBin | Copy-Item -Destination $stageBin -Recurse -Force
  $template = Get-Content -LiteralPath (Join-Path $packageRoot 'store/AppxManifest.xml.template') -Raw
  $manifest = $template.Replace('{{IDENTITY_NAME}}', [System.Security.SecurityElement]::Escape($IdentityName))
  $manifest = $manifest.Replace('{{PUBLISHER}}', [System.Security.SecurityElement]::Escape($Publisher))
  $manifest = $manifest.Replace('{{PUBLISHER_DISPLAY_NAME}}', [System.Security.SecurityElement]::Escape($PublisherDisplayName))
  $manifest = $manifest.Replace('{{VERSION}}', $Version)
  [System.IO.File]::WriteAllText((Join-Path $stage 'AppxManifest.xml'), $manifest, [System.Text.UTF8Encoding]::new($false))

  Add-Type -AssemblyName System.Drawing
  foreach ($size in @(44, 50, 150)) {
    $file = if ($size -eq 50) { 'StoreLogo.png' } else { "Square${size}x${size}Logo.png" }
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $font = [System.Drawing.Font]::new('Arial', [Math]::Max(12, [int]($size / 3)), [System.Drawing.FontStyle]::Bold)
    try {
      $graphics.Clear([System.Drawing.Color]::FromArgb(44, 93, 163))
      $graphics.DrawString('RI', $font, $brush, 2, [Math]::Max(0, [int]($size / 4)))
      $bitmap.Save((Join-Path $stageAssets $file), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $font.Dispose()
      $brush.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }

  $outDir = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) { $OutputDirectory } else { Join-Path $repoRoot $OutputDirectory }
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  $output = Join-Path $outDir ("CrystalWorkerCommunity_${Version}_x64.msix")
  if (Test-Path -LiteralPath $output) { throw "Output already exists: $output" }
  & $makeAppx pack /d $stage /p $output /l
  if ($LASTEXITCODE -ne 0) { throw "MakeAppx failed to build the MSIX package." }
  Write-Output "Built unsigned Store submission package: $output"
  Write-Output "Microsoft Store signs the package after certification. Do not distribute this unsigned MSIX directly."
} finally {
  $resolvedStage = [System.IO.Path]::GetFullPath($stage)
  $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedStage.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
      [System.IO.Path]::GetFileName($resolvedStage).StartsWith('rip-store-msix-')) {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force -ErrorAction SilentlyContinue
  }
}
