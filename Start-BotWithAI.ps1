# 設定標題
$host.ui.RawUI.WindowTitle = "BK-Bot with AI"

# 函數：檢查 Ollama 是否運行中
function Test-OllamaRunning {
    try {
        $connection = Get-NetTCPConnection -LocalPort 11434 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# 函數：啟動 Ollama
function Start-Ollama {
    Write-Host "啟動 Ollama deepseek 模型..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "ollama" -ArgumentList "run deepseek-r1:8b" -WindowStyle Hidden
        Write-Host "等待 Ollama 啟動..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    } catch {
        Write-Host "無法啟動 Ollama: $_" -ForegroundColor Red
        exit 1
    }
}

# 主要執行邏輯
try {
    # 檢查 Ollama 狀態
    if (Test-OllamaRunning) {
        Write-Host "Ollama 已在運行中..." -ForegroundColor Green
    } else {
        Start-Ollama
    }

    # 啟動 Bot
    Write-Host "啟動 Minecraft Bot..." -ForegroundColor Cyan
    npm start

} catch {
    Write-Host "發生錯誤: $_" -ForegroundColor Red
    exit 1
} finally {
    # 結束 Ollama 進程
    Write-Host "清理進程..." -ForegroundColor Yellow
    Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force
}

Write-Host "程序已結束" -ForegroundColor Green