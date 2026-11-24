# Start FixFlow PostgreSQL Server
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgData = "$PSScriptRoot\data\pgdata"
$pgLog = "$PSScriptRoot\data\pg.log"

if (-not (Test-Path $pgData)) {
    Write-Host "Initializing PostgreSQL cluster..." -ForegroundColor Cyan
    & "$pgBin\initdb.exe" -D $pgData -U postgres -E UTF8 --auth=trust
}

Write-Host "Starting PostgreSQL on port 5433..." -ForegroundColor Green
& "$pgBin\pg_ctl.exe" -D $pgData -o "-p 5433" -l $pgLog start
Write-Host "PostgreSQL started. Log: $pgLog" -ForegroundColor Green
