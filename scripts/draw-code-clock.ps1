Add-Type -AssemblyName System.Drawing
$faceDirectory = Join-Path $PSScriptRoot '../faces/code-clock'
[IO.Directory]::CreateDirectory((Join-Path $faceDirectory 'assets')) | Out-Null
$bitmap = [Drawing.Bitmap]::new(480,480)
$g = [Drawing.Graphics]::FromImage($bitmap)
$g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$font = [Drawing.Font]::new('Consolas',11,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
$small = [Drawing.Font]::new('Consolas',10,[Drawing.FontStyle]::Regular,[Drawing.GraphicsUnit]::Pixel)
function Box($x,$y,$w,$h,$color) {
  $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
  $g.FillRectangle($brush,$x,$y,$w,$h); $brush.Dispose()
}
function Text($value,$x,$y,$color,$f=$font) {
  $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($color))
  $g.DrawString($value,$f,$brush,[single]$x,[single]$y); $brush.Dispose()
}
function Panel($x,$y,$w,$h,$title) {
  Box $x $y $w $h '#3D6652'; Box ($x+1) ($y+1) ($w-2) ($h-2) '#030609'
  Box ($x+2) ($y+2) ($w-4) 23 '#07100F'
  Text $title ($x+9) ($y+7) '#6BE891' $small
}
$g.Clear([Drawing.ColorTranslator]::FromHtml('#010204'))
Box 0 0 480 30 '#0B151E'
Text 'CODE SCREENSAVER' 12 9 '#80DEA1' $small
Text 'MANATOO / LOCAL' 370 9 '#789DA9' $small
Panel 8 38 228 106 '> agent/01  ~/Clock.cs'
Panel 244 38 228 106 '> agent/02  ~/Display.cs'
Text '001' 16 73 '#476673' $small; Text 'var now = DateTime.Now;' 43 73 '#B8CCD4' $small
Text '002' 16 90 '#476673' $small; Text 'clock.Tick(now);' 43 90 '#EDC778' $small
Text '003' 16 107 '#476673' $small; Text '// keep good time' 43 107 '#668278' $small
Text '001' 252 73 '#476673' $small; Text 'theme = "midnight";' 279 73 '#80DEA1' $small
Text '002' 252 90 '#476673' $small; Text 'await Render();' 279 90 '#79CCD9' $small
Text '003' 252 107 '#476673' $small; Text 'return live;' 279 107 '#F57880' $small
Panel 8 152 464 210 '> clock/00  ~/LocalTime.cs'
Text '// device time / always running' 22 189 '#668278'
Box 22 325 4 13 '#6BE891'; Text 'RUNNING' 33 326 '#6BE891' $small
Text 'ASTROTOO  /  480x480' 340 326 '#789DA9' $small
Panel 8 370 464 70 '> agent/03  ~/Heartbeat.cs'
Text '0042' 19 404 '#476673'; Text 'while (alive) { await NextMinute(); }' 57 404 '#B8CCD4'
Box 0 450 480 30 '#05100C'
Text '> time service active' 12 460 '#6BE891' $small
Text 'LOCAL / NATIVE CLOCK' 352 460 '#789DA9' $small
$bitmap.Save((Join-Path $faceDirectory 'assets/background.jpg'),[Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $bitmap.Dispose(); $font.Dispose(); $small.Dispose()
