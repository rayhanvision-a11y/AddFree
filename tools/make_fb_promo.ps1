Add-Type -AssemblyName System.Drawing

function Generate-FacebookPromo {
    param (
        [string]$OutPath
    )

    $w = 1200
    $h = 630
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Dark Modern Gradient Background
    $bgRect = New-Object System.Drawing.RectangleF(0, 0, $w, $h)
    $cBg1 = [System.Drawing.Color]::FromArgb(255, 10, 14, 20)
    $cBg2 = [System.Drawing.Color]::FromArgb(255, 20, 27, 36)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $cBg1, $cBg2, 55.0)
    $g.FillRectangle($bgBrush, $bgRect)
    $bgBrush.Dispose()

    # 2. Emerald Ambient Glow on Left Side
    $glowRect = New-Object System.Drawing.RectangleF(20, 80, 480, 480)
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddEllipse($glowRect)
    $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(65, 46, 204, 113)
    $glowBrush.SurroundColors = [System.Drawing.Color[]]@([System.Drawing.Color]::Transparent)
    $g.FillPath($glowBrush, $glowPath)
    $glowBrush.Dispose()
    $glowPath.Dispose()

    # 3. Draw Large Shield Icon on Left
    $shieldSize = 300
    $sX = 90
    $sY = 160
    $cx = $sX + ($shieldSize / 2.0)
    $sW = $shieldSize
    $sH = $shieldSize

    $tlX = $sX + ($sW * 0.16); $tlY = $sY + ($sH * 0.18)
    $trX = $sX + ($sW * 0.84); $trY = $sY + ($sH * 0.18)
    $tcX = $cx;                $tcY = $sY + ($sH * 0.11)
    $bX  = $cx;                $bY  = $sY + ($sH * 0.90)

    $spath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $spath.AddBezier([float]$tlX, [float]$tlY, [float]($sX + $sW * 0.30), [float]$tcY, [float]($sX + $sW * 0.70), [float]$tcY, [float]$trX, [float]$trY)
    $spath.AddBezier([float]$trX, [float]$trY, [float]($sX + $sW * 0.88), [float]($sY + $sH * 0.50), [float]($sX + $sW * 0.68), [float]($sY + $sH * 0.78), [float]$bX, [float]$bY)
    $spath.AddBezier([float]$bX, [float]$bY, [float]($sX + $sW * 0.32), [float]($sY + $sH * 0.78), [float]($sX + $sW * 0.12), [float]($sY + $sH * 0.50), [float]$tlX, [float]$tlY)
    $spath.CloseFigure()

    $sRect = New-Object System.Drawing.RectangleF($sX, $sY, $sW, $sH)
    $cTop = [System.Drawing.Color]::FromArgb(255, 76, 196, 125)
    $cBottom = [System.Drawing.Color]::FromArgb(255, 38, 168, 92)
    $sBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($sRect, $cTop, $cBottom, 90.0)
    $g.FillPath($sBrush, $spath)
    $sBrush.Dispose()

    # Border Glow
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 255, 255, 255), 5.0)
    $g.DrawPath($borderPen, $spath)
    $borderPen.Dispose()

    # White Checkmark
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 22.0)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $p1 = New-Object System.Drawing.PointF([float]($sX + $sW * 0.33), [float]($sY + $sH * 0.50))
    $p2 = New-Object System.Drawing.PointF([float]($sX + $sW * 0.46), [float]($sY + $sH * 0.63))
    $p3 = New-Object System.Drawing.PointF([float]($sX + $sW * 0.68), [float]($sY + $sH * 0.38))
    $g.DrawLines($pen, [System.Drawing.PointF[]]@($p1, $p2, $p3))
    $pen.Dispose()
    $spath.Dispose()

    # 4. Typography & Layout (Right Side)
    $fontBadge = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font("Segoe UI", 54, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
    $fontItem = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Regular)
    $fontBtn = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)

    $brushTitle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 246, 252))
    $brushSub = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 201, 209, 217))
    $brushGreen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 63, 185, 80))
    $brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    $textX = 460

    # Top Badge: 100% FREE & OPEN SOURCE • CHROME EXTENSION
    $bRect = New-Object System.Drawing.RectangleF($textX, 85, 430, 32)
    $bBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 63, 185, 80))
    $bPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 63, 185, 80), 1.0)
    $g.FillRectangle($bBg, $bRect)
    $g.DrawRectangle($bPen, $bRect.X, $bRect.Y, $bRect.Width, $bRect.Height)
    $g.DrawString("OPEN SOURCE * MANIFEST V3 CHROME EXTENSION", $fontBadge, $brushGreen, ($textX + 14), 92)
    $bBg.Dispose()
    $bPen.Dispose()

    # Main Title: AddFree
    $g.DrawString("AddFree", $fontTitle, $brushTitle, ($textX - 5), 125)

    # Subtitle
    $g.DrawString("Stop Intrusive Ads, Popups & Trackers", $fontSub, $brushSub, $textX, 220)

    # Feature List
    $features = @(
        ">> 16x Video Ad Fast-Forward & Instant Auto-Skip",
        ">> Block Popups, Popunders & Click-Trap Overlays",
        ">> Auto-Hide Cookie & CMP Consent Banners",
        ">> Clean URLs (Remove fbclid, gclid, utm trackers)",
        ">> Fast Browsing, Minimal Memory & Battery Friendly"
    )

    $fy = 275
    $itemBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 22, 27, 34))
    $itemBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 48, 54, 61), 1.0)

    foreach ($feat in $features) {
        $fRect = New-Object System.Drawing.RectangleF($textX, $fy, 670, 36)
        $g.FillRectangle($itemBg, $fRect)
        $g.DrawRectangle($itemBorder, $fRect.X, $fRect.Y, $fRect.Width, $fRect.Height)
        $g.DrawString($feat, $fontItem, $brushTitle, ($textX + 16), ($fy + 6))
        $fy += 46
    }
    $itemBg.Dispose()
    $itemBorder.Dispose()

    # Bottom Call To Action / GitHub Bar
    $ctaY = 525
    $ctaRect = New-Object System.Drawing.RectangleF($textX, $ctaY, 670, 48)
    $ctaBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 35, 134, 54))
    $g.FillRectangle($ctaBg, $ctaRect)
    $g.DrawString("Get it on GitHub: github.com/rayhanvision-a11y/AddFree", $fontBtn, $brushWhite, ($textX + 24), ($ctaY + 12))
    $ctaBg.Dispose()

    # Cleanup
    $fontBadge.Dispose()
    $fontTitle.Dispose()
    $fontSub.Dispose()
    $fontItem.Dispose()
    $fontBtn.Dispose()
    $brushTitle.Dispose()
    $brushSub.Dispose()
    $brushGreen.Dispose()
    $brushWhite.Dispose()
    $g.Dispose()

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Facebook Promo Generated: $OutPath"
}

Generate-FacebookPromo -OutPath "f:\laragon\www\AddFree\icons\facebook_post.png"
