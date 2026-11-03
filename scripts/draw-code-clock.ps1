Add-Type -AssemblyName System.Drawing
$faceDirectory = Join-Path $PSScriptRoot '../faces/code-clock'
$layout = Get-Content (Join-Path $faceDirectory 'layout.json') -Raw | ConvertFrom-Json
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
  foreach ($label in $panel.labels) { Text $label.text $label.x $label.y $label.color }
  foreach ($line in $panel.codeLines) { CodeLine $line }
  $bitmap.Save((Join-Path $faceDirectory "assets/panel-$($panel.id).png"),[Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bitmap.Dispose()
}
$font.Dispose()
