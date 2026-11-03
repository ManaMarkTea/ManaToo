Add-Type -AssemblyName System.Drawing
$faceDirectory = Join-Path $PSScriptRoot '../faces/code-clock'
$layout = Get-Content (Join-Path $faceDirectory 'layout.json') -Raw | ConvertFrom-Json
$project = Get-Content (Join-Path $PSScriptRoot '../package.json') -Raw | ConvertFrom-Json
$font = [Drawing.Font]::new('Consolas',10,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
function Box($x,$y,$w,$h,$color) {
  $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
  $script:g.FillRectangle($brush,$x,$y,$w,$h); $brush.Dispose()
}
function Text($value,$x,$y,$color) {
  $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
  $script:g.DrawString($value,$font,$brush,[single]$x,[single]$y); $brush.Dispose()
}
function CodeLine($line) {
  $position = [single]$line.x
  $format = [Drawing.StringFormat]::GenericTypographic.Clone()
  $format.FormatFlags = $format.FormatFlags -bor [Drawing.StringFormatFlags]::MeasureTrailingSpaces
  foreach ($span in $line.spans) {
    $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($span.color))
    $g.DrawString($span.text,$font,$brush,[Drawing.PointF]::new($position,[single]$line.y),$format)
    $position += $g.MeasureString($span.text,$font,[Drawing.PointF]::Empty,$format).Width
    $brush.Dispose()
  }
  $format.Dispose()
}
function SunIcon($icon) {
  $state = $g.Save()
  $g.TranslateTransform([single]$icon.x,[single]$icon.y)
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $pen = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($icon.color),1.6)
  $g.DrawArc($pen,7,14,14,14,180,180)
  $g.DrawLine($pen,1,22,27,22)
  $g.DrawLine($pen,5,26,23,26)
  $g.DrawLine($pen,0,15,4,17)
  $g.DrawLine($pen,24,17,28,15)
  $g.DrawLine($pen,5,8,8,11)
  $g.DrawLine($pen,20,11,23,8)
  $g.DrawLine($pen,14,1,14,9)
  if ($icon.kind -eq 'sunrise') {
    $g.DrawLine($pen,11,4,14,1)
    $g.DrawLine($pen,14,1,17,4)
  } else {
    $g.DrawLine($pen,11,6,14,9)
    $g.DrawLine($pen,14,9,17,6)
  }
  $pen.Dispose()
  $g.Restore($state)
}
function WindIcon($icon) {
  $state = $g.Save()
  $g.TranslateTransform([single]$icon.x,[single]$icon.y)
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $pen = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml($icon.color),1.6)
  $path = [Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddLine(0,7,14,7)
  $path.AddArc(10,1,8,6,90,-270)
  $g.DrawPath($pen,$path)
  $g.DrawLine($pen,0,12,22,12)
  $path.Reset()
  $path.AddLine(0,17,12,17)
  $path.AddArc(8,17,8,6,270,270)
  $g.DrawPath($pen,$path)
  $path.Dispose(); $pen.Dispose(); $g.Restore($state)
}
$background = [Drawing.Bitmap]::new(480,480)
$g = [Drawing.Graphics]::FromImage($background)
$g.Clear([Drawing.ColorTranslator]::FromHtml($layout.canvas.background))
$background.Save((Join-Path $faceDirectory 'assets/background.jpg'),[Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $background.Dispose()
foreach ($panel in $layout.panels) {
  $bitmap = [Drawing.Bitmap]::new([int]$panel.w,[int]$panel.h)
  $g = [Drawing.Graphics]::FromImage($bitmap)
  $g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  if ($panel.title) {
    $g.Clear([Drawing.ColorTranslator]::FromHtml('#3D6652'))
    Box 1 1 ($panel.w-2) ($panel.h-2) '#030609'
    Box 2 2 ($panel.w-4) 23 '#07100F'
    Text $panel.title 9 7 '#6BE891'
  } else { $g.Clear([Drawing.ColorTranslator]::FromHtml($panel.fill)) }
  foreach ($label in $panel.labels) {
    $labelText = $label.text.Replace('{{version}}', $project.version)
    Text $labelText $label.x $label.y $label.color
  }
  foreach ($line in $panel.codeLines) { CodeLine $line }
  foreach ($icon in $panel.icons) {
    if ($icon.kind -eq 'wind') { WindIcon $icon } else { SunIcon $icon }
  }
  $bitmap.Save((Join-Path $faceDirectory "assets/panel-$($panel.id).png"),[Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bitmap.Dispose()
}
$font.Dispose()
