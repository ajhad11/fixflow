# Stop FixFlow PostgreSQL Server
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgData = "$PSScriptRoot\data\pgdata"

Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
& "$pgBin\pg_ctl.exe" -D $pgData stop
Write-Host "PostgreSQL stopped." -ForegroundColor Yellow
