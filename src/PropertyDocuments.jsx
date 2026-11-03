import React, { useState, useRef } from "react";
import {
  Upload, FileText, Trash2, Download, Eye, Copy, Check, AlertCircle,
  Image as ImageIcon, File as FileIcon
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "./supabaseClient";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Storage bucket for all rental documents.  Create this bucket in Supabase
// (public = false) and add an "authenticated full access" policy.
const BUCKET = "rental-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
  const d = iso.length > 10 ? new Date(iso) : null;
  if (d) {
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
  }
  const [y, m, dd] = iso.split("-");
  return `${m}/${dd}/${y.slice(2)}`;
};
const fmtDateRange = (start, end) => `${fmtDate(start)} - ${fmtDate(end)}`;
const parseDate = (mdy) => {
  const [m, d, y] = mdy.split("/");
  const year = y.length === 2 ? "20" + y : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};
const fmtFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// ===== PDF parsing =====

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Rebuild by y position so lines are intact
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
    income: [], expenses: [], distributions: [],
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
  const incomeRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})[^\n]*?4101 Rental Income\s+([A-Za-z][A-Za-z\s\.\-']+?)\s+([\d,]+\.\d{2})/g;
  while ((m = incomeRe.exec(text)) !== null) {
    result.income.push({
      date: parseDate(m[1]),
      tenant: m[2].trim(),
      amount: parseFloat(m[3].replace(/,/g, ""))
    });
  }

  const expRe = /(\d{1,2}\/\d{1,2}\/\d{2,4})[^\n]*?5200 Management fees\s+(.+?)\s+([\d,]+\.\d{2})/g;
  while ((m = expRe.exec(text)) !== null) {
    result.expenses.push({
      date: parseDate(m[1]),
      description: m[2].trim(),
      amount: parseFloat(m[3].replace(/,/g, ""))
    });
  }

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

// ===== Journal entry generation =====

function generateJournalEntry(parsed) {
  const BANK = "Checking";
  const INCOME = "Rental Income";
  const MGMT = "Management Fees";
  const CLEARING = "NSE Clearing";

  const totalIncome = parsed.income.reduce((s, i) => s + i.amount, 0);
  const totalExp = parsed.expenses.reduce((s, e) => s + e.amount, 0);
  const totalDist = parsed.distributions.reduce((s, d) => s + d.amount, 0);

  const dateRange = fmtDateRange(parsed.dateStart, parsed.dateEnd);
  const tenants = [...new Set(parsed.income.map(i => i.tenant).filter(Boolean))];
  const tenantsStr = tenants.length ? ` — ${tenants.join(", ")}` : "";
  const je = { lines: [], memo: "" };

  if (totalIncome > 0 && totalDist > 0) {
    je.lines.push({ type: "Dr", account: BANK, amount: totalDist });
    if (totalExp > 0) je.lines.push({ type: "Dr", account: MGMT, amount: totalExp });
    je.lines.push({ type: "Cr", account: `${INCOME} — ${parsed.property}`, amount: totalIncome });
    je.memo = `NSE Statement ${dateRange}${tenantsStr}`;
  } else if (totalIncome > 0 && totalDist === 0) {
    je.lines.push({ type: "Dr", account: CLEARING, amount: totalIncome });
    je.lines.push({ type: "Cr", account: `${INCOME} — ${parsed.property}`, amount: totalIncome });
    if (totalExp > 0) {
      je.lines.push({ type: "Dr", account: MGMT, amount: totalExp });
      je.lines.push({ type: "Cr", account: CLEARING, amount: totalExp });
    }
    je.memo = `NSE Statement ${dateRange}${tenantsStr} — Rent received, not yet distributed`;
  } else if (totalIncome === 0 && totalDist > 0) {
    je.lines.push({ type: "Dr", account: BANK, amount: totalDist });
    if (totalExp > 0) je.lines.push({ type: "Dr", account: MGMT, amount: totalExp });
    je.lines.push({ type: "Cr", account: CLEARING, amount: totalDist + totalExp });
    je.memo = `NSE Statement ${dateRange} — Distribution of prior undeposited funds`;
  } else {
    return null;
  }
  return je;
}

function formatJEText(je, propertyName) {
  if (!je) return "";
  let out = `Journal Entry: ${propertyName}\nMemo: ${je.memo}\n\n`;
  out += "Account".padEnd(50) + "Debit".padStart(12) + "Credit".padStart(12) + "\n";
  out += "-".repeat(74) + "\n";
  for (const line of je.lines) {
    const amt = fmtMoney(line.amount);
    if (line.type === "Dr") {
      out += line.account.padEnd(50) + amt.padStart(12) + "".padStart(12) + "\n";
    } else {
      out += ("    " + line.account).padEnd(50) + "".padStart(12) + amt.padStart(12) + "\n";
    }
  }
  return out;
}

// ===== UI primitives (match App.jsx) =====

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

function docIcon(mimeType, size = 18) {
  if (!mimeType) return <FileIcon size={size} />;
  if (mimeType.startsWith("image/")) return <ImageIcon size={size} />;
  if (mimeType.includes("pdf")) return <FileText size={size} />;
  return <FileIcon size={size} />;
}

// ===== Main =====

export default function PropertyDocumentsSection({ propertyId, documents, saveDocuments }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef();

  const docs = (documents || []).filter(d => d.propertyId === propertyId)
    .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError("");

    try {
      const newDocs = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Processing ${i + 1} of ${files.length}: ${file.name}`);

        if (file.size > MAX_FILE_SIZE) {
          setUploadError(`${file.name} is over 10 MB — too large to upload.`);
          continue;
        }

        // Try to parse owner statement if PDF
        let parsedData = null;
        let category = "other";
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          try {
            const text = await extractPdfText(file);
            if (isOwnerStatement(text)) {
              parsedData = parseStatementText(text);
              category = "statement";
            } else {
              category = "pdf";
            }
          } catch (e) {
            console.warn("PDF parse failed:", file.name, e);
            category = "pdf";
          }
        } else if ((file.type || "").startsWith("image/")) {
          category = "image";
        }

        // Upload to Supabase Storage
        const docId = uid();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${propertyId}/${docId}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false
          });

        if (upErr) {
          setUploadError(`Failed to upload ${file.name}: ${upErr.message}`);
          continue;
        }

        newDocs.push({
          id: docId,
          propertyId,
          fileName: file.name,
          storagePath,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          category,
          parsedData,
          notes: ""
        });
      }

      if (newDocs.length > 0) {
        saveDocuments([...(documents || []), ...newDocs]);
      }
    } catch (e) {
      setUploadError("Upload failed: " + (e.message || "unknown error"));
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openFile = async (doc) => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET)
        .createSignedUrl(doc.storagePath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert("Could not open file: " + (e.message || "unknown error"));
    }
  };

  const downloadFile = async (doc) => {
    try {
      const { data, error } = await supabase.storage.from(BUCKET)
        .createSignedUrl(doc.storagePath, 3600, { download: doc.fileName });
      if (error) throw error;
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.fileName;
      a.click();
    } catch (e) {
      alert("Could not download file: " + (e.message || "unknown error"));
    }
  };

  const deleteFile = async (doc) => {
    if (!confirm(`Delete "${doc.fileName}"? This cannot be undone.`)) return;
    try {
      await supabase.storage.from(BUCKET).remove([doc.storagePath]);
    } catch (e) {
      console.warn("Storage delete failed (continuing):", e);
    }
    saveDocuments((documents || []).filter(d => d.id !== doc.id));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Drag handlers
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files || []));
  };

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-serif text-lg" style={{ color: C.ink }}>Documents</h3>
        <input ref={fileInputRef} type="file" multiple
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          style={{ display: "none" }}
          accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt" />
        <Btn size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={12} />
          {uploading ? "Uploading…" : "Upload Document"}
        </Btn>
      </div>

      <p className="font-sans text-xs mb-3" style={{ color: C.inkSoft }}>
        Store lease agreements, inspection photos, repair receipts, and owner statements for this property.
        PDF owner statements are automatically parsed to show rent received and the QuickBooks journal entry.
      </p>

      {uploadProgress && (
        <div className="p-2 mb-3 rounded text-sm" style={{ background: C.accentSoft, color: C.accent }}>
          {uploadProgress}
        </div>
      )}

      {uploadError && (
        <div className="p-2 mb-3 rounded text-sm" style={{ background: C.red + "11", color: C.red }}>
          {uploadError}
        </div>
      )}

      {docs.length === 0 && !uploading && (
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition"
          style={{
            borderColor: isDragging ? C.accent : C.inkLine,
            background: isDragging ? C.accentSoft : C.paperSoft
          }}>
          <Upload size={24} style={{ color: C.inkSoft, margin: "0 auto 8px" }} />
          <p className="font-sans text-sm font-medium" style={{ color: C.ink }}>
            Drag a file here or click to upload
          </p>
          <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
            PDF, images, Word, Excel — up to 10 MB per file
          </p>
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-2"
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          {docs.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={() => openFile(doc)}
              onDownload={() => downloadFile(doc)}
              onDelete={() => deleteFile(doc)}
              onCopy={(text) => copyToClipboard(text, doc.id)}
              copied={copiedId === doc.id}
            />
          ))}
          {isDragging && (
            <div className="border-2 border-dashed rounded-lg p-4 text-center"
              style={{ borderColor: C.accent, background: C.accentSoft }}>
              <p className="font-sans text-sm" style={{ color: C.accent }}>Drop to upload</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DocumentRow({ doc, onOpen, onDownload, onDelete, onCopy, copied }) {
  const isStatement = doc.category === "statement" && doc.parsedData;
  const parsed = doc.parsedData;
  const je = isStatement ? generateJournalEntry(parsed) : null;

  const uploaded = new Date(doc.uploadedAt);
  const uploadedStr = `${uploaded.getMonth() + 1}/${uploaded.getDate()}/${uploaded.getFullYear()}`;

  const totalIncome = parsed?.income?.reduce((s, i) => s + i.amount, 0) || 0;
  const totalExp = parsed?.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
  const totalDist = parsed?.distributions?.reduce((s, d) => s + d.amount, 0) || 0;
  const tenants = parsed ? [...new Set(parsed.income.map(i => i.tenant))].join(", ") : "";

  return (
    <div className="rounded-md" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
      {/* Row header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: doc.category === "statement" ? C.accentSoft
              : doc.category === "image" ? C.green + "22"
              : C.inkLine
          }}>
          <span style={{ color: doc.category === "statement" ? C.accent
            : doc.category === "image" ? C.green : C.inkSoft }}>
            {docIcon(doc.mimeType, 18)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-medium truncate" style={{ color: C.ink }}>
            {doc.fileName}
          </p>
          <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
            {fmtFileSize(doc.fileSize)} · uploaded {uploadedStr}
            {isStatement && parsed.dateStart && ` · statement ${fmtDateRange(parsed.dateStart, parsed.dateEnd)}`}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onOpen} className="p-1.5 hover:bg-white rounded" title="View">
            <Eye size={14} style={{ color: C.inkSoft }} />
          </button>
          <button onClick={onDownload} className="p-1.5 hover:bg-white rounded" title="Download">
            <Download size={14} style={{ color: C.inkSoft }} />
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 rounded" title="Delete">
            <Trash2 size={14} style={{ color: C.red }} />
          </button>
        </div>
      </div>

      {/* Parsed statement info */}
      {isStatement && (
        <div className="p-3 border-t" style={{ borderColor: C.inkLine, background: C.accentSoft + "66" }}>
          <p className="font-sans text-xs font-semibold mb-2" style={{ color: C.accent }}>
            Parsed from this statement
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <StatMini label="Rent Received" value={fmtMoney(totalIncome)} color={totalIncome > 0 ? C.green : C.inkSoft} />
            <StatMini label="From Tenant" value={tenants || "—"} color={C.ink} size="small" />
            <StatMini label="Mgmt Fee" value={fmtMoney(totalExp)} color={C.amber} />
            <StatMini label="Distributed" value={fmtMoney(totalDist)} color={C.accent} />
          </div>

          {totalIncome === 0 && (
            <div className="p-2 mb-3 rounded text-xs" style={{ background: C.red + "11", color: C.red }}>
              <AlertCircle size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
              No rent received during this statement period.
            </div>
          )}

          {je && (
            <div className="rounded-md p-3" style={{ background: C.paper, border: `1px solid ${C.inkLine}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-sans text-xs font-semibold" style={{ color: C.ink }}>
                  Journal Entry for QuickBooks
                </p>
                <button
                  onClick={() => onCopy(formatJEText(je, parsed.property))}
                  className="font-sans text-xs flex items-center gap-1 hover:opacity-70"
                  style={{ color: C.accent }}>
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <p className="font-sans text-xs mb-2 italic" style={{ color: C.inkSoft }}>
                {je.memo}
              </p>
              <table className="w-full font-sans text-xs">
                <thead>
                  <tr style={{ color: C.inkSoft }}>
                    <th className="text-left py-1 font-medium">Account</th>
                    <th className="text-right py-1 font-medium">Debit</th>
                    <th className="text-right py-1 font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map((line, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.inkLine}` }}>
                      <td className="py-1" style={{ paddingLeft: line.type === "Cr" ? "16px" : "0" }}>
                        {line.account}
                      </td>
                      <td className="py-1 text-right font-mono" style={{ color: line.type === "Dr" ? C.ink : "transparent" }}>
                        {line.type === "Dr" ? fmtMoney(line.amount) : "·"}
                      </td>
                      <td className="py-1 text-right font-mono" style={{ color: line.type === "Cr" ? C.ink : "transparent" }}>
                        {line.type === "Cr" ? fmtMoney(line.amount) : "·"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, color, size }) {
  return (
    <div className="rounded p-2" style={{ background: C.paper }}>
      <p className="font-sans text-xs" style={{ color: C.inkSoft, fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </p>
      <p className="font-sans font-semibold" style={{ color, fontSize: size === "small" ? "12px" : "15px", marginTop: "2px" }}>
        {value}
      </p>
    </div>
  );
}
