// tooltips.js — hover details for spells AND items.

let elTip, getSpell, getItem;

function levelLabel(l) { return l === 0 ? "Cantrip" : "Level " + l; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function spellHTML(s) {
  const type = s.level === 0 ? `${esc(s.school)} Cantrip` : `Level ${s.level} ${esc(s.school)}`;
  const flags = [];
  if (s.concentration) flags.push(`<span class="chip conc">Concentration</span>`);
  if (s.ritual) flags.push(`<span class="chip rit">Ritual</span>`);
  return `
    <div class="tt-name">${esc(s.name)}</div>
    <div class="tt-type">${type} ${flags.join(" ")}</div>
    <div class="tt-grid">
      <b>Casting</b><span>${esc(s.castingTime)}</span>
      <b>Range</b><span>${esc(s.range)}</span>
      <b>Components</b><span>${esc(s.components)}</span>
      <b>Duration</b><span>${esc(s.duration)}</span>
    </div>
    <div class="tt-desc">${esc(s.description)}</div>
    ${s.higherLevel ? `<div class="tt-higher"><b>At Higher Levels.</b> ${esc(s.higherLevel)}</div>` : ""}`;
}

function itemHTML(it) {
  const meta = [it.rarity, it.attunement ? "requires attunement" : null].filter(Boolean).join(" · ");
  const eff = (it.effects || []).map(e => `<li>${esc(e)}</li>`).join("");
  return `
    <div class="tt-name">${esc(it.name)}</div>
    <div class="tt-type">${esc(meta)}</div>
    <div class="tt-desc">${esc(it.description || "")}</div>
    ${eff ? `<ul class="item-effects">${eff}</ul>` : ""}
    ${it.reviewNote ? `<div class="tt-higher"><b>Note.</b> ${esc(it.reviewNote)}</div>` : ""}`;
}

function show(html, x, y) {
  elTip.innerHTML = html;
  elTip.classList.add("show");
  place(x, y);
}
function place(x, y) {
  const pad = 14, w = elTip.offsetWidth, h = elTip.offsetHeight;
  let left = x + 16, top = y + 16;
  if (left + w + pad > innerWidth) left = x - w - 16;
  if (top + h + pad > innerHeight) top = Math.max(pad, innerHeight - h - pad);
  if (left < pad) left = pad;
  elTip.style.left = left + "px"; elTip.style.top = top + "px";
}
function hide() { elTip.classList.remove("show"); }

export function initTooltips(opts) {
  getSpell = opts.getSpell; getItem = opts.getItem;
  elTip = document.getElementById("tooltip");
  if (!elTip) { elTip = document.createElement("div"); elTip.id = "tooltip"; document.body.appendChild(elTip); }

  const SEL = "[data-spell],[data-item-id],[data-tip]";

  document.addEventListener("mouseover", (e) => {
    const trig = e.target.closest(SEL);
    if (!trig) return;
    if (trig.hasAttribute("data-spell")) {
      const name = trig.getAttribute("data-spell");
      const s = getSpell(name);
      return show(s ? spellHTML(s) : `<div class="tt-name">${esc(name)}</div><div class="tt-desc muted">No details on file yet — add it to the spell data.</div>`, e.clientX, e.clientY);
    }
    if (trig.hasAttribute("data-item-id")) {
      const it = getItem(trig.getAttribute("data-item-id"));
      if (it) return show(itemHTML(it), e.clientX, e.clientY);
      return;
    }
    if (trig.hasAttribute("data-tip")) return show(`<div class="tt-desc">${esc(trig.getAttribute("data-tip"))}</div>`, e.clientX, e.clientY);
  });
  document.addEventListener("mousemove", (e) => { if (elTip.classList.contains("show")) place(e.clientX, e.clientY); });
  document.addEventListener("mouseout", (e) => {
    const trig = e.target.closest(SEL);
    if (!trig) return;
    // don't hide while moving to a child of the same trigger
    if (e.relatedTarget && trig.contains(e.relatedTarget)) return;
    hide();
  });
  // hide if the trigger scrolls away under the pointer (wheel without moving the mouse)
  window.addEventListener("wheel", () => { if (elTip.classList.contains("show")) hide(); }, { passive: true });
}
