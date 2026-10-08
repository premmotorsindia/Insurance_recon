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
| `AxClass\PremPOSReconciliation.xml` | Class | Header detection, CSV load, `processProviderRow`, zero-MSF terminals skipped in MSF journal, MSF journal limited to PineLabs rows, dialog accepts .xlsx/.csv |
| `AxClass\PremBankRecMatchingEngine.xml` | Class | R02: UPI providers get one settlement voucher (`createUPISettlementJournal`, `addUPISettlementLine`) |

Copy the three files over the same objects in the model that holds PremPOS
(`K:\AosService\PackagesLocalDirectory\ACX\ACX\Ax...`), build, then **DB sync** (new fields).

## Before the first import

1. EDT `PremTerminalId` must be at least **25** characters (PhonePe Terminal Id, e.g. `MST2307071545098946089530`).
2. Add the terminals of `POS_TerminalMapping_UPI.csv` in **POS terminal mapping** (outlet, settlement bank, POS receivable / clearing, MSF expense) – same as PineLabs.
3. The bank rec engine matches POS rows to bank lines; to match on UTR it must read the new `UTRNumber` field.

## How the bank rec engine settles these rows

`PremBankRecMatchingEngine.matchPOSSettlement` (rule R02) already posts a POS settlement as a
bank-to-bank transfer:

    Statement bank (HDFC)                      Dr  net
    Terminal's "Settlement bank account"       Cr  net   (the acquirer / clearing bank)

For PhonePe, MobiKwik and PayZapp the day goes into one voucher instead, so the clearing
bank is emptied by the gross the sales put into it:

    Statement bank (HDFC)          Dr  net (bank line)
    MSF expense                    Dr  MSF   (terminal's MSF expense account, else mapping grid)
    CGST + SGST / IGST input       Dr  GST   (mapping grid)
    Settlement bank (PAYZAP...)    Cr  net + MSF + GST

Those rows are stamped MSF posted, and `processMSFCharges` only raises PineLabs rows.

So on **POS terminal mapping** the *Settlement bank account* is the acquirer's own bank account
(PINELCC968 for PineLabs; the PhonePe / MobiKwik / PayZapp bank accounts for these), not HDFC.
No new field is needed.

A narration like `UPI SETTLEMENT -CZL057- 07/10/26` is resolved by
`terminalFromMerchantCode`: the token CZL057 is looked up in *Merchant code* of the terminal
mapping. The engine then sums `NetSettlement` of that terminal for the statement date.
