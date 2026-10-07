# Reproducible synthetic fixtures: no uploaded personal documents are used.
Add-Type -AssemblyName System.Drawing
$fixtureOutput = $PSScriptRoot
$fixtureWidth = 1000
$fixtureHeight = 650
$fixtureFont = 'Tahoma'

function New-Card {
    $bitmap = [System.Drawing.Bitmap]::new($fixtureWidth, $fixtureHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 215, 225), 3)
    $graphics.DrawRectangle($pen, 30, 30, 940, 590)
    $pen.Dispose()
    return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Draw-Text($card, [string]$text, [int]$x, [int]$y, [int]$size = 40, [bool]$rtl = $false) {
    $font = [System.Drawing.Font]::new($fixtureFont, $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $format = [System.Drawing.StringFormat]::new()
    if ($rtl) {
        $format.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft
        $format.Alignment = [System.Drawing.StringAlignment]::Near
    }
    $rect = [System.Drawing.RectangleF]::new($x, $y, 850, 100)
    $card.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, $rect, $format)
    $font.Dispose()
    $format.Dispose()
}

function Save-Card($card, [string]$filename) {
    $card.Bitmap.Save((Join-Path $fixtureOutput $filename), [System.Drawing.Imaging.ImageFormat]::Png)
    $card.Graphics.Dispose()
    $card.Bitmap.Dispose()
    Write-Output $filename
}

# 1. Visual-only image: a red passenger car; no text anywhere.
$card = New-Card
$card.Graphics.FillRectangle([System.Drawing.Brushes]::LightSkyBlue, 40, 40, 920, 470)
$card.Graphics.FillRectangle([System.Drawing.Brushes]::Gray, 40, 510, 920, 100)
$card.Graphics.FillRectangle([System.Drawing.Brushes]::Red, 170, 365, 670, 160)
$body = [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(270, 365), [System.Drawing.Point]::new(380, 235),
    [System.Drawing.Point]::new(640, 235), [System.Drawing.Point]::new(740, 365)
)
$card.Graphics.FillPolygon([System.Drawing.Brushes]::Red, $body)
$card.Graphics.FillPolygon([System.Drawing.Brushes]::LightCyan, [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(320, 345), [System.Drawing.Point]::new(395, 255),
    [System.Drawing.Point]::new(495, 255), [System.Drawing.Point]::new(495, 345)
))
$card.Graphics.FillPolygon([System.Drawing.Brushes]::LightCyan, [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(515, 255), [System.Drawing.Point]::new(625, 255),
    [System.Drawing.Point]::new(693, 345), [System.Drawing.Point]::new(515, 345)
))
$card.Graphics.FillEllipse([System.Drawing.Brushes]::Black, 255, 455, 130, 130)
$card.Graphics.FillEllipse([System.Drawing.Brushes]::Black, 625, 455, 130, 130)
$card.Graphics.FillEllipse([System.Drawing.Brushes]::Silver, 282, 482, 76, 76)
$card.Graphics.FillEllipse([System.Drawing.Brushes]::Silver, 652, 482, 76, 76)
Save-Card $card 'red_car.png'

# 2. English invoice with an unambiguous identifier and payment deadline.
$card = New-Card
Draw-Text $card 'INVOICE' 75 75 62
Draw-Text $card 'Invoice number: EN-1042' 75 200 44
Draw-Text $card 'Payment deadline: 2026-10-31' 75 285 44
Draw-Text $card 'Total: 125 JOD' 75 370 44
Save-Card $card 'english_invoice.png'

# 3. Arabic rendering uses Windows text shaping and right-to-left layout.
$card = New-Card
Draw-Text $card 'فاتورة' 75 75 62 $true
Draw-Text $card 'رقم الفاتورة: AR-2048' 75 200 44 $true
Draw-Text $card 'آخر موعد للدفع: 2026-11-15' 75 285 44 $true
Draw-Text $card 'المجموع: 75 دينار أردني' 75 370 44 $true
Save-Card $card 'arabic_invoice.png'

# 4. Both scripts on a single product label.
$card = New-Card
Draw-Text $card 'MORINGA TEA' 75 75 56
Draw-Text $card 'شاي المورينغا' 75 175 56 $true
Draw-Text $card 'Expiry date: 2027-06-30' 75 300 42
Draw-Text $card 'تاريخ الانتهاء: 2027-06-30' 75 390 42 $true
Save-Card $card 'bilingual_label.png'

# 5. Keep the heading readable, but irreversibly remove identifier detail.
$card = New-Card
Draw-Text $card 'INVOICE' 75 75 62
Draw-Text $card 'Invoice number:' 75 230 44
$identifier = [System.Drawing.Bitmap]::new(600, 100)
$identifierGraphics = [System.Drawing.Graphics]::FromImage($identifier)
$identifierGraphics.Clear([System.Drawing.Color]::White)
$identifierFont = [System.Drawing.Font]::new($fixtureFont, 44, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$identifierGraphics.DrawString('SECRET-5931', $identifierFont, [System.Drawing.Brushes]::Black, 0, 0)
$identifierGraphics.Dispose()
$identifierFont.Dispose()
$tiny = [System.Drawing.Bitmap]::new(18, 4)
$tinyGraphics = [System.Drawing.Graphics]::FromImage($tiny)
$tinyGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
$tinyGraphics.DrawImage($identifier, 0, 0, 18, 4)
$tinyGraphics.Dispose()
$card.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
$card.Graphics.DrawImage($tiny, 80, 335, 650, 100)
$identifier.Dispose()
$tiny.Dispose()
Save-Card $card 'blurred_invoice.png'

# 6. Color is visual evidence; OPEN must be extracted from the sign.
$card = New-Card
$card.Graphics.FillRectangle([System.Drawing.Brushes]::RoyalBlue, 135, 160, 730, 330)
$openFont = [System.Drawing.Font]::new($fixtureFont, 145, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$card.Graphics.DrawString('OPEN', $openFont, [System.Drawing.Brushes]::White, 290, 230)
$openFont.Dispose()
Save-Card $card 'blue_sign.png'

# 7. A label deliberately contains no serial number.
$card = New-Card
Draw-Text $card 'MORINGA TEA' 75 130 58
Draw-Text $card 'Net weight: 100 g' 75 285 44
Save-Card $card 'label_missing_field.png'

# 8. OCR identifies yoga; benefits must come from the project's knowledge base.
$card = New-Card
Draw-Text $card 'YOGA' 75 90 78
Draw-Text $card 'يوغا' 75 200 66 $true
$card.Graphics.FillEllipse([System.Drawing.Brushes]::DarkSlateBlue, 470, 325, 70, 70)
$figurePen = [System.Drawing.Pen]::new([System.Drawing.Color]::DarkSlateBlue, 20)
$card.Graphics.DrawLine($figurePen, 505, 405, 505, 495)
$card.Graphics.DrawLine($figurePen, 505, 430, 390, 400)
$card.Graphics.DrawLine($figurePen, 505, 430, 620, 400)
$card.Graphics.DrawLine($figurePen, 505, 495, 400, 540)
$card.Graphics.DrawLine($figurePen, 505, 495, 610, 540)
$card.Graphics.DrawLine($figurePen, 400, 540, 610, 540)
$figurePen.Dispose()
Save-Card $card 'yoga_card.png'
