const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/f999d0c5-0ad9-4010-9b21-404c6e9fc1e6_8852da5e-ace6-4c39-81a1-de80093e37cf/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "deck.pptx";

const THEME = {
  name: "Bank Rec",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2B2C", lt1: "FFFFFF", dk2: "0F3D3E", lt2: "EAF2F1",
    accent1: "0F3D3E",   // deep teal
    accent2: "F2A541",   // amber
    accent3: "2A7F62",   // reconciled green
    accent4: "C8553D",   // manual red
    accent5: "5B7F80",   // muted teal
    accent6: "D9E6E4",   // pale teal
    hlink: "0F6E70", folHlink: "5B7F80",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Bank Reconciliation - User Manual";
pres.author = "D365 F&O";
const C = pres.SchemeColor;

// ---------- layouts ----------
pres.defineSlideMaster({
  title: "TITLE",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.55, w: 6.6, h: 1.2, fontSize: 44, bold: true, align: "left", color: C.background1, valign: "bottom", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.9, w: 6.6, h: 1.0, fontSize: 18, align: "left", color: C.accent6, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SECTION",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 1.9, y: 2.0, w: 7.4, h: 0.9, fontSize: 40, bold: true, align: "left", color: C.background1, valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 1.9, y: 2.9, w: 7.4, h: 0.7, fontSize: 18, align: "left", color: C.accent6, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.0, h: 0.75, fontSize: 32, bold: true, align: "left", color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "Bank Reconciliation  |  User manual", options: { x: 0.5, y: 5.22, w: 6, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});

// ---------- helpers ----------
function content(title, section) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}
function circle(s, x, y, d, label, fill, color, size) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill }, objectName: "Badge " + label });
  s.addText(String(label), { x, y, w: d, h: d, fontSize: size || 16, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true });
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || C.background2 }, line: { color: fill || C.background2 } });
}
function text(s, t, o) {
  s.addText(t, Object.assign({ isTextBox: true, margin: 0, valign: "top", color: C.text1, fontSize: 14 }, o));
}
function bullets(items, o) {
  return items.map((it, i) => ({ text: it, options: Object.assign({ bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 }, o || {}) }));
}
function table(s, rows, o) {
  const head = rows[0].map(h => ({ text: h, options: { bold: true, color: C.background1, fill: { color: C.text2 }, fontSize: o.headSize || 12 } }));
  const body = rows.slice(1).map((r, ri) => r.map((c, ci) => ({
    text: c,
    options: { fontSize: o.size || 12, color: C.text1, fill: { color: ri % 2 ? C.background1 : C.background2 }, bold: !!(o.boldFirst && ci === 0) },
  })));
  s.addTable([head].concat(body), {
    x: o.x, y: o.y, w: o.w, colW: o.colW, border: { type: "solid", pt: 0.5, color: HEX.accent6 },
    margin: [0.05, 0.08, 0.05, 0.08], valign: "middle", autoPage: false, rowH: o.rowH,
  });
}

// ===================================================================
// 1. Title
pres.addSection({ title: "Introduction" });
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Introduction" });
  s.addText("Bank Reconciliation", { placeholder: "title" });
  s.addText("User manual - D365 Finance and Operations\nBank statement, POS settlements and journals", { placeholder: "body" });
  // motif: three linked circles = statement -> matching -> journal
  const labels = [["1", "Statement"], ["2", "Matching"], ["3", "Journal"]];
  labels.forEach((l, i) => {
    const y = 0.95 + i * 1.3;
    circle(s, 7.85, y, 0.95, l[0], i === 1 ? C.accent2 : C.accent5, i === 1 ? C.text2 : C.background1, 24);
    text(s, l[1], { x: 7.45, y: y + 0.98, w: 1.75, h: 0.28, fontSize: 12, color: C.accent6, align: "center" });
  });
  s.addNotes("User manual for the custom bank reconciliation module: importing POS settlement files and bank statements, running the matching engine, working the manual queue and checking journals.");
}

// 2. Process on one page
{
  const s = content("The whole process on one page", "Introduction");
  const steps = [
    ["Setup", "Parameters, POS terminal mapping, account mapping (one time)"],
    ["Import POS files", "PhonePe, MobiKwik, PayZapp, HDFC cards, Pine Labs"],
    ["Import statement", "Bank statement lines land in the workspace"],
    ["Run matching", "Each line is classified and matched; journals posted"],
    ["Manual queue", "Read the reason, fix, Reclassify, run again"],
    ["Check journals", "Post the journals left for review"],
  ];
  const w = 1.42, gap = 0.1, y = 1.45;
  steps.forEach((st, i) => {
    const x = 0.5 + i * (w + gap);
    card(s, x, y, w, 3.25, i === 0 ? C.accent6 : C.background2);
    circle(s, x + (w - 0.62) / 2, y + 0.22, 0.62, i + 1, i === 3 ? C.accent2 : C.text2, i === 3 ? C.text2 : C.background1, 18);
    text(s, st[0], { x: x + 0.1, y: y + 1.0, w: w - 0.2, h: 0.55, fontSize: 14, bold: true, color: C.text2, align: "center" });
    text(s, st[1], { x: x + 0.12, y: y + 1.6, w: w - 0.24, h: 1.5, fontSize: 12, align: "center" });
  });
  text(s, "Steps 2 to 6 are the daily routine. Step 1 is done once and changed only when a terminal or account changes.", { x: 0.5, y: 4.8, w: 9, h: 0.3, fontSize: 12, color: C.accent5, italic: true });
}

// 3. Where to find it
{
  const s = content("Where to find it", "Introduction");
  card(s, 0.5, 1.3, 2.6, 3.6, C.text2);
  text(s, "Cash and bank management", { x: 0.7, y: 1.55, w: 2.2, h: 0.6, fontSize: 16, bold: true, color: C.background1 });
  text(s, ">  Pm Customisation", { x: 0.7, y: 2.2, w: 2.2, h: 0.4, fontSize: 16, bold: true, color: C.accent2 });
  text(s, "Every screen of the module sits under this menu.", { x: 0.7, y: 2.85, w: 2.2, h: 1.2, fontSize: 14, color: C.accent6 });
  table(s, [
    ["Menu item", "What it is for"],
    ["Bank Reconciliation Workspace", "Import statement, Run matching, review lines, Reclassify, Unmatch, Exclude"],
    ["Import POS settlement", "Upload PhonePe, MobiKwik, PayZapp, HDFC card and Pine Labs files"],
    ["POS Terminal Mapping", "Each terminal: outlet, clearing bank, ledgers"],
    ["POS account mapping", "MSF and GST input accounts for every bank account at once"],
    ["POS Charge Journal", "Pine Labs terminal rental and service charges"],
    ["Bank reconciliation parameters", "Journal names, tolerance, account mapping grid"],
  ], { x: 3.35, y: 1.3, w: 6.15, colW: [2.25, 3.9], size: 12, boldFirst: true, rowH: 0.5 });
}

// ===================================================================
// Section A
pres.addSection({ title: "One-time setup" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "One-time setup" });
  circle(s, 0.75, 2.05, 0.85, "A", C.accent2, C.text2, 28);
  s.addText("One-time setup", { placeholder: "title" });
  s.addText("Parameters, terminal mapping and the masters matching relies on", { placeholder: "body" });
}

// 5. Parameters
{
  const s = content("Bank reconciliation parameters", "One-time setup");
  const cards = [
    ["Journal names", ["Bank journal: settlements, transfers, receipts", "MSF journal: Pine Labs MSF and GST", "Customer payment journal: insurance receipts, advances"]],
    ["Matching", ["Amount tolerance: allowed difference between bank and file (default 1.00)", "Default bank account: used by the Pine Labs MSF journal"]],
    ["Account mapping grid", ["One row per component: MSF expense, CGST / SGST / IGST input", "PMJPL intercompany, trade advance, loan, interest, GST payment", "A row can be for one bank account, one site, or all"]],
  ];
  cards.forEach((c, i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.3, 2.85, 3.3);
    circle(s, x + 0.2, 1.48, 0.5, i + 1, C.text2, C.background1, 14);
    text(s, c[0], { x: x + 0.82, y: 1.5, w: 1.9, h: 0.5, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
    s.addText(bullets(c[1], { fontSize: 13, color: C.text1 }), { x: x + 0.2, y: 2.15, w: 2.5, h: 2.35, isTextBox: true, margin: 0, valign: "top" });
  });
  text(s, "Tip: POS account mapping writes the MSF and GST rows into the grid for every bank account in one step.", { x: 0.5, y: 4.75, w: 9, h: 0.35, fontSize: 12, color: C.accent5, italic: true });
}

// 6. POS terminal mapping fields
{
  const s = content("POS terminal mapping: key fields", "One-time setup");
  table(s, [
    ["Field", "What to enter"],
    ["Terminal ID", "Exactly as in the provider file (PhonePe IDs are 25 characters)"],
    ["Merchant code", "The code the bank prints in the narration, e.g. CZL057"],
    ["Outlet code", "Outlet where the terminal stands (mandatory)"],
    ["Settlement bank account", "The provider's clearing bank account"],
    ["Card clearing bank account", "Only for HDFC card sales, e.g. HDFCCC5144"],
    ["POS receivable account", "Mandatory ledger account"],
    ["MSF expense account", "Ledger the MSF is charged to"],
    ["Active, Valid from / to", "Today's date must fall inside the window"],
  ], { x: 0.5, y: 1.3, w: 5.75, colW: [2.15, 3.6], size: 12, boldFirst: true, rowH: 0.4 });
  card(s, 6.55, 1.3, 2.95, 3.6, C.accent2);
  text(s, "Most common mistake", { x: 6.8, y: 1.5, w: 2.5, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  text(s, "Settlement bank account is the provider's clearing bank (PINELCC968, PAYZAP1642, the PhonePe bank).\n\nNever the HDFC bank whose statement you reconcile: the entry would debit and credit the same bank.", { x: 6.8, y: 2.0, w: 2.5, h: 2.8, fontSize: 14, color: C.text2 });
}

// 7. Per provider
{
  const s = content("What to enter for each provider", "One-time setup");
  table(s, [
    ["Provider", "Terminal ID", "Merchant code", "Settlement bank", "Card clearing bank"],
    ["Pine Labs", "TID, e.g. 41959954", "As today", "Pine Labs bank (PINELCC968)", "-"],
    ["PhonePe", "Terminal Id (MST...)", "PREMMOTORSVKI", "PhonePe clearing bank", "-"],
    ["MobiKwik", "SMBKM28661", "MBKM329926", "MobiKwik clearing bank", "-"],
    ["PayZapp", "62760938 / 63075144", "CZL057 / DIU698", "PayZapp bank (PAYZAP...)", "-"],
    ["HDFC cards", "Same line: 63075144", "DIU698", "Same line", "HDFCCC5144"],
  ], { x: 0.5, y: 1.3, w: 9.0, colW: [1.35, 1.95, 1.7, 2.3, 1.7], size: 12, boldFirst: true, rowH: 0.48 });
  card(s, 0.5, 4.35, 9.0, 0.65, C.accent6);
  text(s, "HDFC card sales use the same terminal line as PayZapp. The engine reads the narration: UPI credits clear the Settlement bank, card credits clear the Card clearing bank.", { x: 0.7, y: 4.42, w: 8.6, h: 0.52, fontSize: 12, color: C.text2, valign: "middle" });
}

// 8. Other masters
{
  const s = content("Other masters the matching relies on", "One-time setup");
  const items = [
    ["Own bank account numbers", "Transfers between our accounts (A2A) are matched by the account number in the narration. Each number must exist once, without spaces, in the same company."],
    ["IFSC map", "Bank-to-bank lines that carry an IFSC instead of an account number are matched through this map."],
    ["Insurance customer map", "Insurer keyword in the narration, e.g. TATA AIG, points to the customer account."],
    ["Advance customer on bank account", "Set Advance-from-customer account on the bank account for customer advances."],
  ];
  items.forEach((it, i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.3 + Math.floor(i / 2) * 1.85;
    card(s, x, y, 4.4, 1.65);
    circle(s, x + 0.2, y + 0.2, 0.5, i + 1, C.text2, C.background1, 14);
    text(s, it[0], { x: x + 0.85, y: y + 0.22, w: 3.4, h: 0.45, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
    text(s, it[1], { x: x + 0.85, y: y + 0.72, w: 3.4, h: 0.85, fontSize: 12 });
  });
}

// ===================================================================
// Section B
pres.addSection({ title: "Daily process" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "Daily process" });
  circle(s, 0.75, 2.05, 0.85, "B", C.accent2, C.text2, 28);
  s.addText("Daily process", { placeholder: "title" });
  s.addText("Import files, import the statement, run matching, clear the queue", { placeholder: "body" });
}

// 10. Import POS files
{
  const s = content("Step 1: import POS settlement files", "Daily process");
  card(s, 0.5, 1.3, 3.0, 3.6);
  circle(s, 0.7, 1.5, 0.55, 1, C.accent2, C.text2, 16);
  text(s, "How to import", { x: 1.4, y: 1.52, w: 2.0, h: 0.5, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  s.addText(bullets([
    "Pm Customisation > Import POS settlement",
    "Choose the file (.xlsx or .csv) and press OK",
    "The provider is recognised from the header row",
    "Read the summary: rows imported, skipped, unmapped terminals",
  ], { fontSize: 13, color: C.text1 }), { x: 0.7, y: 2.2, w: 2.65, h: 2.6, isTextBox: true, margin: 0, valign: "top" });
  table(s, [
    ["File", "Recognised by", "Rows taken"],
    ["Pine Labs (.xlsx)", "TERMINAL NUMBER", "All rows"],
    ["PhonePe (.csv)", "PhonePe Reference Id", "COMPLETED"],
    ["MobiKwik (.xlsx)", "Smid + Utr Number", "Success, with payout batch"],
    ["PayZapp (.xlsx)", "External MID + MSF Amount", "Credit rows; summary skipped"],
    ["HDFC report (.xlsx)", "Mintoak Transaction ID", "Payment Type = Cards, SaleSuccess"],
  ], { x: 3.75, y: 1.3, w: 5.75, colW: [1.6, 2.0, 2.15], size: 12, boldFirst: true, rowH: 0.5 });
  text(s, "Importing the same file again is safe: rows already imported are skipped.", { x: 3.75, y: 4.55, w: 5.75, h: 0.35, fontSize: 12, color: C.accent5, italic: true });
}

// 11. Import statement
{
  const s = content("Step 2: import the bank statement", "Daily process");
  s.addText(bullets([
    "Open the Bank Reconciliation Workspace",
    "Press Import Statement, pick the bank account and the file",
    "Each line gets a match rule automatically (R01, R02 ...)",
  ], { fontSize: 15, color: C.text1 }), { x: 0.5, y: 1.3, w: 9.0, h: 1.2, isTextBox: true, margin: 0, valign: "top" });
  text(s, "A line moves through these statuses", { x: 0.5, y: 2.65, w: 9, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
  const st = [["Pending", C.accent6, C.text2], ["Classified", C.accent5, C.background1], ["Reconciled", C.accent3, C.background1], ["Manual review", C.accent4, C.background1]];
  const pos = [[0.5, 3.25], [2.75, 3.25], [5.6, 2.95], [5.6, 3.95]];
  st.forEach((v, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: pos[i][0], y: pos[i][1], w: 2.0, h: 0.6, rectRadius: 0.3, fill: { color: v[1] }, line: { color: v[1] } });
    text(s, v[0], { x: pos[i][0], y: pos[i][1], w: 2.0, h: 0.6, fontSize: 15, bold: true, color: v[2], align: "center", valign: "middle" });
  });
  s.addShape(pres.shapes.LINE, { x: 2.5, y: 3.55, w: 0.25, h: 0, line: { color: HEX.accent5, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.LINE, { x: 4.75, y: 3.25, w: 0.85, h: 0.15, flipV: true, line: { color: HEX.accent5, width: 2, endArrowType: "triangle" } });
  s.addShape(pres.shapes.LINE, { x: 4.75, y: 3.7, w: 0.85, h: 0.55, line: { color: HEX.accent5, width: 2, endArrowType: "triangle" } });
  text(s, "matched, journal\nposted or linked", { x: 7.8, y: 2.95, w: 1.7, h: 0.6, fontSize: 12, color: C.accent5, valign: "middle" });
  text(s, "the Reason / note\nsays what is missing", { x: 7.8, y: 3.95, w: 1.7, h: 0.6, fontSize: 12, color: C.accent5, valign: "middle" });
}

// 12. Run matching
{
  const s = content("Step 3: run matching", "Daily process");
  const fields = [
    ["Bank account", "The account whose lines you reconcile"],
    ["From / To date", "Optional; blank means no limit"],
    ["Include POS reconciliation", "Raises the Pine Labs MSF + GST journal per settlement date"],
    ["Reconciliation method", "Custom engine only, or also the standard statement"],
  ];
  fields.forEach((f, i) => {
    const y = 1.35 + i * 0.85;
    circle(s, 0.5, y, 0.55, i + 1, C.text2, C.background1, 15);
    text(s, f[0], { x: 1.25, y: y - 0.02, w: 4.0, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    text(s, f[1], { x: 1.25, y: y + 0.3, w: 4.0, h: 0.32, fontSize: 13 });
  });
  card(s, 5.6, 1.3, 3.9, 3.6, C.background2);
  text(s, "What you get", { x: 5.85, y: 1.5, w: 3.4, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  s.addText(bullets([
    "Matching engine completed message with the counts",
    "Reconciled lines carry the journal number",
    "Every other line goes to Manual review with a reason",
    "Running it again only touches lines not yet reconciled",
  ], { fontSize: 13, color: C.text1 }), { x: 5.85, y: 2.0, w: 3.45, h: 2.8, isTextBox: true, margin: 0, valign: "top" });
}

// 13. Rules
{
  const s = content("How each line is matched", "Daily process");
  table(s, [
    ["Rule", "Bank line", "Matched against"],
    ["R01 UTR credit", "NEFT / RTGS / IMPS in", "D365 receipt with the same UTR (last 6 digits)"],
    ["R02 POS settlement", "Card / UPI settlement", "Imported POS rows (next slide)"],
    ["R03 / R05 Cheques", "Cheque paid / deposited", "Cheque number on the payment or receipt"],
    ["R04 Cash deposit", "Cash deposit by branch", "That branch's cash entry on the day"],
    ["R06 Bank to bank", "A2A / own transfer", "Our account number in the narration, or IFSC map"],
    ["R07 NEFT debit", "Outgoing payment", "Vendor code or remark in the narration"],
    ["R10 Insurance receipt", "Credit from an insurer", "Insurance customer map"],
    ["R13 / R14 / R20", "Charges, advances, PMJPL", "Account mapping grid / bank account setup"],
  ], { x: 0.5, y: 1.3, w: 9.0, colW: [2.0, 2.6, 4.4], size: 12, boldFirst: true, rowH: 0.4 });
}

// 14. POS settlements
{
  const s = content("POS settlements: credit and entry", "Daily process");
  table(s, [
    ["Bank narration", "Provider", "Entry"],
    ["41959954TERMINAL 1 CARDS SETTL.", "Pine Labs", "HDFC Dr / Pine Labs bank Cr (MSF in MSF journal)"],
    ["UPI SETTLEMENT -CZL057- 03/10/26", "PayZapp", "HDFC Dr net, MSF Dr, GST Dr / PayZapp bank Cr gross"],
    ["63075144TERMINAL 1 CARDS SETTL. 04/10/26", "HDFC cards", "HDFC Dr, MSF Dr (difference) / HDFCCC5144 Cr gross"],
    ["NEFT Cr-...-PhonePe Limited-...", "PhonePe", "HDFC Dr / PhonePe bank Cr (all terminals of the day)"],
    ["NEFT Cr-...-ONE MOBIKWIK SYSTEMS...", "MobiKwik", "HDFC Dr / MobiKwik bank Cr"],
  ], { x: 0.5, y: 1.3, w: 9.0, colW: [3.4, 1.3, 4.3], size: 12, rowH: 0.5 });
  card(s, 0.5, 4.4, 9.0, 0.6, C.accent6);
  text(s, "Credits arrive the next day. Import the provider file for the sale day before you run matching, or the line waits in the queue.", { x: 0.7, y: 4.45, w: 8.6, h: 0.5, fontSize: 12, color: C.text2, valign: "middle" });
}

// 15. Manual queue
{
  const s = content("Step 4: work the manual review queue", "Daily process");
  const loop = [["Read", "Filter Status = Manual review and read Reason / note"], ["Fix", "Mapping, missing receipt or missing file"], ["Reclassify", "Select the line and press Reclassify"], ["Run again", "Press Run Matching"]];
  loop.forEach((l, i) => {
    const y = 1.3 + i * 0.9;
    circle(s, 0.5, y, 0.62, i + 1, i === 1 ? C.accent2 : C.text2, i === 1 ? C.text2 : C.background1, 16);
    text(s, l[0], { x: 1.3, y: y, w: 3.6, h: 0.32, fontSize: 15, bold: true, color: C.text2 });
    text(s, l[1], { x: 1.3, y: y + 0.32, w: 3.6, h: 0.32, fontSize: 13 });
  });
  card(s, 5.4, 1.3, 4.1, 3.6);
  text(s, "Workspace buttons", { x: 5.65, y: 1.5, w: 3.6, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  const btn = [["Reclassify", "Re-read the rule after setup changed"], ["Unmatch", "Undo a wrong match"], ["Exclude", "Line that is not to be reconciled"]];
  btn.forEach((b, i) => {
    const y = 2.1 + i * 0.9;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.65, y, w: 1.35, h: 0.45, rectRadius: 0.08, fill: { color: C.text2 }, line: { color: C.text2 } });
    text(s, b[0], { x: 5.65, y, w: 1.35, h: 0.45, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle" });
    text(s, b[1], { x: 7.15, y: y - 0.02, w: 2.2, h: 0.5, fontSize: 13, valign: "middle" });
  });
}

// 16. Messages: POS
{
  const s = content("Messages: POS settlements", "Daily process");
  table(s, [
    ["Message on the line", "What to do"],
    ["Could not read a POS terminal, batch or merchant code", "Enter the Merchant code (e.g. CZL057) on POS terminal mapping"],
    ["MSF or GST input account is missing", "MSF expense on the terminal; CGST / SGST / IGST input rows in the account mapping grid"],
    ["No unreconciled settlement rows add up to ...", "Import the provider file for that day; check the terminal ID"],
    ["HDFC cards: the difference is not an MSF", "Import the HDFC report for the missing day"],
    ["Terminal has no settlement bank account", "Set the provider's clearing bank on the terminal"],
  ], { x: 0.5, y: 1.3, w: 9.0, colW: [4.0, 5.0], size: 12, rowH: 0.6 });
}

// 17. Messages: bank lines
{
  const s = content("Messages: other bank lines", "Daily process");
  table(s, [
    ["Message on the line", "What to do"],
    ["Transfer could not be tied to another of our bank accounts", "The account number must exist once, without spaces, in this company"],
    ["UTR ... not found in D365", "Post the receipt with the UTR in its reference"],
    ["Cash deposit ... no entry for that branch on that day", "Post the branch cash deposit voucher, or check its date"],
    ["No account mapped for purpose 'PMJPL intercompany'", "Add that component to the account mapping grid"],
    ["No advance customer configured on bank account", "Set Advance-from-customer account on the bank account"],
  ], { x: 0.5, y: 1.3, w: 9.0, colW: [4.2, 4.8], size: 12, rowH: 0.6 });
}

// 18. Journals
{
  const s = content("Journals created by the engine", "Daily process");
  const cols = [
    ["Where to find them", C.background2, ["General ledger > Journal entries > General journals", "The journal number is on the reconciled line"]],
    ["Posted automatically", C.background2, ["POS settlements, bank receipts, inter-bank transfers", "Bank expenses, customer payments, reversals", "Pine Labs MSF journal"]],
    ["Left for review", C.accent6, ["PMJPL / mapped account entries", "Customer advances", "Check and post them yourself"]],
  ];
  cols.forEach((c, i) => {
    const x = 0.5 + i * 3.05;
    card(s, x, 1.3, 2.85, 2.75, c[1]);
    text(s, c[0], { x: x + 0.2, y: 1.45, w: 2.45, h: 0.45, fontSize: 16, bold: true, color: C.text2 });
    s.addText(bullets(c[2], { fontSize: 13, color: C.text1 }), { x: x + 0.2, y: 2.0, w: 2.5, h: 1.95, isTextBox: true, margin: 0, valign: "top" });
  });
  card(s, 0.5, 4.25, 9.0, 0.75, C.text2);
  text(s, "Every entry has a separate debit line and credit line in the same voucher. No offset account on one line.", { x: 0.7, y: 4.3, w: 8.6, h: 0.65, fontSize: 14, color: C.background1, valign: "middle" });
}

// 19. Daily checklist
pres.addSection({ title: "Wrap-up" });
{
  const s = content("Daily checklist", "Wrap-up");
  const items = [
    "Import yesterday's POS files: PhonePe, MobiKwik, PayZapp, HDFC report, Pine Labs",
    "Import the bank statement",
    "Run matching (tick Include POS reconciliation for the Pine Labs MSF)",
    "Clear the manual review queue: read, fix, Reclassify, run again",
    "Post the journals left for review (PMJPL, customer advances)",
    "PayZapp: each MID and day goes through one process only",
  ];
  items.forEach((t, i) => {
    const y = 1.3 + i * 0.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: y + 0.05, w: 0.38, h: 0.38, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: HEX.dk2, width: 1.5 } });
    text(s, String(i + 1), { x: 0.5, y: y + 0.05, w: 0.38, h: 0.38, fontSize: 13, bold: true, color: C.text2, align: "center", valign: "middle" });
    text(s, t, { x: 1.1, y: y + 0.05, w: 8.4, h: 0.4, fontSize: 15, valign: "middle" });
  });
}

// 20. Closing
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Wrap-up" });
  s.addText("Need help?", { placeholder: "title" });
  s.addText("Send the line's Reason / note and a screenshot of the workspace to the D365 team.", { placeholder: "body" });
  circle(s, 7.85, 1.9, 1.4, "?", C.accent2, C.text2, 48);
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
