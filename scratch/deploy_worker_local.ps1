# deploy_worker_local.ps1
# Script to compile the local worker and copy it to C:\Sales to update the running Piveta service.

$WorkerProj = "C:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\ColiseuSales.Worker.csproj"
$DestDir = "C:\Sales"
$ServiceName = "ColiseuSalesWorker_Piveta"

Write-Host "1. Parando o servico $ServiceName..." -ForegroundColor Yellow
try {
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
    Write-Host "OK: Servico parado com sucesso." -ForegroundColor Green
} catch {
    Write-Host "Erro ao parar servico: $_" -ForegroundColor Red
    exit 1
}

Write-Host "2. Publicando o Worker em modo Release..." -ForegroundColor Yellow
$TempPublish = "C:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\bin\Release\net8.0-windows\win-x64\publish"

# Clean previous publish dir if exists
if (Test-Path $TempPublish) {
    Remove-Item $TempPublish -Recurse -Force
}

dotnet publish $WorkerProj -c Release -r win-x64 --self-contained -o $TempPublish

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro na compilacao/publicacao do Worker!" -ForegroundColor Red
    # Start the service back up
    Start-Service -Name $ServiceName
    exit 1
}
Write-Host "OK: Publicado com sucesso." -ForegroundColor Green

Write-Host "3. Copiando novos binarios para $DestDir..." -ForegroundColor Yellow
try {
    Copy-Item "$TempPublish\*" $DestDir -Recurse -Force -ErrorAction Stop
    Write-Host "OK: Copia concluida." -ForegroundColor Green
} catch {
    Write-Host "Erro ao copiar arquivos: $_" -ForegroundColor Red
    # Start the service back up
    Start-Service -Name $ServiceName
    exit 1
}

Write-Host "4. Iniciando o servico $ServiceName..." -ForegroundColor Yellow
try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Start-Sleep -Seconds 3
    $status = (Get-Service -Name $ServiceName).Status
    Write-Host "OK: Servico iniciado. Status atual: $status" -ForegroundColor Green
} catch {
    Write-Host "Erro ao iniciar servico: $_" -ForegroundColor Red
    exit 1
}

Write-Host "==============================================" -ForegroundColor Green
Write-Host "Atualizacao do Worker executada com sucesso!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
