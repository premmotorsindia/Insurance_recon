# Fix R07 (outgoing NEFT / FT) in YOUR bank rec engine, in place.
#   1. PremBankRecHelper.extractRemittanceRemark  - reads the remark of an "FT - ..." narration
#   2. PremBankRecMatchingEngine                  - new method matchOutgoingByNameWindow, and a call to it
#      in matchOutgoingNEFT: a payment entered up to "Date tolerance (days)" before the bank date
#      is matched by beneficiary name + amount when exactly one entry fits.
# Your own changes in these files are kept: only the pieces above are inserted.
# Run in PowerShell (as Administrator) on the dev box. A backup of each file is written first.

$ErrorActionPreference = 'Stop'
$root   = "K:\AosService\PackagesLocalDirectory\ACX\ACX"
$engine = Join-Path $root "AxClass\PremBankRecMatchingEngine.xml"
$helper = Join-Path $root "AxClass\PremBankRecHelper.xml"
$params = Join-Path $root "AxTable\PremBankRecParameters.xml"

foreach ($f in @($engine, $helper)) { if (-not (Test-Path $f)) { throw "Not found: $f" } }

# --- TFVC: check the two files out so they are not read-only (ignored when not needed) ---
$tf = (Get-ChildItem "C:\Program Files*\Microsoft Visual Studio" -Recurse -Filter tf.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if ($tf) {
    $ErrorActionPreference = 'Continue'
    try { & $tf checkout $engine $helper /noprompt 2>&1 | ForEach-Object { "$_" } | Out-Host } catch { Write-Host "tf checkout: $_" }
    $ErrorActionPreference = 'Stop'
}
foreach ($f in @($engine, $helper)) { Set-ItemProperty $f -Name IsReadOnly -Value $false }

function Read-Xml([string]$path) {
    $bytes = [IO.File]::ReadAllBytes($path)
    $bom   = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    $text  = [Text.Encoding]::UTF8.GetString($bytes)
    if ($bom) { $text = $text.Substring(1) }
    $nl    = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    return @{ Text = $text; Bom = $bom; NL = $nl }
}
function Write-Xml([string]$path, $doc) {
    $enc = New-Object System.Text.UTF8Encoding($doc.Bom)
    [IO.File]::WriteAllText($path, $doc.Text, $enc)
}
function LineStart([string]$text, [int]$index) {
    $i = $text.LastIndexOf("`n", [Math]::Max($index - 1, 0))
    if ($i -lt 0) { return 0 } else { return $i + 1 }
}
function Fix-NL([string]$s, [string]$nl) { return ($s -replace "`r`n", "`n") -replace "`n", $nl }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item $engine "$engine.$stamp.bak"
Copy-Item $helper "$helper.$stamp.bak"
Write-Host "Backups: *.$stamp.bak" -ForegroundColor DarkGray

# --- Date tolerance field on the parameters table ---
$days = "3"
if (Test-Path $params) {
    $p = (Read-Xml $params).Text
    $field = $null
    foreach ($m in [regex]::Matches($p, '(?s)<AxTableField\b.*?</AxTableField>')) {
        $name  = [regex]::Match($m.Value, '<Name>([^<]+)</Name>').Groups[1].Value
        $label = [regex]::Match($m.Value, '<Label>([^<]+)</Label>').Groups[1].Value
        if ($label -match '(?i)date\s*tolerance' -or $name -match '(?i)datetol') { $field = $name; break }
    }
    if ($field) {
        $days = "(params.$field > 0 ? params.$field : 3)"
        Write-Host "Date tolerance field: $field" -ForegroundColor Green
    } else {
        Write-Host "Date tolerance field not found - using 3 days." -ForegroundColor Yellow
    }
}

# ===================== 1. Helper: FT remark =====================
$h = Read-Xml $helper
if ($h.Text.Contains("An HDFC fund transfer to another HDFC account")) {
    Write-Host "Helper: FT block already there - skipped." -ForegroundColor Yellow
} else {
    $anchor = "if (strScan(head, 'NEFT', 1, 5) != 1"
    $at = $h.Text.IndexOf($anchor)
    if ($at -lt 0) { throw "Helper: anchor not found in extractRemittanceRemark: $anchor" }
    $ft = @'
        // An HDFC fund transfer to another HDFC account has one field fewer:
        //
        //     FT -  VKASRV-2141719360 -  14709020452 - SHANTI DEVI KUMAWAT
        //
        // type - remark - account - beneficiary, so the remark is the SECOND field.
        if (strScan(head, 'FT ', 1, 3) == 1 || strScan(head, 'FT-', 1, 3) == 1)
        {
            len = strLen(_description);
            p1  = strScan(_description, '-', 1, len);
            p2  = p1 ? strScan(_description, sep, p1 + 1, len) : 0;

            return p2 > 0 ? strLRTrim(subStr(_description, p1 + 1, p2 - (p1 + 1))) : '';
        }

'@
    $ls = LineStart $h.Text $at
    $h.Text = $h.Text.Insert($ls, (Fix-NL $ft $h.NL))
    Write-Xml $helper $h
    Write-Host "Helper: FT block added." -ForegroundColor Green
}

# ===================== 2. Engine =====================
$e = Read-Xml $engine
if ($e.Text.Contains("matchOutgoingByNameWindow")) {
    Write-Host "Engine: matchOutgoingByNameWindow already there - skipped." -ForegroundColor Yellow
} else {
    # 2a. call in matchOutgoingNEFT, just before the "not matched" message
    $anchor = '_staging.markManual(strFmt("Outgoing NEFT to %1 (Amt: %2) not matched'
    $at = $e.Text.IndexOf($anchor)
    if ($at -lt 0) { throw "Engine: anchor not found in matchOutgoingNEFT: $anchor" }
    $call = @'
        // A payment is often entered a day or two before the bank sends it - entered on
        // 14-Nov, debited on 16-Nov. Nothing matched on the statement date, so the days
        // before it (Date tolerance on the parameters) are tried; only a single candidate
        // is accepted.
        if (this.matchOutgoingByNameWindow(_staging, beneUpper, txnDate - __DAYS__, txnDate - 1, allowSettled))
        {
            return;
        }

'@
    $call = $call.Replace("__DAYS__", $days)
    $ls = LineStart $e.Text $at
    $e.Text = $e.Text.Insert($ls, (Fix-NL $call $e.NL))

    # 2b. the new method, added before </Methods>
    $method = @'
			<Method>
				<Name>matchOutgoingByNameWindow</Name>
				<Source><![CDATA[
    // <summary>
    // Outgoing payment by beneficiary name and amount within a date range before the
    // statement date. Exactly one vendor or customer entry must fit; two or more go to
    // the manual queue rather than being matched to an arbitrary one.
    // </summary>
    private boolean matchOutgoingByNameWindow(
        PremBankStmtStaging _staging,
        str                 _beneUpper,
        TransDate           _fromDate,
        TransDate           _toDate,
        boolean             _allowSettled)
    {
        VendTrans   vendTrans;
        VendTable   vendTable;
        CustTrans   custTrans;
        CustTable   custTable;
        RefRecId    recId;
        str         voucher, account, partyName;
        boolean     isVendor;
        int         found;

        while select vendTrans
            join vendTable
            where vendTable.AccountNum == vendTrans.AccountNum
               && (vendTrans.AmountCur == _staging.Amount
                || vendTrans.AmountCur == -_staging.Amount)
               && vendTrans.TransDate  >= _fromDate
               && vendTrans.TransDate  <= _toDate
        {
            if (!_allowSettled && vendTrans.Closed != dateNull())
            {
                continue;
            }

            partyName = strUpr(vendTable.name());

            if (strScan(partyName, _beneUpper, 1, strLen(partyName)) > 0)
            {
                found++;
                recId    = vendTrans.RecId;
                voucher  = vendTrans.Voucher;
                account  = vendTrans.AccountNum;
                isVendor = true;
            }
        }

        while select custTrans
            join custTable
            where custTable.AccountNum == custTrans.AccountNum
               && (custTrans.AmountCur == _staging.Amount
                || custTrans.AmountCur == -_staging.Amount)
               && custTrans.TransDate  >= _fromDate
               && custTrans.TransDate  <= _toDate
        {
            if (!_allowSettled && custTrans.Closed != dateNull())
            {
                continue;
            }

            partyName = strUpr(custTable.name());

            if (strScan(partyName, _beneUpper, 1, strLen(partyName)) > 0)
            {
                found++;
                recId    = custTrans.RecId;
                voucher  = custTrans.Voucher;
                account  = custTrans.AccountNum;
                isVendor = false;
            }
        }

        if (found == 1)
        {
            this.reconcileMatch(_staging, recId,
                strFmt("%1 NEFT match (entered before the bank date): %2 - voucher %3",
                    isVendor ? "Vendor" : "Customer", account, voucher));
            this.writeBackBankReference(_staging, voucher);
            return true;
        }

        if (found > 1)
        {
            PremBankRecAuditLog::logEvent(_staging.RecId, "NEFT_NAME_AMBIGUOUS",
                strFmt("%1 entries of %2 for %3 between %4 and %5 - sent to manual review",
                    found, _staging.absAmount(), _beneUpper, _fromDate, _toDate));
        }

        return false;
    }

]]></Source>
			</Method>

'@
    $end = $e.Text.LastIndexOf("</Methods>")
    if ($end -lt 0) { throw "Engine: </Methods> not found" }
    $ls = LineStart $e.Text $end
    $e.Text = $e.Text.Insert($ls, (Fix-NL $method $e.NL))
    Write-Xml $engine $e
    Write-Host "Engine: call + method matchOutgoingByNameWindow added (window: $days days)." -ForegroundColor Green
}

# --- sanity check: both files still parse as XML ---
foreach ($f in @($engine, $helper)) { [xml](Get-Content $f -Raw) | Out-Null }
Write-Host "`nDone. Both files are valid XML. Next: Visual Studio > Build, then Reclassify + Run Matching." -ForegroundColor Cyan
Write-Host "To undo: copy the *.$stamp.bak files back over the originals." -ForegroundColor DarkGray
