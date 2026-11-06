# reset-cache.ps1
$log = 'C:\Mac\Home\Documents\GitHub\Coliseu-Dash\reset_cache_run.log'
"=== Reset Cache Run: $(Get-Date) ===" | Out-File $log

# 1. Parar o serviço do Coliseu Dash
try {
    Write-Output "Parando o servico ColiseuWorkerDash..."
    Stop-Service -Name ColiseuWorkerDash -Force -ErrorAction SilentlyContinue
    "Servico parado com sucesso." | Out-File $log -Append
} catch {
    "Erro ao parar o servico: $_" | Out-File $log -Append
}

# 2. Diagnóstico de diretórios sob systemprofile
try {
    "--- Systemprofile AppData Roaming List ---" | Out-File $log -Append
    $sysDir = "C:\Windows\System32\config\systemprofile\AppData\Roaming"
    if (Test-Path $sysDir) {
        Get-ChildItem -Path $sysDir -Recurse -Filter "*sync_cache.sqlite" -ErrorAction SilentlyContinue | ForEach-Object {
            "Found cache: $($_.FullName) (Size: $($_.Length) bytes)" | Out-File $log -Append
        }
        # List subdirectories to be sure
        Get-ChildItem -Path $sysDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            "Subdir: $($_.Name)" | Out-File $log -Append
        }
    } else {
        "Caminho do systemprofile nao existe: $sysDir" | Out-File $log -Append
    }
} catch {
    "Erro no diagnostico: $_" | Out-File $log -Append
}

# 3. Deletar todos os possíveis caches do Coliseu Dash
$searchPaths = @(
    "C:\Windows\System32\config\systemprofile\AppData\Roaming\ColiseuDash\Worker\sync_cache.sqlite",
    "C:\Users\kleber\AppData\Roaming\ColiseuDash\Worker\sync_cache.sqlite"
)

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        try {
            Remove-Item $path -Force
            "Deletado cache com sucesso: $path" | Out-File $log -Append
        } catch {
            "Erro ao deletar cache $path : $_" | Out-File $log -Append
        }
    } else {
        "Cache nao encontrado em: $path" | Out-File $log -Append
    }
}

# 4. Iniciar o serviço do Coliseu Dash
try {
    Write-Output "Iniciando o servico ColiseuWorkerDash..."
    Start-Service -Name ColiseuWorkerDash -ErrorAction SilentlyContinue
    "Servico iniciado com sucesso." | Out-File $log -Append
    $status = (Get-Service -Name ColiseuWorkerDash -ErrorAction SilentlyContinue).Status
    "Status do servico: $status" | Out-File $log -Append
} catch {
    "Erro ao iniciar o servico: $_" | Out-File $log -Append
}
