"use client";

import { ComboSelect } from "./combo-select";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/supabase/types";

interface ServiceSelectProps {
  services: Service[];
  value: string;
  onChange: (id: string) => void;
  buttonId: string;
  labelId: string;
  listboxId: string;
}

function serviceLabel(service: Service) {
  return `${service.name} — ${formatPrice(service.price)} (${formatDuration(service.duration_minutes)})`;
}

// Dropdown 100% customizado (2026-09-03), a pedido do cliente — o <select>
// nativo herda o tema do sistema operacional/navegador (lista azul no
// Windows/Chrome), impossível de restilizar por CSS além do campo fechado.
// Lógica do listbox acessível extraída pra combo-select.tsx (2026-09-10)
// pra reaproveitar no seletor de Profissional.
export function ServiceSelect({
  services,
  value,
  onChange,
  buttonId,
  labelId,
  listboxId,
}: ServiceSelectProps) {
  return (
    <ComboSelect
      items={services}
      value={value}
      onChange={onChange}
      getId={(service) => service.id}
      getLabel={serviceLabel}
      placeholder="Selecione um serviço"
      buttonId={buttonId}
      labelId={labelId}
      listboxId={listboxId}
    />
  );
}
