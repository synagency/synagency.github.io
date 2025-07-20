$content = Get-Content 'dashboard.html'
$beforeSection = $content[0..1578]
$afterSection = $content[1881..($content.Length-1)]
$newContent = $beforeSection + $afterSection
Set-Content 'dashboard.html' -Value $newContent
