# MDtranslator Windows 启动脚本
# 使用方法: 在项目根目录运行 .\start.ps1

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MDtranslator 启动脚本 (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 检查 Conda 环境
if ($env:CONDA_DEFAULT_ENV) {
    Write-Host "当前 Conda 环境: $env:CONDA_DEFAULT_ENV" -ForegroundColor Green
} else {
    Write-Host "警告: 未检测到激活的 Conda 环境" -ForegroundColor Yellow
    Write-Host "请先运行: conda activate mdtranslator" -ForegroundColor Yellow
}

# 清理可能存在的旧进程
Write-Host "`n正在清理旧进程..." -ForegroundColor Yellow

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

Start-Sleep -Seconds 1

$projectRoot = $PSScriptRoot

if (-not $FrontendOnly) {
    # 启动后端
    Write-Host "`n正在启动后端 (端口 8000)..." -ForegroundColor Cyan
    $backendProcess = Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$projectRoot'; conda activate mdtranslator; uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
    ) -PassThru
    Write-Host "后端 PID: $($backendProcess.Id)" -ForegroundColor Gray
}

Start-Sleep -Seconds 3

if (-not $BackendOnly) {
    # 启动前端
    Write-Host "正在启动前端 (端口 3000)..." -ForegroundColor Cyan
    $frontendProcess = Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit", 
        "-Command",
        "cd '$projectRoot\src'; yarn dev"
    ) -PassThru
    Write-Host "前端 PID: $($frontendProcess.Id)" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  项目已启动!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "前端地址: http://127.0.0.1:3000" -ForegroundColor White
Write-Host "后端地址: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "API 文档: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`n提示: 已在新窗口中启动服务，关闭窗口即可停止对应服务" -ForegroundColor Yellow
Write-Host "或运行 .\stop.ps1 停止所有服务" -ForegroundColor Yellow
