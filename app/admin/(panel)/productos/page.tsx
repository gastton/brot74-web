"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Check, ToggleLeft, ToggleRight, ImagePlus } from "lucide-react";
import Image from "next/image";
import ImageZoomModal from "@/components/ImageZoomModal";
import FocalPicker from "@/components/FocalPicker";
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
  imageScale: number;
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
  imageScale: 1,
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
  const [uploadError, setUploadError] = useState("");
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
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
    setUploadError("");
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
      imageScale: p.imageScale ?? 1,
      availableDays: p.availableDays ? p.availableDays.split(",").filter(Boolean) : [],
      active: p.active,
      sortOrder: String(p.sortOrder),
    });
    setImagePreview(p.imageUrl);
    setUploadError("");
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
    const previousPreview = imagePreview;
    setUploadError("");
    setUploading(true);
    // Preview local inmediato
    setImagePreview(URL.createObjectURL(file));

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setForm((f) => ({ ...f, imageUrl: data.url }));
      } else {
        setImagePreview(previousPreview);
        setUploadError(data.error || "No se pudo subir la imagen. Probá de nuevo.");
      }
    } catch {
      setImagePreview(previousPreview);
      setUploadError("Error de conexión. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    setSaving(true);
    const url = editing ? `/api/admin/products/${editing.id}` : "/api/admin/products";
    const method = editing ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: parseInt(form.price), sortOrder: parseInt(form.sortOrder), availableDays: form.availableDays.join(","), focalX: form.focalX, focalY: form.focalY, imageScale: form.imageScale }),
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
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border cursor-zoom-in"
                    onClick={() => setZoomSrc(p.imageUrl)}>
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
                    if (file) { handleImageUpload(file); setForm((f) => ({ ...f, focalX: 50, focalY: 50, imageScale: 1 })); }
                  }}
                />
                {imagePreview ? (
                  <div className="space-y-2">
                    {/* Focal point picker */}
                    <FocalPicker
                      imageUrl={imagePreview}
                      focalX={form.focalX}
                      focalY={form.focalY}
                      scale={form.imageScale}
                      onChange={(x, y) => setForm((f) => ({ ...f, focalX: x, focalY: y }))}
                      onScaleChange={(s) => setForm((f) => ({ ...f, imageScale: s }))}
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
                {uploadError && (
                  <div className="mt-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm">
                    {uploadError}
                  </div>
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

      {zoomSrc && <ImageZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />}
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
