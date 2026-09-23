"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createService,
  deleteService,
  updateService,
} from "@/app/admin/(painel)/servicos/actions";
import {
  badgeClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  fieldClass,
  labelClass,
  linkDangerClass,
  linkPrimaryClass,
} from "@/components/admin/theme";
import { formatDuration, formatPrice } from "@/lib/format";
import type { AdminService } from "@/lib/supabase/types";

interface ServicesManagerProps {
  services: AdminService[];
}

interface FormState {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  displayOrder: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  durationMinutes: "",
  displayOrder: "0",
  active: true,
};

function serviceToForm(service: AdminService): FormState {
  return {
    name: service.name,
    description: service.description ?? "",
    price: String(service.price),
    durationMinutes: String(service.duration_minutes),
    displayOrder: String(service.display_order),
    active: service.active,
  };
}

export function ServicesManager({ services }: ServicesManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function startCreate() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(service: AdminService) {
    setEditingId(service.id);
    setForm(serviceToForm(service));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;

    const price = Number(form.price.replace(",", "."));
    const durationMinutes = Number(form.durationMinutes);
    const displayOrder = Number(form.displayOrder) || 0;

    const duplicate = services.find(
      (s) => s.display_order === displayOrder && s.id !== editingId,
    );
    if (duplicate) {
      setError(
        `Esse número de ordem já está em uso por "${duplicate.name}". Escolha outro número.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    const input = {
      name: form.name,
      description: form.description,
      price,
      durationMinutes,
      displayOrder,
      active: form.active,
    };

    const result =
      editingId === "new"
        ? await createService(input)
        : await updateService(editingId, input);

    setSubmitting(false);

    if (result.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(service: AdminService) {
    if (!confirm(`Excluir "${service.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setRowError(null);
    const result = await deleteService(service.id);
    if (result.ok) {
      router.refresh();
    } else {
      setRowError(result.error);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {editingId === null && (
        <button
          type="button"
          onClick={startCreate}
          className={`self-start ${buttonPrimaryClass}`}
        >
          + Novo serviço
        </button>
      )}

      {editingId !== null && (
        <form
          onSubmit={handleSubmit}
          className={`flex max-w-lg flex-col gap-4 ${cardClass}`}
        >
          <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">
            {editingId === "new" ? "Novo serviço" : "Editar serviço"}
          </h2>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Nome</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Descrição (opcional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Preço (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Duração (min)</label>
              <input
                type="number"
                min={1}
                required
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value })
                }
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Ordem de exibição</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) =>
                  setForm({ ...form, displayOrder: e.target.value })
                }
                className={fieldClass}
              />
              {(() => {
                const duplicate = services.find(
                  (s) =>
                    s.display_order === Number(form.displayOrder) &&
                    s.id !== editingId,
                );
                return duplicate ? (
                  <p className="text-xs text-amber-400">
                    Número já usado por &quot;{duplicate.name}&quot;.
                  </p>
                ) : null;
              })()}
            </div>

            <label className="flex items-center gap-2 pb-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.checked })
                }
              />
              Ativo (visível no site)
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className={buttonPrimaryClass}>
              {submitting ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={cancelEdit} className={buttonSecondaryClass}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {rowError && <p className="text-sm text-red-400">{rowError}</p>}

      <div className="flex flex-col gap-2">
        {services.map((service) => (
          <div
            key={service.id}
            className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${cardClass}`}
          >
            <span className="min-w-32 font-medium text-white">
              {service.name}
            </span>
            <span className="text-white/60">{formatPrice(service.price)}</span>
            <span className="text-white/60">
              {formatDuration(service.duration_minutes)}
            </span>
            <span className="text-white/40">Ordem {service.display_order}</span>
            <span className={badgeClass(service.active ? "green" : "neutral")}>
              {service.active ? "Ativo" : "Inativo"}
            </span>

            <div className="ml-auto flex gap-4">
              <button
                type="button"
                onClick={() => startEdit(service)}
                className={linkPrimaryClass}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(service)}
                className={linkDangerClass}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}

        {services.length === 0 && (
          <p className="py-4 text-sm text-white/40">
            Nenhum serviço cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
