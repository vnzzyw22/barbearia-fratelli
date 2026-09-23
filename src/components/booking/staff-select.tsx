"use client";

import { ComboSelect } from "./combo-select";
import type { Staff } from "@/lib/supabase/types";

interface StaffSelectProps {
  staff: Staff[];
  value: string;
  onChange: (id: string) => void;
  buttonId: string;
  labelId: string;
  listboxId: string;
}

function staffLabel(person: Staff) {
  return person.role ? `${person.name} — ${person.role}` : person.name;
}

export function StaffSelect({
  staff,
  value,
  onChange,
  buttonId,
  labelId,
  listboxId,
}: StaffSelectProps) {
  return (
    <ComboSelect
      items={staff}
      value={value}
      onChange={onChange}
      getId={(person) => person.id}
      getLabel={staffLabel}
      placeholder="Selecione um profissional"
      buttonId={buttonId}
      labelId={labelId}
      listboxId={listboxId}
    />
  );
}
