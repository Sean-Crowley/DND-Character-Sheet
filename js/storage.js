// storage.js — persistence. Live edits live in localStorage; character.json can be
// bound via the File System Access API (Edge/Chrome) for auto-save to disk, with a
// download/upload fallback everywhere else.

const LS_KEY = "kaelaxis-character-v1";
const IDB_DB = "kaelaxis", IDB_STORE = "handles", HANDLE_KEY = "characterFile";

let fileHandle = null;
let saveTimer = null;

/* ---------- localStorage ---------- */
export function loadLocal() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; }
  catch (_) { return null; }
}
export function saveLocal(character) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(character)); return true; }
  catch (_) { return false; }
}
export function clearLocal() { try { localStorage.removeItem(LS_KEY); } catch (_) {} }

/* debounced combined save (localStorage always; file if bound) */
export function scheduleSave(character, onStatus) {
  saveLocal(character);
  if (onStatus) onStatus("dirty");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    let msg = "saved locally";
    if (fileHandle) { try { await writeHandle(character); msg = "saved to character.json"; } catch (_) { msg = "saved locally (file write failed)"; } }
    if (onStatus) onStatus("saved", msg);
  }, 600);
}

/* ---------- download / upload fallback ---------- */
export function exportJSON(character) {
  const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "character.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function importJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json,.json";
    input.onchange = () => {
      const f = input.files[0]; if (!f) return reject(new Error("no file"));
      const reader = new FileReader();
      reader.onload = () => { try { resolve(JSON.parse(reader.result)); } catch (e) { reject(e); } };
      reader.onerror = reject; reader.readAsText(f);
    };
    input.click();
  });
}

/* ---------- File System Access API ---------- */
export function fsSupported() { return "showOpenFilePicker" in window; }

async function writeHandle(character) {
  const w = await fileHandle.createWritable({ keepExistingData: false });
  await w.write(JSON.stringify(character, null, 2));
  await w.close();
}

async function verifyPermission(handle, write) {
  const opts = { mode: write ? "readwrite" : "read" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if ((await handle.requestPermission(opts)) === "granted") return true;
  return false;
}

/* Bind to character.json on disk (user picks it once). Returns the parsed file contents. */
export async function connectFile() {
  if (!fsSupported()) throw new Error("File System Access API not supported in this browser.");
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: "Character JSON", accept: { "application/json": [".json"] } }],
    multiple: false
  });
  if (!(await verifyPermission(handle, true))) throw new Error("permission denied");
  fileHandle = handle;
  await idbPut(HANDLE_KEY, handle);
  const file = await handle.getFile();
  return JSON.parse(await file.text());
}

export async function saveToFile(character) {
  if (fileHandle) { await writeHandle(character); return "character.json"; }
  exportJSON(character); return "download";
}

export function fileBound() { return !!fileHandle; }

/* try to silently reconnect a previously bound handle after reload */
export async function tryReconnect() {
  try {
    const handle = await idbGet(HANDLE_KEY);
    if (!handle) return null;
    if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") {
      fileHandle = handle;
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    }
    // permission needs a gesture; keep handle for a later "Reconnect" click
    fileHandle = null;
    return null;
  } catch (_) { return null; }
}

/* ---------- tiny IndexedDB for the file handle ---------- */
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(key, val) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, "readwrite"); tx.objectStore(IDB_STORE).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function idbGet(key) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, "readonly"); const r = tx.objectStore(IDB_STORE).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
