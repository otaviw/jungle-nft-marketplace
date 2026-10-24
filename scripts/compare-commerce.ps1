param([string]$CaptureFolder = 'commerce-current', [string]$OutputFolder = 'commerce-comparison')
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

Write-Comparison 'pages figma/Desktop/Carrinho de NFTs.png' "artifacts/visual-review/$CaptureFolder/cart-1440.png" 'cart-desktop' 0 1754
Write-Comparison 'pages figma/Mobile/Carrinho de NFTs.png' "artifacts/visual-review/$CaptureFolder/cart-414.png" 'cart-mobile' 0 896
Write-Comparison 'pages figma/Desktop/Pagamento.png' "artifacts/visual-review/$CaptureFolder/checkout-reviewed-1440.png" 'checkout-desktop' 0 1657
Write-Comparison 'pages figma/Mobile/Pagamento.png' "artifacts/visual-review/$CaptureFolder/checkout-reviewed-414.png" 'checkout-mobile' 0 896
