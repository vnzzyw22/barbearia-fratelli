"use client";

import { useState } from "react";
import { updateBusinessSettings } from "@/app/admin/(painel)/configuracoes/actions";
import {
  buttonPrimaryClass,
  fieldClass,
  labelClass,
  sectionTitleClass,
} from "@/components/admin/theme";
import { DAY_LABELS, DAY_ORDER } from "@/lib/business-hours";
import type { BusinessHours, BusinessSettings } from "@/lib/supabase/types";

interface SettingsFormProps {
  business: BusinessSettings;
}

interface DayState {
  closed: boolean;
  open: string;
  close: string;
}

type HoursState = Record<(typeof DAY_ORDER)[number], DayState>;

function toHoursState(hours: BusinessHours): HoursState {
  const state = {} as HoursState;
  for (const day of DAY_ORDER) {
    const entry = hours[day];
    if (entry && "closed" in entry && entry.closed) {
      state[day] = { closed: true, open: "09:00", close: "18:00" };
    } else if (entry && "open" in entry) {
      state[day] = { closed: false, open: entry.open, close: entry.close };
    } else {
      state[day] = { closed: true, open: "09:00", close: "18:00" };
    }
  }
  return state;
}

function toBusinessHours(state: HoursState): BusinessHours {
  const hours: BusinessHours = {};
  for (const day of DAY_ORDER) {
    const dayState = state[day];
    hours[day] = dayState.closed
      ? { closed: true }
      : { open: dayState.open, close: dayState.close };
  }
  return hours;
}

export function SettingsForm({ business }: SettingsFormProps) {
  const [name, setName] = useState(business.name);
  const [whatsapp, setWhatsapp] = useState(business.whatsapp ?? "");
  const [instagram, setInstagram] = useState(business.instagram ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [hours, setHours] = useState<HoursState>(
    toHoursState(business.business_hours),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateDay(day: (typeof DAY_ORDER)[number], patch: Partial<DayState>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const result = await updateBusinessSettings({
      name,
      whatsapp,
      instagram,
      address,
      businessHours: toBusinessHours(hours),
    });

    setSubmitting(false);

    if (result.ok) {
      setSaved(true);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className={labelClass}>
          Nome do negócio
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="whatsapp" className={labelClass}>
          WhatsApp (com DDI e DDD, ex: 5544999999999)
        </label>
        <input
          id="whatsapp"
          type="text"
          placeholder="5544999999999"
          value={whatsapp}
          onChange={(e) => {
            setWhatsapp(e.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="instagram" className={labelClass}>
          Instagram (@usuário)
        </label>
        <input
          id="instagram"
          type="text"
          placeholder="@fratelli.barberclub"
          value={instagram}
          onChange={(e) => {
            setInstagram(e.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="address" className={labelClass}>
          Endereço
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-3">
        <span className={sectionTitleClass}>Horário de funcionamento</span>

        {DAY_ORDER.map((day) => (
          <div
            key={day}
            className="flex flex-wrap items-center gap-3 text-sm text-white/70"
          >
            <span className="w-20 shrink-0 text-white/50">
              {DAY_LABELS[day]}
            </span>

            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!hours[day].closed}
                onChange={(e) =>
                  updateDay(day, { closed: !e.target.checked })
                }
              />
              Aberto
            </label>

            {!hours[day].closed && (
              <>
                <input
                  type="time"
                  value={hours[day].open}
                  onChange={(e) => updateDay(day, { open: e.target.value })}
                  className={fieldClass}
                />
                <span className="text-white/30">até</span>
                <input
                  type="time"
                  value={hours[day].close}
                  onChange={(e) => updateDay(day, { close: e.target.value })}
                  className={fieldClass}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-green-400">Configurações salvas.</p>}

      <button
        type="submit"
        disabled={submitting}
        className={`self-start ${buttonPrimaryClass}`}
      >
        {submitting ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}
