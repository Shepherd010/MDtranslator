# MDtranslator 停止脚本
Write-Host "正在停止 MDtranslator 服务..." -ForegroundColor Yellow

# 停止所有相关 Jobs
Get-Job | Where-Object { $_.State -eq "Running" } | Stop-Job
Get-Job | Remove-Job -Force

# 杀死占用 8000 和 3000 端口的进程
$ports = @(8000, 3000)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        $processId = $connection.OwningProcess
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "已停止端口 $port 上的进程 (PID: $processId)" -ForegroundColor Gray
    }
}

Write-Host "所有服务已停止" -ForegroundColor Green
