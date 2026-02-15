$ErrorActionPreference = "Stop"

# Use fixed "latest" directory instead of timestamp
$backupDir = "backups\latest"

# 0. Clean previous backup so we don't just merge files
if (Test-Path $backupDir) {
    Remove-Item $backupDir -Recurse -Force
    Write-Host "Removed previous backup folder" -ForegroundColor Green
}

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Write-Host "Created new backup directory: $backupDir" -ForegroundColor Green

# 1. Backup SQLite Database (Host file)
if (Test-Path "backend\recall.db") {
    Copy-Item "backend\recall.db" -Destination "$backupDir\recall.db"
    Write-Host "Backed up recall.db" -ForegroundColor Green
} else {
    Write-Host "Warning: backend\recall.db not found!" -ForegroundColor Yellow
}

# 2. Backup Uploads (Host folder)
if (Test-Path "backend\uploads") {
    Copy-Item "backend\uploads" -Destination "$backupDir\uploads" -Recurse
    Write-Host "Backed up uploads directory" -ForegroundColor Green
}

# 3. Backup ChromaDB (Docker Volume)
# We use docker cp to copy from the running (or stopped) container
$containerName = "recall-backend"
if (docker ps -a -q -f name=$containerName) {
    Write-Host "Extracting ChromaDB from Docker container..."
    try {
        docker cp ${containerName}:/app/backend/chroma_db "$backupDir\chroma_db"
        Write-Host "Backed up ChromaDB from container" -ForegroundColor Green
    } catch {
        Write-Host "Failed to copy ChromaDB from Docker: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Warning: Container '$containerName' not found. Cannot backup ChromaDB." -ForegroundColor Yellow
}

Write-Host "`nBackup completed successfully in $backupDir" -ForegroundColor Cyan
