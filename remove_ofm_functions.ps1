# Script pour supprimer toutes les fonctions OFM du dashboard
$filePath = "c:\\Users\\tiagi\\Desktop\\synagency\\syna dev test\\dashboard.html"

# Lire toutes les lignes
$lines = Get-Content $filePath

Write-Host "Fichier original: $($lines.Count) lignes"
Write-Host "Suppression des lignes 5714 à 8268 (fonctions OFM)..."

# Garder les lignes avant 5714 et après 8268
$newLines = @()
$newLines += $lines[0..5713]  # Lignes 1 à 5714 (index 0 à 5713)
$newLines += $lines[8268..($lines.Count-1)]  # Lignes 8269 à la fin

Write-Host "Nouveau fichier: $($newLines.Count) lignes"

# Écrire le nouveau contenu
$newLines | Out-File -FilePath $filePath -Encoding UTF8

Write-Host "Suppression terminée !"
Write-Host "Lignes supprimées: $(5714 + $lines.Count - 8268) lignes"
