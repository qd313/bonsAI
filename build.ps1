# Set the connection details for your Steam Deck
$HostIp="192.168.86.52"
$User="deck"
$Pass="0088qd"
$PluginName="DeckySettingsSearch"

# Install dependencies (only needed once or when adding new packages)
pnpm install

# Force update Decky's modular libraries to their newest versions
pnpm update @decky/api @decky/ui --latest

# Create the dist folder if it doesn't exist
if (!(Test-Path "dist")) { New-Item -ItemType Directory -Path "dist" | Out-Null }

# Build the plugin frontend using the package.json script
pnpm run build

Write-Host "Deploying to Steam Deck..."

# 1. Stop the service and WIPE the old directory so we don't fight 'root' for file overwrites
ssh "$User@$HostIp" "echo '$Pass' | sudo -S systemctl stop plugin_loader && echo '$Pass' | sudo -S rm -rf ~/homebrew/plugins/$PluginName && echo '$Pass' | sudo -S mkdir -p ~/homebrew/plugins/$PluginName/dist && echo '$Pass' | sudo -S chown -R $User ~/homebrew/plugins/$PluginName && echo '$Pass' | sudo -S chmod -R 777 ~/homebrew/plugins/$PluginName"

# 2. Copy the manifest and backend files (these will now write as fresh files)
scp package.json plugin.json main.py "${User}@${HostIp}:~/homebrew/plugins/$PluginName/"

# 3. Copy the compiled UI code
scp dist/index.js "${User}@${HostIp}:~/homebrew/plugins/$PluginName/dist/"

# 4. Fix permissions so the background service can read the files securely
ssh "$User@$HostIp" "echo '$Pass' | sudo -S chmod -R 755 ~/homebrew/plugins/$PluginName"

# 5. Start the Decky Loader service to load the new version
Write-Host "Starting Decky Loader..."
ssh "$User@$HostIp" "echo '$Pass' | sudo -S systemctl start plugin_loader"

Write-Host "Deployment complete!"