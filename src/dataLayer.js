import { supabase } from "./supabaseClient";

// camelCase <-> snake_case helpers
const toSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const objToDb = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // Postgres rejects "" for numeric/date columns - convert to null
    out[toSnake(k)] = v === "" ? null : v;
  }
  return out;
};
const objFromDb = (row) => {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out;
};

// Map storage keys to Supabase tables
const TABLES = {
  "bk:companies": "companies",
  "bk:bills": "bills",
  "bk:properties": "properties",
  "bk:tenants": "tenants",
  "bk:payments": "payments",
  "bk:flips": "flips",
  "bk:payrolls": "payrolls"
};

// Load - returns array (or object for notes)
export async function load(key, fallback) {
  try {
    if (key === "bk:notes") {
      const { data, error } = await supabase.from("company_notes").select("*");
      if (error) throw error;
      const notes = {};
      for (const row of data || []) notes[row.company_id] = row.content;
      return notes;
    }
    const table = TABLES[key];
    if (!table) return fallback;
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return (data || []).map(objFromDb);
  } catch (e) {
    console.error("load failed for", key, e);
    return fallback;
  }
}

// Save - takes the full array (or object for notes); syncs with the table
export async function save(key, value) {
  try {
    if (key === "bk:notes") {
      const { data: existing } = await supabase.from("company_notes").select("company_id");
      const existingIds = new Set((existing || []).map((r) => r.company_id));
      const newIds = new Set(Object.keys(value || {}));
      const toDelete = [...existingIds].filter((id) => !newIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from("company_notes").delete().in("company_id", toDelete);
      }
      const rows = Object.entries(value || {}).map(([company_id, content]) => ({
        company_id,
        content,
        updated_at: new Date().toISOString()
      }));
      if (rows.length > 0) {
        await supabase.from("company_notes").upsert(rows, { onConflict: "company_id" });
      }
      return;
    }

    const table = TABLES[key];
    if (!table) throw new Error("Unknown storage key: " + key);

    const arr = Array.isArray(value) ? value : [];
    const { data: existing } = await supabase.from(table).select("id");
    const existingIds = new Set((existing || []).map((r) => r.id));
    const newIds = new Set(arr.map((v) => v.id));

    const toDelete = [...existingIds].filter((id) => !newIds.has(id));
    if (toDelete.length > 0) {
      await supabase.from(table).delete().in("id", toDelete);
    }

    if (arr.length > 0) {
      const rows = arr.map(objToDb);
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
  } catch (e) {
    console.error("save failed for", key, e);
    alert("Failed to save: " + (e?.message || "unknown error"));
  }
}
