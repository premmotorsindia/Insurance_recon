# Fix R01 for HDFC TPT (same-bank transfer) credits, in place.
#   "50200005917118-TPT-Victoris VXI WHITE-ORBIT AUTO WORLD PRIVATE LIMITED"  Ref 284166462
# The narration has no UTR, and the reference is 9 digits (extractUTR wanted 10+), so the
# UTR came out blank ("UTR n/a"). Now, for a -TPT- narration, the bank reference is used as
# the UTR; its last 6 digits (166462) match the receipt text "|RTGS/NEFT||166462||".
# Only PremBankRecHelper.extractUTR is touched; your other changes are kept.
# Run in PowerShell (as Administrator) on the dev box. A backup is written first.

$ErrorActionPreference = 'Stop'
$root   = "K:\AosService\PackagesLocalDirectory\ACX\ACX"
$helper = Join-Path $root "AxClass\PremBankRecHelper.xml"
if (-not (Test-Path $helper)) { throw "Not found: $helper" }

$tf = (Get-ChildItem "C:\Program Files*\Microsoft Visual Studio" -Recurse -Filter tf.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if ($tf) {
    $ErrorActionPreference = 'Continue'
    try { & $tf checkout $helper /noprompt 2>&1 | ForEach-Object { "$_" } | Out-Host } catch { Write-Host "tf checkout: $_" }
    $ErrorActionPreference = 'Stop'
}
Set-ItemProperty $helper -Name IsReadOnly -Value $false

$bytes = [IO.File]::ReadAllBytes($helper)
$bom   = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
$text  = [Text.Encoding]::UTF8.GetString($bytes)
if ($bom) { $text = $text.Substring(1) }
$nl    = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

if ($text.Contains("HDFC third party transfer (same bank)")) {
    Write-Host "Helper: TPT block already there - nothing to do." -ForegroundColor Yellow
    return
}

$m = [regex]::Match($text, '(?s)<Name>extractUTR</Name>.*?</Method>')
if (-not $m.Success) { throw "Method extractUTR not found in $helper" }
$anchor = "if (_referenceNo && strLen(_referenceNo) >= 10)"
$rel = $m.Value.IndexOf($anchor)
if ($rel -lt 0) { throw "Anchor not found inside extractUTR: $anchor" }
$at = $m.Index + $rel
$lineStart = $text.LastIndexOf("`n", $at - 1) + 1

$block = @'
        // HDFC third party transfer (same bank): "50200005917118-TPT-<remark>-<name>".
        // No UTR in the narration and the bank reference is only 9 digits (284166462), so
        // the reference is the key; the receipt carries its last 6 ("|RTGS/NEFT||166462||").
        if (_referenceNo
         && strLen(strKeep(_referenceNo, '0123456789')) >= 6
         && strScan(strUpr(_description), '-TPT-', 1, strLen(_description)) > 0)
        {
            return _referenceNo;
        }

'@
$block = ($block -replace "`r`n", "`n") -replace "`n", $nl

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $helper "$helper.$stamp.bak"
Write-Host "Backup: $helper.$stamp.bak" -ForegroundColor DarkGray

$text = $text.Insert($lineStart, $block)
try { [xml]$null = $text } catch { throw "XML check failed - file NOT written. $_" }
[IO.File]::WriteAllText($helper, $text, (New-Object System.Text.UTF8Encoding($bom)))
Write-Host "Helper: TPT block added to extractUTR." -ForegroundColor Green
Write-Host "Next: build ACX in Visual Studio, then Reclassify + Run Matching on the TPT lines."
