$ErrorActionPreference = 'Stop'
$rootDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$folder = Join-Path $rootDirectory 'exports/review-watch'
New-Item -ItemType Directory -Force $folder | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe' }
if (!(Test-Path -LiteralPath $compiler)) { throw 'The Windows .NET Framework C# compiler is unavailable.' }
$launcher = Join-Path $folder 'ReviewWatcherLauncher.exe'
$messages = & $compiler '/nologo' '/target:winexe' "/out:$launcher" (Join-Path $PSScriptRoot 'ReviewWatcherLauncher.cs') 2>&1
if ($LASTEXITCODE -ne 0) { throw "Review launcher compilation failed: $messages" }
Write-Output $launcher
