// Toast de resultado de subida de imagen (admin). Ver _design/design_cambios_v23.
type ToastOptions = {
  onRetry?: () => void;
};

const ICONS = {
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4.5"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="9.2"/></svg>`,
  ok: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/></svg>`,
  retry: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/></svg>`,
  close: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
};

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function stackEl(): HTMLDivElement {
  let stack = document.querySelector<HTMLDivElement>(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "assertive");
    document.body.appendChild(stack);
  }
  return stack;
}

function mount(html: string, opts: { dur?: number; ok?: boolean; actions?: boolean; onRetry?: () => void }) {
  const dur = opts.dur ?? 7000;
  const stack = stackEl();
  const el = document.createElement("div");
  el.className = "toast is-running" + (opts.ok ? " is-ok" : "") + (opts.actions ? " has-actions" : "");
  el.style.setProperty("--dur", `${dur / 1000}s`);
  el.setAttribute("role", opts.ok ? "status" : "alert");
  el.innerHTML = html;

  let timer: ReturnType<typeof setTimeout>;
  function remove() {
    el.classList.add("is-leaving");
    clearTimeout(timer);
    setTimeout(() => el.remove(), 280);
  }
  timer = setTimeout(remove, dur);
  el.addEventListener("mouseenter", () => clearTimeout(timer));
  el.addEventListener("mouseleave", () => {
    timer = setTimeout(remove, 2500);
  });
  el.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!target) return;
    const act = target.dataset.act;
    if (act === "dismiss") remove();
    if (act === "retry") {
      opts.onRetry?.();
      remove();
    }
  });

  stack.appendChild(el);
  while (stack.children.length > 3) stack.firstChild?.remove();
  return { close: remove, el };
}

export function toastError(message: string, opts: ToastOptions = {}) {
  return mount(
    `<span class="toast__icon">${ICONS.error}</span>` +
      `<div class="toast__body">` +
      `<p class="toast__title">No se pudo subir la imagen</p>` +
      `<p class="toast__desc">Error: ${esc(message)}</p>` +
      `<div class="toast__actions">` +
      `<button class="toast__retry" data-act="retry">${ICONS.retry}Reintentar</button>` +
      `<button class="toast__ghost" data-act="dismiss">Descartar</button>` +
      `</div>` +
      `</div>` +
      `<button class="toast__close" data-act="dismiss" aria-label="Cerrar">${ICONS.close}</button>` +
      `<span class="toast__timer"></span>`,
    { dur: 7000, actions: true, onRetry: opts.onRetry }
  );
}

export function toastSuccess(subject?: string) {
  const desc = subject ? `Ya se ve ${esc(subject)}.` : "La imagen se guardó.";
  return mount(
    `<span class="toast__icon">${ICONS.ok}</span>` +
      `<div class="toast__body">` +
      `<p class="toast__title">Imagen actualizada</p>` +
      `<p class="toast__desc">${desc}</p>` +
      `</div>` +
      `<button class="toast__close" data-act="dismiss" aria-label="Cerrar">${ICONS.close}</button>` +
      `<span class="toast__timer"></span>`,
    { ok: true, dur: 4000 }
  );
}
