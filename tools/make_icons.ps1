Add-Type -AssemblyName System.Drawing

function Generate-ShieldIcon {
    param (
        [int]$Size,
        [string]$OutPath
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath

    # Calculate shield points based on Size
    # Top-center, top-right, bottom-tip, bottom-tip, top-left
    $cx = $Size / 2.0
    $w = $Size
    $h = $Size

    # Coordinates for modern rounded shield
    # Start top-left
    $tlX = $w * 0.16; $tlY = $h * 0.18
    $trX = $w * 0.84; $trY = $h * 0.18
    $tcX = $cx;       $tcY = $h * 0.11
    $bX  = $cx;       $bY  = $h * 0.90

    # Draw curved top
    $path.AddBezier([float]$tlX, [float]$tlY, [float]($w * 0.30), [float]$tcY, [float]($w * 0.70), [float]$tcY, [float]$trX, [float]$trY)
    # Right side curving down to bottom tip
    $path.AddBezier([float]$trX, [float]$trY, [float]($w * 0.88), [float]($h * 0.50), [float]($w * 0.68), [float]($h * 0.78), [float]$bX, [float]$bY)
    # Left side curving up from bottom tip to top-left
    $path.AddBezier([float]$bX, [float]$bY, [float]($w * 0.32), [float]($h * 0.78), [float]($w * 0.12), [float]($h * 0.50), [float]$tlX, [float]$tlY)
    $path.CloseFigure()

    # Fill shield with vibrant emerald green gradient
    $rect = New-Object System.Drawing.RectangleF(0, 0, $w, $h)
    $cTop = [System.Drawing.Color]::FromArgb(255, 76, 196, 125)    # #4cc47d vibrant light emerald
    $cBottom = [System.Drawing.Color]::FromArgb(255, 38, 168, 92) # #26a85c rich green
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 90.0)
    $g.FillPath($brush, $path)

    # Subtle inner/border glow for crispness
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), [float]($Size * 0.04))
    $g.DrawPath($borderPen, $path)

    # Draw White Checkmark
    $penWidth = [Math]::Max(1.8, $Size * 0.13)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float]$penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $p1 = New-Object System.Drawing.PointF([float]($w * 0.33), [float]($h * 0.50))
    $p2 = New-Object System.Drawing.PointF([float]($w * 0.46), [float]($h * 0.63))
    $p3 = New-Object System.Drawing.PointF([float]($w * 0.68), [float]($h * 0.38))

    $checkPoints = [System.Drawing.PointF[]]@($p1, $p2, $p3)
    $g.DrawLines($pen, $checkPoints)

    # Cleanup
    $pen.Dispose()
    $borderPen.Dispose()
    $brush.Dispose()
    $path.Dispose()
    $g.Dispose()

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated: $OutPath ($Size x $Size)"
}

Generate-ShieldIcon -Size 16 -OutPath "f:\laragon\www\AddFree\icons\icon16.png"
Generate-ShieldIcon -Size 48 -OutPath "f:\laragon\www\AddFree\icons\icon48.png"
Generate-ShieldIcon -Size 128 -OutPath "f:\laragon\www\AddFree\icons\icon128.png"
