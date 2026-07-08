import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Receipt, Building2, Hammer, Settings as SettingsIcon,
  Plus, Trash2, Pencil, Check, X, Calendar, AlertCircle, FileText,
  Users, DollarSign, Bell, ChevronDown, ChevronRight, Search
} from "lucide-react";
import { load, save } from "./dataLayer";

// ============================================================
// STORAGE HELPERS - now uses Supabase via dataLayer
// ============================================================

// ============================================================
// DATE HELPERS
// ============================================================
const todayISO = () => new Date().toISOString().split("T")[0];
const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};
const daysUntil = (iso) => {
  if (!iso) return null;
  const t = new Date(todayISO() + "T00:00:00");
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
};
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };
const addMonths = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().split("T")[0]; };
const addYears = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setFullYear(d.getFullYear() + n); return d.toISOString().split("T")[0]; };
const nextDue = (iso, recurrence) => {
  if (!recurrence || recurrence === "none") return iso;
  if (recurrence === "weekly") return addDays(iso, 7);
  if (recurrence === "biweekly") return addDays(iso, 14);
  if (recurrence === "semimonthly") return addDays(iso, 15);
  if (recurrence === "monthly") return addMonths(iso, 1);
  if (recurrence === "bimonthly") return addMonths(iso, 2);
  if (recurrence === "quarterly") return addMonths(iso, 3);
  if (recurrence === "semiannual") return addMonths(iso, 6);
  if (recurrence === "annual") return addYears(iso, 1);
  return iso;
};
const monthKey = (iso) => iso.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  const names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${names[+m - 1]} ${y}`;
};
const uid = () => Math.random().toString(36).slice(2, 10);

// ============================================================
// SEED DATA
// ============================================================
const SEED_COMPANIES = [
  { id: "flip", name: "JMC Investments", type: "Corporation", color: "#c4602f", showPayroll: true, payrollDays: [1, 10, 25], notes: "House flipping company. 5 employees + 2 owners on payroll. Also holds rentals being transferred to Penciled Properties." },
  { id: "rentals", name: "Penciled Properties", type: "LLC", color: "#5b7a8c", showPayroll: false, payrollDays: [1, 10, 25], notes: "New rental holding company. Currently: 1 house, 3 duplexes, 1 storage unit. Adding ~7 duplexes and 5+ homes." },
  { id: "realtor", name: "JECO Realty", type: "LLC", color: "#8c7a5b", showPayroll: true, payrollDays: [1], notes: "Realtor company. 1 person on payroll, paid the 1st of each month." }
];

const thisYear = new Date().getFullYear();
const SEED_BILLS = [
  { id: uid(), companyId: "realtor", name: "Payroll (realtor)", category: "Payroll", amount: "", dueDate: todayISO(), recurrence: "biweekly", status: "open", notes: "1 person on payroll" },
  { id: uid(), companyId: "flip", name: "Form 941 - Q1 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-04-30`, recurrence: "none", status: "open", notes: "Q1 (Jan-Mar)" },
  { id: uid(), companyId: "flip", name: "Form 941 - Q2 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-07-31`, recurrence: "none", status: "open", notes: "Q2 (Apr-Jun)" },
  { id: uid(), companyId: "flip", name: "Form 941 - Q3 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-10-31`, recurrence: "none", status: "open", notes: "Q3 (Jul-Sep)" },
  { id: uid(), companyId: "flip", name: "Form 941 - Q4 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "none", status: "open", notes: "Q4 (Oct-Dec)" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q1 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-04-30`, recurrence: "none", status: "open", notes: "Q1" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q2 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-07-31`, recurrence: "none", status: "open", notes: "Q2" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q3 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-10-31`, recurrence: "none", status: "open", notes: "Q3" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q4 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "none", status: "open", notes: "Q4" },
  { id: uid(), companyId: "flip", name: "Form 940 - FUTA Annual", category: "Annual Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Federal unemployment tax" },
  { id: uid(), companyId: "realtor", name: "Form 940 - FUTA Annual", category: "Annual Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Federal unemployment tax" },
  { id: uid(), companyId: "flip", name: "W-2s to employees + SSA", category: "Year-End", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Deadline to send W-2s to employees and file with SSA" },
  { id: uid(), companyId: "flip", name: "1099-NEC to contractors + IRS", category: "Year-End", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Subcontractors paid $600+. Likely many on flip side." },
  { id: uid(), companyId: "realtor", name: "W-2 to employee + SSA", category: "Year-End", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "W-2 deadline" },
  { id: uid(), companyId: "flip", name: "Corporate tax return (1120 or 1120-S)", category: "Income Tax", amount: "", dueDate: `${thisYear + 1}-03-15`, recurrence: "annual", status: "open", notes: "S-Corp = 3/15, C-Corp = 4/15. Confirm entity type." },
  { id: uid(), companyId: "rentals", name: "LLC tax return (1065 or Sch E)", category: "Income Tax", amount: "", dueDate: `${thisYear + 1}-03-15`, recurrence: "annual", status: "open", notes: "Multi-member LLC = 1065 (3/15). Single-member = Sch E (4/15)." },
  { id: uid(), companyId: "realtor", name: "LLC tax return", category: "Income Tax", amount: "", dueDate: `${thisYear + 1}-04-15`, recurrence: "annual", status: "open", notes: "Confirm filing type" },
  { id: uid(), companyId: "flip", name: "General liability insurance", category: "Insurance", amount: "", dueDate: addMonths(todayISO(), 1), recurrence: "monthly", status: "open", notes: "" },
  { id: uid(), companyId: "flip", name: "Workers comp premium", category: "Insurance", amount: "", dueDate: addMonths(todayISO(), 1), recurrence: "monthly", status: "open", notes: "" }
];

const SEED_PROPERTIES = [
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Single-Family House", type: "Single Family", units: 1, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Duplex #1", type: "Duplex", units: 2, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Duplex #2", type: "Duplex", units: 2, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Duplex #3", type: "Duplex", units: 2, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Storage Facility", type: "Storage", units: 1, notes: "Existing — manage units separately if needed" }
];

const CATEGORIES = [
  "Payroll","Quarterly Tax","Annual Tax","Income Tax","Year-End","Insurance",
  "License/Permit","Utility","Mortgage","Property Tax","HOA","Subscription",
  "Loan Payment","Vendor","Maintenance","Other"
];

const RECURRENCES = [
  { v: "none", label: "One-time" },
  { v: "weekly", label: "Weekly" },
  { v: "biweekly", label: "Every 2 weeks" },
  { v: "semimonthly", label: "Twice monthly (~15 days)" },
  { v: "monthly", label: "Monthly" },
  { v: "bimonthly", label: "Every 2 months" },
  { v: "quarterly", label: "Quarterly" },
  { v: "semiannual", label: "Every 6 months" },
  { v: "annual", label: "Annual" }
];

const FLIP_STATUSES = ["Acquiring","Demo","Rehab","Listed","Pending","Sold","On Hold"];

// ============================================================
// STYLE
// ============================================================
const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap');
    .font-serif { font-family: 'Fraunces', Georgia, serif; }
    .font-sans { font-family: 'Manrope', system-ui, sans-serif; }
    .ledger-row:nth-child(even) { background: rgba(212, 196, 168, 0.08); }
    .tab-active { box-shadow: inset 0 -2px 0 0 var(--accent); }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; }
    .scroll-hide::-webkit-scrollbar { display: none; }
  `}</style>
);

const C = {
  paper: "#f4f5f7",
  paperSoft: "#e5e7eb",
  ink: "#1f2937",
  inkSoft: "#6b7280",
  inkLine: "#d1d5db",
  accent: "#4b5563",
  accentSoft: "#9ca3af",
  green: "#4d7c5f",
  red: "#b04a4a",
  amber: "#b8862f"
};

// ============================================================
// UI PRIMITIVES
// ============================================================
const Btn = ({ children, onClick, variant = "primary", size = "md", className = "", type = "button", disabled }) => {
  const base = "font-sans font-medium transition rounded inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const variants = {
    primary: "text-white hover:opacity-90",
    secondary: "border hover:bg-black/5",
    ghost: "hover:bg-black/5",
    danger: "text-white hover:opacity-90"
  };
  const styles = variant === "primary" ? { background: C.ink, color: C.paper }
    : variant === "secondary" ? { borderColor: C.inkLine, color: C.ink }
    : variant === "danger" ? { background: C.red }
    : { color: C.ink };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} style={styles}>
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input {...props}
    className={`font-sans px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2 ${className}`}
    style={{ background: C.paper, borderColor: C.inkLine, color: C.ink, ...(props.style || {}) }} />
);

const Select = ({ children, className = "", ...props }) => (
  <select {...props}
    className={`font-sans px-3 py-2 text-sm rounded border focus:outline-none ${className}`}
    style={{ background: C.paper, borderColor: C.inkLine, color: C.ink }}>
    {children}
  </select>
);

const Textarea = ({ className = "", ...props }) => (
  <textarea {...props}
    className={`font-sans px-3 py-2 text-sm rounded border focus:outline-none resize-none ${className}`}
    style={{ background: C.paper, borderColor: C.inkLine, color: C.ink }} />
);

const Label = ({ children, className = "" }) => (
  <label className={`font-sans text-xs uppercase tracking-wider ${className}`}
    style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{children}</label>
);

const Card = ({ children, className = "", style = {}, onClick }) => (
  <div className={`rounded ${className}`}
    style={{ background: C.paper, border: `1px solid ${C.inkLine}`, ...style }}
    onClick={onClick}>{children}</div>
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(31, 42, 58, 0.55)" }} onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded`}
        style={{ background: C.paper, border: `1px solid ${C.inkLine}` }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.inkLine }}>
          <h3 className="font-serif text-xl" style={{ color: C.ink }}>{title}</h3>
          <button onClick={onClose} className="hover:opacity-60"><X size={20} style={{ color: C.ink }} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Pill = ({ children, color }) => (
  <span className="font-sans text-xs px-2 py-0.5 rounded-full"
    style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{children}</span>
);

// ============================================================
// MAIN APP
// ============================================================
export default function App({ onSignOut }) {
  const [tab, setTab] = useState("dashboard");
  const [companies, setCompanies] = useState([]);
  const [bills, setBills] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [flips, setFlips] = useState([]);
  const [notes, setNotes] = useState({});
  const [payrolls, setPayrolls] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      // Load everything in parallel instead of sequentially — much faster startup
      const [c, b, p, t, pm, f, n, pr] = await Promise.all([
        load("bk:companies", null),
        load("bk:bills", null),
        load("bk:properties", null),
        load("bk:tenants", []),
        load("bk:payments", []),
        load("bk:flips", []),
        load("bk:notes", null),
        load("bk:payrolls", [])
      ]);

      // Companies: apply name migration if needed
      if (c && c.length > 0) {
        const renames = {
          "Flip Corporation": "JMC Investments",
          "Rental LLC": "Penciled Properties",
          "Realtor LLC": "JECO Realty"
        };
        let changed = false;
        const renamed = c.map(co => {
          let updated = co;
          if (renames[co.name]) { updated = { ...updated, name: renames[co.name] }; changed = true; }
          if (updated.showPayroll === undefined) {
            updated = { ...updated, showPayroll: updated.id !== "rentals" };
            changed = true;
          }
          if (!updated.payrollDays) {
            updated = { ...updated, payrollDays: updated.id === "realtor" ? [1] : [1, 10, 25] };
            changed = true;
          }
          return updated;
        });
        setCompanies(renamed);
        if (changed) save("bk:companies", renamed);
      } else { setCompanies(SEED_COMPANIES); save("bk:companies", SEED_COMPANIES); }

      // Bills: remove redundant biweekly payroll bill (superseded by Payroll & Quarterlies calendar)
      if (b && b.length > 0) {
        const cleaned = b.filter(bill => !(
          bill.companyId === "flip" &&
          bill.name === "Payroll (employees + owners)" &&
          bill.recurrence === "biweekly"
        ));
        setBills(cleaned);
        if (cleaned.length !== b.length) save("bk:bills", cleaned);
      } else { setBills(SEED_BILLS); save("bk:bills", SEED_BILLS); }

      // Properties: add category if missing
      if (p && p.length > 0) {
        let changed = false;
        const migrated = p.map(prop => {
          if (!prop.category) { changed = true; return { ...prop, category: "Rental" }; }
          return prop;
        });
        setProperties(migrated);
        if (changed) save("bk:properties", migrated);
      } else { setProperties(SEED_PROPERTIES); save("bk:properties", SEED_PROPERTIES); }

      setTenants(t);
      setPayments(pm);
      setFlips(f);
      setNotes(n && typeof n === "object" ? n : (n ? { _general: n } : {}));
      setPayrolls(pr);
      setLoaded(true);
    })();
  }, []);

  const saveCompanies = (v) => { setCompanies(v); save("bk:companies", v); };
  const saveBills = (v) => { setBills(v); save("bk:bills", v); };
  const saveProperties = (v) => { setProperties(v); save("bk:properties", v); };
  const saveTenants = (v) => { setTenants(v); save("bk:tenants", v); };
  const savePayments = (v) => { setPayments(v); save("bk:payments", v); };
  const saveFlips = (v) => { setFlips(v); save("bk:flips", v); };
  const saveNotes = (v) => { setNotes(v); save("bk:notes", v); };
  const savePayrolls = (v) => { setPayrolls(v); save("bk:payrolls", v); };

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper }}>
      <Style />
      <p className="font-serif text-lg italic" style={{ color: C.inkSoft }}>Opening the ledger…</p>
    </div>
  );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: C.ink },
    ...companies.map(c => ({ id: `co:${c.id}`, label: c.name, icon: Building2, color: c.color })),
    { id: "settings", label: "Companies", icon: SettingsIcon, color: C.ink }
  ];

  const activeCompanyId = tab.startsWith("co:") ? tab.slice(3) : null;
  const activeCompany = activeCompanyId ? companies.find(c => c.id === activeCompanyId) : null;

  return (
    <div className="min-h-screen font-sans" style={{ background: C.paper, color: C.ink }}>
      <Style />

      <header className="border-b" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl font-medium" style={{ color: C.ink }}>The Ledger</h1>
            <p className="font-serif italic text-sm mt-0.5" style={{ color: C.inkSoft }}>
              Bookkeeping & rental management — {companies.length} companies
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <p className="font-serif text-sm" style={{ color: C.inkSoft }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            {onSignOut && (
              <button onClick={onSignOut}
                className="font-sans text-xs px-2 py-1 rounded hover:bg-black/5"
                style={{ color: C.inkSoft, border: `1px solid ${C.inkLine}` }}>
                Sign out
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 flex gap-0 overflow-x-auto scroll-hide">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-3 flex items-center gap-2 font-sans text-sm whitespace-nowrap transition ${active ? "tab-active font-semibold" : "hover:bg-black/5"}`}
                style={{ color: active ? t.color : C.ink, "--accent": t.color }}>
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "dashboard" && (
          <Dashboard {...{ companies, bills, saveBills, properties, tenants, payments, savePayments, flips }} setTab={setTab} />
        )}
        {activeCompany && activeCompany.id === "flip" && (
          <JMCView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} saveProperties={saveProperties}
            tenants={tenants} saveTenants={saveTenants}
            payments={payments} savePayments={savePayments}
            flips={flips} saveFlips={saveFlips}
            notes={notes} saveNotes={saveNotes}
            payrolls={payrolls} savePayrolls={savePayrolls}
          />
        )}
        {activeCompany && activeCompany.id === "rentals" && (
          <PenciledView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} saveProperties={saveProperties}
            tenants={tenants} saveTenants={saveTenants}
            payments={payments} savePayments={savePayments}
            flips={flips}
            notes={notes} saveNotes={saveNotes}
            payrolls={payrolls} savePayrolls={savePayrolls}
          />
        )}
        {activeCompany && activeCompany.id === "realtor" && (
          <JECOView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} flips={flips}
            notes={notes} saveNotes={saveNotes}
            payrolls={payrolls} savePayrolls={savePayrolls}
          />
        )}
        {activeCompany && activeCompany.id !== "flip" && activeCompany.id !== "rentals" && activeCompany.id !== "realtor" && (
          <CompanyView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} saveProperties={saveProperties}
            tenants={tenants} saveTenants={saveTenants}
            payments={payments} savePayments={savePayments}
            flips={flips} saveFlips={saveFlips}
            notes={notes} saveNotes={saveNotes}
          />
        )}
        {tab === "settings" && (
          <CompaniesView
            companies={companies} saveCompanies={saveCompanies}
            bills={bills} setBills={setBills}
            properties={properties} setProperties={setProperties}
            tenants={tenants} setTenants={setTenants}
            payments={payments} setPayments={setPayments}
            flips={flips} setFlips={setFlips}
            notes={notes} setNotes={setNotes}
            payrolls={payrolls} setPayrolls={setPayrolls}
            setCompanies={setCompanies}
          />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-center">
        <p className="font-serif italic text-xs" style={{ color: C.inkSoft }}>
          Data saves automatically to this browser session • Edit companies from the Companies tab
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// COMPANY VIEW (per-company wrapper with sub-tabs)
// ============================================================
function CompanyView({ company, allCompanies, bills, saveBills, properties, saveProperties, tenants, saveTenants, payments, savePayments, flips, saveFlips, notes, saveNotes }) {
  // JMC Investments gets its own custom layout
  if (company.id === "flip") {
    return <JMCView
      company={company}
      bills={bills} saveBills={saveBills}
      properties={properties} saveProperties={saveProperties}
      tenants={tenants} saveTenants={saveTenants}
      payments={payments} savePayments={savePayments}
      notes={notes} saveNotes={saveNotes}
    />;
  }

  const [subTab, setSubTab] = useState("bills");

  // Per-company filtered lists for summary stats
  const myBills = bills.filter(b => b.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const myProperties = properties.filter(p => p.companyId === company.id);
  const myFlips = flips.filter(f => f.companyId === company.id);
  const myActiveFlips = myFlips.filter(f => !["Sold","On Hold"].includes(f.status));

  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const subTabs = [
    { id: "bills", label: "Bills & Reminders", icon: Receipt, count: myOpenBills.length },
    { id: "rentals", label: "Rentals", icon: Building2, count: myProperties.length },
    { id: "flips", label: "Flip Projects", icon: Hammer, count: myActiveFlips.length },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Company header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && (
              <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{myOpenBills.length}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Open Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: active ? company.color + "22" : C.inkLine + "44", color: active ? company.color : C.inkSoft }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {subTab === "bills" && (
        <BillsView companies={allCompanies} bills={bills} saveBills={saveBills} forceCompanyId={company.id} />
      )}
      {subTab === "rentals" && (
        <RentalsView companies={allCompanies} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} payments={payments} savePayments={savePayments}
          forceCompanyId={company.id} />
      )}
      {subTab === "flips" && (
        <FlipsView flips={flips} saveFlips={saveFlips} forceCompanyId={company.id} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ companies, bills, saveBills, properties, tenants, payments, savePayments, flips, setTab }) {
  const cm = monthKey(todayISO());
  const companyById = Object.fromEntries(companies.map(c => [c.id, c]));

  const openBills = bills.filter(b => b.status === "open");
  const billsWithDays = openBills.map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const overdue = billsWithDays.filter(b => b.days !== null && b.days < 0);
  const dueThisWeek = billsWithDays.filter(b => b.days !== null && b.days >= 0 && b.days <= 7);
  const dueThisMonth = billsWithDays.filter(b => b.days !== null && b.days > 7 && b.days <= 30);

  const allUnits = tenants.filter(t => t.active !== false);
  const paidThisMonth = payments.filter(p => p.month === cm && p.status === "paid");
  const unpaidUnits = allUnits.filter(t => !paidThisMonth.find(p => p.tenantId === t.id));
  const totalExpected = allUnits.reduce((s, t) => s + (parseFloat(t.rent) || 0), 0);
  const totalCollected = paidThisMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  const StatCard = ({ label, value, sub, color, onClick }) => (
    <Card className="p-5 cursor-pointer hover:shadow-sm transition" style={{ borderLeft: `3px solid ${color}` }}>
      <div onClick={onClick}>
        <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{label}</p>
        <p className="font-serif text-3xl mt-1.5" style={{ color: C.ink }}>{value}</p>
        {sub && <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>{sub}</p>}
      </div>
    </Card>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl" style={{ color: C.ink }}>Overview</h2>
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Everything across all {companies.length} companies — click a company tab above for detail.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Overdue" value={overdue.length} sub={overdue.length ? "needs attention" : "all caught up"}
          color={overdue.length ? C.red : C.green} />
        <StatCard label="Due This Week" value={dueThisWeek.length} sub="next 7 days" color={C.amber} />
        <StatCard label="Rent Unpaid" value={unpaidUnits.length}
          sub={`${monthLabel(cm)} • ${allUnits.length} total units`}
          color={unpaidUnits.length ? C.red : C.green} />
        <StatCard label="Active Flips" value={flips.filter(f => !["Sold","On Hold"].includes(f.status)).length}
          sub={`${flips.length} total`} color={C.accent} />
      </div>

      {/* Per-company quick summaries */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {companies.map(c => {
          const myOpen = bills.filter(b => b.companyId === c.id && b.status === "open");
          const myOverdue = myOpen.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; });
          const myDueWeek = myOpen.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; });
          const myProps = properties.filter(p => p.companyId === c.id).length;
          const myFlips = flips.filter(f => f.companyId === c.id && !["Sold","On Hold"].includes(f.status)).length;
          return (
            <Card key={c.id} className="p-5 cursor-pointer hover:shadow-sm transition"
              style={{ borderLeft: `4px solid ${c.color}` }}
              onClick={() => setTab(`co:${c.id}`)}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg" style={{ color: C.ink }}>{c.name}</h3>
                <ChevronRight size={16} style={{ color: C.inkSoft }} />
              </div>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: C.inkSoft }}>
                <div><span className="font-serif text-lg" style={{ color: myOverdue.length ? C.red : C.ink }}>{myOverdue.length}</span> overdue</div>
                <div><span className="font-serif text-lg" style={{ color: myDueWeek.length ? C.amber : C.ink }}>{myDueWeek.length}</span> this week</div>
                <div><span className="font-serif text-lg" style={{ color: C.ink }}>{myOpen.length}</span> open</div>
              </div>
              <div className="flex gap-3 mt-2 text-xs" style={{ color: C.inkSoft }}>
                {myProps > 0 && <span>{myProps} properties</span>}
                {myFlips > 0 && <span>{myFlips} active flips</span>}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl" style={{ color: C.ink }}>Upcoming Bills</h2>
          </div>

          {overdue.length === 0 && dueThisWeek.length === 0 && dueThisMonth.length === 0 && (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>Nothing due in the next 30 days.</p>
          )}

          {overdue.length > 0 && (
            <div className="mb-4">
              <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.red, letterSpacing: "0.08em" }}>
                <AlertCircle size={12} className="inline mr-1" /> Overdue ({overdue.length})
              </p>
              {overdue.slice(0, 5).map(b => <BillRow key={b.id} bill={b} company={companyById[b.companyId]} onPaid={() => markPaid(b)} urgent />)}
            </div>
          )}

          {dueThisWeek.length > 0 && (
            <div className="mb-4">
              <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.amber, letterSpacing: "0.08em" }}>
                Due This Week ({dueThisWeek.length})
              </p>
              {dueThisWeek.slice(0, 5).map(b => <BillRow key={b.id} bill={b} company={companyById[b.companyId]} onPaid={() => markPaid(b)} />)}
            </div>
          )}

          {dueThisMonth.length > 0 && (
            <div>
              <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>
                Later This Month ({dueThisMonth.length})
              </p>
              {dueThisMonth.slice(0, 5).map(b => <BillRow key={b.id} bill={b} company={companyById[b.companyId]} onPaid={() => markPaid(b)} />)}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl" style={{ color: C.ink }}>Rent Status — {monthLabel(cm)}</h2>
          </div>

          {allUnits.length === 0 ? (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              No tenants added yet. Add properties & tenants from a company's Rentals tab.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded" style={{ background: C.paperSoft }}>
                  <p className="font-sans text-xs" style={{ color: C.inkSoft }}>Expected</p>
                  <p className="font-serif text-xl" style={{ color: C.ink }}>${totalExpected.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded" style={{ background: C.paperSoft }}>
                  <p className="font-sans text-xs" style={{ color: C.inkSoft }}>Collected</p>
                  <p className="font-serif text-xl" style={{ color: C.green }}>${totalCollected.toLocaleString()}</p>
                </div>
              </div>

              {unpaidUnits.length > 0 ? (
                <div>
                  <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.red, letterSpacing: "0.08em" }}>
                    Not Yet Paid ({unpaidUnits.length})
                  </p>
                  {unpaidUnits.map(t => {
                    const prop = properties.find(p => p.id === t.propertyId);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
                        <div>
                          <p className="font-sans text-sm font-medium">{t.name || "—"}</p>
                          <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
                            {prop?.nickname || prop?.address || "—"}{t.unit ? ` • Unit ${t.unit}` : ""} • ${(+t.rent || 0).toLocaleString()}
                          </p>
                        </div>
                        <Btn size="sm" variant="secondary" onClick={() => {
                          const newPayment = { id: uid(), tenantId: t.id, month: cm, amount: t.rent, datePaid: todayISO(), status: "paid", notes: "" };
                          savePayments([...payments, newPayment]);
                        }}>
                          <Check size={12} /> Mark Paid
                        </Btn>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="font-serif italic text-sm" style={{ color: C.green }}>✓ All rents collected for this month.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function BillRow({ bill, company, onPaid, urgent }) {
  const days = daysUntil(bill.dueDate);
  const dayText = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`;
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium truncate" style={{ color: C.ink }}>{bill.name}</p>
        <p className="font-sans text-xs truncate" style={{ color: C.inkSoft }}>
          {company?.name || "—"} • {bill.category} • {fmtDate(bill.dueDate)} ({dayText})
          {bill.amount && ` • $${(+bill.amount).toLocaleString()}`}
        </p>
      </div>
      <Btn size="sm" variant="secondary" onClick={onPaid} className="ml-2 shrink-0">
        <Check size={12} /> Paid
      </Btn>
    </div>
  );
}

// ============================================================
// BILLS VIEW (accepts forceCompanyId)
// ============================================================
function BillsView({ companies, bills, saveBills, forceCompanyId }) {
  const [filter, setFilter] = useState("open");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const effectiveCompanyFilter = forceCompanyId || companyFilter;

  const filtered = bills
    .filter(b => filter === "all" || b.status === filter)
    .filter(b => effectiveCompanyFilter === "all" || b.companyId === effectiveCompanyFilter)
    .filter(b => categoryFilter === "all" || b.category === categoryFilter)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => {
      if (filter === "paid") return (a.paidDate || "").localeCompare(b.paidDate || "");
      return (a.days ?? 999) - (b.days ?? 999);
    });

  const handleSave = (bill) => {
    if (editing) {
      saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    } else {
      saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    }
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };

  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  const reopenBill = (bill) => {
    saveBills(bills.map(b => b.id === bill.id ? { ...b, status: "open", paidDate: null } : b));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          {filtered.length} {filter === "open" ? "open" : filter} {filtered.length === 1 ? "bill" : "bills"}
        </p>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Bill
        </Btn>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <Label>Status</Label>
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="block mt-1">
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </Select>
        </div>
        {!forceCompanyId && (
          <div>
            <Label>Company</Label>
            <Select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="block mt-1">
              <option value="all">All companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label>Category</Label>
          <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="block mt-1">
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>Search</Label>
          <div className="relative mt-1">
            <Search size={14} className="absolute left-2.5 top-2.5" style={{ color: C.inkSoft }} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bill name…"
              className="w-full pl-8" />
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>No bills match these filters.</p>
        ) : (
          <div>
            {filtered.map(b => {
              const company = companies.find(c => c.id === b.companyId);
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 px-4 py-3 hover:bg-black/5"
                  style={{ borderBottom: `1px solid ${C.inkLine + "55"}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink }}>{b.name}</p>
                      {!forceCompanyId && company && <Pill color={company.color}>{company.name}</Pill>}
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                      {b.notes && ` • ${b.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" ? (
                      <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Paid</Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={() => reopenBill(b)}>Reopen</Btn>
                    )}
                    <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editing} companies={companies} onSave={handleSave} forceCompanyId={forceCompanyId}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function BillForm({ bill, companies, onSave, onCancel, onDelete, forceCompanyId, forceFlipId, forcePropertyId }) {
  const [form, setForm] = useState({
    name: bill?.name || "",
    companyId: bill?.companyId || forceCompanyId || companies[0]?.id || "",
    category: bill?.category || "Other",
    amount: bill?.amount || "",
    dueDate: bill?.dueDate || todayISO(),
    recurrence: bill?.recurrence || "none",
    notes: bill?.notes || "",
    flipId: bill?.flipId || forceFlipId || null,
    propertyId: bill?.propertyId || forcePropertyId || null
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <Label>Bill name *</Label>
        <Input value={form.name} onChange={e => update("name", e.target.value)} className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {!forceCompanyId && (
          <div>
            <Label>Company</Label>
            <Select value={form.companyId} onChange={e => update("companyId", e.target.value)} className="block w-full mt-1">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <div className={forceCompanyId ? "col-span-2" : ""}>
          <Label>Category</Label>
          <Select value={form.category} onChange={e => update("category", e.target.value)} className="block w-full mt-1">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Due date</Label>
          <Input type="date" value={form.dueDate} onChange={e => update("dueDate", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Amount</Label>
          <Input type="number" step="0.01" value={form.amount} onChange={e => update("amount", e.target.value)}
            placeholder="optional" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Recurrence</Label>
          <Select value={form.recurrence} onChange={e => update("recurrence", e.target.value)} className="block w-full mt-1">
            {RECURRENCES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <div className="flex justify-between items-center gap-2 pt-2">
        <div>
          {bill && bill.id && onDelete && (
            <Btn variant="danger" size="sm" onClick={() => { if (confirm("Delete this bill?")) onDelete(bill.id); }}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => form.name && onSave(form)} disabled={!form.name}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RENTALS VIEW (accepts forceCompanyId)
// ============================================================
function RentalsView({ companies, properties, saveProperties, tenants, saveTenants, payments, savePayments, forceCompanyId }) {
  const [view, setView] = useState("properties");
  const [editingProp, setEditingProp] = useState(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [expandedProp, setExpandedProp] = useState(null);

  const visibleProperties = forceCompanyId
    ? properties.filter(p => p.companyId === forceCompanyId)
    : properties;
  const visibleTenants = tenants.filter(t => visibleProperties.find(p => p.id === t.propertyId));

  const handleSaveProp = (p) => {
    if (editingProp && editingProp.id) saveProperties(properties.map(x => x.id === editingProp.id ? { ...editingProp, ...p } : x));
    else saveProperties([...properties, { id: uid(), ...p }]);
    setEditingProp(null); setShowPropForm(false);
  };

  const handleDeleteProp = (id) => {
    if (confirm("Delete this property? Tenants on it will also be removed.")) {
      saveProperties(properties.filter(p => p.id !== id));
      saveTenants(tenants.filter(t => t.propertyId !== id));
    }
  };

  const handleSaveTenant = (t) => {
    if (editingTenant && editingTenant.id) saveTenants(tenants.map(x => x.id === editingTenant.id ? { ...editingTenant, ...t } : x));
    else saveTenants([...tenants, { id: uid(), active: true, ...t }]);
    setEditingTenant(null); setShowTenantForm(false);
  };

  const handleDeleteTenant = (id) => {
    if (confirm("Delete this tenant?")) saveTenants(tenants.filter(t => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          {visibleProperties.length} properties • {visibleTenants.filter(t => t.active !== false).length} active tenants
        </p>
        <div className="flex items-center gap-2">
          <div className="flex border rounded overflow-hidden" style={{ borderColor: C.inkLine }}>
            <button onClick={() => setView("properties")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "properties" ? "font-semibold" : ""}`}
              style={{ background: view === "properties" ? C.ink : "transparent", color: view === "properties" ? C.paper : C.ink }}>
              Properties
            </button>
            <button onClick={() => setView("rentroll")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "rentroll" ? "font-semibold" : ""}`}
              style={{ background: view === "rentroll" ? C.ink : "transparent", color: view === "rentroll" ? C.paper : C.ink }}>
              Rent Roll
            </button>
          </div>
          <Btn onClick={() => { setEditingProp(null); setShowPropForm(true); }}>
            <Plus size={14} /> Add Property
          </Btn>
        </div>
      </div>

      {view === "properties" && (
        <div className="space-y-3">
          {visibleProperties.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif italic" style={{ color: C.inkSoft }}>
                No properties yet for this company. Click "Add Property" to start.
              </p>
            </Card>
          ) : visibleProperties.map(p => {
            const company = companies.find(c => c.id === p.companyId);
            const propTenants = tenants.filter(t => t.propertyId === p.id);
            const expanded = expandedProp === p.id;
            return (
              <Card key={p.id}>
                <div className="p-4 flex items-center gap-3">
                  <button onClick={() => setExpandedProp(expanded ? null : p.id)} className="p-1 hover:bg-black/10 rounded">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink }}>{p.nickname || p.address || "Untitled"}</p>
                      {!forceCompanyId && company && <Pill color={company.color}>{company.name}</Pill>}
                      <Pill color={C.inkSoft}>{p.type}</Pill>
                      <Pill color={C.accent}>{propTenants.filter(t => t.active !== false).length}/{p.units} occupied</Pill>
                    </div>
                    {p.address && <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>{p.address}</p>}
                  </div>
                  <button onClick={() => { setEditingProp(p); setShowPropForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => handleDeleteProp(p.id)} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: C.inkLine + "55" }}>
                    <div className="flex items-center justify-between my-3">
                      <p className="font-serif text-sm" style={{ color: C.ink }}>Tenants</p>
                      <Btn size="sm" variant="secondary" onClick={() => { setEditingTenant({ propertyId: p.id }); setShowTenantForm(true); }}>
                        <Plus size={12} /> Add Tenant
                      </Btn>
                    </div>
                    {propTenants.length === 0 ? (
                      <p className="font-serif italic text-sm py-2" style={{ color: C.inkSoft }}>No tenants on this property.</p>
                    ) : propTenants.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-b-0"
                        style={{ borderColor: C.inkLine + "44" }}>
                        <div>
                          <p className="font-sans text-sm font-medium">{t.name}{t.unit ? ` — Unit ${t.unit}` : ""}</p>
                          <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
                            ${(+t.rent || 0).toLocaleString()}/mo
                            {t.phone && ` • ${t.phone}`}
                            {t.email && ` • ${t.email}`}
                            {t.leaseEnd && ` • Lease ends ${fmtDate(t.leaseEnd)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingTenant(t); setShowTenantForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                            <Pencil size={14} style={{ color: C.inkSoft }} />
                          </button>
                          <button onClick={() => handleDeleteTenant(t.id)} className="p-1.5 hover:bg-red-100 rounded">
                            <Trash2 size={14} style={{ color: C.red }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {view === "rentroll" && (
        <RentRoll properties={visibleProperties} tenants={visibleTenants} payments={payments} savePayments={savePayments} />
      )}

      <Modal open={showPropForm} onClose={() => { setShowPropForm(false); setEditingProp(null); }}
        title={editingProp?.id ? "Edit Property" : "Add Property"}>
        <PropertyForm property={editingProp} companies={companies} onSave={handleSaveProp}
          forceCompanyId={forceCompanyId}
          onCancel={() => { setShowPropForm(false); setEditingProp(null); }} />
      </Modal>

      <Modal open={showTenantForm} onClose={() => { setShowTenantForm(false); setEditingTenant(null); }}
        title={editingTenant?.id ? "Edit Tenant" : "Add Tenant"}>
        <TenantForm tenant={editingTenant} properties={visibleProperties} onSave={handleSaveTenant}
          onCancel={() => { setShowTenantForm(false); setEditingTenant(null); }} />
      </Modal>
    </div>
  );
}

function PropertyForm({ property, companies, onSave, onCancel, forceCompanyId }) {
  const [form, setForm] = useState({
    nickname: property?.nickname || "",
    address: property?.address || "",
    companyId: property?.companyId || forceCompanyId || companies.find(c => c.id === "rentals")?.id || companies[0]?.id || "",
    type: property?.type || "Single Family",
    units: property?.units || 1,
    notes: property?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nickname (for quick reference)</Label>
          <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
            placeholder="e.g. Maple Duplex" className="block w-full mt-1" />
        </div>
        {!forceCompanyId && (
          <div>
            <Label>Owning company</Label>
            <Select value={form.companyId} onChange={e => update("companyId", e.target.value)} className="block w-full mt-1">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
      </div>
      <div>
        <Label>Address</Label>
        <Input value={form.address} onChange={e => update("address", e.target.value)}
          placeholder="123 Main St, City, ST" className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
            {["Single Family","Duplex","Triplex","Fourplex","Multi-family","Storage","Commercial","Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label># of units</Label>
          <Input type="number" min="1" value={form.units} onChange={e => update("units", +e.target.value)}
            className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(form)}>Save</Btn>
      </div>
    </div>
  );
}

function TenantForm({ tenant, properties, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: tenant?.name || "",
    propertyId: tenant?.propertyId || properties[0]?.id || "",
    unit: tenant?.unit || "",
    rent: tenant?.rent || "",
    deposit: tenant?.deposit || "",
    phone: tenant?.phone || "",
    email: tenant?.email || "",
    leaseStart: tenant?.leaseStart || "",
    leaseEnd: tenant?.leaseEnd || "",
    movingOutDate: tenant?.movingOutDate || "",
    active: tenant?.active !== false,
    notes: tenant?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tenant name *</Label>
          <Input value={form.name} onChange={e => update("name", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Property</Label>
          <Select value={form.propertyId} onChange={e => update("propertyId", e.target.value)} className="block w-full mt-1">
            {properties.map(p => <option key={p.id} value={p.id}>{p.nickname || p.address}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Unit</Label>
          <Input value={form.unit} onChange={e => update("unit", e.target.value)}
            placeholder="A, B, 1, etc" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Monthly rent</Label>
          <Input type="number" step="0.01" value={form.rent} onChange={e => update("rent", e.target.value)}
            className="block w-full mt-1" />
        </div>
        <div>
          <Label>Security deposit</Label>
          <Input type="number" step="0.01" value={form.deposit} onChange={e => update("deposit", e.target.value)}
            className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => update("phone", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={e => update("email", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Lease start</Label>
          <Input type="date" value={form.leaseStart} onChange={e => update("leaseStart", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Lease end</Label>
          <Input type="date" value={form.leaseEnd} onChange={e => update("leaseEnd", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Moving out on (if notice given)</Label>
        <Input type="date" value={form.movingOutDate} onChange={e => update("movingOutDate", e.target.value)}
          className="block w-full mt-1" />
        <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
          Set this when the tenant gives notice. A warning will show on the property card.
        </p>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={e => update("active", e.target.checked)} />
        <span className="font-sans">Active tenant (uncheck if moved out)</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.name && onSave(form)} disabled={!form.name}>Save</Btn>
      </div>
    </div>
  );
}

function RentRoll({ properties, tenants, payments, savePayments }) {
  const [month, setMonth] = useState(monthKey(todayISO()));

  const monthsRange = useMemo(() => {
    const list = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + i);
      list.push(d.toISOString().slice(0, 7));
    }
    return list;
  }, []);

  const activeUnits = tenants.filter(t => t.active !== false);
  const monthPayments = payments.filter(p => p.month === month && activeUnits.find(t => t.id === p.tenantId));

  const togglePaid = (tenant) => {
    const existing = payments.find(p => p.tenantId === tenant.id && p.month === month);
    if (existing) {
      savePayments(payments.filter(p => p.id !== existing.id));
    } else {
      savePayments([...payments, {
        id: uid(), tenantId: tenant.id, month, amount: tenant.rent,
        datePaid: todayISO(), status: "paid", notes: ""
      }]);
    }
  };

  const expected = activeUnits.reduce((s, t) => s + (+t.rent || 0), 0);
  const collected = monthPayments.reduce((s, p) => s + (+p.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Select value={month} onChange={e => setMonth(e.target.value)}>
          {monthsRange.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </Select>
        <div className="flex gap-4 text-sm">
          <div><span style={{ color: C.inkSoft }}>Expected: </span>
            <span className="font-serif" style={{ color: C.ink }}>${expected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Collected: </span>
            <span className="font-serif" style={{ color: C.green }}>${collected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Outstanding: </span>
            <span className="font-serif" style={{ color: expected - collected > 0 ? C.red : C.green }}>
              ${(expected - collected).toLocaleString()}</span></div>
        </div>
      </div>

      <Card>
        {activeUnits.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>No active tenants.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: C.paperSoft }}>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Property / Unit</th>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Tenant</th>
                <th className="text-right px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Rent</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Status</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Paid On</th>
              </tr>
            </thead>
            <tbody>
              {activeUnits.map(t => {
                const prop = properties.find(p => p.id === t.propertyId);
                const payment = monthPayments.find(p => p.tenantId === t.id);
                return (
                  <tr key={t.id} className="ledger-row border-t" style={{ borderColor: C.inkLine + "44" }}>
                    <td className="px-4 py-3 font-sans text-sm">
                      {prop?.nickname || prop?.address || "—"}
                      {t.unit && <span style={{ color: C.inkSoft }}> • Unit {t.unit}</span>}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm">{t.name}</td>
                    <td className="px-4 py-3 font-sans text-sm text-right">${(+t.rent || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePaid(t)}
                        className="px-3 py-1 rounded text-xs font-semibold transition"
                        style={{
                          background: payment ? C.green : "transparent",
                          color: payment ? C.paper : C.red,
                          border: `1px solid ${payment ? C.green : C.red}`
                        }}>
                        {payment ? "✓ Paid" : "Unpaid"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-sans text-xs" style={{ color: C.inkSoft }}>
                      {payment ? fmtDate(payment.datePaid) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// FLIPS VIEW (accepts forceCompanyId)
// ============================================================
function FlipsView({ flips, saveFlips, forceCompanyId }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");

  const visibleFlips = forceCompanyId
    ? flips.filter(f => f.companyId === forceCompanyId)
    : flips;

  const filtered = visibleFlips.filter(f => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return !["Sold","On Hold"].includes(f.status);
    return f.status === statusFilter;
  });

  const handleSave = (f) => {
    if (editing) saveFlips(flips.map(x => x.id === editing.id ? { ...editing, ...f } : x));
    else saveFlips([...flips, { id: uid(), companyId: forceCompanyId || "flip", ...f }]);
    setEditing(null); setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this flip project?")) saveFlips(flips.filter(f => f.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          {filtered.length} {statusFilter === "active" ? "active" : statusFilter} projects
        </p>
        <div className="flex gap-2 items-end">
          <div>
            <Label>Filter</Label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="block mt-1">
              <option value="active">Active only</option>
              <option value="all">All</option>
              {FLIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Flip
          </Btn>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-serif italic" style={{ color: C.inkSoft }}>
            {visibleFlips.length === 0 ? "No flip projects added yet. Click 'Add Flip' to track your first one." : "No projects match this filter."}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(f => {
            const statusColor = f.status === "Sold" ? C.green
              : f.status === "On Hold" ? C.inkSoft
              : f.status === "Listed" || f.status === "Pending" ? C.amber
              : C.accent;
            return (
              <Card key={f.id} className="p-4" style={{ borderLeft: `3px solid ${statusColor}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg font-medium" style={{ color: C.ink }}>{f.address || "Unnamed flip"}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Pill color={statusColor}>{f.status}</Pill>
                      {f.nickname && <Pill color={C.inkSoft}>{f.nickname}</Pill>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(f); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  {f.purchasePrice && <div><span style={{ color: C.inkSoft }}>Purchase:</span> <span className="font-serif">${(+f.purchasePrice).toLocaleString()}</span></div>}
                  {f.purchaseDate && <div><span style={{ color: C.inkSoft }}>Bought:</span> {fmtDate(f.purchaseDate)}</div>}
                  {f.targetSale && <div><span style={{ color: C.inkSoft }}>Target sale:</span> <span className="font-serif">${(+f.targetSale).toLocaleString()}</span></div>}
                  {f.actualSale && <div><span style={{ color: C.inkSoft }}>Sold for:</span> <span className="font-serif" style={{ color: C.green }}>${(+f.actualSale).toLocaleString()}</span></div>}
                  {f.budget && <div><span style={{ color: C.inkSoft }}>Rehab budget:</span> <span className="font-serif">${(+f.budget).toLocaleString()}</span></div>}
                  {f.spent && <div><span style={{ color: C.inkSoft }}>Spent:</span> <span className="font-serif">${(+f.spent).toLocaleString()}</span></div>}
                </div>
                {f.notes && <p className="font-sans text-xs mt-3 pt-3 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "44" }}>{f.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Flip Project" : "Add Flip Project"} wide>
        <FlipForm flip={editing} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function FlipForm({ flip, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: flip?.address || "",
    nickname: flip?.nickname || "",
    status: flip?.status || "Acquiring",
    purchasePrice: flip?.purchasePrice || "",
    purchaseDate: flip?.purchaseDate || "",
    budget: flip?.budget || "",
    spent: flip?.spent || "",
    targetSale: flip?.targetSale || "",
    actualSale: flip?.actualSale || "",
    saleDate: flip?.saleDate || "",
    notes: flip?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Address *</Label>
          <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={e => update("status", e.target.value)} className="block w-full mt-1">
            {FLIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Nickname (optional)</Label>
        <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
          placeholder="e.g. The Yellow House" className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Purchase price</Label>
          <Input type="number" value={form.purchasePrice} onChange={e => update("purchasePrice", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Purchase date</Label>
          <Input type="date" value={form.purchaseDate} onChange={e => update("purchaseDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Rehab budget</Label>
          <Input type="number" value={form.budget} onChange={e => update("budget", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Spent to date</Label>
          <Input type="number" value={form.spent} onChange={e => update("spent", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Target sale</Label>
          <Input type="number" value={form.targetSale} onChange={e => update("targetSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Actual sale</Label>
          <Input type="number" value={form.actualSale} onChange={e => update("actualSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Sale date</Label>
          <Input type="date" value={form.saleDate} onChange={e => update("saleDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// NOTES VIEW (per-company)
// ============================================================
function NotesView({ notes, saveNotes, companyId, companyName }) {
  const stored = notes[companyId] || "";
  const [local, setLocal] = useState(stored);

  // Re-sync if the active company changes
  useEffect(() => { setLocal(notes[companyId] || ""); }, [companyId, notes]);

  const commit = () => {
    if (local !== (notes[companyId] || "")) {
      saveNotes({ ...notes, [companyId]: local });
    }
  };

  return (
    <div>
      <p className="font-serif italic text-sm mb-4" style={{ color: C.inkSoft }}>
        Scratchpad for {companyName} — saves when you click away from the box.
      </p>
      <Card className="p-4">
        <Textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={commit}
          rows={20} className="block w-full" placeholder="Write anything here…" />
      </Card>
    </div>
  );
}

// ============================================================
// COMPANIES (SETTINGS) VIEW
// ============================================================
function CompaniesView({ companies, saveCompanies, bills, setBills, properties, setProperties, tenants, setTenants, payments, setPayments, flips, setFlips, notes, setNotes, payrolls, setPayrolls, setCompanies }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = (c) => {
    if (editing) saveCompanies(companies.map(x => x.id === editing.id ? { ...editing, ...c } : x));
    else saveCompanies([...companies, { id: uid(), ...c }]);
    setEditing(null); setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this company? Bills, properties, and flips assigned to it will remain but won't have a company label.")) {
      saveCompanies(companies.filter(c => c.id !== id));
    }
  };

  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      companies, bills, properties, tenants, payments, flips, notes, payrolls
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.companies || !Array.isArray(data.companies)) {
          throw new Error("This doesn't look like a Ledger backup file (no companies found).");
        }
        const proceed = confirm(
          `Restore data from this backup?\n\n` +
          `Backup contains:\n` +
          `• ${data.companies?.length || 0} companies\n` +
          `• ${data.bills?.length || 0} bills\n` +
          `• ${data.properties?.length || 0} properties\n` +
          `• ${data.tenants?.length || 0} tenants\n` +
          `• ${data.payments?.length || 0} rent payments\n` +
          `• ${data.flips?.length || 0} flip projects\n` +
          `• ${data.payrolls?.length || 0} payroll entries\n\n` +
          `This will REPLACE all your current data. Continue?`
        );
        if (!proceed) { setImporting(false); e.target.value = ""; return; }

        // Write each to storage and update state
        // Save in dependency order so foreign keys are satisfied
        // 1. Companies (no deps)
        if (data.companies) { setCompanies(data.companies); await save("bk:companies", data.companies); }
        // 2. Properties, flips (depend on companies)
        if (data.properties) { setProperties(data.properties); await save("bk:properties", data.properties); }
        if (data.flips) { setFlips(data.flips); await save("bk:flips", data.flips); }
        // 3. Tenants (depend on properties), bills (depend on co/prop/flip), payrolls (depend on companies)
        if (data.tenants) { setTenants(data.tenants); await save("bk:tenants", data.tenants); }
        if (data.bills) { setBills(data.bills); await save("bk:bills", data.bills); }
        if (data.payrolls) { setPayrolls(data.payrolls); await save("bk:payrolls", data.payrolls); }
        // 4. Payments (depend on tenants), notes (depend on companies)
        if (data.payments) { setPayments(data.payments); await save("bk:payments", data.payments); }
        if (data.notes) { setNotes(data.notes); await save("bk:notes", data.notes); }
        alert("Data restored successfully.");
      } catch (err) {
        alert("Could not read backup file: " + err.message);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Backup & Restore */}
      <Card className="p-5 mb-6" style={{ borderLeft: `4px solid ${C.accent}` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-serif text-lg" style={{ color: C.ink }}>Backup & Restore</h3>
            <p className="font-sans text-sm mt-1" style={{ color: C.inkSoft }}>
              Your data lives in this browser. Download a backup file regularly so nothing's lost if the browser is cleared or you switch computers. Restoring will REPLACE all current data with what's in the backup file.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn onClick={exportData}>Export Backup</Btn>
            <Btn variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "Restore from File"}
            </Btn>
            <input ref={fileInputRef} type="file" accept=".json,application/json"
              onChange={handleFileImport} style={{ display: "none" }} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl" style={{ color: C.ink }}>Companies</h2>
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            {companies.length} companies set up — each gets its own tab above
          </p>
        </div>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Company
        </Btn>
      </div>

      <div className="space-y-3">
        {companies.map(c => (
          <Card key={c.id} className="p-4" style={{ borderLeft: `4px solid ${c.color}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-serif text-lg" style={{ color: C.ink }}>{c.name}</p>
                  <Pill color={c.color}>{c.type}</Pill>
                  {c.showPayroll && <Pill color={C.inkSoft}>Payroll: {(c.payrollDays || [1,10,25]).join(", ")}</Pill>}
                </div>
                {c.notes && <p className="font-sans text-sm mt-2" style={{ color: C.inkSoft }}>{c.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                  <Pencil size={14} style={{ color: C.inkSoft }} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-100 rounded">
                  <Trash2 size={14} style={{ color: C.red }} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Company" : "Add Company"}>
        <CompanyForm company={editing} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function CompanyForm({ company, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: company?.name || "",
    type: company?.type || "LLC",
    color: company?.color || "#5b7a8c",
    showPayroll: company?.showPayroll !== false,
    payrollDays: company?.payrollDays || [1, 10, 25],
    notes: company?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  const colors = ["#c4602f","#5b7a8c","#8c7a5b","#5b7a4b","#8c5b7a","#7a5b8c","#a14430","#b88a2f"];

  return (
    <div className="space-y-4">
      <div>
        <Label>Company name *</Label>
        <Input value={form.name} onChange={e => update("name", e.target.value)} className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Entity type</Label>
          <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
            {["LLC","Corporation","S-Corp","C-Corp","Partnership","Sole Proprietor","Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Color tag</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {colors.map(c => (
              <button key={c} onClick={() => update("color", c)}
                className="w-7 h-7 rounded-full transition"
                style={{ background: c, border: form.color === c ? `2px solid ${C.ink}` : `1px solid ${C.inkLine}`, transform: form.color === c ? "scale(1.1)" : "scale(1)" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="pt-2 border-t" style={{ borderColor: C.inkLine + "55" }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.showPayroll} onChange={e => update("showPayroll", e.target.checked)} />
          <span className="font-sans">Show Payroll & Quarterlies tab</span>
        </label>
        {form.showPayroll && (
          <div className="mt-3 ml-6">
            <Label>Payroll days of month</Label>
            <Input
              value={form.payrollDays.join(", ")}
              onChange={e => {
                const days = e.target.value.split(/[,\s]+/)
                  .map(s => parseInt(s.trim()))
                  .filter(n => Number.isFinite(n) && n >= 1 && n <= 31);
                update("payrollDays", days);
              }}
              placeholder="e.g. 1, 10, 25  or just  1"
              className="block w-full mt-1" />
            <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
              Enter day numbers (1-31) separated by commas. The holiday/weekend rule still applies — payday moves to the first business day before.
            </p>
          </div>
        )}
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.name && onSave(form)} disabled={!form.name}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// JMC: HOLIDAYS + PAYROLL DATE CALCULATION
// ============================================================
const US_FEDERAL_HOLIDAYS = new Set([
  // 2026
  "2026-01-01","2026-01-19","2026-02-16","2026-05-25","2026-06-19",
  "2026-07-03","2026-09-07","2026-10-12","2026-11-11","2026-11-26","2026-12-25",
  // 2027
  "2027-01-01","2027-01-18","2027-02-15","2027-05-31","2027-06-18",
  "2027-07-05","2027-09-06","2027-10-11","2027-11-11","2027-11-25","2027-12-24",
  // 2028
  "2028-01-17","2028-02-21","2028-05-29","2028-06-19","2028-07-04",
  "2028-09-04","2028-10-09","2028-11-10","2028-11-23","2028-12-25"
]);

const isWeekendISO = (iso) => {
  const d = new Date(iso + "T00:00:00").getDay();
  return d === 0 || d === 6;
};
const isHolidayISO = (iso) => US_FEDERAL_HOLIDAYS.has(iso);

// If payday falls on a weekend or federal holiday, move to the first business day BEFORE.
const computePayday = (targetIso) => {
  let d = new Date(targetIso + "T00:00:00");
  const iso = () => d.toISOString().split("T")[0];
  while (isWeekendISO(iso()) || isHolidayISO(iso())) {
    d.setDate(d.getDate() - 1);
  }
  return iso();
};

// IRS semi-weekly deposit rule:
//   Payday Mon or Tue  -> EFTPS due the following Friday (same week)
//   Payday Wed/Thu/Fri -> EFTPS due the following Wednesday (next week)
const computeEftps = (paydayIso) => {
  if (!paydayIso) return null;
  const d = new Date(paydayIso + "T00:00:00");
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  let add = 0;
  if (dow === 1 || dow === 2) add = 5 - dow;           // Mon/Tue -> Fri
  else if (dow >= 3 && dow <= 5) add = 3 + 7 - dow;    // Wed/Thu/Fri -> next Wed
  else if (dow === 6) add = 4;                          // Sat -> next Wed
  else if (dow === 0) add = 3;                          // Sun -> next Wed
  d.setDate(d.getDate() + add);
  return d.toISOString().split("T")[0];
};

// Get payroll events for a given month. Pay days = 1st, 10th, 25th. Submission = 48hr before payday.
const getPayrollEventsForMonth = (yearMonth) => {
  const [y, m] = yearMonth.split("-").map(Number);
  const events = [];
  [1, 10, 25].forEach(day => {
    const target = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const payday = computePayday(target);
    const submit = addDays(payday, -2);
    events.push({ date: submit, title: "Submit payroll", type: "payroll-submit", color: C.amber, payday });
    events.push({ date: payday, title: `Payday (${day}${day === 1 ? "st" : day === 25 ? "th" : "th"})`, type: "payroll-pay", color: C.green });
  });
  return events;
};

const getPayrollEventsForRange = (startIso, endIso) => {
  const events = [];
  let d = new Date(startIso + "T00:00:00");
  d.setDate(1);
  const end = new Date(endIso + "T00:00:00");
  while (d <= end) {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    events.push(...getPayrollEventsForMonth(ym));
    d.setMonth(d.getMonth() + 1);
  }
  return events.filter(e => e.date >= startIso && e.date <= endIso);
};

// ============================================================
// CALENDAR COMPONENT
// ============================================================
function CalendarGrid({ month, events, onChangeMonth, onDayClick, onEventClick }) {
  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayStr = todayISO();

  const eventsByDate = {};
  events.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onChangeMonth(-1)}
          className="px-3 py-1.5 rounded hover:bg-black/5 font-sans text-sm"
          style={{ color: C.ink }}>← Prev</button>
        <h3 className="font-serif text-xl" style={{ color: C.ink }}>{monthLabel(month)}</h3>
        <button onClick={() => onChangeMonth(1)}
          className="px-3 py-1.5 rounded hover:bg-black/5 font-sans text-sm"
          style={{ color: C.ink }}>Next →</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="font-sans text-xs uppercase font-semibold text-center py-1"
            style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} style={{ background: "transparent" }} />;
          const dayEvents = eventsByDate[iso] || [];
          const isToday = iso === todayStr;
          const isHoliday = isHolidayISO(iso);
          const isWeekend = isWeekendISO(iso);
          const clickable = onDayClick && dayEvents.length > 0;
          return (
            <div key={i}
              onClick={() => clickable && onDayClick(iso, dayEvents)}
              className={`min-h-[80px] p-1.5 rounded transition ${clickable ? "cursor-pointer hover:shadow-md" : ""}`}
              style={{
                background: isToday ? C.accent + "22" : isHoliday ? C.inkLine + "44" : C.paper,
                border: `1px solid ${isToday ? C.accent : C.inkLine + "88"}`
              }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif text-sm font-medium"
                  style={{ color: isToday ? C.accent : isWeekend || isHoliday ? C.inkSoft : C.ink }}>
                  {parseInt(iso.split("-")[2])}
                </span>
                {isHoliday && <span className="font-sans text-[9px] uppercase" style={{ color: C.inkSoft }}>Hol</span>}
              </div>
              {dayEvents.slice(0, 3).map((e, j) => (
                <div key={j} className="text-[10px] font-sans px-1 py-0.5 rounded mb-0.5 truncate"
                  style={{ background: e.color + "33", color: e.color, border: `1px solid ${e.color}55` }}
                  title={e.title}>
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] font-sans" style={{ color: C.inkSoft }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// JMC VIEW (custom per-company layout for JMC Investments)
// ============================================================
function JMCView({ company, allCompanies, bills, saveBills, properties, saveProperties, tenants, saveTenants, payments, savePayments, flips, saveFlips, notes, saveNotes, payrolls, savePayrolls }) {
  const [subTab, setSubTab] = useState("reminders");

  const myBills = bills.filter(b => b.companyId === company.id);
  const myProjects = flips.filter(f => f.companyId === company.id);
  const myRentals = properties.filter(p => p.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const subTabs = [
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "projects", label: "Projects", icon: Hammer, count: myProjects.length },
    { id: "rentals", label: "Rentals", icon: Building2, count: myRentals.length },
    { id: "payroll", label: "Payroll & Quarterlies", icon: Calendar },
    { id: "general", label: "General Bills", icon: Receipt },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{myOpenBills.length}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Open Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: active ? company.color + "22" : C.inkLine + "44", color: active ? company.color : C.inkSoft }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {subTab === "reminders" && (
        <JMCRemindersView companyId={company.id} bills={bills} saveBills={saveBills}
          flips={flips} properties={properties} companies={allCompanies}
          payrolls={payrolls} />
      )}
      {subTab === "projects" && (
        <JMCProjectsView companyId={company.id} flips={flips} saveFlips={saveFlips}
          bills={bills} saveBills={saveBills} companies={allCompanies}
          properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} />
      )}
      {subTab === "rentals" && (
        <JMCRentalsView companyId={company.id} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} bills={bills} saveBills={saveBills}
          companies={allCompanies} />
      )}
      {subTab === "payroll" && (
        <JMCPayrollView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies}
          payrolls={payrolls} savePayrolls={savePayrolls} />
      )}
      {subTab === "general" && (
        <JMCGeneralBillsView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

// ============================================================
// JMC: REMINDERS VIEW
// ============================================================
function JMCRemindersView({ companyId, bills, saveBills, flips, properties, companies, payrolls }) {
  const [view, setView] = useState("list");
  const [calMonth, setCalMonth] = useState(monthKey(todayISO()));
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("open");
  const [dayModal, setDayModal] = useState(null); // { date, events }

  const myBills = useMemo(() => bills.filter(b => b.companyId === companyId), [bills, companyId]);

  const filtered = useMemo(() => myBills
    .filter(b => filterStatus === "all" || b.status === filterStatus)
    .filter(b => filterCategory === "all" || b.category === filterCategory)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999)),
    [myBills, filterStatus, filterCategory]);

  // Calendar events: bills + computed payroll dates
  const monthStart = calMonth + "-01";
  const monthEnd = addMonths(monthStart, 1);

  const allEvents = useMemo(() => {
    const billEvents = myBills
      .filter(b => b.dueDate && b.dueDate >= monthStart && b.dueDate < monthEnd)
      .map(b => {
        const flip = b.flipId ? flips.find(f => f.id === b.flipId) : null;
        const prop = b.propertyId ? properties.find(p => p.id === b.propertyId) : null;
        const prefix = flip ? `[${flip.nickname || flip.address}] ` : prop ? `[${prop.nickname || prop.address}] ` : "";
        return {
          date: b.dueDate,
          title: prefix + b.name,
          color: b.status === "paid" ? C.green : daysUntil(b.dueDate) < 0 ? C.red : C.ink,
          type: "bill",
          billId: b.id
        };
      });
    const payrollEvents = (payrolls || []).filter(p => p.companyId === companyId).flatMap(p => {
      const events = [];
      if (p.payday && p.payday >= monthStart && p.payday < monthEnd) {
        events.push({ date: p.payday, title: p.label || "Payday", color: p.status === "done" ? C.inkSoft : C.green, type: "payroll-pay", payrollId: p.id });
      }
      if (p.submitDate && p.submitDate >= monthStart && p.submitDate < monthEnd) {
        events.push({ date: p.submitDate, title: `Submit: ${p.label || "Payroll"}`, color: p.status === "done" ? C.inkSoft : C.amber, type: "payroll-submit", payrollId: p.id });
      }
      return events;
    });
    return [...billEvents, ...payrollEvents];
  }, [myBills, calMonth, flips, properties, monthStart, monthEnd, payrolls, companyId]);

  const handleSave = (bill) => {
    if (editing) saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditing(null); setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this reminder?")) saveBills(bills.filter(b => b.id !== id));
  };

  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Everything with a due date — bills, project costs, payroll, quarterlies.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex border rounded overflow-hidden" style={{ borderColor: C.inkLine }}>
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "list" ? "font-semibold" : ""}`}
              style={{ background: view === "list" ? C.ink : "transparent", color: view === "list" ? C.paper : C.ink }}>
              List
            </button>
            <button onClick={() => setView("calendar")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "calendar" ? "font-semibold" : ""}`}
              style={{ background: view === "calendar" ? C.ink : "transparent", color: view === "calendar" ? C.paper : C.ink }}>
              Calendar
            </button>
          </div>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Reminder
          </Btn>
        </div>
      </div>

      {view === "list" && (
        <>
          <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="block mt-1">
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="block mt-1">
                <option value="all">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </Card>
          <Card>
            {filtered.length === 0 ? (
              <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>Nothing here yet.</p>
            ) : filtered.map(b => {
              const flip = b.flipId ? flips.find(f => f.id === b.flipId) : null;
              const prop = b.propertyId ? properties.find(p => p.id === b.propertyId) : null;
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 px-4 py-3 hover:bg-black/5"
                  style={{ borderBottom: `1px solid ${C.inkLine + "55"}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink }}>{b.name}</p>
                      {flip && <Pill color={C.accent}>{flip.nickname || flip.address}</Pill>}
                      {prop && <Pill color={C.green}>{prop.nickname || prop.address}</Pill>}
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.amber}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                      {b.notes && ` • ${b.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" && (
                      <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>
                    )}
                    <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {view === "calendar" && (
        <Card className="p-5">
          <CalendarGrid month={calMonth} events={allEvents}
            onChangeMonth={(delta) => setCalMonth(monthKey(addMonths(calMonth + "-01", delta)))}
            onDayClick={(iso, evs) => setDayModal({ date: iso, events: evs })} />
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: C.inkLine + "55" }}>
            <span className="font-sans text-xs" style={{ color: C.inkSoft }}>Legend:</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Submit Payroll</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.green }} /> Payday / Paid Bill</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.red }} /> Overdue</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.ink }} /> Bill Due</span>
          </div>
        </Card>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Reminder" : "Add Reminder"}>
        <BillForm bill={editing} companies={companies} onSave={handleSave}
          forceCompanyId={companyId}
          onDelete={(id) => { handleDelete(id); setShowForm(false); setEditing(null); }}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>

      <Modal open={!!dayModal} onClose={() => setDayModal(null)}
        title={dayModal ? `Events on ${fmtDate(dayModal.date)}` : ""}>
        {dayModal && (
          <div className="space-y-2">
            {dayModal.events.map((e, i) => {
              if (e.billId) {
                const bill = bills.find(b => b.id === e.billId);
                if (!bill) return null;
                return (
                  <div key={i} className="p-3 rounded border" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-medium" style={{ color: C.ink }}>{bill.name}</p>
                        <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                          {bill.category}
                          {bill.amount && ` • $${(+bill.amount).toLocaleString()}`}
                          {` • ${bill.status === "paid" ? "Paid" : "Open"}`}
                        </p>
                        {bill.notes && <p className="font-sans text-xs mt-1 italic" style={{ color: C.inkSoft }}>{bill.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {bill.status === "open" && (
                        <Btn size="sm" variant="secondary"
                          onClick={() => { markPaid(bill); setDayModal(null); }}>
                          <Check size={12} /> Mark Paid
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary"
                        onClick={() => { setEditing(bill); setShowForm(true); setDayModal(null); }}>
                        <Pencil size={12} /> Edit
                      </Btn>
                      <Btn size="sm" variant="danger"
                        onClick={() => {
                          if (confirm(`Delete "${bill.name}"?`)) { handleDelete(bill.id); setDayModal(null); }
                        }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                );
              } else if (e.payrollId) {
                return (
                  <div key={i} className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
                    <p className="font-sans font-medium" style={{ color: e.color }}>{e.title}</p>
                    <p className="font-sans text-xs italic mt-1" style={{ color: C.inkSoft }}>
                      This is a payroll entry. Edit, delete, or mark it done from the Payroll & Quarterlies tab.
                    </p>
                  </div>
                );
              } else {
                return (
                  <div key={i} className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
                    <p className="font-sans font-medium" style={{ color: e.color }}>{e.title}</p>
                  </div>
                );
              }
            })}
            <div className="flex justify-end pt-2">
              <Btn variant="ghost" onClick={() => setDayModal(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// JMC: PROJECTS VIEW
// ============================================================
const DEFAULT_UTILITIES = ["Electric", "Water", "Sewer", "Gas", "Internet", "Trash"];

function JMCProjectsView({ companyId, flips, saveFlips, bills, saveBills, companies, properties, saveProperties, tenants, saveTenants }) {
  const [editingProject, setEditingProject] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [openProject, setOpenProject] = useState(null);

  const myProjects = flips.filter(f => f.companyId === companyId);

  const handleSaveProject = (p) => {
    if (editingProject && editingProject.id) {
      saveFlips(flips.map(x => x.id === editingProject.id ? { ...editingProject, ...p } : x));
    } else {
      saveFlips([...flips, {
        id: uid(), companyId, utilities: DEFAULT_UTILITIES.map(name => ({ id: uid(), name, signedUp: false, company: "" })),
        ...p
      }]);
    }
    setEditingProject(null); setShowProjectForm(false);
  };

  const handleDeleteProject = (id) => {
    if (confirm("Delete this project? Bills attached to it will become unlinked but not deleted.")) {
      saveFlips(flips.filter(f => f.id !== id));
      saveBills(bills.map(b => b.flipId === id ? { ...b, flipId: null } : b));
      if (openProject === id) setOpenProject(null);
    }
  };

  const openProj = openProject ? flips.find(f => f.id === openProject) : null;

  const handleConvertToRental = (targetCompanyId) => {
    if (!openProj) return;
    const newPropertyId = uid();
    // Create property from flip data
    const newProperty = {
      id: newPropertyId,
      companyId: targetCompanyId,
      address: openProj.address || "",
      nickname: openProj.nickname || "",
      type: "Single Family",
      units: 1,
      category: "Rental",
      insurer: openProj.insurer || "",
      mortgageLender: openProj.mortgageLender || "",
      utilities: openProj.utilities || DEFAULT_UTILITIES.map(name => ({ id: uid(), name, signedUp: false, company: "" })),
      notes: openProj.notes || ""
    };
    saveProperties([...properties, newProperty]);
    // Migrate bills: flipId -> propertyId
    saveBills(bills.map(b => b.flipId === openProj.id
      ? { ...b, flipId: null, propertyId: newPropertyId, companyId: targetCompanyId }
      : b));
    // Delete flip
    saveFlips(flips.filter(f => f.id !== openProj.id));
    setOpenProject(null);
  };

  return (
    <div>
      {openProj ? (
        <ProjectDetailView project={openProj} flips={flips} saveFlips={saveFlips}
          bills={bills} saveBills={saveBills} companies={companies}
          onBack={() => setOpenProject(null)}
          onEdit={() => { setEditingProject(openProj); setShowProjectForm(true); }}
          onDelete={() => handleDeleteProject(openProj.id)}
          onConvertToRental={handleConvertToRental} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              {myProjects.length} flip {myProjects.length === 1 ? "project" : "projects"} — click the name to open, or use the pencil/trash icons.
            </p>
            <Btn onClick={() => { setEditingProject(null); setShowProjectForm(true); }}>
              <Plus size={14} /> Add Project
            </Btn>
          </div>

          {myProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif italic" style={{ color: C.inkSoft }}>
                No projects yet. Click "Add Project" to start tracking your first flip.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myProjects.map(p => {
                const statusColor = p.status === "Sold" ? C.green
                  : p.status === "On Hold" ? C.inkSoft
                  : p.status === "Listed" || p.status === "Pending" ? C.amber
                  : C.accent;
                const projectBills = bills.filter(b => b.flipId === p.id && b.status === "open");
                const overdueCount = projectBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
                return (
                  <Card key={p.id} className="p-4 hover:shadow-sm transition"
                    style={{ borderLeft: `3px solid ${statusColor}` }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpenProject(p.id)}>
                        <p className="font-serif text-lg font-medium" style={{ color: C.ink }}>{p.nickname || p.address || "Unnamed project"}</p>
                        {p.nickname && p.address && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{p.address}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Pill color={statusColor}>{p.status}</Pill>
                          {projectBills.length > 0 && <Pill color={overdueCount > 0 ? C.red : C.ink}>{projectBills.length} open bills</Pill>}
                        </div>
                        {(p.purchasePrice || p.targetSale) && (
                          <div className="flex gap-3 mt-3 text-xs" style={{ color: C.inkSoft }}>
                            {p.purchasePrice && <span>Bought ${(+p.purchasePrice).toLocaleString()}</span>}
                            {p.targetSale && <span>Target ${(+p.targetSale).toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingProject(p); setShowProjectForm(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Edit">
                          <Pencil size={14} style={{ color: C.inkSoft }} />
                        </button>
                        <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 hover:bg-red-100 rounded" title="Delete">
                          <Trash2 size={14} style={{ color: C.red }} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={showProjectForm} onClose={() => { setShowProjectForm(false); setEditingProject(null); }}
        title={editingProject?.id ? "Edit Project" : "Add Project"} wide>
        <ProjectForm project={editingProject} onSave={handleSaveProject}
          onCancel={() => { setShowProjectForm(false); setEditingProject(null); }} />
      </Modal>
    </div>
  );
}

function ProjectForm({ project, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: project?.address || "",
    nickname: project?.nickname || "",
    status: project?.status || "Acquiring",
    purchasePrice: project?.purchasePrice || "",
    purchaseDate: project?.purchaseDate || "",
    targetSale: project?.targetSale || "",
    actualSale: project?.actualSale || "",
    saleDate: project?.saleDate || "",
    insurer: project?.insurer || "",
    mortgageLender: project?.mortgageLender || "",
    notes: project?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Address *</Label>
          <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={e => update("status", e.target.value)} className="block w-full mt-1">
            {FLIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Nickname (optional, for quick reference)</Label>
        <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
          placeholder="e.g. The Yellow House" className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Purchase price</Label>
          <Input type="number" value={form.purchasePrice} onChange={e => update("purchasePrice", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Purchase date</Label>
          <Input type="date" value={form.purchaseDate} onChange={e => update("purchaseDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Target sale</Label>
          <Input type="number" value={form.targetSale} onChange={e => update("targetSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Actual sale</Label>
          <Input type="number" value={form.actualSale} onChange={e => update("actualSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Sale date</Label>
          <Input type="date" value={form.saleDate} onChange={e => update("saleDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Property insurer</Label>
          <Input value={form.insurer} onChange={e => update("insurer", e.target.value)}
            placeholder="e.g. State Farm" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Mortgage lender (if any)</Label>
          <Input value={form.mortgageLender} onChange={e => update("mortgageLender", e.target.value)}
            placeholder="e.g. Wells Fargo" className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// PROJECT DETAIL VIEW (inside Projects tab)
// ============================================================
function ProjectDetailView({ project, flips, saveFlips, bills, saveBills, companies, onBack, onEdit, onDelete, onConvertToRental }) {
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [addingUtility, setAddingUtility] = useState(false);
  const [newUtilName, setNewUtilName] = useState("");

  const projectBills = bills
    .filter(b => b.flipId === project.id)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.status === "paid" ? 1 : 0) - (b.status === "paid" ? 1 : 0) || (a.days ?? 999) - (b.days ?? 999));

  const statusColor = project.status === "Sold" ? C.green
    : project.status === "On Hold" ? C.inkSoft
    : project.status === "Listed" || project.status === "Pending" ? C.amber
    : C.accent;

  const handleSaveBill = (bill) => {
    if (editingBill) saveBills(bills.map(b => b.id === editingBill.id ? { ...editingBill, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditingBill(null); setShowBillForm(false);
  };
  const handleDeleteBill = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };
  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  // Utilities management
  const utilities = project.utilities || [];
  const updateUtilities = (newUtils) => {
    saveFlips(flips.map(f => f.id === project.id ? { ...f, utilities: newUtils } : f));
  };
  const toggleUtility = (id) => {
    updateUtilities(utilities.map(u => u.id === id ? { ...u, signedUp: !u.signedUp } : u));
  };
  const updateUtilityField = (id, field, value) => {
    updateUtilities(utilities.map(u => u.id === id ? { ...u, [field]: value } : u));
  };
  const addUtility = () => {
    setNewUtilName("");
    setAddingUtility(true);
  };
  const confirmAddUtility = () => {
    if (newUtilName.trim()) {
      updateUtilities([...utilities, { id: uid(), name: newUtilName.trim(), signedUp: false, company: "" }]);
    }
    setAddingUtility(false);
    setNewUtilName("");
  };
  const removeUtility = (id) => {
    if (confirm("Remove this utility?")) updateUtilities(utilities.filter(u => u.id !== id));
  };

  return (
    <div>
      {/* Back + edit bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="font-sans text-sm flex items-center gap-1 hover:opacity-70"
          style={{ color: C.inkSoft }}>
          ← Back to all projects
        </button>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="secondary" size="sm" onClick={onEdit}>
            <Pencil size={12} /> Edit Project Info
          </Btn>
          {onConvertToRental && (
            <Btn variant="secondary" size="sm" onClick={() => setShowConvertModal(true)}>
              Convert to Rental
            </Btn>
          )}
          {onDelete && (
            <Btn variant="danger" size="sm" onClick={onDelete}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
      </div>

      {/* Project header */}
      <Card className="p-5 mb-4" style={{ borderLeft: `3px solid ${statusColor}` }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{project.address || "Unnamed"}</h2>
            {project.nickname && <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>{project.nickname}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <Pill color={statusColor}>{project.status}</Pill>
              {project.insurer && <Pill color={C.inkSoft}>Insured by {project.insurer}</Pill>}
              {project.mortgageLender && <Pill color={C.inkSoft}>Mortgage: {project.mortgageLender}</Pill>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.purchasePrice && (
              <div>
                <p className="font-sans text-xs uppercase" style={{ color: C.inkSoft }}>Purchase</p>
                <p className="font-serif text-lg" style={{ color: C.ink }}>${(+project.purchasePrice).toLocaleString()}</p>
                {project.purchaseDate && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{fmtDate(project.purchaseDate)}</p>}
              </div>
            )}
            {project.targetSale && (
              <div>
                <p className="font-sans text-xs uppercase" style={{ color: C.inkSoft }}>Target Sale</p>
                <p className="font-serif text-lg" style={{ color: C.ink }}>${(+project.targetSale).toLocaleString()}</p>
              </div>
            )}
            {project.actualSale && (
              <div>
                <p className="font-sans text-xs uppercase" style={{ color: C.inkSoft }}>Sold</p>
                <p className="font-serif text-lg" style={{ color: C.green }}>${(+project.actualSale).toLocaleString()}</p>
                {project.saleDate && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{fmtDate(project.saleDate)}</p>}
              </div>
            )}
          </div>
        </div>
        {project.notes && <p className="font-sans text-sm mt-3 pt-3 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "55" }}>{project.notes}</p>}
      </Card>

      {/* Utilities Checklist */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Utilities Checklist</h3>
          <Btn size="sm" variant="secondary" onClick={addUtility}><Plus size={12} /> Add</Btn>
        </div>
        {utilities.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>No utilities set up yet. Add some.</p>
        ) : (
          <div className="space-y-2">
            {utilities.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded"
                style={{ background: u.signedUp ? C.green + "11" : C.paperSoft }}>
                <button onClick={() => toggleUtility(u.id)}
                  className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                  style={{ background: u.signedUp ? C.green : "transparent", borderColor: u.signedUp ? C.green : C.inkLine }}>
                  {u.signedUp && <Check size={12} style={{ color: C.paper }} />}
                </button>
                <span className="font-sans text-sm font-medium w-24 shrink-0" style={{ color: C.ink }}>{u.name}</span>
                <Input value={u.company} onChange={e => updateUtilityField(u.id, "company", e.target.value)}
                  placeholder={u.signedUp ? "Provider name" : "Not signed up"}
                  className="flex-1" />
                <button onClick={() => removeUtility(u.id)} className="p-1 hover:bg-red-100 rounded">
                  <Trash2 size={12} style={{ color: C.red }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bills for this project */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Bills for this Project</h3>
          <Btn size="sm" onClick={() => { setEditingBill(null); setShowBillForm(true); }}>
            <Plus size={12} /> Add Bill
          </Btn>
        </div>
        {projectBills.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No bills yet. Add mortgage payments, property tax, insurance premium, or anything else with a due date.
          </p>
        ) : (
          <div>
            {projectBills.map(b => {
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 py-2 border-b"
                  style={{ borderColor: C.inkLine + "55" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink, opacity: b.status === "paid" ? 0.5 : 1 }}>{b.name}</p>
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" && (
                      <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>
                    )}
                    <button onClick={() => { setEditingBill(b); setShowBillForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showBillForm} onClose={() => { setShowBillForm(false); setEditingBill(null); }}
        title={editingBill ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editingBill} companies={companies} onSave={handleSaveBill}
          forceCompanyId={project.companyId} forceFlipId={project.id}
          onCancel={() => { setShowBillForm(false); setEditingBill(null); }} />
      </Modal>

      <Modal open={addingUtility} onClose={() => setAddingUtility(false)} title="Add Utility">
        <div className="space-y-4">
          <div>
            <Label>Utility name</Label>
            <Input value={newUtilName} onChange={e => setNewUtilName(e.target.value)}
              placeholder="e.g. Cable, Lawn Care, Security" className="block w-full mt-1"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") confirmAddUtility(); }} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setAddingUtility(false)}>Cancel</Btn>
            <Btn onClick={confirmAddUtility} disabled={!newUtilName.trim()}>Add</Btn>
          </div>
        </div>
      </Modal>

      <ConvertFlipModal
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        project={project}
        companies={companies}
        bills={bills.filter(b => b.flipId === project.id)}
        onConfirm={(targetCompanyId) => { setShowConvertModal(false); onConvertToRental && onConvertToRental(targetCompanyId); }}
      />
    </div>
  );
}

// ============================================================
// CONVERT FLIP → RENTAL MODAL
// ============================================================
function ConvertFlipModal({ open, onClose, project, companies, bills, onConfirm }) {
  const [targetCompanyId, setTargetCompanyId] = useState("rentals");
  if (!project) return null;
  return (
    <Modal open={open} onClose={onClose} title="Convert to Rental" wide>
      <div className="space-y-4">
        <p className="font-sans text-sm" style={{ color: C.ink }}>
          Convert <span className="font-medium">{project.nickname || project.address}</span> from a flip project into a rental property.
        </p>

        <div className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
          <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: C.inkSoft }}>What happens:</p>
          <ul className="font-sans text-sm space-y-1" style={{ color: C.ink }}>
            <li>• A new rental property will be created under the company you pick below.</li>
            <li>• The address, nickname, notes, utilities, insurer, and mortgage lender will carry over.</li>
            <li>• {bills.length} bill{bills.length === 1 ? "" : "s"} linked to this project will be re-linked to the new rental.</li>
            <li>• Flip-specific info (purchase price, target sale, budget, status) will NOT carry over.</li>
            <li>• The flip project record will be deleted.</li>
          </ul>
        </div>

        <div>
          <Label>Move to which company?</Label>
          <Select value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)} className="block w-full mt-1">
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onConfirm(targetCompanyId)}>Convert</Btn>
        </div>
      </div>
    </Modal>
  );
}
function JMCRentalsView({ companyId, properties, saveProperties, tenants, saveTenants, bills, saveBills, companies }) {
  const [editingProp, setEditingProp] = useState(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [transferProp, setTransferProp] = useState(null);

  const myRentals = properties.filter(p => p.companyId === companyId);

  const handleSaveProp = (p) => {
    if (editingProp && editingProp.id) saveProperties(properties.map(x => x.id === editingProp.id ? { ...editingProp, ...p } : x));
    else saveProperties([...properties, { id: uid(), companyId, ...p }]);
    setEditingProp(null); setShowPropForm(false);
  };
  const handleDeleteProp = (id) => {
    if (confirm("Delete this rental? Its tenant(s) and linked bills will become unlinked.")) {
      saveProperties(properties.filter(p => p.id !== id));
      saveTenants(tenants.filter(t => t.propertyId !== id));
      saveBills(bills.map(b => b.propertyId === id ? { ...b, propertyId: null } : b));
    }
  };
  const handleTransferProp = (property, targetCompanyId) => {
    // If inline tenant info exists, create a tenants row so it shows up in Penciled's view
    const hasInline = property.tenantName && property.tenantName.trim();
    let nextTenants = tenants;
    if (hasInline) {
      const alreadyExists = tenants.some(t => t.propertyId === property.id && t.name === property.tenantName);
      if (!alreadyExists) {
        nextTenants = [...tenants, {
          id: uid(),
          propertyId: property.id,
          name: property.tenantName,
          rent: property.rent || null,
          leaseStart: property.leaseStart || null,
          leaseEnd: property.leaseEnd || null,
          active: true,
          notes: ""
        }];
        saveTenants(nextTenants);
      }
    }
    // Change companyId and update linked bills to same company
    saveProperties(properties.map(p => p.id === property.id
      ? { ...p, companyId: targetCompanyId }
      : p));
    saveBills(bills.map(b => b.propertyId === property.id
      ? { ...b, companyId: targetCompanyId }
      : b));
    setTransferProp(null);
  };
  const handleSaveTenant = (t) => {
    if (editingTenant && editingTenant.id) saveTenants(tenants.map(x => x.id === editingTenant.id ? { ...editingTenant, ...t } : x));
    else saveTenants([...tenants, { id: uid(), active: true, ...t }]);
    setEditingTenant(null); setShowTenantForm(false);
  };
  const handleDeleteTenant = (id) => {
    if (confirm("Delete this tenant?")) saveTenants(tenants.filter(t => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Rentals JMC still holds (being transferred to Penciled Properties). {myRentals.length} {myRentals.length === 1 ? "rental" : "rentals"}.
        </p>
        <Btn onClick={() => { setEditingProp(null); setShowPropForm(true); }}>
          <Plus size={14} /> Add Rental
        </Btn>
      </div>

      {myRentals.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-serif italic" style={{ color: C.inkSoft }}>
            No rentals on JMC yet. Add any that haven't been transferred to Penciled.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {myRentals.map(p => {
            const leaseTermText = (p.leaseStart || p.leaseEnd)
              ? `${p.leaseStart ? fmtDate(p.leaseStart) : "—"} to ${p.leaseEnd ? fmtDate(p.leaseEnd) : "—"}`
              : null;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-serif text-lg" style={{ color: C.ink }}>{p.address || "Untitled"}</p>
                      <Pill color={C.inkSoft}>{p.type}</Pill>
                      {p.rent && <Pill color={C.green}>${(+p.rent).toLocaleString()}/mo</Pill>}
                    </div>
                    {p.tenantName ? (
                      <p className="font-sans text-sm" style={{ color: C.ink }}>
                        <span style={{ color: C.inkSoft }}>Tenant: </span>
                        <span className="font-medium">{p.tenantName}</span>
                      </p>
                    ) : (
                      <p className="font-sans text-sm italic" style={{ color: C.inkSoft }}>No tenant info — click pencil to add</p>
                    )}
                    {leaseTermText && (
                      <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
                        Lease: {leaseTermText}
                      </p>
                    )}
                    {p.notes && (
                      <p className="font-sans text-xs mt-2 italic pt-2 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "55" }}>{p.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 items-start">
                    <button onClick={() => { setEditingProp(p); setShowPropForm(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Edit">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => setTransferProp(p)} className="px-2 py-1 hover:bg-black/10 rounded font-sans text-xs" title="Move to another company" style={{ color: C.inkSoft }}>
                      Move
                    </button>
                    <button onClick={() => handleDeleteProp(p.id)} className="p-1.5 hover:bg-red-100 rounded" title="Delete">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showPropForm} onClose={() => { setShowPropForm(false); setEditingProp(null); }}
        title={editingProp?.id ? "Edit Rental" : "Add Rental"}>
        <SimpleRentalForm property={editingProp} onSave={handleSaveProp}
          onCancel={() => { setShowPropForm(false); setEditingProp(null); }} />
      </Modal>

      <Modal open={showTenantForm} onClose={() => { setShowTenantForm(false); setEditingTenant(null); }}
        title={editingTenant?.id ? "Edit Tenant" : "Add Tenant"}>
        <TenantForm tenant={editingTenant} properties={myRentals} onSave={handleSaveTenant}
          onCancel={() => { setShowTenantForm(false); setEditingTenant(null); }} />
      </Modal>

      <TransferPropertyModal
        open={!!transferProp}
        onClose={() => setTransferProp(null)}
        property={transferProp}
        currentCompanyId={companyId}
        companies={companies}
        onConfirm={handleTransferProp}
      />
    </div>
  );
}

// ============================================================
// TRANSFER PROPERTY MODAL (move rental from one company to another)
// ============================================================
function TransferPropertyModal({ open, onClose, property, currentCompanyId, companies, onConfirm }) {
  const otherCompanies = companies.filter(c => c.id !== currentCompanyId);
  const [targetId, setTargetId] = useState(otherCompanies[0]?.id || "");
  useEffect(() => {
    if (open && otherCompanies.length > 0 && !otherCompanies.find(c => c.id === targetId)) {
      setTargetId(otherCompanies[0].id);
    }
  }, [open]); // eslint-disable-line
  if (!property) return null;
  const hasInline = property.tenantName && property.tenantName.trim();
  return (
    <Modal open={open} onClose={onClose} title="Move Rental to Another Company">
      <div className="space-y-4">
        <p className="font-sans text-sm" style={{ color: C.ink }}>
          Move <span className="font-medium">{property.nickname || property.address}</span> to a different company.
        </p>
        <div className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
          <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: C.inkSoft }}>What happens:</p>
          <ul className="font-sans text-sm space-y-1" style={{ color: C.ink }}>
            <li>• The property will be reassigned to the company you pick.</li>
            <li>• Bills linked to this property will follow it.</li>
            {hasInline && <li>• The inline tenant info ({property.tenantName}) will be added to the tenants list so it shows up in the new company.</li>}
            <li>• Nothing is deleted.</li>
          </ul>
        </div>
        <div>
          <Label>Move to which company?</Label>
          <Select value={targetId} onChange={e => setTargetId(e.target.value)} className="block w-full mt-1">
            {otherCompanies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onConfirm(property, targetId)} disabled={!targetId}>Move</Btn>
        </div>
      </div>
    </Modal>
  );
}

function SimpleRentalForm({ property, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: property?.address || "",
    type: property?.type || "Single Family",
    tenantName: property?.tenantName || "",
    rent: property?.rent || "",
    leaseStart: property?.leaseStart || "",
    leaseEnd: property?.leaseEnd || "",
    notes: property?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div>
        <Label>Address *</Label>
        <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
          {["Single Family","Duplex","Triplex","Fourplex","Multi-family","Storage","Other"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </div>
      <div className="pt-2 mt-2 border-t" style={{ borderColor: C.inkLine + "55" }}>
        <p className="font-serif text-sm mb-3" style={{ color: C.ink }}>Tenant & Lease</p>
        <div className="space-y-3">
          <div>
            <Label>Tenant name</Label>
            <Input value={form.tenantName} onChange={e => update("tenantName", e.target.value)} className="block w-full mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Monthly rent</Label>
              <Input type="number" step="0.01" value={form.rent} onChange={e => update("rent", e.target.value)}
                placeholder="$" className="block w-full mt-1" />
            </div>
            <div>
              <Label>Lease start</Label>
              <Input type="date" value={form.leaseStart} onChange={e => update("leaseStart", e.target.value)} className="block w-full mt-1" />
            </div>
            <div>
              <Label>Lease end</Label>
              <Input type="date" value={form.leaseEnd} onChange={e => update("leaseEnd", e.target.value)} className="block w-full mt-1" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// JMC: PAYROLL & QUARTERLIES VIEW (calendar with computed payroll dates + 941 quarterlies)
// ============================================================
function JMCPayrollView({ companyId, bills, saveBills, companies, payrolls, savePayrolls }) {
  const [calMonth, setCalMonth] = useState(monthKey(todayISO()));
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [dayModal, setDayModal] = useState(null);

  const myPayrolls = useMemo(() => payrolls.filter(p => p.companyId === companyId), [payrolls, companyId]);

  const taxCategories = ["Payroll", "Quarterly Tax", "Annual Tax", "Year-End"];
  const taxBills = useMemo(
    () => bills.filter(b => b.companyId === companyId && taxCategories.includes(b.category)),
    [bills, companyId]
  );

  const monthStart = calMonth + "-01";
  const monthEnd = addMonths(monthStart, 1);

  const allEvents = useMemo(() => {
    // Payroll events from stored payrolls
    const payrollEvents = myPayrolls.flatMap(p => {
      const events = [];
      if (p.payday && p.payday >= monthStart && p.payday < monthEnd) {
        events.push({
          date: p.payday,
          title: p.label || "Payday",
          color: p.status === "done" ? C.inkSoft : C.green,
          type: "payroll-pay",
          payrollId: p.id
        });
      }
      if (p.submitDate && p.submitDate >= monthStart && p.submitDate < monthEnd) {
        events.push({
          date: p.submitDate,
          title: `Submit: ${p.label || "Payroll"}`,
          color: p.status === "done" ? C.inkSoft : C.amber,
          type: "payroll-submit",
          payrollId: p.id
        });
      }
      if (p.eftpsDate && p.eftpsDate >= monthStart && p.eftpsDate < monthEnd) {
        events.push({
          date: p.eftpsDate,
          title: `EFTPS: ${p.label || "Payroll"}`,
          color: p.status === "done" ? C.inkSoft : "#7c5cad",
          type: "payroll-eftps",
          payrollId: p.id
        });
      }
      return events;
    });

    const taxEvents = taxBills
      .filter(b => b.dueDate && b.dueDate >= monthStart && b.dueDate < monthEnd)
      .map(b => ({
        date: b.dueDate,
        title: b.name,
        color: b.category === "Quarterly Tax" ? C.red : b.category === "Annual Tax" ? C.amber : C.ink,
        type: "tax",
        billId: b.id
      }));
    return [...payrollEvents, ...taxEvents];
  }, [myPayrolls, taxBills, monthStart, monthEnd]);

  const upcomingPayroll = useMemo(() => myPayrolls
    .filter(p => p.payday && p.payday >= todayISO())
    .sort((a, b) => a.payday.localeCompare(b.payday))
    .slice(0, 15), [myPayrolls]);

  const upcomingTax = useMemo(() => taxBills
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "paid" ? 1 : -1;
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    }), [taxBills]);

  // Bill actions (tax)
  const handleSaveBill = (bill) => {
    if (editing) saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditing(null); setShowForm(false);
  };
  const handleDeleteBill = (id) => saveBills(bills.filter(b => b.id !== id));
  const markBillPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  // Payroll actions
  const handleSavePayroll = (entry) => {
    if (editingPayroll && editingPayroll.id) {
      savePayrolls(payrolls.map(p => p.id === editingPayroll.id ? { ...editingPayroll, ...entry } : p));
    } else {
      savePayrolls([...payrolls, { id: uid(), companyId, status: "open", ...entry }]);
    }
    setEditingPayroll(null); setShowPayrollForm(false);
  };
  const handleDeletePayroll = (id) => savePayrolls(payrolls.filter(p => p.id !== id));
  const markPayrollDone = (entry) => {
    savePayrolls(payrolls.map(p => p.id === entry.id ? { ...p, status: "done" } : p));
  };

  const company = companies.find(c => c.id === companyId);
  const payrollDays = (company?.payrollDays && company.payrollDays.length > 0) ? company.payrollDays : [1, 10, 25];

  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const payrollDaysText = payrollDays.map(ordinal).join(", ");

  const generateSchedule = (monthsCount, replace = false) => {
    const entries = [];
    const today = new Date();
    for (let i = 0; i < monthsCount; i++) {
      const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      payrollDays.forEach(day => {
        const safeDay = Math.min(day, new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate());
        const target = `${ym}-${String(safeDay).padStart(2, "0")}`;
        const payday = computePayday(target);
        const submitDate = addDays(payday, -2);
        const eftpsDate = computeEftps(payday);
        entries.push({
          id: uid(),
          companyId,
          payday,
          submitDate,
          eftpsDate,
          label: `Payday (${ordinal(day)})`,
          status: "open",
          notes: ""
        });
      });
    }
    if (replace) {
      const others = payrolls.filter(p => p.companyId !== companyId);
      savePayrolls([...others, ...entries]);
    } else {
      savePayrolls([...payrolls, ...entries]);
    }
  };

  const regenerateSchedule = () => {
    if (confirm("This will delete every payroll entry for this company and create a fresh 12-month schedule. Continue?")) {
      generateSchedule(12, true);
    }
  };

  const isEmpty = myPayrolls.length === 0;

  return (
    <div>
      <div className="mb-4 p-4 rounded flex items-start justify-between gap-3 flex-wrap" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
        <p className="font-serif italic text-sm flex-1 min-w-[200px]" style={{ color: C.inkSoft }}>
          Default rule: paydays on the {payrollDaysText} of each month — if those fall on a weekend or federal holiday, payday moves to the first business day before, and the submission deadline is 48 hours before payday. Adjust the days in this company's settings if needed. You can also manually edit any individual date below.
        </p>
        <div className="flex gap-2 flex-wrap">
          {!isEmpty && (
            <Btn variant="secondary" size="sm" onClick={regenerateSchedule}>Regenerate Schedule</Btn>
          )}
          <Btn variant="secondary" onClick={() => { setEditingPayroll(null); setShowPayrollForm(true); }}>
            <Plus size={14} /> Add Payroll
          </Btn>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Tax / Quarterly
          </Btn>
        </div>
      </div>

      {isEmpty && (
        <Card className="p-6 mb-4 text-center" style={{ background: C.accent + "11", borderColor: C.accent }}>
          <p className="font-serif text-lg mb-2" style={{ color: C.ink }}>No payroll schedule yet</p>
          <p className="font-sans text-sm mb-4" style={{ color: C.inkSoft }}>
            Generate 12 months of paydays using the 1st / 10th / 25th rule. You can edit or delete any entry afterward.
          </p>
          <Btn onClick={() => generateSchedule(12)}>Generate 12 Months</Btn>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <CalendarGrid month={calMonth} events={allEvents}
          onChangeMonth={(delta) => setCalMonth(monthKey(addMonths(calMonth + "-01", delta)))}
          onDayClick={(iso, evs) => setDayModal({ date: iso, events: evs })} />
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: C.inkLine + "55" }}>
          <span className="font-sans text-xs" style={{ color: C.inkSoft }}>Legend:</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Submit Payroll</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.green }} /> Payday</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#7c5cad" }} /> EFTPS Due</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.red }} /> Quarterly Tax</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Annual / Year-End</span>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-serif text-lg mb-3" style={{ color: C.ink }}>Upcoming Paydays</h3>
          {upcomingPayroll.length === 0 ? (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>None upcoming. Add one or generate the schedule above.</p>
          ) : upcomingPayroll.map(p => {
            const days = daysUntil(p.payday);
            return (
              <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium" style={{ color: C.ink, opacity: p.status === "done" ? 0.5 : 1 }}>{p.label}</p>
                  <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
                    Pay {fmtDate(p.payday)}{days !== null && ` (in ${days}d)`} • Submit {fmtDate(p.submitDate)}{p.eftpsDate && ` • EFTPS ${fmtDate(p.eftpsDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.status !== "done" && (
                    <Btn size="sm" variant="secondary" onClick={() => markPayrollDone(p)}><Check size={12} /> Done</Btn>
                  )}
                  <button onClick={() => { setEditingPayroll(p); setShowPayrollForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => { if (confirm("Delete this payroll entry?")) handleDeletePayroll(p.id); }} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg mb-3" style={{ color: C.ink }}>All Tax & Quarterly Items</h3>
          {upcomingTax.length === 0 ? (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              Nothing here. Use "+ Add Tax / Quarterly" above to create one.
            </p>
          ) : upcomingTax.map(b => {
            const days = b.dueDate ? daysUntil(b.dueDate) : null;
            const isPaid = b.status === "paid";
            const isOverdue = !isPaid && days !== null && days < 0;
            return (
              <div key={b.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium" style={{ color: C.ink, opacity: isPaid ? 0.5 : 1 }}>{b.name}</p>
                  <p className="font-sans text-xs" style={{ color: isOverdue ? C.red : C.inkSoft }}>
                    {isPaid ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                    {!isPaid && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                    {` • ${b.category}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isPaid && (
                    <Btn size="sm" variant="secondary" onClick={() => markBillPaid(b)}><Check size={12} /> Done</Btn>
                  )}
                  <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${b.name}"?`)) handleDeleteBill(b.id); }} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Item" : "Add Tax / Quarterly Item"}>
        <BillForm bill={editing || { category: "Quarterly Tax" }} companies={companies} onSave={handleSaveBill}
          forceCompanyId={companyId}
          onDelete={(id) => { handleDeleteBill(id); setShowForm(false); setEditing(null); }}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>

      <Modal open={showPayrollForm} onClose={() => { setShowPayrollForm(false); setEditingPayroll(null); }}
        title={editingPayroll ? "Edit Payroll" : "Add Payroll"}>
        <PayrollEntryForm entry={editingPayroll} onSave={handleSavePayroll}
          onDelete={(id) => { handleDeletePayroll(id); setShowPayrollForm(false); setEditingPayroll(null); }}
          onCancel={() => { setShowPayrollForm(false); setEditingPayroll(null); }} />
      </Modal>

      <Modal open={!!dayModal} onClose={() => setDayModal(null)}
        title={dayModal ? `Events on ${fmtDate(dayModal.date)}` : ""}>
        {dayModal && (
          <div className="space-y-2">
            {dayModal.events.map((e, i) => {
              if (e.billId) {
                const bill = bills.find(b => b.id === e.billId);
                if (!bill) return null;
                return (
                  <div key={i} className="p-3 rounded border" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
                    <p className="font-sans font-medium" style={{ color: C.ink }}>{bill.name}</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                      {bill.category}{bill.amount && ` • $${(+bill.amount).toLocaleString()}`} • {bill.status === "paid" ? "Paid" : "Open"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {bill.status === "open" && (
                        <Btn size="sm" variant="secondary" onClick={() => { markBillPaid(bill); setDayModal(null); }}>
                          <Check size={12} /> Mark Done
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary" onClick={() => { setEditing(bill); setShowForm(true); setDayModal(null); }}>
                        <Pencil size={12} /> Edit
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => {
                        if (confirm(`Delete "${bill.name}"?`)) { handleDeleteBill(bill.id); setDayModal(null); }
                      }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                );
              } else if (e.payrollId) {
                const entry = payrolls.find(p => p.id === e.payrollId);
                if (!entry) return null;
                return (
                  <div key={i} className="p-3 rounded border" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
                    <p className="font-sans font-medium" style={{ color: C.ink }}>{e.title}</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                      Pay: {fmtDate(entry.payday)} • Submit: {fmtDate(entry.submitDate)}{entry.eftpsDate && ` • EFTPS: ${fmtDate(entry.eftpsDate)}`} • {entry.status === "done" ? "Done" : "Open"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {entry.status !== "done" && (
                        <Btn size="sm" variant="secondary" onClick={() => { markPayrollDone(entry); setDayModal(null); }}>
                          <Check size={12} /> Mark Done
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary" onClick={() => { setEditingPayroll(entry); setShowPayrollForm(true); setDayModal(null); }}>
                        <Pencil size={12} /> Edit
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => {
                        if (confirm("Delete this payroll entry?")) { handleDeletePayroll(entry.id); setDayModal(null); }
                      }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                );
              } else {
                return null;
              }
            })}
            <div className="flex justify-end pt-2">
              <Btn variant="ghost" onClick={() => setDayModal(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PayrollEntryForm({ entry, onSave, onCancel, onDelete }) {
  const initialPayday = entry?.payday || todayISO();
  const [form, setForm] = useState({
    payday: initialPayday,
    submitDate: entry?.submitDate || addDays(initialPayday, -2),
    eftpsDate: entry?.eftpsDate || computeEftps(initialPayday),
    label: entry?.label || "Payday",
    notes: entry?.notes || "",
    status: entry?.status || "open"
  });
  const update = (k, v) => {
    if (k === "payday" && (!entry || !entry.id)) {
      // For new entries, auto-update submit + EFTPS when payday changes
      setForm({ ...form, payday: v, submitDate: addDays(v, -2), eftpsDate: computeEftps(v) });
    } else {
      setForm({ ...form, [k]: v });
    }
  };
  const recomputeEftps = () => {
    setForm({ ...form, eftpsDate: computeEftps(form.payday) });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Pay date *</Label>
          <Input type="date" value={form.payday} onChange={e => update("payday", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Submit by</Label>
          <Input type="date" value={form.submitDate} onChange={e => update("submitDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>EFTPS deposit due</Label>
          <button type="button" onClick={recomputeEftps}
            className="font-sans text-xs underline"
            style={{ color: C.inkSoft }}>
            Auto-fill from pay date
          </button>
        </div>
        <Input type="date" value={form.eftpsDate || ""} onChange={e => update("eftpsDate", e.target.value)} className="block w-full mt-1" />
        <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
          Rule: payday Mon/Tue → Friday of same week; payday Wed/Thu/Fri → next Wednesday.
        </p>
      </div>
      <div>
        <Label>Label</Label>
        <Input value={form.label} onChange={e => update("label", e.target.value)}
          placeholder='e.g. "Payday (1st)" or "Year-end bonus"' className="block w-full mt-1" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <div>
          {entry && entry.id && onDelete && (
            <Btn variant="danger" size="sm" onClick={() => { if (confirm("Delete this payroll entry?")) onDelete(entry.id); }}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => form.payday && onSave(form)} disabled={!form.payday}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JMC: GENERAL BILLS VIEW (company-level bills, no project/rental link)
// ============================================================
function JMCGeneralBillsView({ companyId, bills, saveBills, companies }) {
  const [filterStatus, setFilterStatus] = useState("open");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // General bills = company-level bills (no flipId, no propertyId) AND not in payroll/tax categories
  const taxCategories = ["Payroll", "Quarterly Tax", "Annual Tax", "Year-End"];
  const myBills = bills.filter(b => b.companyId === companyId && !b.flipId && !b.propertyId && !taxCategories.includes(b.category));

  const filtered = myBills
    .filter(b => filterStatus === "all" || b.status === filterStatus)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const handleSave = (bill) => {
    if (editing) saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditing(null); setShowForm(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };
  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Company-level bills — insurance, licensing, subscriptions, anything not tied to a specific project or rental.
        </p>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </Select>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Bill
          </Btn>
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>No general bills here.</p>
        ) : filtered.map(b => {
          const days = b.days;
          const urgent = b.status === "open" && days !== null && days < 0;
          const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
          return (
            <div key={b.id} className="ledger-row flex items-center gap-3 px-4 py-3 hover:bg-black/5"
              style={{ borderBottom: `1px solid ${C.inkLine + "55"}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-sans font-medium" style={{ color: C.ink, opacity: b.status === "paid" ? 0.5 : 1 }}>{b.name}</p>
                  <Pill color={C.inkSoft}>{b.category}</Pill>
                  {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                </div>
                <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                  {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                  {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                  {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                  {b.notes && ` • ${b.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {b.status === "open" && (
                  <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>
                )}
                <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                  <Pencil size={14} style={{ color: C.inkSoft }} />
                </button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                  <Trash2 size={14} style={{ color: C.red }} />
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editing} companies={companies} onSave={handleSave}
          forceCompanyId={companyId}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

// ============================================================
// PENCILED PROPERTIES — CUSTOM VIEW (rental holding company)
// ============================================================
function PenciledView({ company, allCompanies, bills, saveBills, properties, saveProperties, tenants, saveTenants, payments, savePayments, flips, notes, saveNotes, payrolls, savePayrolls }) {
  const [subTab, setSubTab] = useState("reminders");

  const myBills = bills.filter(b => b.companyId === company.id);
  const myProperties = properties.filter(p => p.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  // Active tenants count for this company
  const myPropertyIds = new Set(myProperties.map(p => p.id));
  const activeTenantCount = tenants.filter(t => t.active !== false && myPropertyIds.has(t.propertyId)).length;

  const subTabs = [
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "properties", label: "Properties", icon: Building2, count: myProperties.length },
    { id: "rentroll", label: "Rent Roll", icon: DollarSign },
    ...(company.showPayroll ? [{ id: "payroll", label: "Payroll & Quarterlies", icon: Calendar }] : []),
    { id: "general", label: "General Bills", icon: Receipt },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{activeTenantCount}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Active Tenants</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: active ? company.color + "22" : C.inkLine + "44", color: active ? company.color : C.inkSoft }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {subTab === "reminders" && (
        <JMCRemindersView companyId={company.id} bills={bills} saveBills={saveBills}
          flips={flips} properties={properties} companies={allCompanies} payrolls={payrolls} />
      )}
      {subTab === "properties" && (
        <PenciledPropertiesView companyId={company.id} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} bills={bills} saveBills={saveBills} companies={allCompanies}
          payments={payments} savePayments={savePayments} />
      )}
      {subTab === "rentroll" && (
        <PenciledRentRollView companyId={company.id} properties={properties} tenants={tenants}
          payments={payments} savePayments={savePayments} />
      )}
      {subTab === "payroll" && company.showPayroll && (
        <JMCPayrollView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies}
          payrolls={payrolls} savePayrolls={savePayrolls} />
      )}
      {subTab === "general" && (
        <JMCGeneralBillsView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

// ============================================================
// PENCILED: PROPERTIES LIST + FORM
// ============================================================
function PenciledPropertiesView({ companyId, properties, saveProperties, tenants, saveTenants, bills, saveBills, companies, payments, savePayments }) {
  const [editingProp, setEditingProp] = useState(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [openProp, setOpenProp] = useState(null);
  const [transferProp, setTransferProp] = useState(null);

  const myProperties = useMemo(() => properties.filter(p => p.companyId === companyId), [properties, companyId]);

  const handleSaveProp = (p, tenantsList = []) => {
    let propertyId;
    if (editingProp && editingProp.id) {
      propertyId = editingProp.id;
      saveProperties(properties.map(x => x.id === editingProp.id ? { ...editingProp, ...p } : x));
    } else {
      propertyId = uid();
      saveProperties([...properties, {
        id: propertyId, companyId, category: "Rental",
        utilities: DEFAULT_UTILITIES.map(name => ({ id: uid(), name, signedUp: false, company: "", paidBy: "tenant" })),
        ...p
      }]);
    }
    // Reconcile tenants: keep untouched ones, upsert/insert edited, delete removed
    if (tenantsList !== undefined) {
      const existingForProp = tenants.filter(t => t.propertyId === propertyId);
      const submittedIds = new Set(tenantsList.filter(t => !t._new).map(t => t.id));
      const kept = existingForProp.filter(t => submittedIds.has(t.id));
      const updated = tenants.filter(t => t.propertyId !== propertyId).concat(
        tenantsList.map(t => {
          const { _new, ...clean } = t;
          return { ...clean, propertyId, active: clean.active !== false };
        })
      );
      saveTenants(updated);
    }
    setEditingProp(null); setShowPropForm(false);
  };

  const handleDeleteProp = (id) => {
    if (confirm("Delete this property? Tenants and linked bills will be removed.")) {
      saveProperties(properties.filter(p => p.id !== id));
      saveTenants(tenants.filter(t => t.propertyId !== id));
      saveBills(bills.map(b => b.propertyId === id ? { ...b, propertyId: null } : b));
      if (openProp === id) setOpenProp(null);
    }
  };

  const handleTransferProp = (property, targetCompanyId) => {
    saveProperties(properties.map(p => p.id === property.id
      ? { ...p, companyId: targetCompanyId }
      : p));
    saveBills(bills.map(b => b.propertyId === property.id
      ? { ...b, companyId: targetCompanyId }
      : b));
    setTransferProp(null);
    if (openProp === property.id) setOpenProp(null);
  };

  const openProperty = openProp ? properties.find(p => p.id === openProp) : null;

  return (
    <div>
      {openProperty ? (
        <PenciledPropertyDetailView property={openProperty} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} bills={bills} saveBills={saveBills} companies={companies}
          payments={payments} savePayments={savePayments}
          onBack={() => setOpenProp(null)}
          onEdit={() => { setEditingProp(openProperty); setShowPropForm(true); }}
          onDelete={() => handleDeleteProp(openProperty.id)}
          onTransfer={() => setTransferProp(openProperty)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              {myProperties.length} {myProperties.length === 1 ? "property" : "properties"} — click the name to open, or use the pencil/trash icons to edit or delete directly.
            </p>
            <Btn onClick={() => { setEditingProp(null); setShowPropForm(true); }}>
              <Plus size={14} /> Add Property
            </Btn>
          </div>

          {myProperties.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif italic" style={{ color: C.inkSoft }}>
                No properties yet. Click "Add Property" to start.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myProperties.map(p => {
                const propTenants = tenants.filter(t => t.propertyId === p.id && t.active !== false);
                const propBills = bills.filter(b => b.propertyId === p.id && b.status === "open");
                const overdueCount = propBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
                const totalRent = propTenants.reduce((s, t) => s + (+t.rent || 0), 0);
                const units = p.units || 1;
                const vacantCount = Math.max(0, units - propTenants.length);
                const movingOut = propTenants.filter(t => t.movingOutDate).length;
                return (
                  <Card key={p.id} className="p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpenProp(p.id)}>
                        <p className="font-serif text-lg font-medium" style={{ color: C.ink }}>{p.nickname || p.address || "Unnamed"}</p>
                        {p.nickname && p.address && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{p.address}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Pill color={C.inkSoft}>{p.type}</Pill>
                          <Pill color={vacantCount > 0 ? C.red : C.accent}>{propTenants.length}/{units} occupied</Pill>
                          {vacantCount > 0 && <Pill color={C.red}>{vacantCount} vacant</Pill>}
                          {movingOut > 0 && <Pill color={C.amber}>{movingOut} moving out</Pill>}
                          {totalRent > 0 && <Pill color={C.green}>${totalRent.toLocaleString()}/mo</Pill>}
                          {propBills.length > 0 && <Pill color={overdueCount > 0 ? C.red : C.ink}>{propBills.length} open bills</Pill>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 items-start">
                        <button onClick={() => { setEditingProp(p); setShowPropForm(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Edit">
                          <Pencil size={14} style={{ color: C.inkSoft }} />
                        </button>
                        <button onClick={() => setTransferProp(p)} className="px-2 py-1 hover:bg-black/10 rounded font-sans text-xs" title="Move to another company" style={{ color: C.inkSoft }}>
                          Move
                        </button>
                        <button onClick={() => handleDeleteProp(p.id)} className="p-1.5 hover:bg-red-100 rounded" title="Delete">
                          <Trash2 size={14} style={{ color: C.red }} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={showPropForm} onClose={() => { setShowPropForm(false); setEditingProp(null); }}
        title={editingProp?.id ? "Edit Property" : "Add Property"} wide>
        <PenciledPropertyForm property={editingProp}
          existingTenants={editingProp?.id ? tenants.filter(t => t.propertyId === editingProp.id) : []}
          onSave={handleSaveProp}
          onCancel={() => { setShowPropForm(false); setEditingProp(null); }} />
      </Modal>

      <TransferPropertyModal
        open={!!transferProp}
        onClose={() => setTransferProp(null)}
        property={transferProp}
        currentCompanyId={companyId}
        companies={companies}
        onConfirm={handleTransferProp}
      />
    </div>
  );
}

function PenciledPropertyForm({ property, existingTenants = [], onSave, onCancel }) {
  const [form, setForm] = useState({
    address: property?.address || "",
    nickname: property?.nickname || "",
    type: property?.type || "Single Family",
    units: property?.units || 1,
    insurer: property?.insurer || "",
    mortgageLender: property?.mortgageLender || "",
    notes: property?.notes || ""
  });
  const [tenantList, setTenantList] = useState(() => {
    if (existingTenants.length > 0) return existingTenants.map(t => ({ ...t }));
    return [];
  });

  const update = (k, v) => setForm({ ...form, [k]: v });
  const addTenant = () => {
    setTenantList([...tenantList, {
      id: uid(), _new: true,
      name: "", unit: "", rent: "", deposit: "",
      phone: "", email: "",
      leaseStart: "", leaseEnd: "",
      movingOutDate: "",
      active: true, notes: ""
    }]);
  };
  const updateTenant = (id, field, value) => {
    setTenantList(tenantList.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const removeTenant = (id) => {
    setTenantList(tenantList.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Address *</Label>
        <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Nickname</Label>
          <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
            placeholder="optional" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
            {["Single Family","Duplex","Triplex","Fourplex","Multi-family","Storage","Commercial","Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label># of units</Label>
          <Input type="number" min="1" value={form.units} onChange={e => update("units", +e.target.value)}
            className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Property insurer</Label>
          <Input value={form.insurer} onChange={e => update("insurer", e.target.value)}
            placeholder="e.g. State Farm" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Mortgage lender (if any)</Label>
          <Input value={form.mortgageLender} onChange={e => update("mortgageLender", e.target.value)}
            placeholder="e.g. Wells Fargo" className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>

      {/* Inline tenants */}
      <div className="pt-3 border-t" style={{ borderColor: C.inkLine + "55" }}>
        <div className="flex items-center justify-between mb-3">
          <Label>Tenants ({tenantList.length})</Label>
          <Btn size="sm" variant="secondary" onClick={addTenant}><Plus size={12} /> Add Tenant</Btn>
        </div>
        {tenantList.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No tenants added yet. Add tenants now, or later from the property page.
          </p>
        ) : (
          <div className="space-y-3">
            {tenantList.map((t, i) => (
              <div key={t.id} className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-xs uppercase tracking-wider font-semibold" style={{ color: C.inkSoft }}>
                    Tenant {i + 1}
                  </span>
                  <button onClick={() => removeTenant(t.id)} className="p-1 hover:bg-red-100 rounded">
                    <Trash2 size={12} style={{ color: C.red }} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input value={t.name} onChange={e => updateTenant(t.id, "name", e.target.value)} placeholder="Name *" className="text-sm" />
                  <Input value={t.unit} onChange={e => updateTenant(t.id, "unit", e.target.value)} placeholder="Unit (e.g. A, 1, Upstairs)" className="text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input type="number" step="0.01" value={t.rent} onChange={e => updateTenant(t.id, "rent", e.target.value)} placeholder="Monthly rent" className="text-sm" />
                  <Input type="number" step="0.01" value={t.deposit} onChange={e => updateTenant(t.id, "deposit", e.target.value)} placeholder="Security deposit" className="text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input type="date" value={t.leaseStart || ""} onChange={e => updateTenant(t.id, "leaseStart", e.target.value)} placeholder="Lease start" className="text-sm" />
                  <Input type="date" value={t.leaseEnd || ""} onChange={e => updateTenant(t.id, "leaseEnd", e.target.value)} placeholder="Lease end" className="text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={t.phone} onChange={e => updateTenant(t.id, "phone", e.target.value)} placeholder="Phone" className="text-sm" />
                  <Input value={t.email} onChange={e => updateTenant(t.id, "email", e.target.value)} placeholder="Email" className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form, tenantList)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// PENCILED: PROPERTY DETAIL VIEW
// ============================================================
function PenciledPropertyDetailView({ property, properties, saveProperties, tenants, saveTenants, bills, saveBills, companies, payments, savePayments, onBack, onEdit, onDelete, onTransfer }) {
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [addingUtility, setAddingUtility] = useState(false);
  const [newUtilName, setNewUtilName] = useState("");

  const propTenants = tenants.filter(t => t.propertyId === property.id);
  const propBills = bills
    .filter(b => b.propertyId === property.id)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.status === "paid" ? 1 : 0) - (b.status === "paid" ? 1 : 0) || (a.days ?? 999) - (b.days ?? 999));

  const totalRent = propTenants.filter(t => t.active !== false).reduce((s, t) => s + (+t.rent || 0), 0);

  // Tenant handlers
  const handleSaveTenant = (t) => {
    if (editingTenant && editingTenant.id) {
      saveTenants(tenants.map(x => x.id === editingTenant.id ? { ...editingTenant, ...t } : x));
    } else {
      saveTenants([...tenants, { id: uid(), propertyId: property.id, active: true, ...t }]);
    }
    setEditingTenant(null); setShowTenantForm(false);
  };
  const handleDeleteTenant = (id) => {
    if (confirm("Delete this tenant?")) saveTenants(tenants.filter(t => t.id !== id));
  };

  // Bill handlers
  const handleSaveBill = (bill) => {
    if (editingBill) saveBills(bills.map(b => b.id === editingBill.id ? { ...editingBill, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditingBill(null); setShowBillForm(false);
  };
  const handleDeleteBill = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };
  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  // Utilities
  const utilities = property.utilities || [];
  const updateUtilities = (newUtils) => {
    saveProperties(properties.map(p => p.id === property.id ? { ...p, utilities: newUtils } : p));
  };
  const toggleUtility = (id) => updateUtilities(utilities.map(u => u.id === id ? { ...u, signedUp: !u.signedUp } : u));
  const updateUtilityField = (id, field, value) => updateUtilities(utilities.map(u => u.id === id ? { ...u, [field]: value } : u));
  const addUtility = () => { setNewUtilName(""); setAddingUtility(true); };
  const confirmAddUtility = () => {
    if (newUtilName.trim()) updateUtilities([...utilities, { id: uid(), name: newUtilName.trim(), signedUp: false, company: "" }]);
    setAddingUtility(false); setNewUtilName("");
  };
  const removeUtility = (id) => {
    if (confirm("Remove this utility?")) updateUtilities(utilities.filter(u => u.id !== id));
  };

  return (
    <div>
      {/* Back + edit bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="font-sans text-sm flex items-center gap-1 hover:opacity-70" style={{ color: C.inkSoft }}>
          ← Back to all properties
        </button>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="secondary" size="sm" onClick={onEdit}>
            <Pencil size={12} /> Edit Property Info
          </Btn>
          {onTransfer && (
            <Btn variant="secondary" size="sm" onClick={onTransfer}>
              Move to…
            </Btn>
          )}
          {onDelete && (
            <Btn variant="danger" size="sm" onClick={onDelete}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
      </div>

      {/* Header */}
      <Card className="p-5 mb-4" style={{ borderLeft: `3px solid ${C.green}` }}>
        <div>
          <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{property.address || property.nickname || "Unnamed"}</h2>
          {property.nickname && property.address && <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>{property.nickname}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            <Pill color={C.inkSoft}>{property.type}</Pill>
            <Pill color={C.accent}>{property.units || 1} unit{(property.units || 1) > 1 ? "s" : ""}</Pill>
            {totalRent > 0 && <Pill color={C.green}>${totalRent.toLocaleString()}/mo total</Pill>}
            {property.insurer && <Pill color={C.inkSoft}>Insured by {property.insurer}</Pill>}
            {property.mortgageLender && <Pill color={C.inkSoft}>Mortgage: {property.mortgageLender}</Pill>}
          </div>
        </div>
        {property.notes && <p className="font-sans text-sm mt-3 pt-3 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "55" }}>{property.notes}</p>}
      </Card>

      {/* Tenants */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Tenants</h3>
          <Btn size="sm" onClick={() => { setEditingTenant(null); setShowTenantForm(true); }}>
            <Plus size={12} /> Add Tenant
          </Btn>
        </div>
        {propTenants.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No tenants yet. Add one to start tracking rent and lease details.
          </p>
        ) : (
          <div className="space-y-2">
            {propTenants.map(t => {
              const currentMonth = todayISO().slice(0, 7);
              const paidThisMonth = payments && payments.find(p => p.tenantId === t.id && p.month === currentMonth);
              const movingSoon = t.movingOutDate;
              return (
                <div key={t.id} className="p-3 rounded" style={{ background: C.paperSoft, borderLeft: movingSoon ? `3px solid ${C.amber}` : "none" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-medium" style={{ color: C.ink, opacity: t.active === false ? 0.5 : 1 }}>
                        {t.name}{t.unit ? ` — Unit ${t.unit}` : ""}
                        {t.active === false && <span className="ml-2 text-xs italic" style={{ color: C.inkSoft }}>(moved out)</span>}
                        {movingSoon && t.active !== false && (
                          <span className="ml-2 text-xs font-semibold" style={{ color: C.amber }}>
                            Moving out {fmtDate(t.movingOutDate)}
                          </span>
                        )}
                      </p>
                      <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                        ${(+t.rent || 0).toLocaleString()}/mo
                        {t.phone && ` • ${t.phone}`}
                        {t.email && ` • ${t.email}`}
                        {t.leaseEnd && ` • Lease ends ${fmtDate(t.leaseEnd)}`}
                        {t.deposit && ` • Deposit $${(+t.deposit).toLocaleString()}`}
                      </p>
                      {t.notes && <p className="font-sans text-xs mt-1 italic" style={{ color: C.inkSoft }}>{t.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.active !== false && savePayments && (
                        <button onClick={() => {
                          if (paidThisMonth) {
                            savePayments(payments.filter(p => p.id !== paidThisMonth.id));
                          } else {
                            savePayments([...(payments || []), {
                              id: uid(), tenantId: t.id, month: currentMonth,
                              amount: t.rent, datePaid: todayISO(), status: "paid", notes: ""
                            }]);
                          }
                        }}
                          className="px-3 py-1 rounded text-xs font-semibold"
                          style={{
                            background: paidThisMonth ? C.green : "transparent",
                            color: paidThisMonth ? C.paper : C.red,
                            border: `1px solid ${paidThisMonth ? C.green : C.red}`
                          }}
                          title={paidThisMonth ? `Rent paid ${fmtDate(paidThisMonth.datePaid)}` : "Mark rent paid for this month"}>
                          {paidThisMonth ? "✓ Paid" : "Unpaid"}
                        </button>
                      )}
                      <button onClick={() => { setEditingTenant(t); setShowTenantForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                        <Pencil size={14} style={{ color: C.inkSoft }} />
                      </button>
                      <button onClick={() => handleDeleteTenant(t.id)} className="p-1.5 hover:bg-red-100 rounded">
                        <Trash2 size={14} style={{ color: C.red }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Utilities */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Utilities Checklist</h3>
          <Btn size="sm" variant="secondary" onClick={addUtility}><Plus size={12} /> Add</Btn>
        </div>
        {utilities.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>No utilities tracked yet.</p>
        ) : (
          <div className="space-y-2">
            {utilities.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded flex-wrap md:flex-nowrap"
                style={{ background: u.signedUp ? C.green + "11" : C.paperSoft }}>
                <button onClick={() => toggleUtility(u.id)}
                  className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                  style={{ background: u.signedUp ? C.green : "transparent", borderColor: u.signedUp ? C.green : C.inkLine }}>
                  {u.signedUp && <Check size={12} style={{ color: C.paper }} />}
                </button>
                <span className="font-sans text-sm font-medium w-24 shrink-0" style={{ color: C.ink }}>{u.name}</span>
                <Input value={u.company} onChange={e => updateUtilityField(u.id, "company", e.target.value)}
                  placeholder={u.signedUp ? "Provider name" : "Not signed up"} className="flex-1 min-w-[100px]" />
                <Select value={u.paidBy || "tenant"} onChange={e => updateUtilityField(u.id, "paidBy", e.target.value)}
                  className="text-xs shrink-0" style={{ minWidth: "110px" }}>
                  <option value="tenant">Tenant pays</option>
                  <option value="us">We pay</option>
                </Select>
                <button onClick={() => removeUtility(u.id)} className="p-1 hover:bg-red-100 rounded shrink-0">
                  <Trash2 size={12} style={{ color: C.red }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bills */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Bills for this Property</h3>
          <Btn size="sm" onClick={() => { setEditingBill(null); setShowBillForm(true); }}>
            <Plus size={12} /> Add Bill
          </Btn>
        </div>
        {propBills.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No bills yet. Add mortgage payments, property tax, insurance premium, HOA, or anything else with a due date.
          </p>
        ) : (
          <div>
            {propBills.map(b => {
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 py-2 border-b" style={{ borderColor: C.inkLine + "55" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink, opacity: b.status === "paid" ? 0.5 : 1 }}>{b.name}</p>
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" && <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>}
                    <button onClick={() => { setEditingBill(b); setShowBillForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal open={showTenantForm} onClose={() => { setShowTenantForm(false); setEditingTenant(null); }}
        title={editingTenant?.id ? "Edit Tenant" : "Add Tenant"}>
        <TenantForm tenant={editingTenant} properties={[property]} onSave={handleSaveTenant}
          onCancel={() => { setShowTenantForm(false); setEditingTenant(null); }} />
      </Modal>

      <Modal open={showBillForm} onClose={() => { setShowBillForm(false); setEditingBill(null); }}
        title={editingBill ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editingBill} companies={companies} onSave={handleSaveBill}
          forceCompanyId={property.companyId} forcePropertyId={property.id}
          onDelete={(id) => { handleDeleteBill(id); setShowBillForm(false); setEditingBill(null); }}
          onCancel={() => { setShowBillForm(false); setEditingBill(null); }} />
      </Modal>

      <Modal open={addingUtility} onClose={() => setAddingUtility(false)} title="Add Utility">
        <div className="space-y-4">
          <div>
            <Label>Utility name</Label>
            <Input value={newUtilName} onChange={e => setNewUtilName(e.target.value)}
              placeholder="e.g. Cable, Lawn Care, Security" className="block w-full mt-1"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") confirmAddUtility(); }} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setAddingUtility(false)}>Cancel</Btn>
            <Btn onClick={confirmAddUtility} disabled={!newUtilName.trim()}>Add</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PENCILED: RENT ROLL (monthly grid)
// ============================================================
function PenciledRentRollView({ companyId, properties, tenants, payments, savePayments }) {
  const [month, setMonth] = useState(monthKey(todayISO()));

  const monthsRange = useMemo(() => {
    const list = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + i);
      list.push(d.toISOString().slice(0, 7));
    }
    return list;
  }, []);

  const myPropertyIds = useMemo(() => new Set(properties.filter(p => p.companyId === companyId).map(p => p.id)), [properties, companyId]);
  const activeUnits = useMemo(() => tenants.filter(t => t.active !== false && myPropertyIds.has(t.propertyId)), [tenants, myPropertyIds]);
  const monthPayments = useMemo(() => payments.filter(p => p.month === month && activeUnits.find(t => t.id === p.tenantId)), [payments, month, activeUnits]);

  const togglePaid = (tenant) => {
    const existing = payments.find(p => p.tenantId === tenant.id && p.month === month);
    if (existing) {
      savePayments(payments.filter(p => p.id !== existing.id));
    } else {
      savePayments([...payments, {
        id: uid(), tenantId: tenant.id, month, amount: tenant.rent,
        datePaid: todayISO(), status: "paid", notes: ""
      }]);
    }
  };

  const expected = activeUnits.reduce((s, t) => s + (+t.rent || 0), 0);
  const collected = monthPayments.reduce((s, p) => s + (+p.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Select value={month} onChange={e => setMonth(e.target.value)}>
          {monthsRange.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </Select>
        <div className="flex gap-4 text-sm">
          <div><span style={{ color: C.inkSoft }}>Expected: </span>
            <span className="font-serif" style={{ color: C.ink }}>${expected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Collected: </span>
            <span className="font-serif" style={{ color: C.green }}>${collected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Outstanding: </span>
            <span className="font-serif" style={{ color: expected - collected > 0 ? C.red : C.green }}>
              ${(expected - collected).toLocaleString()}</span></div>
        </div>
      </div>

      <Card>
        {activeUnits.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>
            No active tenants yet. Add tenants from the Properties tab.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: C.paperSoft }}>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Property / Unit</th>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Tenant</th>
                <th className="text-right px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Rent</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Status</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Paid On</th>
              </tr>
            </thead>
            <tbody>
              {activeUnits.map(t => {
                const prop = properties.find(p => p.id === t.propertyId);
                const payment = monthPayments.find(p => p.tenantId === t.id);
                return (
                  <tr key={t.id} className="ledger-row border-t" style={{ borderColor: C.inkLine + "44" }}>
                    <td className="px-4 py-3 font-sans text-sm">
                      {prop?.nickname || prop?.address || "—"}
                      {t.unit && <span style={{ color: C.inkSoft }}> • Unit {t.unit}</span>}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm">{t.name}</td>
                    <td className="px-4 py-3 font-sans text-sm text-right">${(+t.rent || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePaid(t)}
                        className="px-3 py-1 rounded text-xs font-semibold transition"
                        style={{
                          background: payment ? C.green : "transparent",
                          color: payment ? C.paper : C.red,
                          border: `1px solid ${payment ? C.green : C.red}`
                        }}>
                        {payment ? "✓ Paid" : "Unpaid"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-sans text-xs" style={{ color: C.inkSoft }}>
                      {payment ? fmtDate(payment.datePaid) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// JECO REALTY — CUSTOM VIEW (small realtor company, 1 on payroll)
// ============================================================
function JECOView({ company, allCompanies, bills, saveBills, properties, flips, notes, saveNotes, payrolls, savePayrolls }) {
  const [subTab, setSubTab] = useState("reminders");

  const myBills = bills.filter(b => b.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const subTabs = [
    { id: "reminders", label: "Reminders", icon: Bell },
    ...(company.showPayroll ? [{ id: "payroll", label: "Payroll & Quarterlies", icon: Calendar }] : []),
    { id: "general", label: "General Bills", icon: Receipt },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{myOpenBills.length}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Open Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "reminders" && (
        <JMCRemindersView companyId={company.id} bills={bills} saveBills={saveBills}
          flips={flips} properties={properties} companies={allCompanies} payrolls={payrolls} />
      )}
      {subTab === "payroll" && company.showPayroll && (
        <JMCPayrollView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies}
          payrolls={payrolls} savePayrolls={savePayrolls} />
      )}
      {subTab === "general" && (
        <JMCGeneralBillsView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}
  { id: uid(), companyId: "flip", name: "Form 941 - Q2 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-07-31`, recurrence: "none", status: "open", notes: "Q2 (Apr-Jun)" },
  { id: uid(), companyId: "flip", name: "Form 941 - Q3 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-10-31`, recurrence: "none", status: "open", notes: "Q3 (Jul-Sep)" },
  { id: uid(), companyId: "flip", name: "Form 941 - Q4 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "none", status: "open", notes: "Q4 (Oct-Dec)" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q1 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-04-30`, recurrence: "none", status: "open", notes: "Q1" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q2 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-07-31`, recurrence: "none", status: "open", notes: "Q2" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q3 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear}-10-31`, recurrence: "none", status: "open", notes: "Q3" },
  { id: uid(), companyId: "realtor", name: "Form 941 - Q4 Federal Payroll Tax", category: "Quarterly Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "none", status: "open", notes: "Q4" },
  { id: uid(), companyId: "flip", name: "Form 940 - FUTA Annual", category: "Annual Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Federal unemployment tax" },
  { id: uid(), companyId: "realtor", name: "Form 940 - FUTA Annual", category: "Annual Tax", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Federal unemployment tax" },
  { id: uid(), companyId: "flip", name: "W-2s to employees + SSA", category: "Year-End", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Deadline to send W-2s to employees and file with SSA" },
  { id: uid(), companyId: "flip", name: "1099-NEC to contractors + IRS", category: "Year-End", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "Subcontractors paid $600+. Likely many on flip side." },
  { id: uid(), companyId: "realtor", name: "W-2 to employee + SSA", category: "Year-End", amount: "", dueDate: `${thisYear + 1}-01-31`, recurrence: "annual", status: "open", notes: "W-2 deadline" },
  { id: uid(), companyId: "flip", name: "Corporate tax return (1120 or 1120-S)", category: "Income Tax", amount: "", dueDate: `${thisYear + 1}-03-15`, recurrence: "annual", status: "open", notes: "S-Corp = 3/15, C-Corp = 4/15. Confirm entity type." },
  { id: uid(), companyId: "rentals", name: "LLC tax return (1065 or Sch E)", category: "Income Tax", amount: "", dueDate: `${thisYear + 1}-03-15`, recurrence: "annual", status: "open", notes: "Multi-member LLC = 1065 (3/15). Single-member = Sch E (4/15)." },
  { id: uid(), companyId: "realtor", name: "LLC tax return", category: "Income Tax", amount: "", dueDate: `${thisYear + 1}-04-15`, recurrence: "annual", status: "open", notes: "Confirm filing type" },
  { id: uid(), companyId: "flip", name: "General liability insurance", category: "Insurance", amount: "", dueDate: addMonths(todayISO(), 1), recurrence: "monthly", status: "open", notes: "" },
  { id: uid(), companyId: "flip", name: "Workers comp premium", category: "Insurance", amount: "", dueDate: addMonths(todayISO(), 1), recurrence: "monthly", status: "open", notes: "" }
];

const SEED_PROPERTIES = [
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Single-Family House", type: "Single Family", units: 1, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Duplex #1", type: "Duplex", units: 2, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Duplex #2", type: "Duplex", units: 2, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Duplex #3", type: "Duplex", units: 2, notes: "Existing rental" },
  { id: uid(), companyId: "rentals", category: "Rental", address: "", nickname: "Storage Facility", type: "Storage", units: 1, notes: "Existing — manage units separately if needed" }
];

const CATEGORIES = [
  "Payroll","Quarterly Tax","Annual Tax","Income Tax","Year-End","Insurance",
  "License/Permit","Utility","Mortgage","Property Tax","HOA","Subscription",
  "Loan Payment","Vendor","Maintenance","Other"
];

const RECURRENCES = [
  { v: "none", label: "One-time" },
  { v: "weekly", label: "Weekly" },
  { v: "biweekly", label: "Every 2 weeks" },
  { v: "semimonthly", label: "Twice monthly (~15 days)" },
  { v: "monthly", label: "Monthly" },
  { v: "bimonthly", label: "Every 2 months" },
  { v: "quarterly", label: "Quarterly" },
  { v: "semiannual", label: "Every 6 months" },
  { v: "annual", label: "Annual" }
];

const FLIP_STATUSES = ["Acquiring","Demo","Rehab","Listed","Pending","Sold","On Hold"];

// ============================================================
// STYLE
// ============================================================
const Style = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap');
    .font-serif { font-family: 'Fraunces', Georgia, serif; }
    .font-sans { font-family: 'Manrope', system-ui, sans-serif; }
    .ledger-row:nth-child(even) { background: rgba(212, 196, 168, 0.08); }
    .tab-active { box-shadow: inset 0 -2px 0 0 var(--accent); }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; }
    .scroll-hide::-webkit-scrollbar { display: none; }
  `}</style>
);

const C = {
  paper: "#f4f5f7",
  paperSoft: "#e5e7eb",
  ink: "#1f2937",
  inkSoft: "#6b7280",
  inkLine: "#d1d5db",
  accent: "#4b5563",
  accentSoft: "#9ca3af",
  green: "#4d7c5f",
  red: "#b04a4a",
  amber: "#b8862f"
};

// ============================================================
// UI PRIMITIVES
// ============================================================
const Btn = ({ children, onClick, variant = "primary", size = "md", className = "", type = "button", disabled }) => {
  const base = "font-sans font-medium transition rounded inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-2.5 py-1 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const variants = {
    primary: "text-white hover:opacity-90",
    secondary: "border hover:bg-black/5",
    ghost: "hover:bg-black/5",
    danger: "text-white hover:opacity-90"
  };
  const styles = variant === "primary" ? { background: C.ink, color: C.paper }
    : variant === "secondary" ? { borderColor: C.inkLine, color: C.ink }
    : variant === "danger" ? { background: C.red }
    : { color: C.ink };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} style={styles}>
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input {...props}
    className={`font-sans px-3 py-2 text-sm rounded border focus:outline-none focus:ring-2 ${className}`}
    style={{ background: C.paper, borderColor: C.inkLine, color: C.ink, ...(props.style || {}) }} />
);

const Select = ({ children, className = "", ...props }) => (
  <select {...props}
    className={`font-sans px-3 py-2 text-sm rounded border focus:outline-none ${className}`}
    style={{ background: C.paper, borderColor: C.inkLine, color: C.ink }}>
    {children}
  </select>
);

const Textarea = ({ className = "", ...props }) => (
  <textarea {...props}
    className={`font-sans px-3 py-2 text-sm rounded border focus:outline-none resize-none ${className}`}
    style={{ background: C.paper, borderColor: C.inkLine, color: C.ink }} />
);

const Label = ({ children, className = "" }) => (
  <label className={`font-sans text-xs uppercase tracking-wider ${className}`}
    style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{children}</label>
);

const Card = ({ children, className = "", style = {}, onClick }) => (
  <div className={`rounded ${className}`}
    style={{ background: C.paper, border: `1px solid ${C.inkLine}`, ...style }}
    onClick={onClick}>{children}</div>
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(31, 42, 58, 0.55)" }} onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded`}
        style={{ background: C.paper, border: `1px solid ${C.inkLine}` }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.inkLine }}>
          <h3 className="font-serif text-xl" style={{ color: C.ink }}>{title}</h3>
          <button onClick={onClose} className="hover:opacity-60"><X size={20} style={{ color: C.ink }} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const Pill = ({ children, color }) => (
  <span className="font-sans text-xs px-2 py-0.5 rounded-full"
    style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{children}</span>
);

// ============================================================
// MAIN APP
// ============================================================
export default function App({ onSignOut }) {
  const [tab, setTab] = useState("dashboard");
  const [companies, setCompanies] = useState([]);
  const [bills, setBills] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [flips, setFlips] = useState([]);
  const [notes, setNotes] = useState({});
  const [payrolls, setPayrolls] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      // Load everything in parallel instead of sequentially — much faster startup
      const [c, b, p, t, pm, f, n, pr] = await Promise.all([
        load("bk:companies", null),
        load("bk:bills", null),
        load("bk:properties", null),
        load("bk:tenants", []),
        load("bk:payments", []),
        load("bk:flips", []),
        load("bk:notes", null),
        load("bk:payrolls", [])
      ]);

      // Companies: apply name migration if needed
      if (c && c.length > 0) {
        const renames = {
          "Flip Corporation": "JMC Investments",
          "Rental LLC": "Penciled Properties",
          "Realtor LLC": "JECO Realty"
        };
        let changed = false;
        const renamed = c.map(co => {
          let updated = co;
          if (renames[co.name]) { updated = { ...updated, name: renames[co.name] }; changed = true; }
          if (updated.showPayroll === undefined) {
            updated = { ...updated, showPayroll: updated.id !== "rentals" };
            changed = true;
          }
          if (!updated.payrollDays) {
            updated = { ...updated, payrollDays: updated.id === "realtor" ? [1] : [1, 10, 25] };
            changed = true;
          }
          return updated;
        });
        setCompanies(renamed);
        if (changed) save("bk:companies", renamed);
      } else { setCompanies(SEED_COMPANIES); save("bk:companies", SEED_COMPANIES); }

      // Bills: remove redundant biweekly payroll bill (superseded by Payroll & Quarterlies calendar)
      if (b && b.length > 0) {
        const cleaned = b.filter(bill => !(
          bill.companyId === "flip" &&
          bill.name === "Payroll (employees + owners)" &&
          bill.recurrence === "biweekly"
        ));
        setBills(cleaned);
        if (cleaned.length !== b.length) save("bk:bills", cleaned);
      } else { setBills(SEED_BILLS); save("bk:bills", SEED_BILLS); }

      // Properties: add category if missing
      if (p && p.length > 0) {
        let changed = false;
        const migrated = p.map(prop => {
          if (!prop.category) { changed = true; return { ...prop, category: "Rental" }; }
          return prop;
        });
        setProperties(migrated);
        if (changed) save("bk:properties", migrated);
      } else { setProperties(SEED_PROPERTIES); save("bk:properties", SEED_PROPERTIES); }

      setTenants(t);
      setPayments(pm);
      setFlips(f);
      setNotes(n && typeof n === "object" ? n : (n ? { _general: n } : {}));
      setPayrolls(pr);
      setLoaded(true);
    })();
  }, []);

  const saveCompanies = (v) => { setCompanies(v); save("bk:companies", v); };
  const saveBills = (v) => { setBills(v); save("bk:bills", v); };
  const saveProperties = (v) => { setProperties(v); save("bk:properties", v); };
  const saveTenants = (v) => { setTenants(v); save("bk:tenants", v); };
  const savePayments = (v) => { setPayments(v); save("bk:payments", v); };
  const saveFlips = (v) => { setFlips(v); save("bk:flips", v); };
  const saveNotes = (v) => { setNotes(v); save("bk:notes", v); };
  const savePayrolls = (v) => { setPayrolls(v); save("bk:payrolls", v); };

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper }}>
      <Style />
      <p className="font-serif text-lg italic" style={{ color: C.inkSoft }}>Opening the ledger…</p>
    </div>
  );

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: C.ink },
    ...companies.map(c => ({ id: `co:${c.id}`, label: c.name, icon: Building2, color: c.color })),
    { id: "settings", label: "Companies", icon: SettingsIcon, color: C.ink }
  ];

  const activeCompanyId = tab.startsWith("co:") ? tab.slice(3) : null;
  const activeCompany = activeCompanyId ? companies.find(c => c.id === activeCompanyId) : null;

  return (
    <div className="min-h-screen font-sans" style={{ background: C.paper, color: C.ink }}>
      <Style />

      <header className="border-b" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-serif text-3xl font-medium" style={{ color: C.ink }}>The Ledger</h1>
            <p className="font-serif italic text-sm mt-0.5" style={{ color: C.inkSoft }}>
              Bookkeeping & rental management — {companies.length} companies
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <p className="font-serif text-sm" style={{ color: C.inkSoft }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            {onSignOut && (
              <button onClick={onSignOut}
                className="font-sans text-xs px-2 py-1 rounded hover:bg-black/5"
                style={{ color: C.inkSoft, border: `1px solid ${C.inkLine}` }}>
                Sign out
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 flex gap-0 overflow-x-auto scroll-hide">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-3 flex items-center gap-2 font-sans text-sm whitespace-nowrap transition ${active ? "tab-active font-semibold" : "hover:bg-black/5"}`}
                style={{ color: active ? t.color : C.ink, "--accent": t.color }}>
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === "dashboard" && (
          <Dashboard {...{ companies, bills, saveBills, properties, tenants, payments, savePayments, flips }} setTab={setTab} />
        )}
        {activeCompany && activeCompany.id === "flip" && (
          <JMCView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} saveProperties={saveProperties}
            tenants={tenants} saveTenants={saveTenants}
            payments={payments} savePayments={savePayments}
            flips={flips} saveFlips={saveFlips}
            notes={notes} saveNotes={saveNotes}
            payrolls={payrolls} savePayrolls={savePayrolls}
          />
        )}
        {activeCompany && activeCompany.id === "rentals" && (
          <PenciledView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} saveProperties={saveProperties}
            tenants={tenants} saveTenants={saveTenants}
            payments={payments} savePayments={savePayments}
            flips={flips}
            notes={notes} saveNotes={saveNotes}
            payrolls={payrolls} savePayrolls={savePayrolls}
          />
        )}
        {activeCompany && activeCompany.id === "realtor" && (
          <JECOView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} flips={flips}
            notes={notes} saveNotes={saveNotes}
            payrolls={payrolls} savePayrolls={savePayrolls}
          />
        )}
        {activeCompany && activeCompany.id !== "flip" && activeCompany.id !== "rentals" && activeCompany.id !== "realtor" && (
          <CompanyView
            company={activeCompany}
            allCompanies={companies}
            bills={bills} saveBills={saveBills}
            properties={properties} saveProperties={saveProperties}
            tenants={tenants} saveTenants={saveTenants}
            payments={payments} savePayments={savePayments}
            flips={flips} saveFlips={saveFlips}
            notes={notes} saveNotes={saveNotes}
          />
        )}
        {tab === "settings" && (
          <CompaniesView
            companies={companies} saveCompanies={saveCompanies}
            bills={bills} setBills={setBills}
            properties={properties} setProperties={setProperties}
            tenants={tenants} setTenants={setTenants}
            payments={payments} setPayments={setPayments}
            flips={flips} setFlips={setFlips}
            notes={notes} setNotes={setNotes}
            payrolls={payrolls} setPayrolls={setPayrolls}
            setCompanies={setCompanies}
          />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-center">
        <p className="font-serif italic text-xs" style={{ color: C.inkSoft }}>
          Data saves automatically to this browser session • Edit companies from the Companies tab
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// COMPANY VIEW (per-company wrapper with sub-tabs)
// ============================================================
function CompanyView({ company, allCompanies, bills, saveBills, properties, saveProperties, tenants, saveTenants, payments, savePayments, flips, saveFlips, notes, saveNotes }) {
  // JMC Investments gets its own custom layout
  if (company.id === "flip") {
    return <JMCView
      company={company}
      bills={bills} saveBills={saveBills}
      properties={properties} saveProperties={saveProperties}
      tenants={tenants} saveTenants={saveTenants}
      payments={payments} savePayments={savePayments}
      notes={notes} saveNotes={saveNotes}
    />;
  }

  const [subTab, setSubTab] = useState("bills");

  // Per-company filtered lists for summary stats
  const myBills = bills.filter(b => b.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const myProperties = properties.filter(p => p.companyId === company.id);
  const myFlips = flips.filter(f => f.companyId === company.id);
  const myActiveFlips = myFlips.filter(f => !["Sold","On Hold"].includes(f.status));

  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const subTabs = [
    { id: "bills", label: "Bills & Reminders", icon: Receipt, count: myOpenBills.length },
    { id: "rentals", label: "Rentals", icon: Building2, count: myProperties.length },
    { id: "flips", label: "Flip Projects", icon: Hammer, count: myActiveFlips.length },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Company header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && (
              <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{myOpenBills.length}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Open Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: active ? company.color + "22" : C.inkLine + "44", color: active ? company.color : C.inkSoft }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {subTab === "bills" && (
        <BillsView companies={allCompanies} bills={bills} saveBills={saveBills} forceCompanyId={company.id} />
      )}
      {subTab === "rentals" && (
        <RentalsView companies={allCompanies} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} payments={payments} savePayments={savePayments}
          forceCompanyId={company.id} />
      )}
      {subTab === "flips" && (
        <FlipsView flips={flips} saveFlips={saveFlips} forceCompanyId={company.id} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ companies, bills, saveBills, properties, tenants, payments, savePayments, flips, setTab }) {
  const cm = monthKey(todayISO());
  const companyById = Object.fromEntries(companies.map(c => [c.id, c]));

  const openBills = bills.filter(b => b.status === "open");
  const billsWithDays = openBills.map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const overdue = billsWithDays.filter(b => b.days !== null && b.days < 0);
  const dueThisWeek = billsWithDays.filter(b => b.days !== null && b.days >= 0 && b.days <= 7);
  const dueThisMonth = billsWithDays.filter(b => b.days !== null && b.days > 7 && b.days <= 30);

  const allUnits = tenants.filter(t => t.active !== false);
  const paidThisMonth = payments.filter(p => p.month === cm && p.status === "paid");
  const unpaidUnits = allUnits.filter(t => !paidThisMonth.find(p => p.tenantId === t.id));
  const totalExpected = allUnits.reduce((s, t) => s + (parseFloat(t.rent) || 0), 0);
  const totalCollected = paidThisMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  const StatCard = ({ label, value, sub, color, onClick }) => (
    <Card className="p-5 cursor-pointer hover:shadow-sm transition" style={{ borderLeft: `3px solid ${color}` }}>
      <div onClick={onClick}>
        <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{label}</p>
        <p className="font-serif text-3xl mt-1.5" style={{ color: C.ink }}>{value}</p>
        {sub && <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>{sub}</p>}
      </div>
    </Card>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl" style={{ color: C.ink }}>Overview</h2>
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Everything across all {companies.length} companies — click a company tab above for detail.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Overdue" value={overdue.length} sub={overdue.length ? "needs attention" : "all caught up"}
          color={overdue.length ? C.red : C.green} />
        <StatCard label="Due This Week" value={dueThisWeek.length} sub="next 7 days" color={C.amber} />
        <StatCard label="Rent Unpaid" value={unpaidUnits.length}
          sub={`${monthLabel(cm)} • ${allUnits.length} total units`}
          color={unpaidUnits.length ? C.red : C.green} />
        <StatCard label="Active Flips" value={flips.filter(f => !["Sold","On Hold"].includes(f.status)).length}
          sub={`${flips.length} total`} color={C.accent} />
      </div>

      {/* Per-company quick summaries */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {companies.map(c => {
          const myOpen = bills.filter(b => b.companyId === c.id && b.status === "open");
          const myOverdue = myOpen.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; });
          const myDueWeek = myOpen.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; });
          const myProps = properties.filter(p => p.companyId === c.id).length;
          const myFlips = flips.filter(f => f.companyId === c.id && !["Sold","On Hold"].includes(f.status)).length;
          return (
            <Card key={c.id} className="p-5 cursor-pointer hover:shadow-sm transition"
              style={{ borderLeft: `4px solid ${c.color}` }}
              onClick={() => setTab(`co:${c.id}`)}>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg" style={{ color: C.ink }}>{c.name}</h3>
                <ChevronRight size={16} style={{ color: C.inkSoft }} />
              </div>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: C.inkSoft }}>
                <div><span className="font-serif text-lg" style={{ color: myOverdue.length ? C.red : C.ink }}>{myOverdue.length}</span> overdue</div>
                <div><span className="font-serif text-lg" style={{ color: myDueWeek.length ? C.amber : C.ink }}>{myDueWeek.length}</span> this week</div>
                <div><span className="font-serif text-lg" style={{ color: C.ink }}>{myOpen.length}</span> open</div>
              </div>
              <div className="flex gap-3 mt-2 text-xs" style={{ color: C.inkSoft }}>
                {myProps > 0 && <span>{myProps} properties</span>}
                {myFlips > 0 && <span>{myFlips} active flips</span>}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl" style={{ color: C.ink }}>Upcoming Bills</h2>
          </div>

          {overdue.length === 0 && dueThisWeek.length === 0 && dueThisMonth.length === 0 && (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>Nothing due in the next 30 days.</p>
          )}

          {overdue.length > 0 && (
            <div className="mb-4">
              <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.red, letterSpacing: "0.08em" }}>
                <AlertCircle size={12} className="inline mr-1" /> Overdue ({overdue.length})
              </p>
              {overdue.slice(0, 5).map(b => <BillRow key={b.id} bill={b} company={companyById[b.companyId]} onPaid={() => markPaid(b)} urgent />)}
            </div>
          )}

          {dueThisWeek.length > 0 && (
            <div className="mb-4">
              <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.amber, letterSpacing: "0.08em" }}>
                Due This Week ({dueThisWeek.length})
              </p>
              {dueThisWeek.slice(0, 5).map(b => <BillRow key={b.id} bill={b} company={companyById[b.companyId]} onPaid={() => markPaid(b)} />)}
            </div>
          )}

          {dueThisMonth.length > 0 && (
            <div>
              <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>
                Later This Month ({dueThisMonth.length})
              </p>
              {dueThisMonth.slice(0, 5).map(b => <BillRow key={b.id} bill={b} company={companyById[b.companyId]} onPaid={() => markPaid(b)} />)}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl" style={{ color: C.ink }}>Rent Status — {monthLabel(cm)}</h2>
          </div>

          {allUnits.length === 0 ? (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              No tenants added yet. Add properties & tenants from a company's Rentals tab.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded" style={{ background: C.paperSoft }}>
                  <p className="font-sans text-xs" style={{ color: C.inkSoft }}>Expected</p>
                  <p className="font-serif text-xl" style={{ color: C.ink }}>${totalExpected.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded" style={{ background: C.paperSoft }}>
                  <p className="font-sans text-xs" style={{ color: C.inkSoft }}>Collected</p>
                  <p className="font-serif text-xl" style={{ color: C.green }}>${totalCollected.toLocaleString()}</p>
                </div>
              </div>

              {unpaidUnits.length > 0 ? (
                <div>
                  <p className="font-sans text-xs uppercase font-semibold mb-2" style={{ color: C.red, letterSpacing: "0.08em" }}>
                    Not Yet Paid ({unpaidUnits.length})
                  </p>
                  {unpaidUnits.map(t => {
                    const prop = properties.find(p => p.id === t.propertyId);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
                        <div>
                          <p className="font-sans text-sm font-medium">{t.name || "—"}</p>
                          <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
                            {prop?.nickname || prop?.address || "—"}{t.unit ? ` • Unit ${t.unit}` : ""} • ${(+t.rent || 0).toLocaleString()}
                          </p>
                        </div>
                        <Btn size="sm" variant="secondary" onClick={() => {
                          const newPayment = { id: uid(), tenantId: t.id, month: cm, amount: t.rent, datePaid: todayISO(), status: "paid", notes: "" };
                          savePayments([...payments, newPayment]);
                        }}>
                          <Check size={12} /> Mark Paid
                        </Btn>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="font-serif italic text-sm" style={{ color: C.green }}>✓ All rents collected for this month.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function BillRow({ bill, company, onPaid, urgent }) {
  const days = daysUntil(bill.dueDate);
  const dayText = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`;
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium truncate" style={{ color: C.ink }}>{bill.name}</p>
        <p className="font-sans text-xs truncate" style={{ color: C.inkSoft }}>
          {company?.name || "—"} • {bill.category} • {fmtDate(bill.dueDate)} ({dayText})
          {bill.amount && ` • $${(+bill.amount).toLocaleString()}`}
        </p>
      </div>
      <Btn size="sm" variant="secondary" onClick={onPaid} className="ml-2 shrink-0">
        <Check size={12} /> Paid
      </Btn>
    </div>
  );
}

// ============================================================
// BILLS VIEW (accepts forceCompanyId)
// ============================================================
function BillsView({ companies, bills, saveBills, forceCompanyId }) {
  const [filter, setFilter] = useState("open");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const effectiveCompanyFilter = forceCompanyId || companyFilter;

  const filtered = bills
    .filter(b => filter === "all" || b.status === filter)
    .filter(b => effectiveCompanyFilter === "all" || b.companyId === effectiveCompanyFilter)
    .filter(b => categoryFilter === "all" || b.category === categoryFilter)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()))
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => {
      if (filter === "paid") return (a.paidDate || "").localeCompare(b.paidDate || "");
      return (a.days ?? 999) - (b.days ?? 999);
    });

  const handleSave = (bill) => {
    if (editing) {
      saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    } else {
      saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    }
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };

  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  const reopenBill = (bill) => {
    saveBills(bills.map(b => b.id === bill.id ? { ...b, status: "open", paidDate: null } : b));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          {filtered.length} {filter === "open" ? "open" : filter} {filtered.length === 1 ? "bill" : "bills"}
        </p>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Bill
        </Btn>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <Label>Status</Label>
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="block mt-1">
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </Select>
        </div>
        {!forceCompanyId && (
          <div>
            <Label>Company</Label>
            <Select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="block mt-1">
              <option value="all">All companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <div>
          <Label>Category</Label>
          <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="block mt-1">
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label>Search</Label>
          <div className="relative mt-1">
            <Search size={14} className="absolute left-2.5 top-2.5" style={{ color: C.inkSoft }} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bill name…"
              className="w-full pl-8" />
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>No bills match these filters.</p>
        ) : (
          <div>
            {filtered.map(b => {
              const company = companies.find(c => c.id === b.companyId);
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 px-4 py-3 hover:bg-black/5"
                  style={{ borderBottom: `1px solid ${C.inkLine + "55"}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink }}>{b.name}</p>
                      {!forceCompanyId && company && <Pill color={company.color}>{company.name}</Pill>}
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                      {b.notes && ` • ${b.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" ? (
                      <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Paid</Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={() => reopenBill(b)}>Reopen</Btn>
                    )}
                    <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editing} companies={companies} onSave={handleSave} forceCompanyId={forceCompanyId}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function BillForm({ bill, companies, onSave, onCancel, onDelete, forceCompanyId, forceFlipId, forcePropertyId }) {
  const [form, setForm] = useState({
    name: bill?.name || "",
    companyId: bill?.companyId || forceCompanyId || companies[0]?.id || "",
    category: bill?.category || "Other",
    amount: bill?.amount || "",
    dueDate: bill?.dueDate || todayISO(),
    recurrence: bill?.recurrence || "none",
    notes: bill?.notes || "",
    flipId: bill?.flipId || forceFlipId || null,
    propertyId: bill?.propertyId || forcePropertyId || null
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <Label>Bill name *</Label>
        <Input value={form.name} onChange={e => update("name", e.target.value)} className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {!forceCompanyId && (
          <div>
            <Label>Company</Label>
            <Select value={form.companyId} onChange={e => update("companyId", e.target.value)} className="block w-full mt-1">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
        <div className={forceCompanyId ? "col-span-2" : ""}>
          <Label>Category</Label>
          <Select value={form.category} onChange={e => update("category", e.target.value)} className="block w-full mt-1">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Due date</Label>
          <Input type="date" value={form.dueDate} onChange={e => update("dueDate", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Amount</Label>
          <Input type="number" step="0.01" value={form.amount} onChange={e => update("amount", e.target.value)}
            placeholder="optional" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Recurrence</Label>
          <Select value={form.recurrence} onChange={e => update("recurrence", e.target.value)} className="block w-full mt-1">
            {RECURRENCES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <div className="flex justify-between items-center gap-2 pt-2">
        <div>
          {bill && bill.id && onDelete && (
            <Btn variant="danger" size="sm" onClick={() => { if (confirm("Delete this bill?")) onDelete(bill.id); }}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => form.name && onSave(form)} disabled={!form.name}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RENTALS VIEW (accepts forceCompanyId)
// ============================================================
function RentalsView({ companies, properties, saveProperties, tenants, saveTenants, payments, savePayments, forceCompanyId }) {
  const [view, setView] = useState("properties");
  const [editingProp, setEditingProp] = useState(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [expandedProp, setExpandedProp] = useState(null);

  const visibleProperties = forceCompanyId
    ? properties.filter(p => p.companyId === forceCompanyId)
    : properties;
  const visibleTenants = tenants.filter(t => visibleProperties.find(p => p.id === t.propertyId));

  const handleSaveProp = (p) => {
    if (editingProp && editingProp.id) saveProperties(properties.map(x => x.id === editingProp.id ? { ...editingProp, ...p } : x));
    else saveProperties([...properties, { id: uid(), ...p }]);
    setEditingProp(null); setShowPropForm(false);
  };

  const handleDeleteProp = (id) => {
    if (confirm("Delete this property? Tenants on it will also be removed.")) {
      saveProperties(properties.filter(p => p.id !== id));
      saveTenants(tenants.filter(t => t.propertyId !== id));
    }
  };

  const handleSaveTenant = (t) => {
    if (editingTenant && editingTenant.id) saveTenants(tenants.map(x => x.id === editingTenant.id ? { ...editingTenant, ...t } : x));
    else saveTenants([...tenants, { id: uid(), active: true, ...t }]);
    setEditingTenant(null); setShowTenantForm(false);
  };

  const handleDeleteTenant = (id) => {
    if (confirm("Delete this tenant?")) saveTenants(tenants.filter(t => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          {visibleProperties.length} properties • {visibleTenants.filter(t => t.active !== false).length} active tenants
        </p>
        <div className="flex items-center gap-2">
          <div className="flex border rounded overflow-hidden" style={{ borderColor: C.inkLine }}>
            <button onClick={() => setView("properties")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "properties" ? "font-semibold" : ""}`}
              style={{ background: view === "properties" ? C.ink : "transparent", color: view === "properties" ? C.paper : C.ink }}>
              Properties
            </button>
            <button onClick={() => setView("rentroll")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "rentroll" ? "font-semibold" : ""}`}
              style={{ background: view === "rentroll" ? C.ink : "transparent", color: view === "rentroll" ? C.paper : C.ink }}>
              Rent Roll
            </button>
          </div>
          <Btn onClick={() => { setEditingProp(null); setShowPropForm(true); }}>
            <Plus size={14} /> Add Property
          </Btn>
        </div>
      </div>

      {view === "properties" && (
        <div className="space-y-3">
          {visibleProperties.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif italic" style={{ color: C.inkSoft }}>
                No properties yet for this company. Click "Add Property" to start.
              </p>
            </Card>
          ) : visibleProperties.map(p => {
            const company = companies.find(c => c.id === p.companyId);
            const propTenants = tenants.filter(t => t.propertyId === p.id);
            const expanded = expandedProp === p.id;
            return (
              <Card key={p.id}>
                <div className="p-4 flex items-center gap-3">
                  <button onClick={() => setExpandedProp(expanded ? null : p.id)} className="p-1 hover:bg-black/10 rounded">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink }}>{p.nickname || p.address || "Untitled"}</p>
                      {!forceCompanyId && company && <Pill color={company.color}>{company.name}</Pill>}
                      <Pill color={C.inkSoft}>{p.type}</Pill>
                      <Pill color={C.accent}>{propTenants.filter(t => t.active !== false).length}/{p.units} occupied</Pill>
                    </div>
                    {p.address && <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>{p.address}</p>}
                  </div>
                  <button onClick={() => { setEditingProp(p); setShowPropForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => handleDeleteProp(p.id)} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>

                {expanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: C.inkLine + "55" }}>
                    <div className="flex items-center justify-between my-3">
                      <p className="font-serif text-sm" style={{ color: C.ink }}>Tenants</p>
                      <Btn size="sm" variant="secondary" onClick={() => { setEditingTenant({ propertyId: p.id }); setShowTenantForm(true); }}>
                        <Plus size={12} /> Add Tenant
                      </Btn>
                    </div>
                    {propTenants.length === 0 ? (
                      <p className="font-serif italic text-sm py-2" style={{ color: C.inkSoft }}>No tenants on this property.</p>
                    ) : propTenants.map(t => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-b-0"
                        style={{ borderColor: C.inkLine + "44" }}>
                        <div>
                          <p className="font-sans text-sm font-medium">{t.name}{t.unit ? ` — Unit ${t.unit}` : ""}</p>
                          <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
                            ${(+t.rent || 0).toLocaleString()}/mo
                            {t.phone && ` • ${t.phone}`}
                            {t.email && ` • ${t.email}`}
                            {t.leaseEnd && ` • Lease ends ${fmtDate(t.leaseEnd)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingTenant(t); setShowTenantForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                            <Pencil size={14} style={{ color: C.inkSoft }} />
                          </button>
                          <button onClick={() => handleDeleteTenant(t.id)} className="p-1.5 hover:bg-red-100 rounded">
                            <Trash2 size={14} style={{ color: C.red }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {view === "rentroll" && (
        <RentRoll properties={visibleProperties} tenants={visibleTenants} payments={payments} savePayments={savePayments} />
      )}

      <Modal open={showPropForm} onClose={() => { setShowPropForm(false); setEditingProp(null); }}
        title={editingProp?.id ? "Edit Property" : "Add Property"}>
        <PropertyForm property={editingProp} companies={companies} onSave={handleSaveProp}
          forceCompanyId={forceCompanyId}
          onCancel={() => { setShowPropForm(false); setEditingProp(null); }} />
      </Modal>

      <Modal open={showTenantForm} onClose={() => { setShowTenantForm(false); setEditingTenant(null); }}
        title={editingTenant?.id ? "Edit Tenant" : "Add Tenant"}>
        <TenantForm tenant={editingTenant} properties={visibleProperties} onSave={handleSaveTenant}
          onCancel={() => { setShowTenantForm(false); setEditingTenant(null); }} />
      </Modal>
    </div>
  );
}

function PropertyForm({ property, companies, onSave, onCancel, forceCompanyId }) {
  const [form, setForm] = useState({
    nickname: property?.nickname || "",
    address: property?.address || "",
    companyId: property?.companyId || forceCompanyId || companies.find(c => c.id === "rentals")?.id || companies[0]?.id || "",
    type: property?.type || "Single Family",
    units: property?.units || 1,
    notes: property?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nickname (for quick reference)</Label>
          <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
            placeholder="e.g. Maple Duplex" className="block w-full mt-1" />
        </div>
        {!forceCompanyId && (
          <div>
            <Label>Owning company</Label>
            <Select value={form.companyId} onChange={e => update("companyId", e.target.value)} className="block w-full mt-1">
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        )}
      </div>
      <div>
        <Label>Address</Label>
        <Input value={form.address} onChange={e => update("address", e.target.value)}
          placeholder="123 Main St, City, ST" className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
            {["Single Family","Duplex","Triplex","Fourplex","Multi-family","Storage","Commercial","Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label># of units</Label>
          <Input type="number" min="1" value={form.units} onChange={e => update("units", +e.target.value)}
            className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave(form)}>Save</Btn>
      </div>
    </div>
  );
}

function TenantForm({ tenant, properties, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: tenant?.name || "",
    propertyId: tenant?.propertyId || properties[0]?.id || "",
    unit: tenant?.unit || "",
    rent: tenant?.rent || "",
    deposit: tenant?.deposit || "",
    phone: tenant?.phone || "",
    email: tenant?.email || "",
    leaseStart: tenant?.leaseStart || "",
    leaseEnd: tenant?.leaseEnd || "",
    active: tenant?.active !== false,
    notes: tenant?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tenant name *</Label>
          <Input value={form.name} onChange={e => update("name", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Property</Label>
          <Select value={form.propertyId} onChange={e => update("propertyId", e.target.value)} className="block w-full mt-1">
            {properties.map(p => <option key={p.id} value={p.id}>{p.nickname || p.address}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Unit</Label>
          <Input value={form.unit} onChange={e => update("unit", e.target.value)}
            placeholder="A, B, 1, etc" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Monthly rent</Label>
          <Input type="number" step="0.01" value={form.rent} onChange={e => update("rent", e.target.value)}
            className="block w-full mt-1" />
        </div>
        <div>
          <Label>Security deposit</Label>
          <Input type="number" step="0.01" value={form.deposit} onChange={e => update("deposit", e.target.value)}
            className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => update("phone", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={e => update("email", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Lease start</Label>
          <Input type="date" value={form.leaseStart} onChange={e => update("leaseStart", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Lease end</Label>
          <Input type="date" value={form.leaseEnd} onChange={e => update("leaseEnd", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={e => update("active", e.target.checked)} />
        <span className="font-sans">Active tenant (uncheck if moved out)</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.name && onSave(form)} disabled={!form.name}>Save</Btn>
      </div>
    </div>
  );
}

function RentRoll({ properties, tenants, payments, savePayments }) {
  const [month, setMonth] = useState(monthKey(todayISO()));

  const monthsRange = useMemo(() => {
    const list = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + i);
      list.push(d.toISOString().slice(0, 7));
    }
    return list;
  }, []);

  const activeUnits = tenants.filter(t => t.active !== false);
  const monthPayments = payments.filter(p => p.month === month && activeUnits.find(t => t.id === p.tenantId));

  const togglePaid = (tenant) => {
    const existing = payments.find(p => p.tenantId === tenant.id && p.month === month);
    if (existing) {
      savePayments(payments.filter(p => p.id !== existing.id));
    } else {
      savePayments([...payments, {
        id: uid(), tenantId: tenant.id, month, amount: tenant.rent,
        datePaid: todayISO(), status: "paid", notes: ""
      }]);
    }
  };

  const expected = activeUnits.reduce((s, t) => s + (+t.rent || 0), 0);
  const collected = monthPayments.reduce((s, p) => s + (+p.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Select value={month} onChange={e => setMonth(e.target.value)}>
          {monthsRange.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </Select>
        <div className="flex gap-4 text-sm">
          <div><span style={{ color: C.inkSoft }}>Expected: </span>
            <span className="font-serif" style={{ color: C.ink }}>${expected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Collected: </span>
            <span className="font-serif" style={{ color: C.green }}>${collected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Outstanding: </span>
            <span className="font-serif" style={{ color: expected - collected > 0 ? C.red : C.green }}>
              ${(expected - collected).toLocaleString()}</span></div>
        </div>
      </div>

      <Card>
        {activeUnits.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>No active tenants.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: C.paperSoft }}>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Property / Unit</th>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Tenant</th>
                <th className="text-right px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Rent</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Status</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Paid On</th>
              </tr>
            </thead>
            <tbody>
              {activeUnits.map(t => {
                const prop = properties.find(p => p.id === t.propertyId);
                const payment = monthPayments.find(p => p.tenantId === t.id);
                return (
                  <tr key={t.id} className="ledger-row border-t" style={{ borderColor: C.inkLine + "44" }}>
                    <td className="px-4 py-3 font-sans text-sm">
                      {prop?.nickname || prop?.address || "—"}
                      {t.unit && <span style={{ color: C.inkSoft }}> • Unit {t.unit}</span>}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm">{t.name}</td>
                    <td className="px-4 py-3 font-sans text-sm text-right">${(+t.rent || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePaid(t)}
                        className="px-3 py-1 rounded text-xs font-semibold transition"
                        style={{
                          background: payment ? C.green : "transparent",
                          color: payment ? C.paper : C.red,
                          border: `1px solid ${payment ? C.green : C.red}`
                        }}>
                        {payment ? "✓ Paid" : "Unpaid"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-sans text-xs" style={{ color: C.inkSoft }}>
                      {payment ? fmtDate(payment.datePaid) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// FLIPS VIEW (accepts forceCompanyId)
// ============================================================
function FlipsView({ flips, saveFlips, forceCompanyId }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");

  const visibleFlips = forceCompanyId
    ? flips.filter(f => f.companyId === forceCompanyId)
    : flips;

  const filtered = visibleFlips.filter(f => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return !["Sold","On Hold"].includes(f.status);
    return f.status === statusFilter;
  });

  const handleSave = (f) => {
    if (editing) saveFlips(flips.map(x => x.id === editing.id ? { ...editing, ...f } : x));
    else saveFlips([...flips, { id: uid(), companyId: forceCompanyId || "flip", ...f }]);
    setEditing(null); setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this flip project?")) saveFlips(flips.filter(f => f.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          {filtered.length} {statusFilter === "active" ? "active" : statusFilter} projects
        </p>
        <div className="flex gap-2 items-end">
          <div>
            <Label>Filter</Label>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="block mt-1">
              <option value="active">Active only</option>
              <option value="all">All</option>
              {FLIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Flip
          </Btn>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-serif italic" style={{ color: C.inkSoft }}>
            {visibleFlips.length === 0 ? "No flip projects added yet. Click 'Add Flip' to track your first one." : "No projects match this filter."}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(f => {
            const statusColor = f.status === "Sold" ? C.green
              : f.status === "On Hold" ? C.inkSoft
              : f.status === "Listed" || f.status === "Pending" ? C.amber
              : C.accent;
            return (
              <Card key={f.id} className="p-4" style={{ borderLeft: `3px solid ${statusColor}` }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg font-medium" style={{ color: C.ink }}>{f.address || "Unnamed flip"}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Pill color={statusColor}>{f.status}</Pill>
                      {f.nickname && <Pill color={C.inkSoft}>{f.nickname}</Pill>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(f); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  {f.purchasePrice && <div><span style={{ color: C.inkSoft }}>Purchase:</span> <span className="font-serif">${(+f.purchasePrice).toLocaleString()}</span></div>}
                  {f.purchaseDate && <div><span style={{ color: C.inkSoft }}>Bought:</span> {fmtDate(f.purchaseDate)}</div>}
                  {f.targetSale && <div><span style={{ color: C.inkSoft }}>Target sale:</span> <span className="font-serif">${(+f.targetSale).toLocaleString()}</span></div>}
                  {f.actualSale && <div><span style={{ color: C.inkSoft }}>Sold for:</span> <span className="font-serif" style={{ color: C.green }}>${(+f.actualSale).toLocaleString()}</span></div>}
                  {f.budget && <div><span style={{ color: C.inkSoft }}>Rehab budget:</span> <span className="font-serif">${(+f.budget).toLocaleString()}</span></div>}
                  {f.spent && <div><span style={{ color: C.inkSoft }}>Spent:</span> <span className="font-serif">${(+f.spent).toLocaleString()}</span></div>}
                </div>
                {f.notes && <p className="font-sans text-xs mt-3 pt-3 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "44" }}>{f.notes}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Flip Project" : "Add Flip Project"} wide>
        <FlipForm flip={editing} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function FlipForm({ flip, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: flip?.address || "",
    nickname: flip?.nickname || "",
    status: flip?.status || "Acquiring",
    purchasePrice: flip?.purchasePrice || "",
    purchaseDate: flip?.purchaseDate || "",
    budget: flip?.budget || "",
    spent: flip?.spent || "",
    targetSale: flip?.targetSale || "",
    actualSale: flip?.actualSale || "",
    saleDate: flip?.saleDate || "",
    notes: flip?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Address *</Label>
          <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={e => update("status", e.target.value)} className="block w-full mt-1">
            {FLIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Nickname (optional)</Label>
        <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
          placeholder="e.g. The Yellow House" className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Purchase price</Label>
          <Input type="number" value={form.purchasePrice} onChange={e => update("purchasePrice", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Purchase date</Label>
          <Input type="date" value={form.purchaseDate} onChange={e => update("purchaseDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Rehab budget</Label>
          <Input type="number" value={form.budget} onChange={e => update("budget", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Spent to date</Label>
          <Input type="number" value={form.spent} onChange={e => update("spent", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Target sale</Label>
          <Input type="number" value={form.targetSale} onChange={e => update("targetSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Actual sale</Label>
          <Input type="number" value={form.actualSale} onChange={e => update("actualSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Sale date</Label>
          <Input type="date" value={form.saleDate} onChange={e => update("saleDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// NOTES VIEW (per-company)
// ============================================================
function NotesView({ notes, saveNotes, companyId, companyName }) {
  const stored = notes[companyId] || "";
  const [local, setLocal] = useState(stored);

  // Re-sync if the active company changes
  useEffect(() => { setLocal(notes[companyId] || ""); }, [companyId, notes]);

  const commit = () => {
    if (local !== (notes[companyId] || "")) {
      saveNotes({ ...notes, [companyId]: local });
    }
  };

  return (
    <div>
      <p className="font-serif italic text-sm mb-4" style={{ color: C.inkSoft }}>
        Scratchpad for {companyName} — saves when you click away from the box.
      </p>
      <Card className="p-4">
        <Textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={commit}
          rows={20} className="block w-full" placeholder="Write anything here…" />
      </Card>
    </div>
  );
}

// ============================================================
// COMPANIES (SETTINGS) VIEW
// ============================================================
function CompaniesView({ companies, saveCompanies, bills, setBills, properties, setProperties, tenants, setTenants, payments, setPayments, flips, setFlips, notes, setNotes, payrolls, setPayrolls, setCompanies }) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = (c) => {
    if (editing) saveCompanies(companies.map(x => x.id === editing.id ? { ...editing, ...c } : x));
    else saveCompanies([...companies, { id: uid(), ...c }]);
    setEditing(null); setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this company? Bills, properties, and flips assigned to it will remain but won't have a company label.")) {
      saveCompanies(companies.filter(c => c.id !== id));
    }
  };

  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      companies, bills, properties, tenants, payments, flips, notes, payrolls
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.companies || !Array.isArray(data.companies)) {
          throw new Error("This doesn't look like a Ledger backup file (no companies found).");
        }
        const proceed = confirm(
          `Restore data from this backup?\n\n` +
          `Backup contains:\n` +
          `• ${data.companies?.length || 0} companies\n` +
          `• ${data.bills?.length || 0} bills\n` +
          `• ${data.properties?.length || 0} properties\n` +
          `• ${data.tenants?.length || 0} tenants\n` +
          `• ${data.payments?.length || 0} rent payments\n` +
          `• ${data.flips?.length || 0} flip projects\n` +
          `• ${data.payrolls?.length || 0} payroll entries\n\n` +
          `This will REPLACE all your current data. Continue?`
        );
        if (!proceed) { setImporting(false); e.target.value = ""; return; }

        // Write each to storage and update state
        // Save in dependency order so foreign keys are satisfied
        // 1. Companies (no deps)
        if (data.companies) { setCompanies(data.companies); await save("bk:companies", data.companies); }
        // 2. Properties, flips (depend on companies)
        if (data.properties) { setProperties(data.properties); await save("bk:properties", data.properties); }
        if (data.flips) { setFlips(data.flips); await save("bk:flips", data.flips); }
        // 3. Tenants (depend on properties), bills (depend on co/prop/flip), payrolls (depend on companies)
        if (data.tenants) { setTenants(data.tenants); await save("bk:tenants", data.tenants); }
        if (data.bills) { setBills(data.bills); await save("bk:bills", data.bills); }
        if (data.payrolls) { setPayrolls(data.payrolls); await save("bk:payrolls", data.payrolls); }
        // 4. Payments (depend on tenants), notes (depend on companies)
        if (data.payments) { setPayments(data.payments); await save("bk:payments", data.payments); }
        if (data.notes) { setNotes(data.notes); await save("bk:notes", data.notes); }
        alert("Data restored successfully.");
      } catch (err) {
        alert("Could not read backup file: " + err.message);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Backup & Restore */}
      <Card className="p-5 mb-6" style={{ borderLeft: `4px solid ${C.accent}` }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="font-serif text-lg" style={{ color: C.ink }}>Backup & Restore</h3>
            <p className="font-sans text-sm mt-1" style={{ color: C.inkSoft }}>
              Your data lives in this browser. Download a backup file regularly so nothing's lost if the browser is cleared or you switch computers. Restoring will REPLACE all current data with what's in the backup file.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn onClick={exportData}>Export Backup</Btn>
            <Btn variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "Restore from File"}
            </Btn>
            <input ref={fileInputRef} type="file" accept=".json,application/json"
              onChange={handleFileImport} style={{ display: "none" }} />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-2xl" style={{ color: C.ink }}>Companies</h2>
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            {companies.length} companies set up — each gets its own tab above
          </p>
        </div>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={14} /> Add Company
        </Btn>
      </div>

      <div className="space-y-3">
        {companies.map(c => (
          <Card key={c.id} className="p-4" style={{ borderLeft: `4px solid ${c.color}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-serif text-lg" style={{ color: C.ink }}>{c.name}</p>
                  <Pill color={c.color}>{c.type}</Pill>
                  {c.showPayroll && <Pill color={C.inkSoft}>Payroll: {(c.payrollDays || [1,10,25]).join(", ")}</Pill>}
                </div>
                {c.notes && <p className="font-sans text-sm mt-2" style={{ color: C.inkSoft }}>{c.notes}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                  <Pencil size={14} style={{ color: C.inkSoft }} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-red-100 rounded">
                  <Trash2 size={14} style={{ color: C.red }} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Company" : "Add Company"}>
        <CompanyForm company={editing} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

function CompanyForm({ company, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: company?.name || "",
    type: company?.type || "LLC",
    color: company?.color || "#5b7a8c",
    showPayroll: company?.showPayroll !== false,
    payrollDays: company?.payrollDays || [1, 10, 25],
    notes: company?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  const colors = ["#c4602f","#5b7a8c","#8c7a5b","#5b7a4b","#8c5b7a","#7a5b8c","#a14430","#b88a2f"];

  return (
    <div className="space-y-4">
      <div>
        <Label>Company name *</Label>
        <Input value={form.name} onChange={e => update("name", e.target.value)} className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Entity type</Label>
          <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
            {["LLC","Corporation","S-Corp","C-Corp","Partnership","Sole Proprietor","Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Color tag</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {colors.map(c => (
              <button key={c} onClick={() => update("color", c)}
                className="w-7 h-7 rounded-full transition"
                style={{ background: c, border: form.color === c ? `2px solid ${C.ink}` : `1px solid ${C.inkLine}`, transform: form.color === c ? "scale(1.1)" : "scale(1)" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="pt-2 border-t" style={{ borderColor: C.inkLine + "55" }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.showPayroll} onChange={e => update("showPayroll", e.target.checked)} />
          <span className="font-sans">Show Payroll & Quarterlies tab</span>
        </label>
        {form.showPayroll && (
          <div className="mt-3 ml-6">
            <Label>Payroll days of month</Label>
            <Input
              value={form.payrollDays.join(", ")}
              onChange={e => {
                const days = e.target.value.split(/[,\s]+/)
                  .map(s => parseInt(s.trim()))
                  .filter(n => Number.isFinite(n) && n >= 1 && n <= 31);
                update("payrollDays", days);
              }}
              placeholder="e.g. 1, 10, 25  or just  1"
              className="block w-full mt-1" />
            <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
              Enter day numbers (1-31) separated by commas. The holiday/weekend rule still applies — payday moves to the first business day before.
            </p>
          </div>
        )}
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.name && onSave(form)} disabled={!form.name}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// JMC: HOLIDAYS + PAYROLL DATE CALCULATION
// ============================================================
const US_FEDERAL_HOLIDAYS = new Set([
  // 2026
  "2026-01-01","2026-01-19","2026-02-16","2026-05-25","2026-06-19",
  "2026-07-03","2026-09-07","2026-10-12","2026-11-11","2026-11-26","2026-12-25",
  // 2027
  "2027-01-01","2027-01-18","2027-02-15","2027-05-31","2027-06-18",
  "2027-07-05","2027-09-06","2027-10-11","2027-11-11","2027-11-25","2027-12-24",
  // 2028
  "2028-01-17","2028-02-21","2028-05-29","2028-06-19","2028-07-04",
  "2028-09-04","2028-10-09","2028-11-10","2028-11-23","2028-12-25"
]);

const isWeekendISO = (iso) => {
  const d = new Date(iso + "T00:00:00").getDay();
  return d === 0 || d === 6;
};
const isHolidayISO = (iso) => US_FEDERAL_HOLIDAYS.has(iso);

// If payday falls on a weekend or federal holiday, move to the first business day BEFORE.
const computePayday = (targetIso) => {
  let d = new Date(targetIso + "T00:00:00");
  const iso = () => d.toISOString().split("T")[0];
  while (isWeekendISO(iso()) || isHolidayISO(iso())) {
    d.setDate(d.getDate() - 1);
  }
  return iso();
};

// IRS semi-weekly deposit rule:
//   Payday Mon or Tue  -> EFTPS due the following Friday (same week)
//   Payday Wed/Thu/Fri -> EFTPS due the following Wednesday (next week)
const computeEftps = (paydayIso) => {
  if (!paydayIso) return null;
  const d = new Date(paydayIso + "T00:00:00");
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  let add = 0;
  if (dow === 1 || dow === 2) add = 5 - dow;           // Mon/Tue -> Fri
  else if (dow >= 3 && dow <= 5) add = 3 + 7 - dow;    // Wed/Thu/Fri -> next Wed
  else if (dow === 6) add = 4;                          // Sat -> next Wed
  else if (dow === 0) add = 3;                          // Sun -> next Wed
  d.setDate(d.getDate() + add);
  return d.toISOString().split("T")[0];
};

// Get payroll events for a given month. Pay days = 1st, 10th, 25th. Submission = 48hr before payday.
const getPayrollEventsForMonth = (yearMonth) => {
  const [y, m] = yearMonth.split("-").map(Number);
  const events = [];
  [1, 10, 25].forEach(day => {
    const target = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const payday = computePayday(target);
    const submit = addDays(payday, -2);
    events.push({ date: submit, title: "Submit payroll", type: "payroll-submit", color: C.amber, payday });
    events.push({ date: payday, title: `Payday (${day}${day === 1 ? "st" : day === 25 ? "th" : "th"})`, type: "payroll-pay", color: C.green });
  });
  return events;
};

const getPayrollEventsForRange = (startIso, endIso) => {
  const events = [];
  let d = new Date(startIso + "T00:00:00");
  d.setDate(1);
  const end = new Date(endIso + "T00:00:00");
  while (d <= end) {
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    events.push(...getPayrollEventsForMonth(ym));
    d.setMonth(d.getMonth() + 1);
  }
  return events.filter(e => e.date >= startIso && e.date <= endIso);
};

// ============================================================
// CALENDAR COMPONENT
// ============================================================
function CalendarGrid({ month, events, onChangeMonth, onDayClick, onEventClick }) {
  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayStr = todayISO();

  const eventsByDate = {};
  events.forEach(e => {
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onChangeMonth(-1)}
          className="px-3 py-1.5 rounded hover:bg-black/5 font-sans text-sm"
          style={{ color: C.ink }}>← Prev</button>
        <h3 className="font-serif text-xl" style={{ color: C.ink }}>{monthLabel(month)}</h3>
        <button onClick={() => onChangeMonth(1)}
          className="px-3 py-1.5 rounded hover:bg-black/5 font-sans text-sm"
          style={{ color: C.ink }}>Next →</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="font-sans text-xs uppercase font-semibold text-center py-1"
            style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} style={{ background: "transparent" }} />;
          const dayEvents = eventsByDate[iso] || [];
          const isToday = iso === todayStr;
          const isHoliday = isHolidayISO(iso);
          const isWeekend = isWeekendISO(iso);
          const clickable = onDayClick && dayEvents.length > 0;
          return (
            <div key={i}
              onClick={() => clickable && onDayClick(iso, dayEvents)}
              className={`min-h-[80px] p-1.5 rounded transition ${clickable ? "cursor-pointer hover:shadow-md" : ""}`}
              style={{
                background: isToday ? C.accent + "22" : isHoliday ? C.inkLine + "44" : C.paper,
                border: `1px solid ${isToday ? C.accent : C.inkLine + "88"}`
              }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-serif text-sm font-medium"
                  style={{ color: isToday ? C.accent : isWeekend || isHoliday ? C.inkSoft : C.ink }}>
                  {parseInt(iso.split("-")[2])}
                </span>
                {isHoliday && <span className="font-sans text-[9px] uppercase" style={{ color: C.inkSoft }}>Hol</span>}
              </div>
              {dayEvents.slice(0, 3).map((e, j) => (
                <div key={j} className="text-[10px] font-sans px-1 py-0.5 rounded mb-0.5 truncate"
                  style={{ background: e.color + "33", color: e.color, border: `1px solid ${e.color}55` }}
                  title={e.title}>
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[10px] font-sans" style={{ color: C.inkSoft }}>
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// JMC VIEW (custom per-company layout for JMC Investments)
// ============================================================
function JMCView({ company, allCompanies, bills, saveBills, properties, saveProperties, tenants, saveTenants, payments, savePayments, flips, saveFlips, notes, saveNotes, payrolls, savePayrolls }) {
  const [subTab, setSubTab] = useState("reminders");

  const myBills = bills.filter(b => b.companyId === company.id);
  const myProjects = flips.filter(f => f.companyId === company.id);
  const myRentals = properties.filter(p => p.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const subTabs = [
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "projects", label: "Projects", icon: Hammer, count: myProjects.length },
    { id: "rentals", label: "Rentals", icon: Building2, count: myRentals.length },
    { id: "payroll", label: "Payroll & Quarterlies", icon: Calendar },
    { id: "general", label: "General Bills", icon: Receipt },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{myOpenBills.length}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Open Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: active ? company.color + "22" : C.inkLine + "44", color: active ? company.color : C.inkSoft }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {subTab === "reminders" && (
        <JMCRemindersView companyId={company.id} bills={bills} saveBills={saveBills}
          flips={flips} properties={properties} companies={allCompanies}
          payrolls={payrolls} />
      )}
      {subTab === "projects" && (
        <JMCProjectsView companyId={company.id} flips={flips} saveFlips={saveFlips}
          bills={bills} saveBills={saveBills} companies={allCompanies}
          properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} />
      )}
      {subTab === "rentals" && (
        <JMCRentalsView companyId={company.id} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} bills={bills} saveBills={saveBills}
          companies={allCompanies} />
      )}
      {subTab === "payroll" && (
        <JMCPayrollView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies}
          payrolls={payrolls} savePayrolls={savePayrolls} />
      )}
      {subTab === "general" && (
        <JMCGeneralBillsView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

// ============================================================
// JMC: REMINDERS VIEW
// ============================================================
function JMCRemindersView({ companyId, bills, saveBills, flips, properties, companies, payrolls }) {
  const [view, setView] = useState("list");
  const [calMonth, setCalMonth] = useState(monthKey(todayISO()));
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("open");
  const [dayModal, setDayModal] = useState(null); // { date, events }

  const myBills = useMemo(() => bills.filter(b => b.companyId === companyId), [bills, companyId]);

  const filtered = useMemo(() => myBills
    .filter(b => filterStatus === "all" || b.status === filterStatus)
    .filter(b => filterCategory === "all" || b.category === filterCategory)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999)),
    [myBills, filterStatus, filterCategory]);

  // Calendar events: bills + computed payroll dates
  const monthStart = calMonth + "-01";
  const monthEnd = addMonths(monthStart, 1);

  const allEvents = useMemo(() => {
    const billEvents = myBills
      .filter(b => b.dueDate && b.dueDate >= monthStart && b.dueDate < monthEnd)
      .map(b => {
        const flip = b.flipId ? flips.find(f => f.id === b.flipId) : null;
        const prop = b.propertyId ? properties.find(p => p.id === b.propertyId) : null;
        const prefix = flip ? `[${flip.nickname || flip.address}] ` : prop ? `[${prop.nickname || prop.address}] ` : "";
        return {
          date: b.dueDate,
          title: prefix + b.name,
          color: b.status === "paid" ? C.green : daysUntil(b.dueDate) < 0 ? C.red : C.ink,
          type: "bill",
          billId: b.id
        };
      });
    const payrollEvents = (payrolls || []).filter(p => p.companyId === companyId).flatMap(p => {
      const events = [];
      if (p.payday && p.payday >= monthStart && p.payday < monthEnd) {
        events.push({ date: p.payday, title: p.label || "Payday", color: p.status === "done" ? C.inkSoft : C.green, type: "payroll-pay", payrollId: p.id });
      }
      if (p.submitDate && p.submitDate >= monthStart && p.submitDate < monthEnd) {
        events.push({ date: p.submitDate, title: `Submit: ${p.label || "Payroll"}`, color: p.status === "done" ? C.inkSoft : C.amber, type: "payroll-submit", payrollId: p.id });
      }
      return events;
    });
    return [...billEvents, ...payrollEvents];
  }, [myBills, calMonth, flips, properties, monthStart, monthEnd, payrolls, companyId]);

  const handleSave = (bill) => {
    if (editing) saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditing(null); setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this reminder?")) saveBills(bills.filter(b => b.id !== id));
  };

  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Everything with a due date — bills, project costs, payroll, quarterlies.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex border rounded overflow-hidden" style={{ borderColor: C.inkLine }}>
            <button onClick={() => setView("list")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "list" ? "font-semibold" : ""}`}
              style={{ background: view === "list" ? C.ink : "transparent", color: view === "list" ? C.paper : C.ink }}>
              List
            </button>
            <button onClick={() => setView("calendar")}
              className={`px-3 py-1.5 font-sans text-sm ${view === "calendar" ? "font-semibold" : ""}`}
              style={{ background: view === "calendar" ? C.ink : "transparent", color: view === "calendar" ? C.paper : C.ink }}>
              Calendar
            </button>
          </div>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Reminder
          </Btn>
        </div>
      </div>

      {view === "list" && (
        <>
          <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="block mt-1">
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="block mt-1">
                <option value="all">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </Card>
          <Card>
            {filtered.length === 0 ? (
              <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>Nothing here yet.</p>
            ) : filtered.map(b => {
              const flip = b.flipId ? flips.find(f => f.id === b.flipId) : null;
              const prop = b.propertyId ? properties.find(p => p.id === b.propertyId) : null;
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 px-4 py-3 hover:bg-black/5"
                  style={{ borderBottom: `1px solid ${C.inkLine + "55"}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink }}>{b.name}</p>
                      {flip && <Pill color={C.accent}>{flip.nickname || flip.address}</Pill>}
                      {prop && <Pill color={C.green}>{prop.nickname || prop.address}</Pill>}
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.amber}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                      {b.notes && ` • ${b.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" && (
                      <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>
                    )}
                    <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}

      {view === "calendar" && (
        <Card className="p-5">
          <CalendarGrid month={calMonth} events={allEvents}
            onChangeMonth={(delta) => setCalMonth(monthKey(addMonths(calMonth + "-01", delta)))}
            onDayClick={(iso, evs) => setDayModal({ date: iso, events: evs })} />
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: C.inkLine + "55" }}>
            <span className="font-sans text-xs" style={{ color: C.inkSoft }}>Legend:</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Submit Payroll</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.green }} /> Payday / Paid Bill</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.red }} /> Overdue</span>
            <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.ink }} /> Bill Due</span>
          </div>
        </Card>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Reminder" : "Add Reminder"}>
        <BillForm bill={editing} companies={companies} onSave={handleSave}
          forceCompanyId={companyId}
          onDelete={(id) => { handleDelete(id); setShowForm(false); setEditing(null); }}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>

      <Modal open={!!dayModal} onClose={() => setDayModal(null)}
        title={dayModal ? `Events on ${fmtDate(dayModal.date)}` : ""}>
        {dayModal && (
          <div className="space-y-2">
            {dayModal.events.map((e, i) => {
              if (e.billId) {
                const bill = bills.find(b => b.id === e.billId);
                if (!bill) return null;
                return (
                  <div key={i} className="p-3 rounded border" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-medium" style={{ color: C.ink }}>{bill.name}</p>
                        <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                          {bill.category}
                          {bill.amount && ` • $${(+bill.amount).toLocaleString()}`}
                          {` • ${bill.status === "paid" ? "Paid" : "Open"}`}
                        </p>
                        {bill.notes && <p className="font-sans text-xs mt-1 italic" style={{ color: C.inkSoft }}>{bill.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {bill.status === "open" && (
                        <Btn size="sm" variant="secondary"
                          onClick={() => { markPaid(bill); setDayModal(null); }}>
                          <Check size={12} /> Mark Paid
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary"
                        onClick={() => { setEditing(bill); setShowForm(true); setDayModal(null); }}>
                        <Pencil size={12} /> Edit
                      </Btn>
                      <Btn size="sm" variant="danger"
                        onClick={() => {
                          if (confirm(`Delete "${bill.name}"?`)) { handleDelete(bill.id); setDayModal(null); }
                        }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                );
              } else if (e.payrollId) {
                return (
                  <div key={i} className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
                    <p className="font-sans font-medium" style={{ color: e.color }}>{e.title}</p>
                    <p className="font-sans text-xs italic mt-1" style={{ color: C.inkSoft }}>
                      This is a payroll entry. Edit, delete, or mark it done from the Payroll & Quarterlies tab.
                    </p>
                  </div>
                );
              } else {
                return (
                  <div key={i} className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
                    <p className="font-sans font-medium" style={{ color: e.color }}>{e.title}</p>
                  </div>
                );
              }
            })}
            <div className="flex justify-end pt-2">
              <Btn variant="ghost" onClick={() => setDayModal(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================================================
// JMC: PROJECTS VIEW
// ============================================================
const DEFAULT_UTILITIES = ["Electric", "Water", "Sewer", "Gas", "Internet", "Trash"];

function JMCProjectsView({ companyId, flips, saveFlips, bills, saveBills, companies, properties, saveProperties, tenants, saveTenants }) {
  const [editingProject, setEditingProject] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [openProject, setOpenProject] = useState(null);

  const myProjects = flips.filter(f => f.companyId === companyId);

  const handleSaveProject = (p) => {
    if (editingProject && editingProject.id) {
      saveFlips(flips.map(x => x.id === editingProject.id ? { ...editingProject, ...p } : x));
    } else {
      saveFlips([...flips, {
        id: uid(), companyId, utilities: DEFAULT_UTILITIES.map(name => ({ id: uid(), name, signedUp: false, company: "" })),
        ...p
      }]);
    }
    setEditingProject(null); setShowProjectForm(false);
  };

  const handleDeleteProject = (id) => {
    if (confirm("Delete this project? Bills attached to it will become unlinked but not deleted.")) {
      saveFlips(flips.filter(f => f.id !== id));
      saveBills(bills.map(b => b.flipId === id ? { ...b, flipId: null } : b));
      if (openProject === id) setOpenProject(null);
    }
  };

  const openProj = openProject ? flips.find(f => f.id === openProject) : null;

  const handleConvertToRental = (targetCompanyId) => {
    if (!openProj) return;
    const newPropertyId = uid();
    // Create property from flip data
    const newProperty = {
      id: newPropertyId,
      companyId: targetCompanyId,
      address: openProj.address || "",
      nickname: openProj.nickname || "",
      type: "Single Family",
      units: 1,
      category: "Rental",
      insurer: openProj.insurer || "",
      mortgageLender: openProj.mortgageLender || "",
      utilities: openProj.utilities || DEFAULT_UTILITIES.map(name => ({ id: uid(), name, signedUp: false, company: "" })),
      notes: openProj.notes || ""
    };
    saveProperties([...properties, newProperty]);
    // Migrate bills: flipId -> propertyId
    saveBills(bills.map(b => b.flipId === openProj.id
      ? { ...b, flipId: null, propertyId: newPropertyId, companyId: targetCompanyId }
      : b));
    // Delete flip
    saveFlips(flips.filter(f => f.id !== openProj.id));
    setOpenProject(null);
  };

  return (
    <div>
      {openProj ? (
        <ProjectDetailView project={openProj} flips={flips} saveFlips={saveFlips}
          bills={bills} saveBills={saveBills} companies={companies}
          onBack={() => setOpenProject(null)}
          onEdit={() => { setEditingProject(openProj); setShowProjectForm(true); }}
          onDelete={() => handleDeleteProject(openProj.id)}
          onConvertToRental={handleConvertToRental} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              {myProjects.length} flip {myProjects.length === 1 ? "project" : "projects"} — click the name to open, or use the pencil/trash icons.
            </p>
            <Btn onClick={() => { setEditingProject(null); setShowProjectForm(true); }}>
              <Plus size={14} /> Add Project
            </Btn>
          </div>

          {myProjects.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif italic" style={{ color: C.inkSoft }}>
                No projects yet. Click "Add Project" to start tracking your first flip.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myProjects.map(p => {
                const statusColor = p.status === "Sold" ? C.green
                  : p.status === "On Hold" ? C.inkSoft
                  : p.status === "Listed" || p.status === "Pending" ? C.amber
                  : C.accent;
                const projectBills = bills.filter(b => b.flipId === p.id && b.status === "open");
                const overdueCount = projectBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
                return (
                  <Card key={p.id} className="p-4 hover:shadow-sm transition"
                    style={{ borderLeft: `3px solid ${statusColor}` }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpenProject(p.id)}>
                        <p className="font-serif text-lg font-medium" style={{ color: C.ink }}>{p.nickname || p.address || "Unnamed project"}</p>
                        {p.nickname && p.address && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{p.address}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Pill color={statusColor}>{p.status}</Pill>
                          {projectBills.length > 0 && <Pill color={overdueCount > 0 ? C.red : C.ink}>{projectBills.length} open bills</Pill>}
                        </div>
                        {(p.purchasePrice || p.targetSale) && (
                          <div className="flex gap-3 mt-3 text-xs" style={{ color: C.inkSoft }}>
                            {p.purchasePrice && <span>Bought ${(+p.purchasePrice).toLocaleString()}</span>}
                            {p.targetSale && <span>Target ${(+p.targetSale).toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditingProject(p); setShowProjectForm(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Edit">
                          <Pencil size={14} style={{ color: C.inkSoft }} />
                        </button>
                        <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 hover:bg-red-100 rounded" title="Delete">
                          <Trash2 size={14} style={{ color: C.red }} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={showProjectForm} onClose={() => { setShowProjectForm(false); setEditingProject(null); }}
        title={editingProject?.id ? "Edit Project" : "Add Project"} wide>
        <ProjectForm project={editingProject} onSave={handleSaveProject}
          onCancel={() => { setShowProjectForm(false); setEditingProject(null); }} />
      </Modal>
    </div>
  );
}

function ProjectForm({ project, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: project?.address || "",
    nickname: project?.nickname || "",
    status: project?.status || "Acquiring",
    purchasePrice: project?.purchasePrice || "",
    purchaseDate: project?.purchaseDate || "",
    targetSale: project?.targetSale || "",
    actualSale: project?.actualSale || "",
    saleDate: project?.saleDate || "",
    insurer: project?.insurer || "",
    mortgageLender: project?.mortgageLender || "",
    notes: project?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Address *</Label>
          <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={e => update("status", e.target.value)} className="block w-full mt-1">
            {FLIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Nickname (optional, for quick reference)</Label>
        <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
          placeholder="e.g. The Yellow House" className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Purchase price</Label>
          <Input type="number" value={form.purchasePrice} onChange={e => update("purchasePrice", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Purchase date</Label>
          <Input type="date" value={form.purchaseDate} onChange={e => update("purchaseDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Target sale</Label>
          <Input type="number" value={form.targetSale} onChange={e => update("targetSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Actual sale</Label>
          <Input type="number" value={form.actualSale} onChange={e => update("actualSale", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Sale date</Label>
          <Input type="date" value={form.saleDate} onChange={e => update("saleDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Property insurer</Label>
          <Input value={form.insurer} onChange={e => update("insurer", e.target.value)}
            placeholder="e.g. State Farm" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Mortgage lender (if any)</Label>
          <Input value={form.mortgageLender} onChange={e => update("mortgageLender", e.target.value)}
            placeholder="e.g. Wells Fargo" className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// PROJECT DETAIL VIEW (inside Projects tab)
// ============================================================
function ProjectDetailView({ project, flips, saveFlips, bills, saveBills, companies, onBack, onEdit, onDelete, onConvertToRental }) {
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [addingUtility, setAddingUtility] = useState(false);
  const [newUtilName, setNewUtilName] = useState("");

  const projectBills = bills
    .filter(b => b.flipId === project.id)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.status === "paid" ? 1 : 0) - (b.status === "paid" ? 1 : 0) || (a.days ?? 999) - (b.days ?? 999));

  const statusColor = project.status === "Sold" ? C.green
    : project.status === "On Hold" ? C.inkSoft
    : project.status === "Listed" || project.status === "Pending" ? C.amber
    : C.accent;

  const handleSaveBill = (bill) => {
    if (editingBill) saveBills(bills.map(b => b.id === editingBill.id ? { ...editingBill, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditingBill(null); setShowBillForm(false);
  };
  const handleDeleteBill = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };
  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  // Utilities management
  const utilities = project.utilities || [];
  const updateUtilities = (newUtils) => {
    saveFlips(flips.map(f => f.id === project.id ? { ...f, utilities: newUtils } : f));
  };
  const toggleUtility = (id) => {
    updateUtilities(utilities.map(u => u.id === id ? { ...u, signedUp: !u.signedUp } : u));
  };
  const updateUtilityField = (id, field, value) => {
    updateUtilities(utilities.map(u => u.id === id ? { ...u, [field]: value } : u));
  };
  const addUtility = () => {
    setNewUtilName("");
    setAddingUtility(true);
  };
  const confirmAddUtility = () => {
    if (newUtilName.trim()) {
      updateUtilities([...utilities, { id: uid(), name: newUtilName.trim(), signedUp: false, company: "" }]);
    }
    setAddingUtility(false);
    setNewUtilName("");
  };
  const removeUtility = (id) => {
    if (confirm("Remove this utility?")) updateUtilities(utilities.filter(u => u.id !== id));
  };

  return (
    <div>
      {/* Back + edit bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="font-sans text-sm flex items-center gap-1 hover:opacity-70"
          style={{ color: C.inkSoft }}>
          ← Back to all projects
        </button>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="secondary" size="sm" onClick={onEdit}>
            <Pencil size={12} /> Edit Project Info
          </Btn>
          {onConvertToRental && (
            <Btn variant="secondary" size="sm" onClick={() => setShowConvertModal(true)}>
              Convert to Rental
            </Btn>
          )}
          {onDelete && (
            <Btn variant="danger" size="sm" onClick={onDelete}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
      </div>

      {/* Project header */}
      <Card className="p-5 mb-4" style={{ borderLeft: `3px solid ${statusColor}` }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{project.address || "Unnamed"}</h2>
            {project.nickname && <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>{project.nickname}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <Pill color={statusColor}>{project.status}</Pill>
              {project.insurer && <Pill color={C.inkSoft}>Insured by {project.insurer}</Pill>}
              {project.mortgageLender && <Pill color={C.inkSoft}>Mortgage: {project.mortgageLender}</Pill>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.purchasePrice && (
              <div>
                <p className="font-sans text-xs uppercase" style={{ color: C.inkSoft }}>Purchase</p>
                <p className="font-serif text-lg" style={{ color: C.ink }}>${(+project.purchasePrice).toLocaleString()}</p>
                {project.purchaseDate && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{fmtDate(project.purchaseDate)}</p>}
              </div>
            )}
            {project.targetSale && (
              <div>
                <p className="font-sans text-xs uppercase" style={{ color: C.inkSoft }}>Target Sale</p>
                <p className="font-serif text-lg" style={{ color: C.ink }}>${(+project.targetSale).toLocaleString()}</p>
              </div>
            )}
            {project.actualSale && (
              <div>
                <p className="font-sans text-xs uppercase" style={{ color: C.inkSoft }}>Sold</p>
                <p className="font-serif text-lg" style={{ color: C.green }}>${(+project.actualSale).toLocaleString()}</p>
                {project.saleDate && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{fmtDate(project.saleDate)}</p>}
              </div>
            )}
          </div>
        </div>
        {project.notes && <p className="font-sans text-sm mt-3 pt-3 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "55" }}>{project.notes}</p>}
      </Card>

      {/* Utilities Checklist */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Utilities Checklist</h3>
          <Btn size="sm" variant="secondary" onClick={addUtility}><Plus size={12} /> Add</Btn>
        </div>
        {utilities.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>No utilities set up yet. Add some.</p>
        ) : (
          <div className="space-y-2">
            {utilities.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded"
                style={{ background: u.signedUp ? C.green + "11" : C.paperSoft }}>
                <button onClick={() => toggleUtility(u.id)}
                  className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                  style={{ background: u.signedUp ? C.green : "transparent", borderColor: u.signedUp ? C.green : C.inkLine }}>
                  {u.signedUp && <Check size={12} style={{ color: C.paper }} />}
                </button>
                <span className="font-sans text-sm font-medium w-24 shrink-0" style={{ color: C.ink }}>{u.name}</span>
                <Input value={u.company} onChange={e => updateUtilityField(u.id, "company", e.target.value)}
                  placeholder={u.signedUp ? "Provider name" : "Not signed up"}
                  className="flex-1" />
                <button onClick={() => removeUtility(u.id)} className="p-1 hover:bg-red-100 rounded">
                  <Trash2 size={12} style={{ color: C.red }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bills for this project */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Bills for this Project</h3>
          <Btn size="sm" onClick={() => { setEditingBill(null); setShowBillForm(true); }}>
            <Plus size={12} /> Add Bill
          </Btn>
        </div>
        {projectBills.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No bills yet. Add mortgage payments, property tax, insurance premium, or anything else with a due date.
          </p>
        ) : (
          <div>
            {projectBills.map(b => {
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 py-2 border-b"
                  style={{ borderColor: C.inkLine + "55" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink, opacity: b.status === "paid" ? 0.5 : 1 }}>{b.name}</p>
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" && (
                      <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>
                    )}
                    <button onClick={() => { setEditingBill(b); setShowBillForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showBillForm} onClose={() => { setShowBillForm(false); setEditingBill(null); }}
        title={editingBill ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editingBill} companies={companies} onSave={handleSaveBill}
          forceCompanyId={project.companyId} forceFlipId={project.id}
          onCancel={() => { setShowBillForm(false); setEditingBill(null); }} />
      </Modal>

      <Modal open={addingUtility} onClose={() => setAddingUtility(false)} title="Add Utility">
        <div className="space-y-4">
          <div>
            <Label>Utility name</Label>
            <Input value={newUtilName} onChange={e => setNewUtilName(e.target.value)}
              placeholder="e.g. Cable, Lawn Care, Security" className="block w-full mt-1"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") confirmAddUtility(); }} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setAddingUtility(false)}>Cancel</Btn>
            <Btn onClick={confirmAddUtility} disabled={!newUtilName.trim()}>Add</Btn>
          </div>
        </div>
      </Modal>

      <ConvertFlipModal
        open={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        project={project}
        companies={companies}
        bills={bills.filter(b => b.flipId === project.id)}
        onConfirm={(targetCompanyId) => { setShowConvertModal(false); onConvertToRental && onConvertToRental(targetCompanyId); }}
      />
    </div>
  );
}

// ============================================================
// CONVERT FLIP → RENTAL MODAL
// ============================================================
function ConvertFlipModal({ open, onClose, project, companies, bills, onConfirm }) {
  const [targetCompanyId, setTargetCompanyId] = useState("rentals");
  if (!project) return null;
  return (
    <Modal open={open} onClose={onClose} title="Convert to Rental" wide>
      <div className="space-y-4">
        <p className="font-sans text-sm" style={{ color: C.ink }}>
          Convert <span className="font-medium">{project.nickname || project.address}</span> from a flip project into a rental property.
        </p>

        <div className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
          <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: C.inkSoft }}>What happens:</p>
          <ul className="font-sans text-sm space-y-1" style={{ color: C.ink }}>
            <li>• A new rental property will be created under the company you pick below.</li>
            <li>• The address, nickname, notes, utilities, insurer, and mortgage lender will carry over.</li>
            <li>• {bills.length} bill{bills.length === 1 ? "" : "s"} linked to this project will be re-linked to the new rental.</li>
            <li>• Flip-specific info (purchase price, target sale, budget, status) will NOT carry over.</li>
            <li>• The flip project record will be deleted.</li>
          </ul>
        </div>

        <div>
          <Label>Move to which company?</Label>
          <Select value={targetCompanyId} onChange={e => setTargetCompanyId(e.target.value)} className="block w-full mt-1">
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onConfirm(targetCompanyId)}>Convert</Btn>
        </div>
      </div>
    </Modal>
  );
}
function JMCRentalsView({ companyId, properties, saveProperties, tenants, saveTenants, bills, saveBills, companies }) {
  const [editingProp, setEditingProp] = useState(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [transferProp, setTransferProp] = useState(null);

  const myRentals = properties.filter(p => p.companyId === companyId);

  const handleSaveProp = (p) => {
    if (editingProp && editingProp.id) saveProperties(properties.map(x => x.id === editingProp.id ? { ...editingProp, ...p } : x));
    else saveProperties([...properties, { id: uid(), companyId, ...p }]);
    setEditingProp(null); setShowPropForm(false);
  };
  const handleDeleteProp = (id) => {
    if (confirm("Delete this rental? Its tenant(s) and linked bills will become unlinked.")) {
      saveProperties(properties.filter(p => p.id !== id));
      saveTenants(tenants.filter(t => t.propertyId !== id));
      saveBills(bills.map(b => b.propertyId === id ? { ...b, propertyId: null } : b));
    }
  };
  const handleTransferProp = (property, targetCompanyId) => {
    // If inline tenant info exists, create a tenants row so it shows up in Penciled's view
    const hasInline = property.tenantName && property.tenantName.trim();
    let nextTenants = tenants;
    if (hasInline) {
      const alreadyExists = tenants.some(t => t.propertyId === property.id && t.name === property.tenantName);
      if (!alreadyExists) {
        nextTenants = [...tenants, {
          id: uid(),
          propertyId: property.id,
          name: property.tenantName,
          rent: property.rent || null,
          leaseStart: property.leaseStart || null,
          leaseEnd: property.leaseEnd || null,
          active: true,
          notes: ""
        }];
        saveTenants(nextTenants);
      }
    }
    // Change companyId and update linked bills to same company
    saveProperties(properties.map(p => p.id === property.id
      ? { ...p, companyId: targetCompanyId }
      : p));
    saveBills(bills.map(b => b.propertyId === property.id
      ? { ...b, companyId: targetCompanyId }
      : b));
    setTransferProp(null);
  };
  const handleSaveTenant = (t) => {
    if (editingTenant && editingTenant.id) saveTenants(tenants.map(x => x.id === editingTenant.id ? { ...editingTenant, ...t } : x));
    else saveTenants([...tenants, { id: uid(), active: true, ...t }]);
    setEditingTenant(null); setShowTenantForm(false);
  };
  const handleDeleteTenant = (id) => {
    if (confirm("Delete this tenant?")) saveTenants(tenants.filter(t => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Rentals JMC still holds (being transferred to Penciled Properties). {myRentals.length} {myRentals.length === 1 ? "rental" : "rentals"}.
        </p>
        <Btn onClick={() => { setEditingProp(null); setShowPropForm(true); }}>
          <Plus size={14} /> Add Rental
        </Btn>
      </div>

      {myRentals.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-serif italic" style={{ color: C.inkSoft }}>
            No rentals on JMC yet. Add any that haven't been transferred to Penciled.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {myRentals.map(p => {
            const leaseTermText = (p.leaseStart || p.leaseEnd)
              ? `${p.leaseStart ? fmtDate(p.leaseStart) : "—"} to ${p.leaseEnd ? fmtDate(p.leaseEnd) : "—"}`
              : null;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="font-serif text-lg" style={{ color: C.ink }}>{p.address || "Untitled"}</p>
                      <Pill color={C.inkSoft}>{p.type}</Pill>
                      {p.rent && <Pill color={C.green}>${(+p.rent).toLocaleString()}/mo</Pill>}
                    </div>
                    {p.tenantName ? (
                      <p className="font-sans text-sm" style={{ color: C.ink }}>
                        <span style={{ color: C.inkSoft }}>Tenant: </span>
                        <span className="font-medium">{p.tenantName}</span>
                      </p>
                    ) : (
                      <p className="font-sans text-sm italic" style={{ color: C.inkSoft }}>No tenant info — click pencil to add</p>
                    )}
                    {leaseTermText && (
                      <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
                        Lease: {leaseTermText}
                      </p>
                    )}
                    {p.notes && (
                      <p className="font-sans text-xs mt-2 italic pt-2 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "55" }}>{p.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 items-start">
                    <button onClick={() => { setEditingProp(p); setShowPropForm(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Edit">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => setTransferProp(p)} className="px-2 py-1 hover:bg-black/10 rounded font-sans text-xs" title="Move to another company" style={{ color: C.inkSoft }}>
                      Move
                    </button>
                    <button onClick={() => handleDeleteProp(p.id)} className="p-1.5 hover:bg-red-100 rounded" title="Delete">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showPropForm} onClose={() => { setShowPropForm(false); setEditingProp(null); }}
        title={editingProp?.id ? "Edit Rental" : "Add Rental"}>
        <SimpleRentalForm property={editingProp} onSave={handleSaveProp}
          onCancel={() => { setShowPropForm(false); setEditingProp(null); }} />
      </Modal>

      <Modal open={showTenantForm} onClose={() => { setShowTenantForm(false); setEditingTenant(null); }}
        title={editingTenant?.id ? "Edit Tenant" : "Add Tenant"}>
        <TenantForm tenant={editingTenant} properties={myRentals} onSave={handleSaveTenant}
          onCancel={() => { setShowTenantForm(false); setEditingTenant(null); }} />
      </Modal>

      <TransferPropertyModal
        open={!!transferProp}
        onClose={() => setTransferProp(null)}
        property={transferProp}
        currentCompanyId={companyId}
        companies={companies}
        onConfirm={handleTransferProp}
      />
    </div>
  );
}

// ============================================================
// TRANSFER PROPERTY MODAL (move rental from one company to another)
// ============================================================
function TransferPropertyModal({ open, onClose, property, currentCompanyId, companies, onConfirm }) {
  const otherCompanies = companies.filter(c => c.id !== currentCompanyId);
  const [targetId, setTargetId] = useState(otherCompanies[0]?.id || "");
  useEffect(() => {
    if (open && otherCompanies.length > 0 && !otherCompanies.find(c => c.id === targetId)) {
      setTargetId(otherCompanies[0].id);
    }
  }, [open]); // eslint-disable-line
  if (!property) return null;
  const hasInline = property.tenantName && property.tenantName.trim();
  return (
    <Modal open={open} onClose={onClose} title="Move Rental to Another Company">
      <div className="space-y-4">
        <p className="font-sans text-sm" style={{ color: C.ink }}>
          Move <span className="font-medium">{property.nickname || property.address}</span> to a different company.
        </p>
        <div className="p-3 rounded" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
          <p className="font-sans text-xs uppercase tracking-wider mb-2" style={{ color: C.inkSoft }}>What happens:</p>
          <ul className="font-sans text-sm space-y-1" style={{ color: C.ink }}>
            <li>• The property will be reassigned to the company you pick.</li>
            <li>• Bills linked to this property will follow it.</li>
            {hasInline && <li>• The inline tenant info ({property.tenantName}) will be added to the tenants list so it shows up in the new company.</li>}
            <li>• Nothing is deleted.</li>
          </ul>
        </div>
        <div>
          <Label>Move to which company?</Label>
          <Select value={targetId} onChange={e => setTargetId(e.target.value)} className="block w-full mt-1">
            {otherCompanies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onConfirm(property, targetId)} disabled={!targetId}>Move</Btn>
        </div>
      </div>
    </Modal>
  );
}

function SimpleRentalForm({ property, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: property?.address || "",
    type: property?.type || "Single Family",
    tenantName: property?.tenantName || "",
    rent: property?.rent || "",
    leaseStart: property?.leaseStart || "",
    leaseEnd: property?.leaseEnd || "",
    notes: property?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div>
        <Label>Address *</Label>
        <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
          {["Single Family","Duplex","Triplex","Fourplex","Multi-family","Storage","Other"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </div>
      <div className="pt-2 mt-2 border-t" style={{ borderColor: C.inkLine + "55" }}>
        <p className="font-serif text-sm mb-3" style={{ color: C.ink }}>Tenant & Lease</p>
        <div className="space-y-3">
          <div>
            <Label>Tenant name</Label>
            <Input value={form.tenantName} onChange={e => update("tenantName", e.target.value)} className="block w-full mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Monthly rent</Label>
              <Input type="number" step="0.01" value={form.rent} onChange={e => update("rent", e.target.value)}
                placeholder="$" className="block w-full mt-1" />
            </div>
            <div>
              <Label>Lease start</Label>
              <Input type="date" value={form.leaseStart} onChange={e => update("leaseStart", e.target.value)} className="block w-full mt-1" />
            </div>
            <div>
              <Label>Lease end</Label>
              <Input type="date" value={form.leaseEnd} onChange={e => update("leaseEnd", e.target.value)} className="block w-full mt-1" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// JMC: PAYROLL & QUARTERLIES VIEW (calendar with computed payroll dates + 941 quarterlies)
// ============================================================
function JMCPayrollView({ companyId, bills, saveBills, companies, payrolls, savePayrolls }) {
  const [calMonth, setCalMonth] = useState(monthKey(todayISO()));
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [dayModal, setDayModal] = useState(null);

  const myPayrolls = useMemo(() => payrolls.filter(p => p.companyId === companyId), [payrolls, companyId]);

  const taxCategories = ["Payroll", "Quarterly Tax", "Annual Tax", "Year-End"];
  const taxBills = useMemo(
    () => bills.filter(b => b.companyId === companyId && taxCategories.includes(b.category)),
    [bills, companyId]
  );

  const monthStart = calMonth + "-01";
  const monthEnd = addMonths(monthStart, 1);

  const allEvents = useMemo(() => {
    // Payroll events from stored payrolls
    const payrollEvents = myPayrolls.flatMap(p => {
      const events = [];
      if (p.payday && p.payday >= monthStart && p.payday < monthEnd) {
        events.push({
          date: p.payday,
          title: p.label || "Payday",
          color: p.status === "done" ? C.inkSoft : C.green,
          type: "payroll-pay",
          payrollId: p.id
        });
      }
      if (p.submitDate && p.submitDate >= monthStart && p.submitDate < monthEnd) {
        events.push({
          date: p.submitDate,
          title: `Submit: ${p.label || "Payroll"}`,
          color: p.status === "done" ? C.inkSoft : C.amber,
          type: "payroll-submit",
          payrollId: p.id
        });
      }
      if (p.eftpsDate && p.eftpsDate >= monthStart && p.eftpsDate < monthEnd) {
        events.push({
          date: p.eftpsDate,
          title: `EFTPS: ${p.label || "Payroll"}`,
          color: p.status === "done" ? C.inkSoft : "#7c5cad",
          type: "payroll-eftps",
          payrollId: p.id
        });
      }
      return events;
    });

    const taxEvents = taxBills
      .filter(b => b.dueDate && b.dueDate >= monthStart && b.dueDate < monthEnd)
      .map(b => ({
        date: b.dueDate,
        title: b.name,
        color: b.category === "Quarterly Tax" ? C.red : b.category === "Annual Tax" ? C.amber : C.ink,
        type: "tax",
        billId: b.id
      }));
    return [...payrollEvents, ...taxEvents];
  }, [myPayrolls, taxBills, monthStart, monthEnd]);

  const upcomingPayroll = useMemo(() => myPayrolls
    .filter(p => p.payday && p.payday >= todayISO())
    .sort((a, b) => a.payday.localeCompare(b.payday))
    .slice(0, 15), [myPayrolls]);

  const upcomingTax = useMemo(() => taxBills
    .slice()
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "paid" ? 1 : -1;
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    }), [taxBills]);

  // Bill actions (tax)
  const handleSaveBill = (bill) => {
    if (editing) saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditing(null); setShowForm(false);
  };
  const handleDeleteBill = (id) => saveBills(bills.filter(b => b.id !== id));
  const markBillPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  // Payroll actions
  const handleSavePayroll = (entry) => {
    if (editingPayroll && editingPayroll.id) {
      savePayrolls(payrolls.map(p => p.id === editingPayroll.id ? { ...editingPayroll, ...entry } : p));
    } else {
      savePayrolls([...payrolls, { id: uid(), companyId, status: "open", ...entry }]);
    }
    setEditingPayroll(null); setShowPayrollForm(false);
  };
  const handleDeletePayroll = (id) => savePayrolls(payrolls.filter(p => p.id !== id));
  const markPayrollDone = (entry) => {
    savePayrolls(payrolls.map(p => p.id === entry.id ? { ...p, status: "done" } : p));
  };

  const company = companies.find(c => c.id === companyId);
  const payrollDays = (company?.payrollDays && company.payrollDays.length > 0) ? company.payrollDays : [1, 10, 25];

  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const payrollDaysText = payrollDays.map(ordinal).join(", ");

  const generateSchedule = (monthsCount, replace = false) => {
    const entries = [];
    const today = new Date();
    for (let i = 0; i < monthsCount; i++) {
      const m = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      payrollDays.forEach(day => {
        const safeDay = Math.min(day, new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate());
        const target = `${ym}-${String(safeDay).padStart(2, "0")}`;
        const payday = computePayday(target);
        const submitDate = addDays(payday, -2);
        const eftpsDate = computeEftps(payday);
        entries.push({
          id: uid(),
          companyId,
          payday,
          submitDate,
          eftpsDate,
          label: `Payday (${ordinal(day)})`,
          status: "open",
          notes: ""
        });
      });
    }
    if (replace) {
      const others = payrolls.filter(p => p.companyId !== companyId);
      savePayrolls([...others, ...entries]);
    } else {
      savePayrolls([...payrolls, ...entries]);
    }
  };

  const regenerateSchedule = () => {
    if (confirm("This will delete every payroll entry for this company and create a fresh 12-month schedule. Continue?")) {
      generateSchedule(12, true);
    }
  };

  const isEmpty = myPayrolls.length === 0;

  return (
    <div>
      <div className="mb-4 p-4 rounded flex items-start justify-between gap-3 flex-wrap" style={{ background: C.paperSoft, border: `1px solid ${C.inkLine}` }}>
        <p className="font-serif italic text-sm flex-1 min-w-[200px]" style={{ color: C.inkSoft }}>
          Default rule: paydays on the {payrollDaysText} of each month — if those fall on a weekend or federal holiday, payday moves to the first business day before, and the submission deadline is 48 hours before payday. Adjust the days in this company's settings if needed. You can also manually edit any individual date below.
        </p>
        <div className="flex gap-2 flex-wrap">
          {!isEmpty && (
            <Btn variant="secondary" size="sm" onClick={regenerateSchedule}>Regenerate Schedule</Btn>
          )}
          <Btn variant="secondary" onClick={() => { setEditingPayroll(null); setShowPayrollForm(true); }}>
            <Plus size={14} /> Add Payroll
          </Btn>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Tax / Quarterly
          </Btn>
        </div>
      </div>

      {isEmpty && (
        <Card className="p-6 mb-4 text-center" style={{ background: C.accent + "11", borderColor: C.accent }}>
          <p className="font-serif text-lg mb-2" style={{ color: C.ink }}>No payroll schedule yet</p>
          <p className="font-sans text-sm mb-4" style={{ color: C.inkSoft }}>
            Generate 12 months of paydays using the 1st / 10th / 25th rule. You can edit or delete any entry afterward.
          </p>
          <Btn onClick={() => generateSchedule(12)}>Generate 12 Months</Btn>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <CalendarGrid month={calMonth} events={allEvents}
          onChangeMonth={(delta) => setCalMonth(monthKey(addMonths(calMonth + "-01", delta)))}
          onDayClick={(iso, evs) => setDayModal({ date: iso, events: evs })} />
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t" style={{ borderColor: C.inkLine + "55" }}>
          <span className="font-sans text-xs" style={{ color: C.inkSoft }}>Legend:</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Submit Payroll</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.green }} /> Payday</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#7c5cad" }} /> EFTPS Due</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.red }} /> Quarterly Tax</span>
          <span className="font-sans text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: C.amber }} /> Annual / Year-End</span>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-serif text-lg mb-3" style={{ color: C.ink }}>Upcoming Paydays</h3>
          {upcomingPayroll.length === 0 ? (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>None upcoming. Add one or generate the schedule above.</p>
          ) : upcomingPayroll.map(p => {
            const days = daysUntil(p.payday);
            return (
              <div key={p.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium" style={{ color: C.ink, opacity: p.status === "done" ? 0.5 : 1 }}>{p.label}</p>
                  <p className="font-sans text-xs" style={{ color: C.inkSoft }}>
                    Pay {fmtDate(p.payday)}{days !== null && ` (in ${days}d)`} • Submit {fmtDate(p.submitDate)}{p.eftpsDate && ` • EFTPS ${fmtDate(p.eftpsDate)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.status !== "done" && (
                    <Btn size="sm" variant="secondary" onClick={() => markPayrollDone(p)}><Check size={12} /> Done</Btn>
                  )}
                  <button onClick={() => { setEditingPayroll(p); setShowPayrollForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => { if (confirm("Delete this payroll entry?")) handleDeletePayroll(p.id); }} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg mb-3" style={{ color: C.ink }}>All Tax & Quarterly Items</h3>
          {upcomingTax.length === 0 ? (
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              Nothing here. Use "+ Add Tax / Quarterly" above to create one.
            </p>
          ) : upcomingTax.map(b => {
            const days = b.dueDate ? daysUntil(b.dueDate) : null;
            const isPaid = b.status === "paid";
            const isOverdue = !isPaid && days !== null && days < 0;
            return (
              <div key={b.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: C.inkLine + "44" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium" style={{ color: C.ink, opacity: isPaid ? 0.5 : 1 }}>{b.name}</p>
                  <p className="font-sans text-xs" style={{ color: isOverdue ? C.red : C.inkSoft }}>
                    {isPaid ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                    {!isPaid && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                    {` • ${b.category}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isPaid && (
                    <Btn size="sm" variant="secondary" onClick={() => markBillPaid(b)}><Check size={12} /> Done</Btn>
                  )}
                  <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${b.name}"?`)) handleDeleteBill(b.id); }} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Item" : "Add Tax / Quarterly Item"}>
        <BillForm bill={editing || { category: "Quarterly Tax" }} companies={companies} onSave={handleSaveBill}
          forceCompanyId={companyId}
          onDelete={(id) => { handleDeleteBill(id); setShowForm(false); setEditing(null); }}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>

      <Modal open={showPayrollForm} onClose={() => { setShowPayrollForm(false); setEditingPayroll(null); }}
        title={editingPayroll ? "Edit Payroll" : "Add Payroll"}>
        <PayrollEntryForm entry={editingPayroll} onSave={handleSavePayroll}
          onDelete={(id) => { handleDeletePayroll(id); setShowPayrollForm(false); setEditingPayroll(null); }}
          onCancel={() => { setShowPayrollForm(false); setEditingPayroll(null); }} />
      </Modal>

      <Modal open={!!dayModal} onClose={() => setDayModal(null)}
        title={dayModal ? `Events on ${fmtDate(dayModal.date)}` : ""}>
        {dayModal && (
          <div className="space-y-2">
            {dayModal.events.map((e, i) => {
              if (e.billId) {
                const bill = bills.find(b => b.id === e.billId);
                if (!bill) return null;
                return (
                  <div key={i} className="p-3 rounded border" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
                    <p className="font-sans font-medium" style={{ color: C.ink }}>{bill.name}</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                      {bill.category}{bill.amount && ` • $${(+bill.amount).toLocaleString()}`} • {bill.status === "paid" ? "Paid" : "Open"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {bill.status === "open" && (
                        <Btn size="sm" variant="secondary" onClick={() => { markBillPaid(bill); setDayModal(null); }}>
                          <Check size={12} /> Mark Done
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary" onClick={() => { setEditing(bill); setShowForm(true); setDayModal(null); }}>
                        <Pencil size={12} /> Edit
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => {
                        if (confirm(`Delete "${bill.name}"?`)) { handleDeleteBill(bill.id); setDayModal(null); }
                      }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                );
              } else if (e.payrollId) {
                const entry = payrolls.find(p => p.id === e.payrollId);
                if (!entry) return null;
                return (
                  <div key={i} className="p-3 rounded border" style={{ borderColor: C.inkLine, background: C.paperSoft }}>
                    <p className="font-sans font-medium" style={{ color: C.ink }}>{e.title}</p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                      Pay: {fmtDate(entry.payday)} • Submit: {fmtDate(entry.submitDate)}{entry.eftpsDate && ` • EFTPS: ${fmtDate(entry.eftpsDate)}`} • {entry.status === "done" ? "Done" : "Open"}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {entry.status !== "done" && (
                        <Btn size="sm" variant="secondary" onClick={() => { markPayrollDone(entry); setDayModal(null); }}>
                          <Check size={12} /> Mark Done
                        </Btn>
                      )}
                      <Btn size="sm" variant="secondary" onClick={() => { setEditingPayroll(entry); setShowPayrollForm(true); setDayModal(null); }}>
                        <Pencil size={12} /> Edit
                      </Btn>
                      <Btn size="sm" variant="danger" onClick={() => {
                        if (confirm("Delete this payroll entry?")) { handleDeletePayroll(entry.id); setDayModal(null); }
                      }}>
                        <Trash2 size={12} /> Delete
                      </Btn>
                    </div>
                  </div>
                );
              } else {
                return null;
              }
            })}
            <div className="flex justify-end pt-2">
              <Btn variant="ghost" onClick={() => setDayModal(null)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PayrollEntryForm({ entry, onSave, onCancel, onDelete }) {
  const initialPayday = entry?.payday || todayISO();
  const [form, setForm] = useState({
    payday: initialPayday,
    submitDate: entry?.submitDate || addDays(initialPayday, -2),
    eftpsDate: entry?.eftpsDate || computeEftps(initialPayday),
    label: entry?.label || "Payday",
    notes: entry?.notes || "",
    status: entry?.status || "open"
  });
  const update = (k, v) => {
    if (k === "payday" && (!entry || !entry.id)) {
      // For new entries, auto-update submit + EFTPS when payday changes
      setForm({ ...form, payday: v, submitDate: addDays(v, -2), eftpsDate: computeEftps(v) });
    } else {
      setForm({ ...form, [k]: v });
    }
  };
  const recomputeEftps = () => {
    setForm({ ...form, eftpsDate: computeEftps(form.payday) });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Pay date *</Label>
          <Input type="date" value={form.payday} onChange={e => update("payday", e.target.value)} className="block w-full mt-1" />
        </div>
        <div>
          <Label>Submit by</Label>
          <Input type="date" value={form.submitDate} onChange={e => update("submitDate", e.target.value)} className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label>EFTPS deposit due</Label>
          <button type="button" onClick={recomputeEftps}
            className="font-sans text-xs underline"
            style={{ color: C.inkSoft }}>
            Auto-fill from pay date
          </button>
        </div>
        <Input type="date" value={form.eftpsDate || ""} onChange={e => update("eftpsDate", e.target.value)} className="block w-full mt-1" />
        <p className="font-sans text-xs mt-1" style={{ color: C.inkSoft }}>
          Rule: payday Mon/Tue → Friday of same week; payday Wed/Thu/Fri → next Wednesday.
        </p>
      </div>
      <div>
        <Label>Label</Label>
        <Input value={form.label} onChange={e => update("label", e.target.value)}
          placeholder='e.g. "Payday (1st)" or "Year-end bonus"' className="block w-full mt-1" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} className="block w-full mt-1" />
      </div>
      <div className="flex justify-between items-center pt-2">
        <div>
          {entry && entry.id && onDelete && (
            <Btn variant="danger" size="sm" onClick={() => { if (confirm("Delete this payroll entry?")) onDelete(entry.id); }}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => form.payday && onSave(form)} disabled={!form.payday}>Save</Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// JMC: GENERAL BILLS VIEW (company-level bills, no project/rental link)
// ============================================================
function JMCGeneralBillsView({ companyId, bills, saveBills, companies }) {
  const [filterStatus, setFilterStatus] = useState("open");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // General bills = company-level bills (no flipId, no propertyId) AND not in payroll/tax categories
  const taxCategories = ["Payroll", "Quarterly Tax", "Annual Tax", "Year-End"];
  const myBills = bills.filter(b => b.companyId === companyId && !b.flipId && !b.propertyId && !taxCategories.includes(b.category));

  const filtered = myBills
    .filter(b => filterStatus === "all" || b.status === filterStatus)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const handleSave = (bill) => {
    if (editing) saveBills(bills.map(b => b.id === editing.id ? { ...editing, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditing(null); setShowForm(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };
  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
          Company-level bills — insurance, licensing, subscriptions, anything not tied to a specific project or rental.
        </p>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="all">All</option>
          </Select>
          <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={14} /> Add Bill
          </Btn>
        </div>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>No general bills here.</p>
        ) : filtered.map(b => {
          const days = b.days;
          const urgent = b.status === "open" && days !== null && days < 0;
          const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
          return (
            <div key={b.id} className="ledger-row flex items-center gap-3 px-4 py-3 hover:bg-black/5"
              style={{ borderBottom: `1px solid ${C.inkLine + "55"}` }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-sans font-medium" style={{ color: C.ink, opacity: b.status === "paid" ? 0.5 : 1 }}>{b.name}</p>
                  <Pill color={C.inkSoft}>{b.category}</Pill>
                  {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                </div>
                <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                  {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                  {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                  {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                  {b.notes && ` • ${b.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {b.status === "open" && (
                  <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>
                )}
                <button onClick={() => { setEditing(b); setShowForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                  <Pencil size={14} style={{ color: C.inkSoft }} />
                </button>
                <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                  <Trash2 size={14} style={{ color: C.red }} />
                </button>
              </div>
            </div>
          );
        })}
      </Card>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editing} companies={companies} onSave={handleSave}
          forceCompanyId={companyId}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}

// ============================================================
// PENCILED PROPERTIES — CUSTOM VIEW (rental holding company)
// ============================================================
function PenciledView({ company, allCompanies, bills, saveBills, properties, saveProperties, tenants, saveTenants, payments, savePayments, flips, notes, saveNotes, payrolls, savePayrolls }) {
  const [subTab, setSubTab] = useState("reminders");

  const myBills = bills.filter(b => b.companyId === company.id);
  const myProperties = properties.filter(p => p.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  // Active tenants count for this company
  const myPropertyIds = new Set(myProperties.map(p => p.id));
  const activeTenantCount = tenants.filter(t => t.active !== false && myPropertyIds.has(t.propertyId)).length;

  const subTabs = [
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "properties", label: "Properties", icon: Building2, count: myProperties.length },
    { id: "rentroll", label: "Rent Roll", icon: DollarSign },
    ...(company.showPayroll ? [{ id: "payroll", label: "Payroll & Quarterlies", icon: Calendar }] : []),
    { id: "general", label: "General Bills", icon: Receipt },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{activeTenantCount}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Active Tenants</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                  style={{ background: active ? company.color + "22" : C.inkLine + "44", color: active ? company.color : C.inkSoft }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {subTab === "reminders" && (
        <JMCRemindersView companyId={company.id} bills={bills} saveBills={saveBills}
          flips={flips} properties={properties} companies={allCompanies} payrolls={payrolls} />
      )}
      {subTab === "properties" && (
        <PenciledPropertiesView companyId={company.id} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "rentroll" && (
        <PenciledRentRollView companyId={company.id} properties={properties} tenants={tenants}
          payments={payments} savePayments={savePayments} />
      )}
      {subTab === "payroll" && company.showPayroll && (
        <JMCPayrollView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies}
          payrolls={payrolls} savePayrolls={savePayrolls} />
      )}
      {subTab === "general" && (
        <JMCGeneralBillsView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}

// ============================================================
// PENCILED: PROPERTIES LIST + FORM
// ============================================================
function PenciledPropertiesView({ companyId, properties, saveProperties, tenants, saveTenants, bills, saveBills, companies }) {
  const [editingProp, setEditingProp] = useState(null);
  const [showPropForm, setShowPropForm] = useState(false);
  const [openProp, setOpenProp] = useState(null);
  const [transferProp, setTransferProp] = useState(null);

  const myProperties = useMemo(() => properties.filter(p => p.companyId === companyId), [properties, companyId]);

  const handleSaveProp = (p) => {
    if (editingProp && editingProp.id) {
      saveProperties(properties.map(x => x.id === editingProp.id ? { ...editingProp, ...p } : x));
    } else {
      saveProperties([...properties, {
        id: uid(), companyId, category: "Rental",
        utilities: DEFAULT_UTILITIES.map(name => ({ id: uid(), name, signedUp: false, company: "" })),
        ...p
      }]);
    }
    setEditingProp(null); setShowPropForm(false);
  };

  const handleDeleteProp = (id) => {
    if (confirm("Delete this property? Tenants and linked bills will be removed.")) {
      saveProperties(properties.filter(p => p.id !== id));
      saveTenants(tenants.filter(t => t.propertyId !== id));
      saveBills(bills.map(b => b.propertyId === id ? { ...b, propertyId: null } : b));
      if (openProp === id) setOpenProp(null);
    }
  };

  const handleTransferProp = (property, targetCompanyId) => {
    saveProperties(properties.map(p => p.id === property.id
      ? { ...p, companyId: targetCompanyId }
      : p));
    saveBills(bills.map(b => b.propertyId === property.id
      ? { ...b, companyId: targetCompanyId }
      : b));
    setTransferProp(null);
    if (openProp === property.id) setOpenProp(null);
  };

  const openProperty = openProp ? properties.find(p => p.id === openProp) : null;

  return (
    <div>
      {openProperty ? (
        <PenciledPropertyDetailView property={openProperty} properties={properties} saveProperties={saveProperties}
          tenants={tenants} saveTenants={saveTenants} bills={bills} saveBills={saveBills} companies={companies}
          onBack={() => setOpenProp(null)}
          onEdit={() => { setEditingProp(openProperty); setShowPropForm(true); }}
          onDelete={() => handleDeleteProp(openProperty.id)}
          onTransfer={() => setTransferProp(openProperty)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
              {myProperties.length} {myProperties.length === 1 ? "property" : "properties"} — click the name to open, or use the pencil/trash icons to edit or delete directly.
            </p>
            <Btn onClick={() => { setEditingProp(null); setShowPropForm(true); }}>
              <Plus size={14} /> Add Property
            </Btn>
          </div>

          {myProperties.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-serif italic" style={{ color: C.inkSoft }}>
                No properties yet. Click "Add Property" to start.
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myProperties.map(p => {
                const propTenants = tenants.filter(t => t.propertyId === p.id && t.active !== false);
                const propBills = bills.filter(b => b.propertyId === p.id && b.status === "open");
                const overdueCount = propBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
                const totalRent = propTenants.reduce((s, t) => s + (+t.rent || 0), 0);
                return (
                  <Card key={p.id} className="p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpenProp(p.id)}>
                        <p className="font-serif text-lg font-medium" style={{ color: C.ink }}>{p.nickname || p.address || "Unnamed"}</p>
                        {p.nickname && p.address && <p className="font-sans text-xs" style={{ color: C.inkSoft }}>{p.address}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Pill color={C.inkSoft}>{p.type}</Pill>
                          <Pill color={C.accent}>{propTenants.length}/{p.units || 1} occupied</Pill>
                          {totalRent > 0 && <Pill color={C.green}>${totalRent.toLocaleString()}/mo</Pill>}
                          {propBills.length > 0 && <Pill color={overdueCount > 0 ? C.red : C.ink}>{propBills.length} open bills</Pill>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 items-start">
                        <button onClick={() => { setEditingProp(p); setShowPropForm(true); }} className="p-1.5 hover:bg-black/10 rounded" title="Edit">
                          <Pencil size={14} style={{ color: C.inkSoft }} />
                        </button>
                        <button onClick={() => setTransferProp(p)} className="px-2 py-1 hover:bg-black/10 rounded font-sans text-xs" title="Move to another company" style={{ color: C.inkSoft }}>
                          Move
                        </button>
                        <button onClick={() => handleDeleteProp(p.id)} className="p-1.5 hover:bg-red-100 rounded" title="Delete">
                          <Trash2 size={14} style={{ color: C.red }} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={showPropForm} onClose={() => { setShowPropForm(false); setEditingProp(null); }}
        title={editingProp?.id ? "Edit Property" : "Add Property"} wide>
        <PenciledPropertyForm property={editingProp} onSave={handleSaveProp}
          onCancel={() => { setShowPropForm(false); setEditingProp(null); }} />
      </Modal>

      <TransferPropertyModal
        open={!!transferProp}
        onClose={() => setTransferProp(null)}
        property={transferProp}
        currentCompanyId={companyId}
        companies={companies}
        onConfirm={handleTransferProp}
      />
    </div>
  );
}

function PenciledPropertyForm({ property, onSave, onCancel }) {
  const [form, setForm] = useState({
    address: property?.address || "",
    nickname: property?.nickname || "",
    type: property?.type || "Single Family",
    units: property?.units || 1,
    insurer: property?.insurer || "",
    mortgageLender: property?.mortgageLender || "",
    notes: property?.notes || ""
  });
  const update = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <div>
        <Label>Address *</Label>
        <Input value={form.address} onChange={e => update("address", e.target.value)} className="block w-full mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Nickname</Label>
          <Input value={form.nickname} onChange={e => update("nickname", e.target.value)}
            placeholder="optional" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={e => update("type", e.target.value)} className="block w-full mt-1">
            {["Single Family","Duplex","Triplex","Fourplex","Multi-family","Storage","Commercial","Other"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label># of units</Label>
          <Input type="number" min="1" value={form.units} onChange={e => update("units", +e.target.value)}
            className="block w-full mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Property insurer</Label>
          <Input value={form.insurer} onChange={e => update("insurer", e.target.value)}
            placeholder="e.g. State Farm" className="block w-full mt-1" />
        </div>
        <div>
          <Label>Mortgage lender (if any)</Label>
          <Input value={form.mortgageLender} onChange={e => update("mortgageLender", e.target.value)}
            placeholder="e.g. Wells Fargo" className="block w-full mt-1" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} className="block w-full mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => form.address && onSave(form)} disabled={!form.address}>Save</Btn>
      </div>
    </div>
  );
}

// ============================================================
// PENCILED: PROPERTY DETAIL VIEW
// ============================================================
function PenciledPropertyDetailView({ property, properties, saveProperties, tenants, saveTenants, bills, saveBills, companies, onBack, onEdit, onDelete, onTransfer }) {
  const [editingTenant, setEditingTenant] = useState(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [addingUtility, setAddingUtility] = useState(false);
  const [newUtilName, setNewUtilName] = useState("");

  const propTenants = tenants.filter(t => t.propertyId === property.id);
  const propBills = bills
    .filter(b => b.propertyId === property.id)
    .map(b => ({ ...b, days: daysUntil(b.dueDate) }))
    .sort((a, b) => (a.status === "paid" ? 1 : 0) - (b.status === "paid" ? 1 : 0) || (a.days ?? 999) - (b.days ?? 999));

  const totalRent = propTenants.filter(t => t.active !== false).reduce((s, t) => s + (+t.rent || 0), 0);

  // Tenant handlers
  const handleSaveTenant = (t) => {
    if (editingTenant && editingTenant.id) {
      saveTenants(tenants.map(x => x.id === editingTenant.id ? { ...editingTenant, ...t } : x));
    } else {
      saveTenants([...tenants, { id: uid(), propertyId: property.id, active: true, ...t }]);
    }
    setEditingTenant(null); setShowTenantForm(false);
  };
  const handleDeleteTenant = (id) => {
    if (confirm("Delete this tenant?")) saveTenants(tenants.filter(t => t.id !== id));
  };

  // Bill handlers
  const handleSaveBill = (bill) => {
    if (editingBill) saveBills(bills.map(b => b.id === editingBill.id ? { ...editingBill, ...bill } : b));
    else saveBills([...bills, { id: uid(), status: "open", ...bill }]);
    setEditingBill(null); setShowBillForm(false);
  };
  const handleDeleteBill = (id) => {
    if (confirm("Delete this bill?")) saveBills(bills.filter(b => b.id !== id));
  };
  const markPaid = (bill) => {
    let updated;
    if (bill.recurrence && bill.recurrence !== "none") {
      updated = bills.map(b => b.id === bill.id ? { ...b, dueDate: nextDue(b.dueDate, b.recurrence) } : b);
    } else {
      updated = bills.map(b => b.id === bill.id ? { ...b, status: "paid", paidDate: todayISO() } : b);
    }
    saveBills(updated);
  };

  // Utilities
  const utilities = property.utilities || [];
  const updateUtilities = (newUtils) => {
    saveProperties(properties.map(p => p.id === property.id ? { ...p, utilities: newUtils } : p));
  };
  const toggleUtility = (id) => updateUtilities(utilities.map(u => u.id === id ? { ...u, signedUp: !u.signedUp } : u));
  const updateUtilityField = (id, field, value) => updateUtilities(utilities.map(u => u.id === id ? { ...u, [field]: value } : u));
  const addUtility = () => { setNewUtilName(""); setAddingUtility(true); };
  const confirmAddUtility = () => {
    if (newUtilName.trim()) updateUtilities([...utilities, { id: uid(), name: newUtilName.trim(), signedUp: false, company: "" }]);
    setAddingUtility(false); setNewUtilName("");
  };
  const removeUtility = (id) => {
    if (confirm("Remove this utility?")) updateUtilities(utilities.filter(u => u.id !== id));
  };

  return (
    <div>
      {/* Back + edit bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="font-sans text-sm flex items-center gap-1 hover:opacity-70" style={{ color: C.inkSoft }}>
          ← Back to all properties
        </button>
        <div className="flex gap-2 flex-wrap">
          <Btn variant="secondary" size="sm" onClick={onEdit}>
            <Pencil size={12} /> Edit Property Info
          </Btn>
          {onTransfer && (
            <Btn variant="secondary" size="sm" onClick={onTransfer}>
              Move to…
            </Btn>
          )}
          {onDelete && (
            <Btn variant="danger" size="sm" onClick={onDelete}>
              <Trash2 size={12} /> Delete
            </Btn>
          )}
        </div>
      </div>

      {/* Header */}
      <Card className="p-5 mb-4" style={{ borderLeft: `3px solid ${C.green}` }}>
        <div>
          <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{property.address || property.nickname || "Unnamed"}</h2>
          {property.nickname && property.address && <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>{property.nickname}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            <Pill color={C.inkSoft}>{property.type}</Pill>
            <Pill color={C.accent}>{property.units || 1} unit{(property.units || 1) > 1 ? "s" : ""}</Pill>
            {totalRent > 0 && <Pill color={C.green}>${totalRent.toLocaleString()}/mo total</Pill>}
            {property.insurer && <Pill color={C.inkSoft}>Insured by {property.insurer}</Pill>}
            {property.mortgageLender && <Pill color={C.inkSoft}>Mortgage: {property.mortgageLender}</Pill>}
          </div>
        </div>
        {property.notes && <p className="font-sans text-sm mt-3 pt-3 border-t" style={{ color: C.inkSoft, borderColor: C.inkLine + "55" }}>{property.notes}</p>}
      </Card>

      {/* Tenants */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Tenants</h3>
          <Btn size="sm" onClick={() => { setEditingTenant(null); setShowTenantForm(true); }}>
            <Plus size={12} /> Add Tenant
          </Btn>
        </div>
        {propTenants.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No tenants yet. Add one to start tracking rent and lease details.
          </p>
        ) : (
          <div className="space-y-2">
            {propTenants.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded" style={{ background: C.paperSoft }}>
                <div className="flex-1 min-w-0">
                  <p className="font-sans font-medium" style={{ color: C.ink, opacity: t.active === false ? 0.5 : 1 }}>
                    {t.name}{t.unit ? ` — Unit ${t.unit}` : ""}
                    {t.active === false && <span className="ml-2 text-xs italic" style={{ color: C.inkSoft }}>(moved out)</span>}
                  </p>
                  <p className="font-sans text-xs mt-0.5" style={{ color: C.inkSoft }}>
                    ${(+t.rent || 0).toLocaleString()}/mo
                    {t.phone && ` • ${t.phone}`}
                    {t.email && ` • ${t.email}`}
                    {t.leaseEnd && ` • Lease ends ${fmtDate(t.leaseEnd)}`}
                    {t.deposit && ` • Deposit $${(+t.deposit).toLocaleString()}`}
                  </p>
                  {t.notes && <p className="font-sans text-xs mt-1 italic" style={{ color: C.inkSoft }}>{t.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingTenant(t); setShowTenantForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                    <Pencil size={14} style={{ color: C.inkSoft }} />
                  </button>
                  <button onClick={() => handleDeleteTenant(t.id)} className="p-1.5 hover:bg-red-100 rounded">
                    <Trash2 size={14} style={{ color: C.red }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Utilities */}
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Utilities Checklist</h3>
          <Btn size="sm" variant="secondary" onClick={addUtility}><Plus size={12} /> Add</Btn>
        </div>
        {utilities.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>No utilities tracked yet.</p>
        ) : (
          <div className="space-y-2">
            {utilities.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded"
                style={{ background: u.signedUp ? C.green + "11" : C.paperSoft }}>
                <button onClick={() => toggleUtility(u.id)}
                  className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                  style={{ background: u.signedUp ? C.green : "transparent", borderColor: u.signedUp ? C.green : C.inkLine }}>
                  {u.signedUp && <Check size={12} style={{ color: C.paper }} />}
                </button>
                <span className="font-sans text-sm font-medium w-24 shrink-0" style={{ color: C.ink }}>{u.name}</span>
                <Input value={u.company} onChange={e => updateUtilityField(u.id, "company", e.target.value)}
                  placeholder={u.signedUp ? "Provider name" : "Not signed up"} className="flex-1" />
                <button onClick={() => removeUtility(u.id)} className="p-1 hover:bg-red-100 rounded">
                  <Trash2 size={12} style={{ color: C.red }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bills */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg" style={{ color: C.ink }}>Bills for this Property</h3>
          <Btn size="sm" onClick={() => { setEditingBill(null); setShowBillForm(true); }}>
            <Plus size={12} /> Add Bill
          </Btn>
        </div>
        {propBills.length === 0 ? (
          <p className="font-serif italic text-sm" style={{ color: C.inkSoft }}>
            No bills yet. Add mortgage payments, property tax, insurance premium, HOA, or anything else with a due date.
          </p>
        ) : (
          <div>
            {propBills.map(b => {
              const days = b.days;
              const urgent = b.status === "open" && days !== null && days < 0;
              const soon = b.status === "open" && days !== null && days >= 0 && days <= 7;
              return (
                <div key={b.id} className="ledger-row flex items-center gap-3 py-2 border-b" style={{ borderColor: C.inkLine + "55" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-sans font-medium" style={{ color: C.ink, opacity: b.status === "paid" ? 0.5 : 1 }}>{b.name}</p>
                      <Pill color={C.inkSoft}>{b.category}</Pill>
                      {b.recurrence !== "none" && <Pill color={C.accent}>{RECURRENCES.find(r => r.v === b.recurrence)?.label}</Pill>}
                    </div>
                    <p className="font-sans text-xs mt-1" style={{ color: urgent ? C.red : soon ? C.amber : C.inkSoft }}>
                      {b.status === "paid" ? `Paid ${fmtDate(b.paidDate)}` : `Due ${fmtDate(b.dueDate)}`}
                      {b.status === "open" && days !== null && ` (${days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`})`}
                      {b.amount && ` • $${(+b.amount).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {b.status === "open" && <Btn size="sm" variant="secondary" onClick={() => markPaid(b)}><Check size={12} /> Done</Btn>}
                    <button onClick={() => { setEditingBill(b); setShowBillForm(true); }} className="p-1.5 hover:bg-black/10 rounded">
                      <Pencil size={14} style={{ color: C.inkSoft }} />
                    </button>
                    <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 hover:bg-red-100 rounded">
                      <Trash2 size={14} style={{ color: C.red }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal open={showTenantForm} onClose={() => { setShowTenantForm(false); setEditingTenant(null); }}
        title={editingTenant?.id ? "Edit Tenant" : "Add Tenant"}>
        <TenantForm tenant={editingTenant} properties={[property]} onSave={handleSaveTenant}
          onCancel={() => { setShowTenantForm(false); setEditingTenant(null); }} />
      </Modal>

      <Modal open={showBillForm} onClose={() => { setShowBillForm(false); setEditingBill(null); }}
        title={editingBill ? "Edit Bill" : "Add Bill"}>
        <BillForm bill={editingBill} companies={companies} onSave={handleSaveBill}
          forceCompanyId={property.companyId} forcePropertyId={property.id}
          onDelete={(id) => { handleDeleteBill(id); setShowBillForm(false); setEditingBill(null); }}
          onCancel={() => { setShowBillForm(false); setEditingBill(null); }} />
      </Modal>

      <Modal open={addingUtility} onClose={() => setAddingUtility(false)} title="Add Utility">
        <div className="space-y-4">
          <div>
            <Label>Utility name</Label>
            <Input value={newUtilName} onChange={e => setNewUtilName(e.target.value)}
              placeholder="e.g. Cable, Lawn Care, Security" className="block w-full mt-1"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") confirmAddUtility(); }} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setAddingUtility(false)}>Cancel</Btn>
            <Btn onClick={confirmAddUtility} disabled={!newUtilName.trim()}>Add</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============================================================
// PENCILED: RENT ROLL (monthly grid)
// ============================================================
function PenciledRentRollView({ companyId, properties, tenants, payments, savePayments }) {
  const [month, setMonth] = useState(monthKey(todayISO()));

  const monthsRange = useMemo(() => {
    const list = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + i);
      list.push(d.toISOString().slice(0, 7));
    }
    return list;
  }, []);

  const myPropertyIds = useMemo(() => new Set(properties.filter(p => p.companyId === companyId).map(p => p.id)), [properties, companyId]);
  const activeUnits = useMemo(() => tenants.filter(t => t.active !== false && myPropertyIds.has(t.propertyId)), [tenants, myPropertyIds]);
  const monthPayments = useMemo(() => payments.filter(p => p.month === month && activeUnits.find(t => t.id === p.tenantId)), [payments, month, activeUnits]);

  const togglePaid = (tenant) => {
    const existing = payments.find(p => p.tenantId === tenant.id && p.month === month);
    if (existing) {
      savePayments(payments.filter(p => p.id !== existing.id));
    } else {
      savePayments([...payments, {
        id: uid(), tenantId: tenant.id, month, amount: tenant.rent,
        datePaid: todayISO(), status: "paid", notes: ""
      }]);
    }
  };

  const expected = activeUnits.reduce((s, t) => s + (+t.rent || 0), 0);
  const collected = monthPayments.reduce((s, p) => s + (+p.amount || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Select value={month} onChange={e => setMonth(e.target.value)}>
          {monthsRange.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </Select>
        <div className="flex gap-4 text-sm">
          <div><span style={{ color: C.inkSoft }}>Expected: </span>
            <span className="font-serif" style={{ color: C.ink }}>${expected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Collected: </span>
            <span className="font-serif" style={{ color: C.green }}>${collected.toLocaleString()}</span></div>
          <div><span style={{ color: C.inkSoft }}>Outstanding: </span>
            <span className="font-serif" style={{ color: expected - collected > 0 ? C.red : C.green }}>
              ${(expected - collected).toLocaleString()}</span></div>
        </div>
      </div>

      <Card>
        {activeUnits.length === 0 ? (
          <p className="p-8 text-center font-serif italic" style={{ color: C.inkSoft }}>
            No active tenants yet. Add tenants from the Properties tab.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: C.paperSoft }}>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Property / Unit</th>
                <th className="text-left px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Tenant</th>
                <th className="text-right px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Rent</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Status</th>
                <th className="text-center px-4 py-2 font-sans text-xs uppercase font-semibold" style={{ color: C.inkSoft, letterSpacing: "0.08em" }}>Paid On</th>
              </tr>
            </thead>
            <tbody>
              {activeUnits.map(t => {
                const prop = properties.find(p => p.id === t.propertyId);
                const payment = monthPayments.find(p => p.tenantId === t.id);
                return (
                  <tr key={t.id} className="ledger-row border-t" style={{ borderColor: C.inkLine + "44" }}>
                    <td className="px-4 py-3 font-sans text-sm">
                      {prop?.nickname || prop?.address || "—"}
                      {t.unit && <span style={{ color: C.inkSoft }}> • Unit {t.unit}</span>}
                    </td>
                    <td className="px-4 py-3 font-sans text-sm">{t.name}</td>
                    <td className="px-4 py-3 font-sans text-sm text-right">${(+t.rent || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePaid(t)}
                        className="px-3 py-1 rounded text-xs font-semibold transition"
                        style={{
                          background: payment ? C.green : "transparent",
                          color: payment ? C.paper : C.red,
                          border: `1px solid ${payment ? C.green : C.red}`
                        }}>
                        {payment ? "✓ Paid" : "Unpaid"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center font-sans text-xs" style={{ color: C.inkSoft }}>
                      {payment ? fmtDate(payment.datePaid) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// JECO REALTY — CUSTOM VIEW (small realtor company, 1 on payroll)
// ============================================================
function JECOView({ company, allCompanies, bills, saveBills, properties, flips, notes, saveNotes, payrolls, savePayrolls }) {
  const [subTab, setSubTab] = useState("reminders");

  const myBills = bills.filter(b => b.companyId === company.id);
  const myOpenBills = myBills.filter(b => b.status === "open");
  const overdue = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d < 0; }).length;
  const dueSoon = myOpenBills.filter(b => { const d = daysUntil(b.dueDate); return d !== null && d >= 0 && d <= 7; }).length;

  const subTabs = [
    { id: "reminders", label: "Reminders", icon: Bell },
    ...(company.showPayroll ? [{ id: "payroll", label: "Payroll & Quarterlies", icon: Calendar }] : []),
    { id: "general", label: "General Bills", icon: Receipt },
    { id: "notes", label: "Notes", icon: FileText }
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 pb-4 border-b" style={{ borderColor: C.inkLine }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: company.color }} />
              <h2 className="font-serif text-2xl" style={{ color: C.ink }}>{company.name}</h2>
              <Pill color={company.color}>{company.type}</Pill>
            </div>
            {company.notes && <p className="font-sans text-sm mt-2 max-w-2xl" style={{ color: C.inkSoft }}>{company.notes}</p>}
          </div>
          <div className="flex gap-4 text-sm">
            {overdue > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.red }}>{overdue}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Overdue</p>
              </div>
            )}
            {dueSoon > 0 && (
              <div className="text-center">
                <p className="font-serif text-2xl" style={{ color: C.amber }}>{dueSoon}</p>
                <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Due This Week</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-serif text-2xl" style={{ color: C.ink }}>{myOpenBills.length}</p>
              <p className="font-sans text-xs uppercase tracking-wider" style={{ color: C.inkSoft }}>Open Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto scroll-hide" style={{ borderColor: C.inkLine + "55" }}>
        {subTabs.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className={`px-3 py-2 flex items-center gap-1.5 font-sans text-sm whitespace-nowrap transition ${active ? "font-semibold" : "hover:bg-black/5"}`}
              style={{
                color: active ? company.color : C.inkSoft,
                borderBottom: active ? `2px solid ${company.color}` : "2px solid transparent",
                marginBottom: "-1px"
              }}>
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {subTab === "reminders" && (
        <JMCRemindersView companyId={company.id} bills={bills} saveBills={saveBills}
          flips={flips} properties={properties} companies={allCompanies} payrolls={payrolls} />
      )}
      {subTab === "payroll" && company.showPayroll && (
        <JMCPayrollView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies}
          payrolls={payrolls} savePayrolls={savePayrolls} />
      )}
      {subTab === "general" && (
        <JMCGeneralBillsView companyId={company.id} bills={bills} saveBills={saveBills} companies={allCompanies} />
      )}
      {subTab === "notes" && (
        <NotesView notes={notes} saveNotes={saveNotes} companyId={company.id} companyName={company.name} />
      )}
    </div>
  );
}
