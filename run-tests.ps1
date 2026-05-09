#!/usr/bin/env pwsh
# Sequential test runner - works around vitest fork pool hanging on Windows
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot

$files = Get-ChildItem -Recurse -Filter "*.test.*" -Path "src/__tests__" | Sort-Object FullName
$total = $files.Count
$passed = 0; $failed = 0; $failedFiles = @()

Write-Host "`n Running $total test files sequentially...`n" -ForegroundColor Cyan

foreach ($f in $files) {
    $rel = $f.FullName.Replace("$PSScriptRoot\", '').Replace('\', '/')
    $output = & npx vitest run $rel --reporter=verbose 2>&1 | Out-String

    if ($output -match '(\d+) passed' -and $output -notmatch 'failed') {
        $count = $Matches[1]
        $passed++
        Write-Host " PASS " -NoNewline -ForegroundColor Green
        Write-Host "$rel ($count tests)"
    } else {
        $failed++
        $failedFiles += $rel
        Write-Host " FAIL " -NoNewline -ForegroundColor Red
        Write-Host "$rel"
        # Show failure details
        $output -split "`n" | Where-Object { $_ -match '(FAIL|Error|expected|AssertionError|×)' } | Select-Object -First 5 | ForEach-Object { Write-Host "       $_" -ForegroundColor Yellow }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Test Files: $passed passed, $failed failed (of $total)" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
if ($failedFiles.Count -gt 0) {
    Write-Host " Failed:" -ForegroundColor Red
    $failedFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
}
Write-Host "========================================`n" -ForegroundColor Cyan

exit $failed
