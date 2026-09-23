"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createStaff,
  deleteStaff,
  updateStaff,
} from "@/app/admin/(painel)/equipe/actions";
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
import type { AdminStaff } from "@/lib/supabase/types";

interface StaffManagerProps {
  staff: AdminStaff[];
}

export function StaffManager({ staff }: StaffManagerProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const editing =
    editingId !== null && editingId !== "new"
      ? (staff.find((s) => s.id === editingId) ?? null)
      : null;

  function startCreate() {
    setEditingId("new");
    setError(null);
  }

  function startEdit(person: AdminStaff) {
    setEditingId(person.id);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editingId === null) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result =
        editingId === "new"
          ? await createStaff(formData)
          : await updateStaff(editingId, formData);

      if (result.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      // Mesma lição da Galeria: falha antes de chegar na Server Action
      // (corpo grande demais, queda de rede) não retorna ActionResult —
      // sem isso o botão travaria em "Salvando..." pra sempre.
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(person: AdminStaff) {
    if (!confirm(`Excluir "${person.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    setRowError(null);
    const result = await deleteStaff(person.id, person.photo_url);
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
          + Novo profissional
        </button>
      )}

      {editingId !== null && (
        <form
          onSubmit={handleSubmit}
          className={`flex max-w-lg flex-col gap-4 ${cardClass}`}
        >
          <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">
            {editingId === "new" ? "Novo profissional" : "Editar profissional"}
          </h2>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Nome</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Função (ex: Barbeiro)</label>
            <input
              type="text"
              name="role"
              defaultValue={editing?.role ?? ""}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Instagram (@usuário)</label>
            <input
              type="text"
              name="instagram"
              placeholder="@usuario"
              defaultValue={editing?.instagram ?? ""}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>
              Foto{editing ? " (deixe em branco pra manter a atual)" : ""}
            </label>
            <input
              type="file"
              name="file"
              accept="image/*"
              className="text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:tracking-widest file:text-white file:uppercase"
            />
          </div>

          <div className="grid grid-cols-2 items-end gap-4">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Ordem de exibição</label>
              <input
                type="number"
                name="displayOrder"
                defaultValue={String(editing?.display_order ?? 0)}
                className={fieldClass}
              />
            </div>

            <label className="flex items-center gap-2 pb-2 text-sm text-white/70">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={editing?.active ?? true}
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {staff.map((person) => (
          <div key={person.id} className={`flex flex-col gap-2 ${cardClass}`}>
            <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5">
              {person.photo_url ? (
                <Image
                  src={person.photo_url}
                  alt={person.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-white/30">
                  Sem foto
                </div>
              )}
            </div>

            <span className="font-medium text-white">{person.name}</span>
            {person.role && <span className="text-sm text-white/60">{person.role}</span>}
            <span className={`w-fit ${badgeClass(person.active ? "green" : "neutral")}`}>
              {person.active ? "Ativo" : "Inativo"}
            </span>

            <div className="mt-1 flex gap-4">
              <button type="button" onClick={() => startEdit(person)} className={linkPrimaryClass}>
                Editar
              </button>
              <button type="button" onClick={() => handleDelete(person)} className={linkDangerClass}>
                Excluir
              </button>
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <p className="py-4 text-sm text-white/40">
            Nenhum profissional cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
