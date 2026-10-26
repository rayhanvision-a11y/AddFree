Add-Type -AssemblyName System.Drawing

function Generate-Banner {
    param (
        [string]$OutPath
    )

    $w = 1200
    $h = 420
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Dark background gradient
    $bgRect = New-Object System.Drawing.RectangleF(0, 0, $w, $h)
    $cBg1 = [System.Drawing.Color]::FromArgb(255, 13, 17, 23)   # #0d1117 deep slate
    $cBg2 = [System.Drawing.Color]::FromArgb(255, 22, 27, 34)   # #161b22
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($bgRect, $cBg1, $cBg2, 45.0)
    $g.FillRectangle($bgBrush, $bgRect)
    $bgBrush.Dispose()

    # 2. Glowing emerald ambient circle behind shield
    $glowRect = New-Object System.Drawing.RectangleF(50, 60, 300, 300)
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddEllipse($glowRect)
    $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
    $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(50, 46, 204, 113) # translucent emerald
    $glowBrush.SurroundColors = [System.Drawing.Color[]]@([System.Drawing.Color]::Transparent)
    $g.FillPath($glowBrush, $glowPath)
    $glowBrush.Dispose()
    $glowPath.Dispose()

    # 3. Draw Shield on left side
    $shieldSize = 220
    $sX = 90
    $sY = 100
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
    $cTop = [System.Drawing.Color]::FromArgb(255, 76, 196, 125)    # #4cc47d
    $cBottom = [System.Drawing.Color]::FromArgb(255, 38, 168, 92) # #26a85c
    $sBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($sRect, $cTop, $cBottom, 90.0)
    $g.FillPath($sBrush, $spath)
    $sBrush.Dispose()

    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 255, 255, 255), 4.0)
    $g.DrawPath($borderPen, $spath)
    $borderPen.Dispose()

    # Shield Checkmark
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 16.0)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $p1 = New-Object System.Drawing.PointF([float]($sX + $sW * 0.33), [float]($sY + $sH * 0.50))
    $p2 = New-Object System.Drawing.PointF([float]($sX + $sW * 0.46), [float]($sY + $sH * 0.63))
    $p3 = New-Object System.Drawing.PointF([float]($sX + $sW * 0.68), [float]($sY + $sH * 0.38))
    $g.DrawLines($pen, [System.Drawing.PointF[]]@($p1, $p2, $p3))
    $pen.Dispose()
    $spath.Dispose()

    # 4. Text Content (Right side)
    $fontTitle = New-Object System.Drawing.Font("Segoe UI", 48, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Regular)
    $fontBadge = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)

    $brushTitle = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 240, 246, 252))
    $brushSub = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 139, 148, 158))
    $brushGreen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 63, 185, 80))

    # Badge: Manifest V3
    $badgeRect = New-Object System.Drawing.RectangleF(360, 95, 120, 26)
    $badgeBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 63, 185, 80))
    $badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 63, 185, 80), 1.0)
    $g.FillRectangle($badgeBg, $badgeRect)
    $g.DrawRectangle($badgePen, 360, 95, 120, 26)
    $g.DrawString("MANIFEST V3", $fontBadge, $brushGreen, 372, 100)
    $badgeBg.Dispose()
    $badgePen.Dispose()

    # Title: AddFree
    $g.DrawString("AddFree", $fontTitle, $brushTitle, 355, 125)

    # Subtitle
    $subText = "Ultra-Fast Ad, Tracker & Video Popup Blocker"
    $g.DrawString($subText, $fontSub, $brushSub, 360, 210)

    # Pill tags
    $tags = @("16x Video Ad Fast-Forward", "Cookie Dialog Hider", "Clean URLs Stripper", "Anti-Popup Guard", "WebRTC & Miner Shield")
    $tagX = 360
    $tagY = 265
    $fontTag = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
    $tagBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 201, 209, 217))
    $tagBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 33, 38, 45))
    $tagBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 48, 54, 61), 1.0)

    foreach ($t in $tags) {
        $size = $g.MeasureString($t, $fontTag)
        $tRect = New-Object System.Drawing.RectangleF($tagX, $tagY, ($size.Width + 18), 30)
        if (($tagX + $size.Width + 24) -gt 1150) {
            $tagX = 360
            $tagY += 38
            $tRect = New-Object System.Drawing.RectangleF($tagX, $tagY, ($size.Width + 18), 30)
        }
        $g.FillRectangle($tagBg, $tRect)
        $g.DrawRectangle($tagBorder, $tRect.X, $tRect.Y, $tRect.Width, $tRect.Height)
        $g.DrawString($t, $fontTag, $tagBrush, ($tagX + 9), ($tagY + 6))
        $tagX += ($size.Width + 26)
    }

    # Cleanup
    $tagBrush.Dispose()
    $tagBg.Dispose()
    $tagBorder.Dispose()
    $fontTag.Dispose()
    $brushTitle.Dispose()
    $brushSub.Dispose()
    $brushGreen.Dispose()
    $fontTitle.Dispose()
    $fontSub.Dispose()
    $fontBadge.Dispose()
    $g.Dispose()

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Banner Generated: $OutPath"
}

Generate-Banner -OutPath "f:\laragon\www\AddFree\icons\banner.png"
