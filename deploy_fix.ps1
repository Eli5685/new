Rename-Item -Path ".git" -NewName "_git" -ErrorAction SilentlyContinue
Write-Host "Git hidden. Starting deploy..."
Set-Location "web"
cmd /c "npx vercel --prod"
Set-Location ".."
Rename-Item -Path "_git" -NewName ".git" -ErrorAction SilentlyContinue
Write-Host "Git restored."
