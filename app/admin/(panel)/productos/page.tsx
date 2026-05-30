"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Check, ToggleLeft, ToggleRight, ImagePlus } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

const DAYS = [
  { key: "lunes",     label: "Lunes",      short: "L" },
  { key: "miercoles", label: "Miércoles",  short: "Mi" },
  { key: "sabado",    label: "Sábado",     short: "Sa" },
];

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  weight: string;
  ingredients: string;
  imageUrl: string;
  focalX: number;
  focalY: number;
  availableDays: string;
  active: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  weight: "",
  ingredients: "",
  imageUrl: "",
  focalX: 50,
  focalY: 50,
  availableDays: [] as string[],
  active: true,
  sortOrder: "0",
};

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchProducts() {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => { fetchProducts(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setImagePreview("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      weight: p.weight,
      ingredients: p.ingredients,
      imageUrl: p.imageUrl,
      focalX: p.focalX ?? 50,
      focalY: p.focalY ?? 50,
      availableDays: p.availableDays ? p.availableDays.split(",").filter(Boolean) : [],
      active: p.active,
      sortOrder: String(p.sortOrder),
    });
    setImagePreview(p.imageUrl);
    setShowForm(true);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    // Preview local inmediato
    setImagePreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setForm((f) => ({ ...f, imageUrl: data.url }));
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    setSaving(true);
    const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products";
    const method = editing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: parseInt(form.price), sortOrder: parseInt(form.sortOrder), availableDays: form.availableDays.join(","), focalX: form.focalX, focalY: form.focalY }),
    });
    await fetchProducts();
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    fetchProducts();
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, active: !p.active }),
    });
    fetchProducts();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brown">Productos</h1>
          <p className="text-muted text-sm mt-1">Gestioná tu catálogo de panes</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 rounded-xl text-sm">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted" /></div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl border-2 p-5 ${p.active ? "border-border" : "border-border opacity-60"}`}>
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                {p.imageUrl ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border">
                    <Image src={p.imageUrl} alt={p.name} width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-cream border border-border flex items-center justify-center shrink-0">
                    <ImagePlus className="w-6 h-6 text-muted/50" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-lg font-bold text-brown">{p.name}</h3>
                    {p.weight && <span className="text-xs bg-cream px-2 py-0.5 rounded-full text-muted">{p.weight}</span>}
                    {!p.active && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  {p.description && <p className="text-sm text-muted mt-1">{p.description}</p>}
                  {p.ingredients && <p className="text-xs text-muted/70 mt-1 italic">🌾 {p.ingredients}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xl font-bold text-brown">{formatCurrency(p.price)}</p>
                    <div className="flex gap-1">
                      {DAYS.map((d) => {
                        const active = p.availableDays?.includes(d.key);
                        return (
                          <span key={d.key} className={`text-xs px-2 py-0.5 rounded font-semibold ${active ? "bg-amber/20 text-amber" : "bg-border text-muted/50"}`}>
                            {d.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleActive(p)} className="p-2 text-muted hover:text-brown transition-colors">
                    {p.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-2 text-muted hover:text-brown transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-muted hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-cream rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-cream border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-serif text-xl font-bold text-brown">
                {editing ? "Editar producto" : "Nuevo producto"}
              </h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted" /></button>
            </div>

            <div className="p-6 space-y-4">

              {/* Image uploader */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">Imagen</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { handleImageUpload(file); setForm((f) => ({ ...f, focalX: 50, focalY: 50 })); }
                  }}
                />
                {imagePreview ? (
                  <div className="space-y-2">
                    {/* Focal point picker */}
                    <FocalPicker
                      imageUrl={imagePreview}
                      focalX={form.focalX}
                      focalY={form.focalY}
                      onChange={(x, y) => setForm((f) => ({ ...f, focalX: x, focalY: y }))}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-xs text-muted hover:text-brown transition-colors py-1"
                    >
                      Cambiar imagen
                    </button>
                    {uploading && (
                      <div className="flex items-center justify-center gap-2 text-muted text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" /> Subiendo...
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border hover:border-amber transition-colors overflow-hidden"
                  >
                    <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8" />
                          <p className="text-sm">Tocá para subir una foto</p>
                          <p className="text-xs">JPG, PNG o WEBP</p>
                        </>
                      )}
                    </div>
                  </button>
                )}
              </div>

              <Field label="Nombre *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Full Integral" />
              <Field label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Pan de trigo integral con semillas" textarea />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio (ARS) *" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="6500" type="number" />
                <Field label="Peso" value={form.weight} onChange={(v) => setForm({ ...form, weight: v })} placeholder="700g" />
              </div>
              <Field label="Ingredientes" value={form.ingredients} onChange={(v) => setForm({ ...form, ingredients: v })} placeholder="Harina integral, semillas de girasol, nueces, miel" textarea />

              {/* Días disponibles */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-2">Días disponibles</label>
                <div className="flex gap-3">
                  {DAYS.map((d) => {
                    const checked = form.availableDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                          checked
                            ? "bg-amber/10 border-amber text-amber"
                            : "bg-white border-border text-muted hover:border-amber/40"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Actualiza el stock en todas las fechas futuras del día seleccionado.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-amber" />
                <span className="text-sm font-medium text-charcoal">Producto activo</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary rounded-xl py-3 text-sm">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || uploading || !form.name || !form.price} className="flex-1 btn-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FocalPicker({ imageUrl, focalX, focalY, onChange }: {
  imageUrl: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getPos = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)));
    onChange(x, y);
  }, [onChange]);

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted">Arrastrá para enfocar el recuadre</p>
      <div
        ref={ref}
        className="relative aspect-square w-full overflow-hidden rounded-xl cursor-crosshair select-none touch-none"
        onMouseDown={(e) => { dragging.current = true; getPos(e.clientX, e.clientY); }}
        onMouseMove={(e) => { if (dragging.current) getPos(e.clientX, e.clientY); }}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={(e) => { dragging.current = true; getPos(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchMove={(e) => { if (dragging.current) getPos(e.touches[0].clientX, e.touches[0].clientY); }}
        onTouchEnd={() => { dragging.current = false; }}
      >
        <Image
          src={imageUrl}
          alt="Focal preview"
          fill
          className="object-cover pointer-events-none"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
          sizes="400px"
        />
        {/* Guías */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 h-px bg-white/50" style={{ top: `${focalY}%` }} />
          <div className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${focalX}%` }} />
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${focalX}%`, top: `${focalY}%` }}
          />
        </div>
        {/* Label */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
          <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            Arrastrá para enfocar
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", textarea }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; textarea?: boolean;
}) {
  const cls = "w-full border-2 border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber bg-white";
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className={cls + " resize-none"} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
