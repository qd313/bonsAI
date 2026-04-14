<#
.SYNOPSIS
This script helps set up Ollama for your Decky plugin's local AI client-server model on Windows.
#>

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ollama AI Setup Script for Decky Plugin (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$installerPath = "$env:TEMP\OllamaSetup.exe"
$ollamaUrl = "https://ollama.com/download/OllamaSetup.exe"

Write-Host "Downloading the latest version of Ollama..."
try {
    Invoke-WebRequest -Uri $ollamaUrl -OutFile $installerPath -ErrorAction Stop
} catch {
    Write-Error "Failed to download Ollama. Please check your internet connection or visit https://ollama.com/download to install manually."
    exit
}

Write-Host "Installing Ollama... Please follow any prompts that appear."
try {
    # Start the installer and wait for it to complete.
    Start-Process -FilePath $installerPath -Wait
    Write-Host "Ollama installed successfully." -ForegroundColor Green
} catch {
    Write-Error "Failed to execute the Ollama installer."
    exit
}

Write-Host ""
Write-Host "Pulling the 'llama3' model (this may take some time depending on your internet connection and PC specs)..."

# Refresh the PATH variable for the current session so PowerShell knows where 'ollama.exe' is immediately
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

ollama pull llama3

Write-Host ""
Write-Host "Ollama setup complete! It should now be running in the background and accessible on port 11434." -ForegroundColor Green
Write-Host "You can test it by opening a new PowerShell window and running: ollama run llama3 `"Hello, Ollama!`""
Write-Host "========================================" -ForegroundColor Cyan