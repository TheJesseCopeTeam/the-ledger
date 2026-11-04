import React, { useState, useRef, useMemo } from "react";
import {
  Upload, FileText, AlertCircle, Trash2, Download, ChevronRight
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import * as XLSX from "xlsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const C = {
  paper: "#ffffff",
  paperSoft: "#f5f7fa",
  ink: "#1e293b",
  inkSoft: "#64748b",
  inkLine: "#e2e8f0",
  accent: "#0077c5",
  accentSoft: "#dbeafe",
  green: "#2ca01c",
  red: "#d13438",
  amber: "#e08e0b"
};

const uid = () => Math.random().toString(36).slice(2, 12);
const fmtMoney = (n) => {
  const v = +n || 0;
  return "$" + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y.slice(2)}`;
};
const fmtDateRange = (start, end) => {
  if (!start || !end) return "—";
  return `${fmtDate(start)} - ${fmtDate(end)}`;
};
const parseDate = (mdy) => {
  const [m, d, y] = mdy.split("/");
  const year = y.length === 2 ? "20" + y : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthYearLabel = (iso) => {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  return `${monthNames[parseInt(m) - 1]} ${y}`;
};

// ===== PDF extraction =====

async function extractPdfText(fileOrBlob) {
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rows = {};
    for (const it of content.items) {
      const y = Math.round(it.transform[5]);
      if (!rows[y]) rows[y] = [];
      rows[y].push(it);
    }
    const yKeys = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of yKeys) {
      const line = rows[y].sort((a, b) => a.transform[4] - b.transform[4])
        .map(it => it.str).join(" ");
      full += line + "\n";
    }
  }
  return full;
}

function isOwnerStatement(text) {
  return text.includes("Owner Statement") && /Ownerships:/i.test(text);
}

function parseStatementText(text) {
  const result = {
    property: null, dateStart: null, dateEnd: null,
    income: [], expenses: [], maintenance: [], distributions: [],
    beginningBalance: 0, endingBalance: 0,
    netIncome: 0, undeposited: 0
  };

  const pm = text.match(/Ownerships:\s*([^\n]+?)(?:\s*Date Range|\n)/);
  if (pm) result.property = pm[1].trim();

  const dm = text.match(/Date Range:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dm) {
    result.dateStart = parseDate(dm[1]);
    result.dateEnd = parseDate(dm[2]);
  }

  let m;

  // Income — 4101 Rental Income
  const incomeRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})[^\n]*?4101 Rental Income\s+([A-Za-z][A-Za-z\s\.\-']+?)\s+([\d,]+\.\d{2})/g;
  while ((m = incomeRe.exec(text)) !== null) {
    result.income.push({
      date: parseDate(m[1]),
      tenant: m[2].trim(),
      amount: parseFloat(m[3].replace(/,/g, ""))
    });
  }

  // Management fees — 5200
  const mgmtRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})[^\n]*?5200 Management fees\s+(.+?)\s+([\d,]+\.\d{2})/g;
  while ((m = mgmtRe.exec(text)) !== null) {
    result.expenses.push({
      date: parseDate(m[1]),
      description: m[2].trim(),
      amount: parseFloat(m[3].replace(/,/g, ""))
    });
  }

  // Maintenance / repairs — various account codes starting with 52, 53, 54, 55 that aren't 5200
  // Common: 5300 Repairs, 5301 Maintenance, 5400 Landscaping, etc.
  const maintRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})[^\n]*?(5[3-9]\d{2}|53\d{2}|6\d{3})\s+([A-Za-z][A-Za-z\s\/]+?)\s+(.+?)\s+([\d,]+\.\d{2})/g;
  while ((m = maintRe.exec(text)) !== null) {
    const acctLabel = m[3].trim();
    // Skip the mgmt fee pattern we already caught
    if (acctLabel.toLowerCase().includes("management")) continue;
    result.maintenance.push({
      date: parseDate(m[1]),
      accountCode: m[2],
      accountLabel: acctLabel,
      description: m[4].trim(),
      amount: parseFloat(m[5].replace(/,/g, ""))
    });
  }

  // Owner distributions — 3002
  const distRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})[^\n]*?3002 Owner Distribution\s+(.+?)\s+(-?[\d,]+\.?\d*)/g;
  while ((m = distRe.exec(text)) !== null) {
    result.distributions.push({
      date: parseDate(m[1]),
      comment: m[2].trim(),
      amount: Math.abs(parseFloat(m[3].replace(/,/g, "")))
    });
  }

  const begin = text.match(/Beginning Bank Balance\s+(-?[\d,]+\.\d{2})/);
  if (begin) result.beginningBalance = parseFloat(begin[1].replace(/,/g, ""));
  const end = text.match(/Ending Bank Balance\s+(-?[\d,]+\.\d{2})/);
  if (end) result.endingBalance = parseFloat(end[1].replace(/,/g, ""));
  const net = text.match(/Net Income\/Loss\s+(-?[\d,]+\.\d{2})/);
  if (net) result.netIncome = parseFloat(net[1].replace(/,/g, ""));
  const undep = text.match(/Less Undeposited Funds\s+(-?[\d,]+\.\d{2})/);
  if (undep) result.undeposited = parseFloat(undep[1].replace(/,/g, ""));

  return result;
}

// ===== Batch helpers =====

function summarizeBatch(parsedStatements) {
  const withActivity = parsedStatements.filter(p => p && p.property);
  const propertiesPaid = withActivity.filter(p => p.income.length > 0);
  const propertiesNoRent = withActivity.filter(p => p.income.length === 0);

  const totalRent = withActivity.reduce((s, p) => s + p.income.reduce((ss, i) => ss + i.amount, 0), 0);
  const totalMgmt = withActivity.reduce((s, p) => s + p.expenses.reduce((ss, e) => ss + e.amount, 0), 0);
  const totalMaint = withActivity.reduce((s, p) => s + p.maintenance.reduce((ss, e) => ss + e.amount, 0), 0);
  const totalDist = withActivity.reduce((s, p) => s + p.distributions.reduce((ss, d) => ss + d.amount, 0), 0);

  const dates = withActivity.map(p => p.dateStart).filter(Boolean).sort();
  const endDates = withActivity.map(p => p.dateEnd).filter(Boolean).sort();

  return {
    statementCount: withActivity.length,
    propertiesPaid,
    propertiesNoRent,
    totalRent,
    totalMgmt,
    totalMaint,
    totalDist,
    statementStart: dates[0] || null,
    statementEnd: endDates[endDates.length - 1] || null
  };
}

// ===== Excel export =====

// Build a single journal entry for ONE property.
// Structure:
//   CREDIT: Rental Income - [property]
//   DEBIT:  Owner Disbursement (cash sent to owner)
//   DEBIT:  Management Fees
//   DEBIT:  Maintenance / Utilities
//   DEBIT or CREDIT: NSE Clearing (for timing differences)
function buildPropertyJE(prop) {
  const DISBURSE = "Owner Disbursement";
  const INCOME = "Rental Income";
  const MGMT = "Management Fees";
  const MAINT = "Maintenance";
  const CLEARING = "NSE Clearing";

  const totalIncome = prop.income.reduce((s, i) => s + i.amount, 0);
  const totalMgmt = prop.expenses.reduce((s, e) => s + e.amount, 0);
  const totalMaint = prop.maintenance.reduce((s, e) => s + e.amount, 0);
  const totalDist = prop.distributions.reduce((s, d) => s + d.amount, 0);

  // No activity -> no JE
  if (totalIncome === 0 && totalMgmt === 0 && totalMaint === 0 && totalDist === 0) {
    return null;
  }

  const postDate = prop.dateEnd || new Date().toISOString().slice(0, 10);
  const tenants = [...new Set(prop.income.map(i => i.tenant).filter(Boolean))].join(", ");
  const memo = `NSE Statement ${fmtDateRange(prop.dateStart, prop.dateEnd)} — ${prop.property}${tenants ? ` (${tenants})` : ""}`;

  const lines = [];

  // DEBIT: Owner Disbursement (if any was sent)
  if (totalDist > 0) {
    lines.push({ date: postDate, memo, account: DISBURSE, debit: totalDist, credit: 0 });
  }

  // DEBIT: Management Fees
  if (totalMgmt > 0) {
    lines.push({ date: postDate, memo, account: MGMT, debit: totalMgmt, credit: 0 });
  }

  // DEBIT: Maintenance / Utilities
  for (const m of prop.maintenance) {
    lines.push({
      date: postDate,
      memo: `${memo} — ${m.accountLabel}: ${m.description}`,
      account: MAINT,
      debit: m.amount,
      credit: 0
    });
  }

  // Handle balancing — timing difference from undeposited funds
  const cashOut = totalDist + totalMgmt + totalMaint;
  const diff = totalIncome - cashOut;
  if (diff > 0) {
    // Rent came in, not all distributed - difference sits in clearing
    lines.push({ date: postDate, memo, account: CLEARING, debit: diff, credit: 0 });
  } else if (diff < 0) {
    // Distribution exceeded current rent - prior undeposited being released
    lines.push({ date: postDate, memo, account: CLEARING, debit: 0, credit: Math.abs(diff) });
  }

  // CREDIT: Rental Income (by property)
  if (totalIncome > 0) {
    lines.push({
      date: postDate,
      memo,
      account: `${INCOME} - ${prop.property}`,
      debit: 0,
      credit: totalIncome
    });
  }

  return { property: prop.property, dateStart: prop.dateStart, dateEnd: prop.dateEnd, memo, lines };
}

// Build an array of per-property JEs for every property with activity.
function buildAllPropertyJEs(statements) {
  const jes = [];
  let jeNumber = 1;
  for (const prop of statements) {
    const je = buildPropertyJE(prop);
    if (je) {
      je.jeNumber = `JE${String(jeNumber).padStart(3, "0")}`;
      jes.push(je);
      jeNumber++;
    }
  }
  return jes;
}

function downloadExcel(batch, summary) {
  const jes = buildAllPropertyJEs(batch.parsedData.statements);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Journal Entries — per property, QB-import ready
  // Columns match standard QB journal-entry CSV layout
  const jeRows = [
    ["Date", "JE #", "Memo", "Account", "Debit", "Credit", "Property"]
  ];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const je of jes) {
    for (const l of je.lines) {
      jeRows.push([
        l.date,
        je.jeNumber,
        l.memo,
        l.account,
        l.debit || "",
        l.credit || "",
        je.property
      ]);
      totalDebit += l.debit || 0;
      totalCredit += l.credit || 0;
    }
    // Blank row between JEs for readability
    jeRows.push([]);
  }
  jeRows.push(["", "", "", "TOTALS", totalDebit, totalCredit, ""]);
  const jeSheet = XLSX.utils.aoa_to_sheet(jeRows);
  jeSheet["!cols"] = [
    { wch: 11 }, { wch: 8 }, { wch: 46 }, { wch: 32 },
    { wch: 11 }, { wch: 11 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, jeSheet, "Journal Entries");

  // Sheet 2: Rent Received
  const rentRows = [["Property", "Tenant", "Date Paid", "Amount"]];
  for (const prop of summary.propertiesPaid) {
    for (const i of prop.income) {
      rentRows.push([prop.property, i.tenant, i.date, i.amount]);
    }
  }
  rentRows.push([]);
  rentRows.push(["", "", "TOTAL", summary.totalRent]);
  const rentSheet = XLSX.utils.aoa_to_sheet(rentRows);
  rentSheet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, rentSheet, "Rent Received");

  // Sheet 3: No Rent Received
  if (summary.propertiesNoRent.length > 0) {
    const noRentRows = [["Property", "Statement Period"]];
    for (const p of summary.propertiesNoRent) {
      noRentRows.push([p.property, fmtDateRange(p.dateStart, p.dateEnd)]);
    }
    const noRentSheet = XLSX.utils.aoa_to_sheet(noRentRows);
    noRentSheet["!cols"] = [{ wch: 28 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, noRentSheet, "No Rent Received");
  }

  // Sheet 4: Fees & Maintenance Detail
  const feeRows = [["Property", "Date", "Type", "Description", "Amount"]];
  for (const prop of summary.propertiesPaid.concat(summary.propertiesNoRent)) {
    for (const e of prop.expenses) {
      feeRows.push([prop.property, e.date, "Management Fee", e.description, e.amount]);
    }
    for (const mnt of prop.maintenance) {
      feeRows.push([prop.property, mnt.date, mnt.accountLabel, mnt.description, mnt.amount]);
    }
  }
  if (feeRows.length > 1) {
    const feeSheet = XLSX.utils.aoa_to_sheet(feeRows);
    feeSheet["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 36 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, feeSheet, "Fees & Maintenance");
  }

  const filename = (batch.batchName || "Rental Statements").replace(/[^a-zA-Z0-9 ]/g, "") + " - Journal Entries.xlsx";
  XLSX.writeFile(wb, filename);
}

// ===== UI primitives =====

const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, className = "" }) => {
  const base = "font-sans font-medium transition rounded-md inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const styles = variant === "primary" ? { background: C.accent, color: "#fff" }
    : variant === "secondary" ? { background: C.paper, color: C.ink, border: `1px solid ${C.inkLine}` }
    : variant === "danger" ? { background: C.red, color: "#fff" }
    : { color: C.inkSoft };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${className}`} style={styles}>
      {children}
    </button>
  );
};

const Card = ({ children, className = "", style = {} }) => (
  <div className={`rounded-lg ${className}`}
    style={{ background: C.paper, border: `1px solid ${C.inkLine}`, boxShadow: "0 1px 2px rgba(15,23,42,0.04)", ...style }}>
    {children}
  </div>
);

const Pill = ({ children, color }) => (
  <span className="font-sans text-xs font-medium px-2 py-0.5 rounded-full inline-block mr-1 mb-1"
    style={{ background: color + "18", color }}>{children}</span>
);

// ===== Main =====

export default function RentalStatementsView({ companyId, companyName, statementBatches, saveStatementBatches }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [openBatchId, setOpenBatchId] = useState(null);
  const fileInputRef = useRef();

  const myBatches = useMemo(() =>
    (statementBatches || []).filter(b => b.companyId === companyId)
      .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || "")),
    [statementBatches, companyId]
  );

  const openBatch = openBatchId ? myBatches.find(b => b.id === openBatchId) : null;

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError("");
    try {
      const pdfBlobs = []; // {name, blob}

      // Separate PDFs from ZIPs
      for (const file of files) {
        const isZip = file.type === "application/zip"
          || file.type === "application/x-zip-compressed"
          || file.name.toLowerCase().endsWith(".zip");
        if (isZip) {
          setUploadProgress(`Reading ZIP: ${file.name}`);
          const zip = await JSZip.loadAsync(file);
          for (const entry of Object.values(zip.files)) {
            if (entry.dir) continue;
            if (entry.name.toLowerCase().endsWith(".pdf")) {
              const blob = await entry.async("blob");
              pdfBlobs.push({ name: entry.name, blob });
            }
          }
        } else if (file.name.toLowerCase().endsWith(".pdf")) {
          pdfBlobs.push({ name: file.name, blob: file });
        }
      }

      if (pdfBlobs.length === 0) {
        setUploadError("No PDFs found in your upload.");
        setUploading(false);
        return;
      }

      // Parse each PDF
      const parsed = [];
      const skipped = [];
      for (let i = 0; i < pdfBlobs.length; i++) {
        setUploadProgress(`Parsing ${i + 1} of ${pdfBlobs.length}: ${pdfBlobs[i].name}`);
        try {
          const text = await extractPdfText(pdfBlobs[i].blob);
          if (!isOwnerStatement(text)) {
            skipped.push(pdfBlobs[i].name);
            continue;
          }
          const data = parseStatementText(text);
          if (!data.property || !data.dateStart) {
            skipped.push(pdfBlobs[i].name);
            continue;
          }
          parsed.push(data);
        } catch (e) {
          console.warn("Parse failed:", pdfBlobs[i].name, e);
          skipped.push(pdfBlobs[i].name);
        }
      }

      if (parsed.length === 0) {
        setUploadError("No valid owner statements found in your upload.");
        setUploading(false);
        return;
      }

      const summary = summarizeBatch(parsed);
      const batchName = summary.statementStart
        ? monthYearLabel(summary.statementStart) + " Statements"
        : `Rental Statements (uploaded ${new Date().toLocaleDateString()})`;

      const newBatch = {
        id: uid(),
        companyId,
        batchName,
        statementStart: summary.statementStart,
        statementEnd: summary.statementEnd,
        statementCount: summary.statementCount,
        totalRent: summary.totalRent,
        totalMgmtFees: summary.totalMgmt,
        totalMaintenance: summary.totalMaint,
        totalDistributed: summary.totalDist,
        noRentCount: summary.propertiesNoRent.length,
        parsedData: { statements: parsed },
        notes: skipped.length ? `Skipped files that couldn't be read as owner statements: ${skipped.join(", ")}` : "",
        uploadedAt: new Date().toISOString()
      };

      saveStatementBatches([...(statementBatches || []), newBatch]);
      setOpenBatchId(newBatch.id);
      if (skipped.length) {
        setUploadError(`Parsed ${parsed.length}. Skipped ${skipped.length}: ${skipped.join(", ")}`);
      }
    } catch (e) {
      console.error(e);
      setUploadError("Upload failed: " + (e.message || "unknown error"));
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this statement batch? Journal entries you've already made in QuickBooks won't be affected.")) return;
    saveStatementBatches((statementBatches || []).filter(b => b.id !== id));
    if (openBatchId === id) setOpenBatchId(null);
  };

  const handleExcelDownload = (batch) => {
    const summary = summarizeBatch(batch.parsedData.statements);
    downloadExcel(batch, summary);
  };

  // Drag handlers
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files || []));
  };

  if (openBatch) {
    return <BatchDetail batch={openBatch}
      onBack={() => setOpenBatchId(null)}
      onDelete={() => handleDelete(openBatch.id)}
      onDownload={() => handleExcelDownload(openBatch)} />;
  }

  return (
    <div>
      <div className="mb-4">
        <p className="font-sans text-sm" style={{ color: C.inkSoft }}>
          Upload owner statement PDFs or a ZIP from New Spring Equities. The Ledger parses them, flags who didn't pay,
          and gives you an Excel journal entry for QuickBooks.
        </p>
      </div>

      {/* Upload zone */}
      <Card className="p-5 mb-4">
        <input ref={fileInputRef} type="file" multiple
          accept=".pdf,application/pdf,.zip,application/zip,application/x-zip-compressed"
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          style={{ display: "none" }} />
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition"
          style={{
            borderColor: isDragging ? C.accent : C.inkLine,
            background: isDragging ? C.accentSoft : C.paperSoft
          }}>
          <Upload size={32} style={{ color: C.inkSoft, margin: "0 auto 8px" }} />
          <p className="font-sans text-base font-medium mb-1" style={{ color: C.ink }}>
            {uploading ? "Processing…" : "Drag statement PDFs or a ZIP file here, or click to upload"}
          </p>
          <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
            Supports multiple PDFs at once, or a single ZIP containing all statements
          </p>
        </div>

        {uploadProgress && (
          <div className="mt-3 p-2 rounded text-sm" style={{ background: C.accentSoft, color: C.accent }}>
            {uploadProgress}
          </div>
        )}
        {uploadError && (
          <div className="mt-3 p-2 rounded text-sm" style={{ background: C.red + "11", color: C.red }}>
            {uploadError}
          </div>
        )}
      </Card>

      {/* Past uploads */}
      {myBatches.length > 0 ? (
        <Card className="p-5">
          <h3 className="font-sans text-lg font-semibold mb-3" style={{ color: C.ink }}>Past Uploads</h3>
          <div className="space-y-2">
            {myBatches.map(batch => (
              <div key={batch.id} className="flex items-center justify-between p-3 rounded"
                style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpenBatchId(batch.id)}>
                  <p className="font-sans font-medium" style={{ color: C.ink }}>
                    {batch.batchName}
                  </p>
                  <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                    {batch.statementCount} statements · {fmtDateRange(batch.statementStart, batch.statementEnd)} ·
                    rent {fmtMoney(batch.totalRent)} · {batch.noRentCount || 0} no-rent
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Btn variant="secondary" size="sm" onClick={() => setOpenBatchId(batch.id)}>View</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => handleExcelDownload(batch)}>
                    <Download size={12} /> Excel
                  </Btn>
                  <button onClick={() => handleDelete(batch.id)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <FileText size={32} style={{ color: C.inkSoft, margin: "0 auto 12px" }} />
          <p className="font-sans text-sm" style={{ color: C.ink }}>No statements uploaded yet.</p>
          <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
            Upload your first batch using the zone above.
          </p>
        </Card>
      )}
    </div>
  );
}

function BatchDetail({ batch, onBack, onDelete, onDownload }) {
  const summary = useMemo(() => summarizeBatch(batch.parsedData.statements), [batch]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="font-sans text-sm flex items-center gap-1 hover:opacity-70" style={{ color: C.inkSoft }}>
          ← Back to all statements
        </button>
        <div className="flex gap-2">
          <Btn onClick={onDownload}>
            <Download size={14} /> Download Journal Entry (Excel)
          </Btn>
          <Btn variant="danger" size="sm" onClick={onDelete}>
            <Trash2 size={12} /> Delete
          </Btn>
        </div>
      </div>

      <Card className="p-5 mb-4" style={{ borderLeft: `3px solid ${C.accent}` }}>
        <h2 className="font-sans text-xl font-semibold mb-1" style={{ color: C.ink }}>
          {batch.batchName}
        </h2>
        <p className="font-sans text-sm" style={{ color: C.inkSoft }}>
          {summary.statementCount} statements · {fmtDateRange(summary.statementStart, summary.statementEnd)}
        </p>
        {batch.notes && (
          <p className="font-sans text-xs mt-2 italic" style={{ color: C.amber }}>{batch.notes}</p>
        )}
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card className="p-4">
          <p className="font-sans text-xs font-medium uppercase" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>Rent Collected</p>
          <p className="font-sans text-2xl font-semibold mt-1" style={{ color: C.green }}>{fmtMoney(summary.totalRent)}</p>
          <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>From {summary.propertiesPaid.length} properties</p>
        </Card>
        <Card className="p-4">
          <p className="font-sans text-xs font-medium uppercase" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>Mgmt Fees</p>
          <p className="font-sans text-2xl font-semibold mt-1" style={{ color: C.amber }}>{fmtMoney(summary.totalMgmt)}</p>
        </Card>
        <Card className="p-4">
          <p className="font-sans text-xs font-medium uppercase" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>Maintenance</p>
          <p className="font-sans text-2xl font-semibold mt-1" style={{ color: C.amber }}>{fmtMoney(summary.totalMaint)}</p>
        </Card>
        <Card className="p-4">
          <p className="font-sans text-xs font-medium uppercase" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>Owner Distributions</p>
          <p className="font-sans text-2xl font-semibold mt-1" style={{ color: C.accent }}>{fmtMoney(summary.totalDist)}</p>
        </Card>
        <Card className="p-4">
          <p className="font-sans text-xs font-medium uppercase" style={{ color: C.inkSoft, letterSpacing: "0.05em" }}>No Rent Received</p>
          <p className="font-sans text-2xl font-semibold mt-1"
            style={{ color: summary.propertiesNoRent.length > 0 ? C.red : C.inkSoft }}>
            {summary.propertiesNoRent.length}
          </p>
          <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>Needs follow-up</p>
        </Card>
      </div>

      {/* Rent received */}
      {summary.propertiesPaid.length > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="font-sans text-lg font-semibold mb-3" style={{ color: C.ink }}>Rent Received</h3>
          <table className="w-full font-sans text-sm">
            <thead>
              <tr style={{ color: C.inkSoft }}>
                <th className="text-left py-2 text-xs font-medium uppercase">Property</th>
                <th className="text-left py-2 text-xs font-medium uppercase">Tenant</th>
                <th className="text-right py-2 text-xs font-medium uppercase">Amount</th>
                <th className="text-right py-2 text-xs font-medium uppercase">Date Paid</th>
              </tr>
            </thead>
            <tbody>
              {summary.propertiesPaid.flatMap(p =>
                p.income.map((i, idx) => (
                  <tr key={`${p.property}-${idx}`} style={{ borderTop: `1px solid ${C.inkLine}` }}>
                    <td className="py-2">{p.property}</td>
                    <td className="py-2">{i.tenant}</td>
                    <td className="py-2 text-right font-medium" style={{ color: C.green }}>{fmtMoney(i.amount)}</td>
                    <td className="py-2 text-right" style={{ color: C.inkSoft }}>{fmtDate(i.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* No rent */}
      {summary.propertiesNoRent.length > 0 && (
        <Card className="p-5 mb-4" style={{ borderLeft: `3px solid ${C.red}` }}>
          <h3 className="font-sans text-lg font-semibold mb-3" style={{ color: C.ink }}>
            <AlertCircle size={16} style={{ display: "inline", marginRight: 6, color: C.red, verticalAlign: "-3px" }} />
            No Rent Received ({summary.propertiesNoRent.length})
          </h3>
          <div>
            {summary.propertiesNoRent.map(p => (
              <Pill key={p.property} color={C.red}>{p.property}</Pill>
            ))}
          </div>
          <p className="font-sans text-xs mt-3" style={{ color: C.inkSoft }}>
            These properties had no rent received this statement period. May be vacant, late, or on a different payment schedule.
          </p>
        </Card>
      )}

      {/* Maintenance detail */}
      {summary.totalMaint > 0 && (
        <Card className="p-5 mb-4">
          <h3 className="font-sans text-lg font-semibold mb-3" style={{ color: C.ink }}>Maintenance & Repairs</h3>
          <table className="w-full font-sans text-sm">
            <thead>
              <tr style={{ color: C.inkSoft }}>
                <th className="text-left py-2 text-xs font-medium uppercase">Property</th>
                <th className="text-left py-2 text-xs font-medium uppercase">Type</th>
                <th className="text-left py-2 text-xs font-medium uppercase">Description</th>
                <th className="text-right py-2 text-xs font-medium uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.propertiesPaid.concat(summary.propertiesNoRent).flatMap(p =>
                p.maintenance.map((m, idx) => (
                  <tr key={`${p.property}-mnt-${idx}`} style={{ borderTop: `1px solid ${C.inkLine}` }}>
                    <td className="py-2">{p.property}</td>
                    <td className="py-2" style={{ color: C.inkSoft }}>{m.accountLabel}</td>
                    <td className="py-2 text-xs">{m.description}</td>
                    <td className="py-2 text-right font-medium" style={{ color: C.amber }}>{fmtMoney(m.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Per-property journal entries */}
      <Card className="p-5 mb-4">
        <h3 className="font-sans text-lg font-semibold mb-3" style={{ color: C.ink }}>
          Journal Entries ({buildAllPropertyJEs(batch.parsedData.statements).length})
        </h3>
        <p className="font-sans text-xs mb-4" style={{ color: C.inkSoft }}>
          Preview of what will be in the Excel download — one JE per property with activity.
        </p>
        <div className="space-y-4">
          {buildAllPropertyJEs(batch.parsedData.statements).map((je) => (
            <div key={je.jeNumber} className="rounded-md p-3" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="font-sans font-semibold text-sm" style={{ color: C.ink }}>
                  {je.jeNumber} — {je.property}
                </p>
                <span className="font-sans text-xs" style={{ color: C.inkSoft }}>
                  {fmtDate(je.dateStart)} - {fmtDate(je.dateEnd)}
                </span>
              </div>
              <table className="w-full font-sans text-xs">
                <thead>
                  <tr style={{ color: C.inkSoft }}>
                    <th className="text-left py-1 font-medium uppercase">Account</th>
                    <th className="text-right py-1 font-medium uppercase">Debit</th>
                    <th className="text-right py-1 font-medium uppercase">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map((line, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.inkLine}` }}>
                      <td className="py-1.5" style={{ paddingLeft: line.credit > 0 ? "18px" : "0" }}>
                        {line.account}
                      </td>
                      <td className="py-1.5 text-right font-mono" style={{ color: line.debit > 0 ? C.ink : "transparent" }}>
                        {line.debit > 0 ? fmtMoney(line.debit) : "·"}
                      </td>
                      <td className="py-1.5 text-right font-mono" style={{ color: line.credit > 0 ? C.ink : "transparent" }}>
                        {line.credit > 0 ? fmtMoney(line.credit) : "·"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
