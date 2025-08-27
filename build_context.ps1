# ==============================================================================
# Script Konteks Proyek CAPI-PWA (Versi PowerShell untuk Windows)
# ==============================================================================
# Tujuan: Secara otomatis menemukan dan menggabungkan semua file spesifikasi
#         (.md di spec/) dan semua file perintah TOML (.toml di frontend-pwa)
#         menjadi satu file teks tunggal.
#
# Cara Menggunakan:
# 1. Buka PowerShell di direktori root proyek (CAPI-PWA).
# 2. Jalankan script: .\build_context.ps1
#    (Mungkin perlu mengubah Execution Policy: Set-ExecutionPolicy RemoteSigned)
# ==============================================================================

# Nama file output
$outputFile = "full_context.txt"

# Dapatkan path direktori saat ini tempat script dijalankan
$currentDir = Get-Location

# Direktori yang akan dipindai
$specDir = Join-Path $currentDir "spec"
$commandsDir = Join-Path $currentDir "frontend-pwa\.gemini\commands"

# Hapus file output lama jika ada untuk memulai dari awal
if (Test-Path $outputFile) {
    Clear-Content -Path $outputFile
}

Write-Host "Memulai proses penggabungan konteks secara dinamis..." -ForegroundColor Green

# Fungsi untuk menambahkan file ke output dengan header yang jelas
function Append-FileToContext {
    param (
        [Parameter(Mandatory=$true)]
        [System.IO.FileInfo]$fileInfo
    )
    
    $relativePath = $fileInfo.FullName.Substring($currentDir.Path.Length + 1)
    Write-Host "   -> Menambahkan file: $relativePath"

    # Menambahkan header ke file output
    Add-Content -Path $outputFile -Value "========================================================================"
    Add-Content -Path $outputFile -Value "## FILE: $relativePath"
    Add-Content -Path $outputFile -Value "========================================================================"
    Add-Content -Path $outputFile -Value ""

    # Menambahkan konten file
    Add-Content -Path $outputFile -Value (Get-Content -Path $fileInfo.FullName -Raw)

    # Menambahkan pemisah di akhir
    Add-Content -Path $outputFile -Value ""
    Add-Content -Path $outputFile -Value "--- END OF FILE: $relativePath ---"
    Add-Content -Path $outputFile -Value "`n`n"
}

# --- Pencarian File Dinamis ---

# 1. Cari dan tambahkan semua file .md dari direktori spesifikasi
# --> PERBAIKAN DI SINI: Menghapus karakter yang membingungkan PowerShell
Write-Host "Mencari file spesifikasi .md di '$specDir'..."
$specFiles = Get-ChildItem -Path $specDir -Filter "*.md" -Recurse -File | Sort-Object FullName
foreach ($file in $specFiles) {
    Append-FileToContext -fileInfo $file
}

# 2. Cari dan tambahkan semua file .toml dari direktori perintah
# --> PERBAIKAN DI SINI: Menghapus karakter yang membingungkan PowerShell
Write-Host "Mencari file perintah .toml di '$commandsDir'..."
if (Test-Path $commandsDir) {
    $commandFiles = Get-ChildItem -Path $commandsDir -Filter "*.toml" -Recurse -File | Sort-Object FullName
    foreach ($file in $commandFiles) {
        Append-FileToContext -fileInfo $file
    }
}
else {
    Write-Host "   - Peringatan: Direktori perintah tidak ditemukan: $commandsDir" -ForegroundColor Yellow
}

# --- Selesai ---
Write-Host "Selesai! Konteks lengkap telah dibuat di file: $outputFile" -ForegroundColor Green
Write-Host "Sekarang Anda dapat menggunakan file ini sebagai konteks lengkap untuk AI."