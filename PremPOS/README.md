# PremPOS – PhonePe / MobiKwik / PayZapp in POS reconciliation

The existing PineLabs POS import (`PremPOSReconciliation`) now also reads PhonePe (.csv),
MobiKwik (.xlsx) and PayZapp (.xlsx) settlement files. The format is recognised from the
header row, so the same menu item **Import POS settlement** takes all four files.

| Header found | Provider | Terminal ID (map key) | UTR / RRN | MSF / GST | Settlement date |
|---|---|---|---|---|---|
| TERMINAL NUMBER + DOMESTIC AMT | PineLabs (unchanged) | TID | ARN NO | file | SETTLE DATE |
| PhonePe Reference Id | PhonePe | Terminal Id | Transaction UTR | none (0) | Transaction date + 1 |
| Smid + Utr Number | MobiKwik | Smid | Utr Number | none (0) | Payout Date (rows with Payout Batch = NA are skipped) |
| External MID + MSF Amount | PayZapp | External TID | Txn ref no. (RRN) | MSF, CGST/SGST/IGST/UTGST | Settlement Date |

Rows land in `PremPOSSettlementStaging` exactly like PineLabs rows (Sale / Refund), with
`BankAccountId` from `PremPOSTerminalMap`, so the bank rec engine (bank Dr + MSF Dr = POS Cr)
and the MSF+GST journal work unchanged. New staging fields: `Provider`, `UTRNumber`.

Skipped rows: PayZapp payout summary / PAN / GST footer, PhonePe status ≠ COMPLETED,
MobiKwik state ≠ Success, MobiKwik rows without payout batch, rows already imported
(same provider + terminal + transaction reference) – so overlapping files can be uploaded again.

## Changed / new objects (check-in list)

| Object | Type | Change |
|---|---|---|
| `AxEnum\PremPOSProvider.xml` | Enum | **New** – PineLabs, PhonePe, MobiKwik, PayZapp |
| `AxTable\PremPOSSettlementStaging.xml` | Table | Fields `Provider`, `UTRNumber`; indexes `Idx_ProviderRef`, `Idx_UTR` |
| `AxClass\PremPOSReconciliation.xml` | Class | Header detection, CSV load, `processProviderRow`, zero-MSF terminals skipped in MSF journal, dialog accepts .xlsx/.csv |
| `AxTable\PremPOSTerminalMap.xml` | Table | Field `ClearingBankAccount` (+ relation to BankAccountTable); methods `findByMerchantId`, `posCreditAccountType`, `posCreditLedgerDimension`, `initPOSCreditLine` |
| `AxForm\PremPOSTerminalMapForm.xml` | Form | `Clearing bank account` on the Accounting group |

Copy the three files over the same objects in the model that holds PremPOS
(`K:\AosService\PackagesLocalDirectory\ACX\ACX\Ax...`), build, then **DB sync** (new fields).

## Before the first import

1. EDT `PremTerminalId` must be at least **25** characters (PhonePe Terminal Id, e.g. `MST2307071545098946089530`).
2. Add the terminals of `POS_TerminalMapping_UPI.csv` in **POS terminal mapping** (outlet, settlement bank, POS receivable / clearing, MSF expense) – same as PineLabs.
3. The bank rec engine matches POS rows to bank lines; to match on UTR it must read the new `UTRNumber` field.

## Clearing bank account (option B)

PhonePe, MobiKwik and PayZapp collections sit in their own bank accounts in Cash and bank
management. Set that bank account as **Clearing bank account** on the terminal mapping; the
settlement entry then becomes

    Settlement bank (HDFC)   Dr  net
    MSF expense              Dr  MSF
    GST input                Dr  GST
    Clearing bank (PhonePe)  Cr  gross   <- bank line, not a ledger line

The bank rec engine builds this entry. Where it fills the POS credit line from
`POSReceivableAccount`, replace those lines with one call:

    terminalMap.initPOSCreditLine(journalTrans);

Terminals without a clearing bank (PineLabs) keep posting to `POSReceivableAccount`, so the
change is safe for them. Find the engine class with:

    Select-String -Path "K:\AosService\PackagesLocalDirectory\ACX\ACX\AxClass\*.xml" -Pattern "POSReceivableAccount|getReceivableAccount" | Select-Object Path -Unique
