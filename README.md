# Insurance card settlement reconciliation (D365 F&O model `PMINSREC`)

X++ model for Dynamics 365 Finance & Operations (10.0.40+). It uploads the insurance portal card
settlement files (ICICI / HDFC / HSBC), posts the card payment, and reconciles it against the
customer / fixed-vendor receipts.

```
Metadata/PMINSREC/Descriptor/PMINSREC.xml     model descriptor
Metadata/PMINSREC/PMINSREC/Ax*                AOT objects
```

Copy `Metadata/PMINSREC` into `PackagesLocalDirectory` (or map it into your VS solution), build the
model, and synchronise the database. The model references `ApplicationSuite` and its standard
dependencies.

## Flow

| Step | What happens |
|---|---|
| 1. Upload card file | **Insurance card settlement > Upload card file**, then choose the card bank and the `.xlsx` / `.csv` file. Columns are read by name using **Card file column mapping**. Lines already uploaded (same transaction ID) are skipped. |
| 2. Net rule | Lines are grouped by card bank and Request ID: net = DEBIT − CREDIT over all files uploaded so far. Net ≤ 0 is **Net zero – skipped**. Net > 0 becomes one grid line for the net amount, and its date and transaction ID come from the latest DEBIT line. A request with an ENDORSEMENT line goes to **Manual**. |
| 3. Classify | A Request ID starting with `N` is a new car. One starting with `R` or `S` is a renewal. The outlet code is mapped to a site through **Outlet site mapping**. |
| 4. Individual report | **Upload individual report** (new car or renewal). Every column is stored. Lines match on PROPOSALNO = Request ID and pick up the TC name (DLR_EXECUTIVE), IC name, registration number, chassis, engine number and FREE_INS. |
| 5. JV1 (immediately) | Created right after the upload: **Vendor payable Dr / Card bank Cr**. The posting date is the card transaction date. The journal name, vendor and bank come from **Posting setup** (card bank + new car/renewal + site). |
| 6. JV2 new car | Looks for a customer in the new car customer group (default `C000001`) where `CustTable.PMINSRECChassisNum` = chassis. An exact match wins; otherwise one unique "ends with" match is accepted. Posts **Customer Dr / Vendor payable Cr**. If no customer is found the status is **Customer not found**. |
| 7. JV2 renewal | Looks for an open credit on the fixed vendor whose text contains the registration number. Posts **Fixed vendor Dr (receipt amount)** + **Difference account Dr/Cr (card − receipt)** / **Vendor payable Cr (card amount)**. If no receipt is found the status is **Receipt not available**. |
| 8. Settle | Once JV2 is posted, the JV1 debit is settled against the JV2 credit on the vendor payable. For a renewal, the fixed vendor receipt is also settled against the JV2 debit. The status becomes **Completed**. |
| 9. Daily re-match | **Process / re-match** runs steps 5–8 again for every open line against the latest receipts and customers. |

With **Auto post and settle** on (Parameters), journals are created, posted and settled in one go.
With it off, journals are only created; the user posts them, and the next **Process / re-match**
continues with JV2 and the settlement.

A **Manual** line (endorsement, difference above the limit, or new card lines after JV1) is posted
only after **Release manual line**.

## Setup checklist

1. **Parameters**: auto post and settle, new car customer group (`C000001`), maximum difference (0 = no limit).
2. **Outlet site mapping**: 2009, 2051, 3792, … → site.
3. **Posting setup**: one row per card bank × new car/renewal × site:
   - JV1 and JV2 journal names (vendor invoice journal)
   - vendor payable account
   - card bank account
   - fixed vendor (renewal)
   - difference account type (Ledger / Customer / Vendor) and account
4. **Card file column mapping**: **Load ICICI / HSBC defaults** fills in the ICICI and HSBC columns. Add the HDFC columns once the HDFC file sample is available.
5. **New car customer chassis numbers**: maintain `PMINSRECChassisNum` on the new car customers.
6. **Security**: assign the role **Insurance card reconciliation clerk**.

## Reports

- **Insurance card settlement** grid: the card amount, insurance received amount, difference, TC name, status, JV1/JV2 journals and vouchers. It can be filtered and exported to Excel.
- **Outstanding / discount report**: filter by date range and optionally by card bank, then group by dealer executive (TC), card bank, site or insurance company. It shows the card amount, received amount, given discount and outstanding amount per group.

## Points to verify on the first build

- `CustTable.PMINSRECChassisNum` is added through a table extension. If a chassis field already exists on
  `CustTable`, change `PMINSRECProcessEngine.findCustomerByChassis` to use it.
- Settlement uses `VendTrans::settleTransaction(SpecTransExecutionContext, VendTransSettleTransactionParameters)`
  (10.0.40 API).
- JV2 contains customer lines (new car) and vendor-to-vendor lines (renewal). If the vendor invoice journal
  name does not allow them, set a general journal name as the JV2 journal name in the posting setup.
- The main menu entry is added by the extension `MainMenu.PMINSREC`.
