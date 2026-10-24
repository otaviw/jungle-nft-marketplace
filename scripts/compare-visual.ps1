param([string]$CaptureFolder = 'current', [string]$OutputFolder = 'comparison')
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
$workspace = (Get-Location).Path
$outputPath = Join-Path $workspace "artifacts/visual-review/$OutputFolder"
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

function Write-Comparison($referencePath, $capturePath, $name, $cropY, $cropHeight) {
    $reference = [System.Drawing.Bitmap]::FromFile((Join-Path $workspace $referencePath))
    $capture = [System.Drawing.Bitmap]::FromFile((Join-Path $workspace $capturePath))
    $width = $reference.Width
    $height = [Math]::Min($cropHeight, [Math]::Min($reference.Height, $capture.Height) - $cropY)
    $canvas = New-Object System.Drawing.Bitmap ($width * 2), ($height + 36)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([System.Drawing.Color]::FromArgb(20, 13, 10))
    $font = New-Object System.Drawing.Font 'Consolas', 16
    $brush = [System.Drawing.Brushes]::White
    $graphics.DrawString('REFERENCIA', $font, $brush, 12, 8)
    $graphics.DrawString('IMPLEMENTACAO', $font, $brush, ($width + 12), 8)
    $source = New-Object System.Drawing.Rectangle 0, $cropY, $width, $height
    $left = New-Object System.Drawing.Rectangle 0, 36, $width, $height
    $right = New-Object System.Drawing.Rectangle $width, 36, $width, $height
    $graphics.DrawImage($reference, $left, $source, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.DrawImage($capture, $right, $source, [System.Drawing.GraphicsUnit]::Pixel)
    $canvas.Save((Join-Path $outputPath "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $font.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()
    $reference.Dispose()
    $capture.Dispose()
}

$desktopHome = 'pages figma/Desktop/' + (Get-ChildItem -LiteralPath 'pages figma/Desktop' -Filter 'In*cio.png').Name
$mobileHome = 'pages figma/Mobile/' + (Get-ChildItem -LiteralPath 'pages figma/Mobile' -Filter 'In*cio.png').Name
Write-Comparison $desktopHome "artifacts/visual-review/$CaptureFolder/home-1440.png" 'home-desktop-top' 0 1100
Write-Comparison $desktopHome "artifacts/visual-review/$CaptureFolder/home-1440.png" 'home-desktop-catalog' 1100 1000
Write-Comparison $desktopHome "artifacts/visual-review/$CaptureFolder/home-1440.png" 'home-desktop-bottom' 2100 1500
Write-Comparison 'pages figma/Desktop/Detalhes do NFT.png' "artifacts/visual-review/$CaptureFolder/detail-1440.png" 'detail-desktop-top' 0 1100
Write-Comparison 'pages figma/Desktop/Detalhes do NFT.png' "artifacts/visual-review/$CaptureFolder/detail-1440.png" 'detail-desktop-related' 1100 1100
Write-Comparison $mobileHome "artifacts/visual-review/$CaptureFolder/home-414.png" 'home-mobile' 0 896
Write-Comparison 'pages figma/Mobile/Detalhes do NFT.png' "artifacts/visual-review/$CaptureFolder/detail-414.png" 'detail-mobile' 0 896
