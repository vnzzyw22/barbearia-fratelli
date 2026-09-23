"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  deleteClient,
  updateClient,
} from "@/app/admin/(painel)/clientes/actions";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  fieldClass,
  labelClass,
  linkDangerClass,
  linkPrimaryClass,
} from "@/components/admin/theme";
import type { AdminClient } from "@/lib/supabase/types";

interface ClientsManagerProps {
  clients: AdminClient[];
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function ClientsManager({ clients }: ClientsManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.whatsapp?.toLowerCase().includes(term),
    );
  }, [clients, search]);

  function startEdit(client: AdminClient) {
    setEditingId(client.id);
    setName(client.name);
    setWhatsapp(client.whatsapp ?? "");
    setNotes(client.notes ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    setSubmitting(true);
    setError(null);

    const result = await updateClient(editingId, { name, whatsapp, notes });

    setSubmitting(false);

    if (result.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(client: AdminClient) {
    if (!confirm(`Excluir "${client.name}"? Essa ação não pode ser desfeita.`)) {
      return;
    }

    const result = await deleteClient(client.id);
    if (result.ok) router.refresh();
    else setError(result.error);
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <input
        type="text"
        placeholder="Buscar por nome ou WhatsApp..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`max-w-sm ${fieldClass}`}
      />

      {editingId !== null && (
        <form
          onSubmit={handleSubmit}
          className={`flex max-w-lg flex-col gap-4 ${cardClass}`}
        >
          <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">
            Editar cliente
          </h2>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Nome</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>WhatsApp</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Observações</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={fieldClass}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className={buttonPrimaryClass}>
              {submitting ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className={buttonSecondaryClass}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {editingId === null && error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {filtered.length === 0 ? (
        <p className="py-4 text-sm text-white/40">
          {clients.length === 0
            ? "Nenhum cliente cadastrado ainda."
            : "Nenhum cliente encontrado."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="px-4 py-3 font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Nome
                </th>
                <th className="px-4 py-3 font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  WhatsApp
                </th>
                <th className="px-4 py-3 font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Observações
                </th>
                <th className="px-4 py-3 font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Desde
                </th>
                <th className="px-4 py-3 text-right font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/60">
                    {client.whatsapp ?? "—"}
                  </td>
                  <td
                    className="max-w-xs truncate px-4 py-3 text-white/40"
                    title={client.notes ?? undefined}
                  >
                    {client.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/40">
                    {formatDate(client.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => startEdit(client)}
                        className={linkPrimaryClass}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(client)}
                        className={linkDangerClass}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
