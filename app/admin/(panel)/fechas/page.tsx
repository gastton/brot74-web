"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, X, Check, ToggleLeft, ToggleRight, Home, Truck, CalendarDays, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import FocalPicker from "@/components/FocalPicker";

interface Slot {
  id: number;
  date: string;
  dayLabel: string;
  deliveryMode: "pickup" | "delivery" | "both";
  pickupTime: string;
  location: string;
  imageUrl: string;
  imageFocalX: number;
  imageFocalY: number;
  orderCutoff: string | null;
  active: boolean;
  stocks: { id: number; productName: string; totalStock: number; reservedStock: number; productId: number; deliverySlotId: number }[];
}

interface Product { id: number; name: string; }

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function FechasPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null);
  const [form, setForm] = useState({ date: "", dayLabel: "", deliveryMode: "pickup" as "pickup"|"delivery"|"both", pickupTime: "", location: "", active: true });
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});

  // Default generate month: next month
  const now = new Date();
  const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const [genMonth, setGenMonth] = useState(nextMonth); // 0-indexed
  const [genYear, setGenYear] = useState(nextYear);

  async function fetchAll() {
    const [slotsRes, productsRes, imagesRes] = await Promise.all([
      fetch("/api/admin/slots"),
      fetch("/api/admin/products"),
      fetch("/api/admin/images"),
    ]);
    const slotsData = await slotsRes.json();
    const productsData = await productsRes.json();
    const imagesData = await imagesRes.json();
    setImages(imagesData);
    setSlots(slotsData.map((s: Slot & { stocks: { product: { name: string }, totalStock: number, reservedStock: number, id: number, productId: number, deliverySlotId: number }[] }) => ({
      ...s,
      stocks: s.stocks.map((st) => ({
        ...st,
        productName: (st as unknown as { product: { name: string } }).product?.name ?? "",
      })),
    })));
    setProducts(productsData);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  // Preview dates for the generate modal
  const previewDates = (() => {
    const days: Date[] = [];
    const cursor = new Date(genYear, genMonth, 1);
    while (cursor.getMonth() === genMonth) {
      const d = cursor.getDay();
      if (d === 1 || d === 6) days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  })();

  function handleDateChange(dateStr: string) {
    if (!dateStr) return;
    const d = new Date(dateStr + "T12:00:00");
    const label = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, (c) => c.toUpperCase());
    setForm((f) => ({ ...f, date: dateStr, dayLabel: label }));
  }

  async function handleCreate() {
    if (!form.date || !form.dayLabel) return;
    setSaving(true);
    await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: form.date, dayLabel: form.dayLabel, deliveryMode: form.deliveryMode, pickupTime: form.pickupTime, location: form.location, active: form.active }),
    });
    await fetchAll();
    setShowForm(false);
    setSaving(false);
    setForm({ date: "", dayLabel: "", deliveryMode: "pickup", pickupTime: "", location: "", active: true });
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateResult(null);
    const res = await fetch("/api/admin/slots/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: genYear, month: genMonth + 1 }), // API expects 1-indexed
    });
    const data = await res.json();
    setGenerateResult(data);
    await fetchAll();
    setGenerating(false);
  }

  async function toggleActive(slot: Slot) {
    await fetch(`/api/admin/slots/${slot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayLabel: slot.dayLabel, deliveryMode: slot.deliveryMode, active: !slot.active }),
    });
    fetchAll();
  }

  async function changeDeliveryMode(slot: Slot, mode: "pickup" | "delivery" | "both") {
    await fetch(`/api/admin/slots/${slot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayLabel: slot.dayLabel, deliveryMode: mode, pickupTime: slot.pickupTime, location: slot.location, active: slot.active }),
    });
    fetchAll();
  }

  async function updateDetails(slot: Slot, pickupTime: string, location: string) {
    await fetch(`/api/admin/slots/${slot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayLabel: slot.dayLabel, deliveryMode: slot.deliveryMode, pickupTime, location, imageUrl: slot.imageUrl, imageFocalX: slot.imageFocalX, imageFocalY: slot.imageFocalY, orderCutoff: slot.orderCutoff, active: slot.active }),
    });
    fetchAll();
  }

  async function updateImage(slot: Slot, imageUrl: string, focalX?: number, focalY?: number) {
    await fetch(`/api/admin/slots/${slot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayLabel: slot.dayLabel, deliveryMode: slot.deliveryMode, pickupTime: slot.pickupTime, location: slot.location, imageUrl, imageFocalX: focalX ?? slot.imageFocalX, imageFocalY: focalY ?? slot.imageFocalY, orderCutoff: slot.orderCutoff, active: slot.active }),
    });
    fetchAll();
  }

  async function updateCutoff(slot: Slot, orderCutoff: string | null) {
    await fetch(`/api/admin/slots/${slot.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayLabel: slot.dayLabel, deliveryMode: slot.deliveryMode, pickupTime: slot.pickupTime, location: slot.location, imageUrl: slot.imageUrl, imageFocalX: slot.imageFocalX, imageFocalY: slot.imageFocalY, orderCutoff, active: slot.active }),
    });
    fetchAll();
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta fecha? Se eliminarán también los stocks asociados.")) return;
    await fetch(`/api/admin/slots/${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function saveStock(productId: number, deliverySlotId: number, key: string) {
    const val = parseInt(stockEdits[key] ?? "0");
    if (isNaN(val)) return;
    await fetch("/api/admin/stock", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, deliverySlotId, totalStock: val }),
    });
    setStockEdits((prev) => { const next = { ...prev }; delete next[key]; return next; });
    fetchAll();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const past = slots.filter((s) => new Date(s.date) < today);
  const upcoming = slots.filter((s) => new Date(s.date) >= today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brown">Fechas de entrega</h1>
          <p className="text-muted text-sm mt-1">Gestioná cuándo y cuánto producís</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowGenerate(true); setGenerateResult(null); }}
            className="btn-secondary flex items-center gap-2 rounded-xl text-sm"
          >
            <CalendarDays className="w-4 h-4" /> Generar mes
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Nueva fecha
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>
      ) : (
        <>
          <SlotList
            title="Próximas fechas"
            slots={upcoming}
            products={products}
            images={images}
            stockEdits={stockEdits}
            setStockEdits={setStockEdits}
            onToggle={toggleActive}
            onDelete={handleDelete}
            onSaveStock={saveStock}
            onChangeMode={changeDeliveryMode}
            onUpdateDetails={updateDetails}
            onUpdateImage={updateImage}
            onUpdateCutoff={updateCutoff}
          />

          {past.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted hover:text-brown transition-colors py-1"
              >
                {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showPast ? "Ocultar fechas anteriores" : `Ver ${past.length} fecha${past.length !== 1 ? "s" : ""} anterior${past.length !== 1 ? "es" : ""}`}
              </button>
              {showPast && (
                <div className="mt-3">
                  <SlotList
                    title=""
                    slots={past}
                    products={products}
                    stockEdits={stockEdits}
                    setStockEdits={setStockEdits}
                    onToggle={toggleActive}
                    onDelete={handleDelete}
                    onSaveStock={saveStock}
                    onChangeMode={changeDeliveryMode}
                    onUpdateDetails={updateDetails}
                    onUpdateImage={updateImage}
                    onUpdateCutoff={updateCutoff}
                    images={images}
                    muted
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: nueva fecha manual */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-bold text-brown">Nueva fecha</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Fecha *</label>
                <input type="date" value={form.date} onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white" />
                {form.date && (
                  <p className="text-xs text-muted mt-1">{form.dayLabel}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Etiqueta</label>
                <input type="text" value={form.dayLabel} onChange={(e) => setForm({ ...form, dayLabel: e.target.value })}
                  placeholder="Ej: Lunes 26 de mayo"
                  className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Tipo de entrega</label>
                <select
                  value={form.deliveryMode}
                  onChange={(e) => setForm({ ...form, deliveryMode: e.target.value as "pickup"|"delivery"|"both" })}
                  className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white"
                >
                  <option value="pickup">🏠 Retiro en casa</option>
                  <option value="delivery">🚚 Delivery</option>
                  <option value="both">🏠🚚 Ambos (cliente elige)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Horario de retiro</label>
                <input type="text" value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
                  placeholder="Ej: 10:00 - 13:00"
                  className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Lugar de retiro</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ej: Av. Corrientes 1234, CABA"
                  className="w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary rounded-xl py-3 text-sm">Cancelar</button>
                <button onClick={handleCreate} disabled={saving || !form.date} className="flex-1 btn-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: generar mes */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => { if (!generating) setShowGenerate(false); }} />
          <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-xl font-bold text-brown">Generar fechas del mes</h2>
              <button onClick={() => setShowGenerate(false)} disabled={generating}><X className="w-5 h-5 text-muted" /></button>
            </div>

            {generateResult ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold text-lg">✓ {generateResult.created} fecha{generateResult.created !== 1 ? "s" : ""} creada{generateResult.created !== 1 ? "s" : ""}</p>
                  {generateResult.skipped > 0 && (
                    <p className="text-green-600 text-sm mt-1">{generateResult.skipped} ya existía{generateResult.skipped !== 1 ? "n" : ""}, se omitieron</p>
                  )}
                </div>
                <button onClick={() => setShowGenerate(false)} className="w-full btn-primary rounded-xl py-3 text-sm">
                  Listo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selector mes/año */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1">Mes</label>
                    <select
                      value={genMonth}
                      onChange={(e) => setGenMonth(Number(e.target.value))}
                      className="w-full border-2 border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber bg-white"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1">Año</label>
                    <select
                      value={genYear}
                      onChange={(e) => setGenYear(Number(e.target.value))}
                      className="w-full border-2 border-border rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber bg-white"
                    >
                      {[now.getFullYear(), now.getFullYear() + 1].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview de fechas */}
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Se van a crear {previewDates.length} fechas
                  </p>
                  <div className="bg-white rounded-xl border border-border p-3 max-h-48 overflow-y-auto space-y-1">
                    {previewDates.map((d, i) => {
                      const label = d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
                        .replace(/^\w/, (c) => c.toUpperCase());
                      return (
                        <div key={i} className="flex items-center justify-between text-sm py-0.5">
                          <span className="text-charcoal">{label}</span>
                          <span className="text-xs text-muted">Retiro</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-muted">
                  El stock inicial de cada fecha se setea automáticamente según los días disponibles de cada producto.
                </p>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowGenerate(false)} className="flex-1 btn-secondary rounded-xl py-3 text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleGenerate} disabled={generating} className="flex-1 btn-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                    {generating ? "Generando..." : "Generar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SlotList({ title, slots, products, images, stockEdits, setStockEdits, onToggle, onDelete, onSaveStock, onChangeMode, onUpdateDetails, onUpdateImage, onUpdateCutoff, muted }: {
  title: string; slots: Slot[]; products: Product[]; images: string[];
  stockEdits: Record<string, string>; setStockEdits: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  onToggle: (s: Slot) => void; onDelete: (id: number) => void;
  onSaveStock: (productId: number, deliverySlotId: number, key: string) => void;
  onChangeMode: (s: Slot, mode: "pickup"|"delivery"|"both") => void;
  onUpdateDetails: (s: Slot, pickupTime: string, location: string) => void;
  onUpdateImage: (s: Slot, imageUrl: string, focalX?: number, focalY?: number) => void;
  onUpdateCutoff: (s: Slot, orderCutoff: string | null) => void;
  muted?: boolean;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      {title && <h2 className={`font-serif text-lg font-bold mb-3 ${muted ? "text-muted" : "text-brown"}`}>{title}</h2>}
      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.id} className={`bg-white rounded-2xl border-2 p-5 ${muted ? "border-border opacity-70" : "border-border"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {slot.deliveryMode === "delivery" ? <Truck className="w-5 h-5 text-amber" /> : slot.deliveryMode === "both" ? <div className="flex gap-0.5"><Home className="w-4 h-4 text-amber" /><Truck className="w-4 h-4 text-amber" /></div> : <Home className="w-5 h-5 text-amber" />}
                <div>
                  <p className="font-semibold text-charcoal">{slot.dayLabel}</p>
                  <p className="text-xs text-muted">
                    {slot.deliveryMode === "pickup" ? "Retiro" : slot.deliveryMode === "delivery" ? "Delivery" : "Retiro o delivery"}
                    {!slot.active && " · Inactivo"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onToggle(slot)} className="p-2 text-muted hover:text-brown transition-colors">
                  {slot.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => onDelete(slot.id)} className="p-2 text-muted hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-4 mb-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Tipo de entrega</p>
                <select
                  value={slot.deliveryMode}
                  onChange={(e) => onChangeMode(slot, e.target.value as "pickup"|"delivery"|"both")}
                  className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber bg-white"
                >
                  <option value="pickup">🏠 Retiro en casa</option>
                  <option value="delivery">🚚 Delivery</option>
                  <option value="both">🏠🚚 Ambos (cliente elige)</option>
                </select>
              </div>
              <SlotDetailField label="Horario de retiro" placeholder="Ej: 10:00 - 13:00" initial={slot.pickupTime}
                onSave={(v) => onUpdateDetails(slot, v, slot.location)} />
              <SlotDetailField label="Lugar de retiro" placeholder="Ej: Av. Corrientes 1234, CABA" initial={slot.location}
                onSave={(v) => onUpdateDetails(slot, slot.pickupTime, v)} />

              {/* Cutoff */}
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Pedidos hasta</p>
                <input
                  type="date"
                  defaultValue={slot.orderCutoff ? new Date(slot.orderCutoff).toISOString().slice(0, 10) : ""}
                  onChange={(e) => onUpdateCutoff(slot, e.target.value ? new Date(e.target.value + "T12:00:00Z").toISOString() : null)}
                  className="w-full border-2 border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber bg-white"
                />
              </div>

              {/* Image editor */}
              <SlotImageEditor
                slot={slot}
                images={images}
                onSave={(imageUrl, focalX, focalY) => onUpdateImage(slot, imageUrl, focalX, focalY)}
              />
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Stock disponible</p>
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const stockEntry = slot.stocks.find((s) => s.productId === product.id);
                  const key = `${product.id}-${slot.id}`;
                  const current = stockEdits[key] ?? String(stockEntry?.totalStock ?? 0);
                  const reserved = stockEntry?.reservedStock ?? 0;
                  return (
                    <div key={product.id} className="bg-cream rounded-xl p-3">
                      <p className="text-xs font-semibold text-charcoal mb-1 truncate">{product.name}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min="0" value={current}
                          onChange={(e) => setStockEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-16 border-2 border-border rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-amber bg-white"
                        />
                        <button onClick={() => onSaveStock(product.id, slot.id, key)}
                          className="p-1.5 bg-brown text-cream rounded-lg hover:bg-charcoal transition-colors">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                      {reserved > 0 && <p className="text-xs text-amber mt-1">{reserved} reservados</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HERO_IMAGE_FALLBACK = "/products/product-1779659787800.jpeg";

function SlotImageEditor({ slot, images, onSave }: {
  slot: Slot;
  images: string[];
  onSave: (imageUrl: string, focalX: number, focalY: number) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(slot.imageUrl || HERO_IMAGE_FALLBACK);
  const [focalX, setFocalX] = useState(slot.imageFocalX);
  const [focalY, setFocalY] = useState(slot.imageFocalY);

  function handleOpen() {
    setSelectedImage(slot.imageUrl || HERO_IMAGE_FALLBACK);
    setFocalX(slot.imageFocalX);
    setFocalY(slot.imageFocalY);
    setShowModal(true);
  }

  function handleSave() {
    onSave(selectedImage, focalX, focalY);
    setShowModal(false);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full btn-secondary rounded-xl py-2 text-sm flex items-center justify-center gap-2"
      >
        <ImageIcon className="w-4 h-4" /> Imagen de la card
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-brown">Imagen de la card</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted" /></button>
            </div>

            {/* Focal picker — mismo ratio que la card, con overlay */}
            <div className="mb-4">
              <FocalPicker
                imageUrl={selectedImage}
                focalX={focalX}
                focalY={focalY}
                containerClass="h-72"
                onChange={(x, y) => { setFocalX(x); setFocalY(y); }}
                overlay={
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <p className="text-sm font-bold tracking-widest uppercase opacity-90">
                        {new Date(slot.date).toLocaleDateString("es-AR", { weekday: "long" }).toUpperCase()}
                      </p>
                      <p className="text-xs tracking-widest uppercase opacity-70">
                        {new Date(slot.date).toLocaleDateString("es-AR", { month: "short" }).toUpperCase().replace(".", "")}
                      </p>
                      <p className="text-5xl font-bold leading-none mt-1">{new Date(slot.date).getDate()}</p>
                    </div>
                  </>
                }
              />
            </div>

            {/* Image grid */}
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Elegí una imagen</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {images.map((url) => (
                <button key={url} onClick={() => { setSelectedImage(url); setFocalX(50); setFocalY(50); }}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selectedImage === url ? "border-amber shadow-sm" : "border-border hover:border-amber/50"
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {selectedImage === url && (
                    <div className="absolute inset-0 bg-amber/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-amber drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button onClick={handleSave} className="w-full btn-primary rounded-xl py-3 text-sm flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Guardar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SlotDetailField({ label, placeholder, initial, onSave }: {
  label: string; placeholder: string; initial: string; onSave: (v: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border-2 border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber bg-white"
        />
        {dirty && (
          <button onClick={() => onSave(value)}
            className="p-2 bg-brown text-cream rounded-xl hover:bg-charcoal transition-colors">
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
