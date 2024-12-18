# Set Variables
$ResourceGroup = "DocumentProcessingRG"
$StorageAccountName = "docprocessingocrstorage"
$CognitiveAccountName = "docprocessingcv-cv"
$CosmosDbName = "docprocessingcosmos"
$ProjectFolder = "C:\Users\Moe_k\document-processing-function"
$DistFolder = "$ProjectFolder\dist"
$ZipFile = "$DistFolder.zip"

# Step 1: Clean the dist folder (if it exists)
Write-Output "Checking for existing dist folder..."
cd $ProjectFolder
if (Test-Path $DistFolder) {
    Write-Output "Dist folder exists. Cleaning up..."
    npm run clean
} else {
    Write-Output "No dist folder found. Skipping clean-up."
}

# Step 2: Install dependencies
Write-Output "Installing dependencies..."
npm install
if (!$?) {
    Write-Error "Failed to install dependencies."
    exit 1
}
Write-Output "Dependencies installed successfully."

# Step 3: Build the project to generate the dist folder
Write-Output "Building the project to generate the dist folder..."
npm run build
if (!(Test-Path $DistFolder)) {
    Write-Error "Dist folder was not created. Build failed."
    exit 1
}
Write-Output "Dist folder created successfully."

# Step 4: Get Azure values
Write-Output "Fetching AzureWebJobsStorage connection string..."
$FullConnectionString = az storage account show-connection-string --name $StorageAccountName --resource-group $ResourceGroup --query connectionString -o tsv
$AzureWebJobsStorage = $FullConnectionString -split ";BlobEndpoint=" | Select-Object -First 1

Write-Output "Fetching Computer Vision endpoint..."
$ComputerVisionEndpoint = az cognitiveservices account show --name $CognitiveAccountName --resource-group $ResourceGroup --query "properties.endpoint" -o tsv

Write-Output "Fetching Computer Vision key..."
$ComputerVisionKey = az cognitiveservices account keys list --name $CognitiveAccountName --resource-group $ResourceGroup --query "key1" -o tsv

Write-Output "Fetching Cosmos DB connection string..."
$CosmosDbConnectionString = az cosmosdb keys list --name $CosmosDbName --resource-group $ResourceGroup --type connection-strings --query "connectionStrings[0].connectionString" -o tsv

# Step 5: Create local.settings.json in the dist folder
Write-Output "Creating local.settings.json..."
@"
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "$AzureWebJobsStorage",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COMPUTER_VISION_ENDPOINT": "$ComputerVisionEndpoint",
    "COMPUTER_VISION_KEY": "$ComputerVisionKey",
    "COSMOS_DB_CONNECTION_STRING": "$CosmosDbConnectionString"
  }
}
"@ | Set-Content -Path "$DistFolder\local.settings.json"
Write-Output "local.settings.json has been created successfully in the dist folder."

# Step 6: Copy node_modules to the dist folder
Write-Output "Copying node_modules to the dist folder..."
if (!(Test-Path "$DistFolder\node_modules")) {
    Copy-Item -Recurse -Path "$ProjectFolder\node_modules" -Destination "$DistFolder\node_modules"
    Write-Output "node_modules successfully copied to the dist folder."
} else {
    Write-Output "node_modules already exists in the dist folder. Skipping copy."
}

# Step 7: Ensure package.json and host.json exist in the dist folder
Write-Output "Copying required files (package.json, host.json) to the dist folder..."
if (!(Test-Path "$DistFolder\package.json")) {
    Copy-Item "$ProjectFolder\package.json" "$DistFolder\package.json"
    Write-Output "Copied package.json to dist folder."
}
if (!(Test-Path "$DistFolder\host.json")) {
    Copy-Item "$ProjectFolder\host.json" "$DistFolder\host.json"
    Write-Output "Copied host.json to dist folder."
}

# Step 8: Zip the dist folder (Exclude node_modules)
Write-Output "Zipping the dist folder (excluding node_modules)..."
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
    Write-Output "Old zip file removed."
}

# Create a list of files and folders to include, excluding node_modules
$filesToArchive = Get-ChildItem -Path $DistFolder -Recurse -Exclude "node_modules" | Where-Object { -not $_.PSIsContainer }

# Compress the filtered files into the zip file
Compress-Archive -Path $filesToArchive.FullName -DestinationPath $ZipFile -Force
Write-Output "The dist folder has been successfully zipped as $ZipFile."


# Final Output
Write-Output "Configuration, build, and zipping completed successfully. The zip file is ready for deployment."
