#!/bin/bash
 
# Function to check if a command exists
dependencies=("node" "npm" "swa")
check_dependency() {
    if ! command -v "$1" &>/dev/null; then
        echo "Error: $1 is not installed. Please install it before running this script."
        exit 1
    fi
}
 
# Check dependencies
for dep in "${dependencies[@]}"; do
    check_dependency "$dep"
done
 
# Ensure Azure Static Web Apps CLI is installed
if ! npm list -g @azure/static-web-apps-cli &>/dev/null; then
    echo "Installing Azure Static Web Apps CLI..."
    npm install -g @azure/static-web-apps-cli
fi
 
# Get user input for Static Web App details
echo "Enter your Azure Static Web App name:"
read STATIC_APP_NAME
 
if [ -z "$STATIC_APP_NAME" ]; then
    echo "Error: Static Web App name cannot be empty."
    exit 1
fi
 
# Get the deployment token
echo "Enter your Azure Static Web App deployment token (paste and press Enter):"
read DEPLOYMENT_TOKEN
 
if [ -z "$DEPLOYMENT_TOKEN" ]; then
    echo "Error: Deployment token cannot be empty."
    exit 1
fi
 
# Build the React app
echo "Building the React application..."
npm install && npm run build
 
if [ $? -ne 0 ]; then
    echo "Error: React app build failed. Check the logs above."
    exit 1
fi
 
# Check and create swa-cli.config.json if it doesn't exist
if [ ! -f swa-cli.config.json ]; then
    cat > swa-cli.config.json <<EOL
{
  "$schema": "https://aka.ms/azure/static-web-apps-cli/schema",
  "configurations": {
    "$STATIC_APP_NAME": {
      "appDir": "build",
      "outputLocation": "build"
    }
  }
}
EOL
    echo "swa-cli.config.json created successfully."
else
    echo "swa-cli.config.json already exists. Skipping creation."
fi
 
# Check and create staticwebapp.config.json if it doesn't exist
if [ ! -f staticwebapp.config.json ]; then
    cat > staticwebapp.config.json <<EOL
{
    "navigationFallback": {
        "rewrite": "/index.html"
    }
}
EOL
    echo "staticwebapp.config.json created successfully."
else
    echo "staticwebapp.config.json already exists. Skipping creation."
fi
 
# Deploy the application
echo "Deploying to Azure Static Web Apps..."
swa deploy --deployment-token "$DEPLOYMENT_TOKEN" --config-name "$STATIC_APP_NAME" --env production
 
if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed. Check the error messages above."
    exit 1
fi