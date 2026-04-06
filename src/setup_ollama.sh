#!/bin/bash

# This script helps set up Ollama for your Decky plugin's local AI client-server model.
# It is designed for Linux and macOS. For Windows, please see the instructions below.

echo "========================================"
echo "Ollama AI Setup Script for Decky Plugin"
echo "========================================"
echo ""

echo "Downloading and installing the latest version of Ollama..."
# Official Ollama install command for Linux/macOS
# This command downloads and runs the latest installer script
# For more details, visit: https://ollama.com/download
curl -fsSL https://ollama.com/install.sh | sh

if [ $? -ne 0 ]; then
    echo "Error: Ollama installation failed. Please check the output above or visit https://ollama.com/download for manual installation."
    exit 1
fi
echo "Ollama installed/updated successfully."

echo ""
echo "Pulling the 'llama3' model (this may take some time depending on your internet connection and PC specs)..."
# You can change 'llama3' to any other model you wish to use, e.g., 'mistral', 'phi3'
ollama pull llama3

if [ $? -ne 0 ]; then
    echo "Error: Failed to pull 'llama3' model. Ensure Ollama is running and you have an internet connection."
    exit 1
fi

echo ""
echo "Ollama setup complete! It should now be running in the background and accessible on port 11434."
echo "You can test it by running: ollama run llama3 'Hello, Ollama!'"
echo "========================================"