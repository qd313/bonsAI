# Set the connection details for your Steam Deck
$HostIp="192.168.86.52"
$PcIp="192.168.86.35"
$User="deck"
$Pass="0088qd"
$PluginName="bonsAI"

# Install dependencies (only needed once or when adding new packages)
pnpm install

# Create the dist folder if it doesn't exist
if (!(Test-Path "dist")) { New-Item -ItemType Directory -Path "dist" | Out-Null }

# Inject the IPs into the frontend so they can be read natively by React
Write-Host "Generating src/config.ts..."
Set-Content -Path "src\config.ts" -Value "export const HostIp = '$HostIp';`nexport const PcIp = '$PcIp';"

# Build the plugin frontend
pnpm run build

Write-Host "Uploading to temporary Deck directory..."

# 1. Create a safe temporary directory in the user folder (no sudo required)
ssh "$User@$HostIp" "mkdir -p ~/decky_temp_$PluginName/dist"

# 2. Upload everything into the temporary directory
scp package.json plugin.json main.py "${User}@${HostIp}:~/decky_temp_$PluginName/"
scp dist/index.js "${User}@${HostIp}:~/decky_temp_$PluginName/dist/"

Write-Host "Overwriting system files and restarting Decky Loader..."

# 3. Auto-inject the password silently and restart the service
$RemoteCommand = "echo '$Pass' | sudo -S systemctl stop plugin_loader.service 2>/dev/null && " +
                 "echo '$Pass' | sudo -S mkdir -p ~/homebrew/plugins/$PluginName/dist 2>/dev/null && " +
                 "echo '$Pass' | sudo -S cp -rf ~/decky_temp_$PluginName/* ~/homebrew/plugins/$PluginName/ 2>/dev/null && " +
                 "echo '$Pass' | sudo -S systemctl start plugin_loader.service 2>/dev/null && " +
                 "rm -rf ~/decky_temp_$PluginName"

ssh "$User@$HostIp" $RemoteCommand

Write-Host "Deployment complete! Your new UI should appear on the Deck instantly."