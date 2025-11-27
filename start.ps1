# MDtranslator Windows 启动脚本
# 使用方法: 在项目根目录运行 .\start.ps1
# 同时启动前端和后端，调试信息输出到当前终端

param(
    [switch]$BackendOnly,   # 只启动后端
    [switch]$FrontendOnly   # 只启动前端
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MDtranslator 启动脚本 (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 检查 Conda 环境
if ($env:CONDA_DEFAULT_ENV -eq "mdtranslator") {
    Write-Host "当前 Conda 环境: $env:CONDA_DEFAULT_ENV" -ForegroundColor Green
} else {
    Write-Host "警告: 请先激活 mdtranslator 环境" -ForegroundColor Yellow
    Write-Host "运行: conda activate mdtranslator" -ForegroundColor Yellow
    exit 1
}

$projectRoot = $PSScriptRoot

# 清理旧进程
Write-Host "`n正在清理旧进程..." -ForegroundColor Yellow
@(8000, 3000) | ForEach-Object {
    $port = $_
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $conn.OwningProcess | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
        Write-Host "已停止端口 $port 上的进程" -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  启动服务" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "后端: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "前端: http://127.0.0.1:3000" -ForegroundColor White
Write-Host "API:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`n按 Ctrl+C 停止所有服务`n" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor DarkGray

if ($FrontendOnly) {
    # 只启动前端
    Set-Location "$projectRoot\src"
    yarn dev
}
elseif ($BackendOnly) {
    # 只启动后端
    Set-Location "$projectRoot\backend"
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload
}
else {
    # 同时启动前端和后端
    # 后端作为 Job 在后台运行，前端在前台运行（这样可以看到两者的输出）
    
    # 启动后端 Job
    $backendJob = Start-Job -ScriptBlock {
        param($backendPath, $condaEnv)
        Set-Location $backendPath
        # 直接调用 conda 环境中的 uvicorn
        & "$env:USERPROFILE\.conda\envs\$condaEnv\Scripts\uvicorn.exe" main:app --host 127.0.0.1 --port 8000 --reload 2>&1
    } -ArgumentList "$projectRoot\backend", "mdtranslator"
    
    Write-Host "[后端] 已在后台启动 (Job ID: $($backendJob.Id))" -ForegroundColor Cyan
    
    # 等待后端启动
    Start-Sleep -Seconds 2
    
    # 启动一个循环来同时显示后端日志和运行前端
    $frontendJob = Start-Job -ScriptBlock {
        param($srcPath)
        Set-Location $srcPath
        yarn dev 2>&1
    } -ArgumentList "$projectRoot\src"
    
    Write-Host "[前端] 已在后台启动 (Job ID: $($frontendJob.Id))" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host "实时日志输出:" -ForegroundColor Yellow
    Write-Host "----------------------------------------`n" -ForegroundColor DarkGray
    
    # 持续输出两个 Job 的日志
    try {
        while ($true) {
            # 获取后端输出
            $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
            if ($backendOutput) {
                $backendOutput | ForEach-Object {
                    Write-Host "[Backend] $_" -ForegroundColor Blue
                }
            }
            
            # 获取前端输出
            $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
            if ($frontendOutput) {
                $frontendOutput | ForEach-Object {
                    Write-Host "[Frontend] $_" -ForegroundColor Green
                }
            }
            
            # 检查 Job 状态
            if ($backendJob.State -eq "Failed") {
                Write-Host "[Backend] 进程已退出" -ForegroundColor Red
                Receive-Job -Job $backendJob
            }
            if ($frontendJob.State -eq "Failed") {
                Write-Host "[Frontend] 进程已退出" -ForegroundColor Red
                Receive-Job -Job $frontendJob
            }
            
            Start-Sleep -Milliseconds 100
        }
    }
    finally {
        # Ctrl+C 时清理
        Write-Host "`n`n正在停止服务..." -ForegroundColor Yellow
        Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
        Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
        Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue
        
        # 确保端口释放
        @(8000, 3000) | ForEach-Object {
            $conn = Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue
            if ($conn) {
                $conn.OwningProcess | ForEach-Object {
                    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
                }
            }
        }
        Write-Host "所有服务已停止" -ForegroundColor Green
    }
}
