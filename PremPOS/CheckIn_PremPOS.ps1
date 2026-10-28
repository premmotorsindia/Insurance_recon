# PremPOS / Bank rec check-in. Run in PowerShell on the dev box.
# Step 1 runs automatically and shows the pending changes; the check-in itself asks first.

$tf = (Get-ChildItem "C:\Program Files*\Microsoft Visual Studio" -Recurse -Filter tf.exe -ErrorAction SilentlyContinue |
       Select-Object -First 1).FullName
if (-not $tf) { Write-Host "tf.exe not found - use Visual Studio > Team Explorer > Pending Changes." -ForegroundColor Red; return }

$root  = "K:\AosService\PackagesLocalDirectory\ACX\ACX"
$new   = @("AxEnum\PremPOSProvider.xml")
$edits = @(
    "AxTable\PremPOSSettlementStaging.xml",
    "AxTable\PremPOSTerminalMap.xml",
    "AxForm\PremPOSTerminalMapForm.xml",
    "AxClass\PremPOSReconciliation.xml",
    "AxClass\PremBankRecMatchingEngine.xml",
    "AxClass\PremBankRecHelper.xml",
    "AxEdt\PremTerminalId.xml"
)

$all     = ($new + $edits) | ForEach-Object { Join-Path $root $_ }
$missing = $all | Where-Object { -not (Test-Path $_) }
if ($missing) { Write-Host "These files are not on K:\ - copy them first:" -ForegroundColor Red; $missing; return }

Set-Location $root

# 1) New object -> add (an "already has pending changes / already exists" message is fine)
& $tf add ($new | ForEach-Object { Join-Path $root $_ }) /noprompt

# 2) Changed objects -> pending edit
& $tf checkout ($edits | ForEach-Object { Join-Path $root $_ }) /noprompt

# 3) Show what will go in
Write-Host "`n===== Pending changes =====" -ForegroundColor Cyan
& $tf status $all /format:brief

# 4) Check in after confirmation
$answer = Read-Host "`nCheck in these files now? (Y/N)"
if ($answer -eq 'Y') {
    & $tf checkin $all /comment:"PremPOS: PhonePe/MobiKwik/PayZapp/HDFC cards import, bank rec settlement, MSF journal fix, Dr/Cr split lines" /noprompt
}
else {
    Write-Host "Not checked in. Use Visual Studio > Pending Changes when ready."
}
