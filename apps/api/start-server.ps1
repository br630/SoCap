# PowerShell script to start the server and show output
Write-Host "Starting server..." -ForegroundColor Green
cd $PSScriptRoot
$env:NODE_ENV='development'
npx ts-node-dev --respawn --transpile-only src/index.ts
