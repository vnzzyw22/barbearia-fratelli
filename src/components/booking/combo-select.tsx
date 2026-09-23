"use client";

import { useEffect, useRef, useState } from "react";

interface ComboSelectProps<T> {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder: string;
  buttonId: string;
  labelId: string;
  listboxId: string;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 6"
      className={`h-1.5 w-2.5 shrink-0 fill-none stroke-current transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  );
}

// Extraído de service-select.tsx (2026-09-10) pra reaproveitar o mesmo
// listbox ARIA acessível (role="listbox"/"option", navegação por
// seta/Enter/Escape, fecha ao clicar fora) no seletor de Profissional, sem
// duplicar ~150 linhas de lógica de dropdown customizado. `getId`/`getLabel`
// isolam o que muda entre Serviço e Profissional.
export function ComboSelect<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  placeholder,
  buttonId,
  labelId,
  listboxId,
}: ComboSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = items.findIndex((item) => getId(item) === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  function openMenu() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function closeMenu(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function selectAt(index: number) {
    const item = items[index];
    if (!item) return;
    onChange(getId(item));
    closeMenu(true);
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        closeMenu(true);
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(items.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectAt(activeIndex);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${buttonId}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-none border-0 border-b bg-teal/70 px-3 py-3 text-left text-base text-ivory transition-colors duration-200 focus-visible:bg-teal ${
          open ? "border-gold bg-teal" : "border-gold/40"
        }`}
      >
        <span className={selected ? "" : "text-mist"}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          id={listboxId}
          aria-labelledby={labelId}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-gold/40 bg-teal-ink py-1 outline-none"
        >
          {items.map((item, i) => {
            const id = getId(item);
            const isSelected = id === value;
            const isActive = i === activeIndex;

            return (
              <li
                key={id}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectAt(i)}
                className={`cursor-pointer px-3 py-3 text-[0.95rem] transition-colors duration-150 ${
                  isActive ? "bg-gold text-teal-ink" : "text-ivory"
                }`}
              >
                {getLabel(item)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
