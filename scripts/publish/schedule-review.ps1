param([ValidateRange(1,14)][int]$Days = 3)
$ErrorActionPreference = 'Stop'
$rootDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$taskName = 'ManaToo-PublicReview-Hourly'
$description = "Hourly public clockface review check for $rootDirectory; expires automatically."
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Description -ne $description) { throw 'A task with this name exists and is not managed by this workspace.' }
$pointer = Get-Content (Join-Path $rootDirectory 'exports/publish/current.json') -Raw | ConvertFrom-Json
if ($pointer.directory -notmatch '^v\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$') { throw 'Invalid publish candidate directory.' }
$manifest = Get-Content (Join-Path $rootDirectory "exports/publish/$($pointer.directory)/manifest.json") -Raw | ConvertFrom-Json
$launcher = & (Join-Path $PSScriptRoot 'build-review-launcher.ps1')
$now = Get-Date
$stop = $now.AddDays($Days)
$first = $now.Date.AddHours($now.Hour + 1)
$folder = Join-Path $rootDirectory 'exports/review-watch'
New-Item -ItemType Directory -Force $folder | Out-Null
@{ title=$manifest.title; deviceId=$manifest.deviceId; clockId=$manifest.clockId; startAt=$first.ToString('o'); stopAt=$stop.ToString('o'); taskName=$taskName } | ConvertTo-Json | Set-Content (Join-Path $folder 'config.json')
$nodePath = (Get-Command node).Source
$watcher = Join-Path $PSScriptRoot 'watch-review.mjs'
$arguments = '"' + $nodePath + '" "' + $watcher + '"'
$action = New-ScheduledTaskAction -Execute $launcher -Argument $arguments -WorkingDirectory $rootDirectory
$trigger = New-ScheduledTaskTrigger -Once -At $first -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days $Days)
$trigger.EndBoundary = $stop.ToString('yyyy-MM-ddTHH:mm:sszzz')
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 3) -MultipleInstances IgnoreNew -DeleteExpiredTaskAfter (New-TimeSpan -Hours 1)
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$definition = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $description
Register-ScheduledTask -TaskName $taskName -InputObject $definition -Force | Select-Object TaskName,State
Write-Output "First hourly check: $($first.ToString('o'))"
Write-Output "Monitoring ends: $($stop.ToString('o'))"
Write-Output "Logs: $folder"
