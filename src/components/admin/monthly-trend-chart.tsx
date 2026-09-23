"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
}

interface MonthlyTrendChartProps {
  monthlyTotals: MonthlyTotal[];
}

// Paleta validada pelo skill de dataviz (scripts/validate_palette.js) --
// slots 6 (verde) e 8 (vermelho) da paleta categórica padrão, na versão
// escura, checados como par (não são vizinhos na ordem original de 8, mas
// só usamos 2 séries aqui): CVD ΔE 8.6 / normal-vision ΔE 32.6 contra a
// superfície #1a1a1a do admin -- passam em todos os checks no modo escuro
// (único modo que este painel usa). Mesma família de cor já usada nos
// cards de resumo e na tabela de lançamentos desta página, então a
// legenda não introduz um significado novo.
const COLOR_INCOME = "#008300";
const COLOR_EXPENSE = "#e66767";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const PADDING_LEFT = 52;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;

function monthLabel(monthISO: string) {
  const [year, month] = monthISO.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
  return label.replace(".", "");
}

// Teto "redondo" pro eixo Y (ex.: 137 -> 150, 480 -> 500) -- ticks previsíveis
// em vez de frações decimais.
function niceCeiling(value: number) {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

type HoverInfo = {
  type: "income" | "expense";
  month: string;
  value: number;
  xPercent: number;
};

export function MonthlyTrendChart({ monthlyTotals }: MonthlyTrendChartProps) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [showTable, setShowTable] = useState(false);

  const maxValue = Math.max(
    1,
    ...monthlyTotals.flatMap((m) => [m.income, m.expense]),
  );
  const axisMax = niceCeiling(maxValue);
  const plotWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const groupWidth = plotWidth / monthlyTotals.length;
  const barWidth = Math.min(22, groupWidth * 0.32);
  const barGap = 3;

  function yFor(value: number) {
    return PADDING_TOP + plotHeight * (1 - value / axisMax);
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(axisMax * f));

  return (
    <div className="rounded-lg border border-white/10 bg-teal-deep p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
          Entradas × Saídas — últimos {monthlyTotals.length} meses
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 font-label text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: COLOR_INCOME }}
              />
              Entradas
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: COLOR_EXPENSE }}
              />
              Saídas
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="font-label text-xs text-white/40 underline decoration-white/20 underline-offset-2 hover:text-white/70"
          >
            {showTable ? "Ver gráfico" : "Ver como tabela"}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-2 pr-4 font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Mês
                </th>
                <th className="py-2 pr-4 text-right font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Entradas
                </th>
                <th className="py-2 text-right font-nav text-xs font-bold tracking-widest text-white/40 uppercase">
                  Saídas
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyTotals.map((m) => (
                <tr key={m.month} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-4 text-white/70 capitalize">
                    {monthLabel(m.month)}
                  </td>
                  <td className="py-2 pr-4 text-right font-label tabular-nums text-white">
                    {formatPrice(m.income)}
                  </td>
                  <td className="py-2 text-right font-label tabular-nums text-white">
                    {formatPrice(m.expense)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full"
          >
            <title>{`Entradas e saídas por mês, últimos ${monthlyTotals.length} meses`}</title>
            {/* Gridlines horizontais -- hairline, recessivas */}
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={PADDING_LEFT}
                x2={CHART_WIDTH - PADDING_RIGHT}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke="#2c2c2a"
                strokeWidth={1}
              />
            ))}

            {/* Ticks do eixo Y */}
            {ticks.map((tick) => (
              <text
                key={tick}
                x={PADDING_LEFT - 8}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-white/40"
                style={{ font: "9px var(--font-label), monospace" }}
              >
                {tick >= 1000 ? `${Math.round(tick / 100) / 10}k` : tick}
              </text>
            ))}

            {monthlyTotals.map((m, i) => {
              const groupX = PADDING_LEFT + i * groupWidth;
              const centerX = groupX + groupWidth / 2;
              const incomeX = centerX - barWidth - barGap / 2;
              const expenseX = centerX + barGap / 2;
              const incomeY = yFor(m.income);
              const expenseY = yFor(m.expense);
              const baseline = yFor(0);

              return (
                <g key={m.month}>
                  <rect
                    x={incomeX}
                    y={incomeY}
                    width={barWidth}
                    height={Math.max(0, baseline - incomeY)}
                    rx={3}
                    fill={COLOR_INCOME}
                    opacity={
                      hover && hover.month === m.month && hover.type !== "income"
                        ? 0.5
                        : 1
                    }
                    tabIndex={0}
                    aria-label={`Entradas em ${monthLabel(m.month)}: ${formatPrice(m.income)}`}
                    onMouseEnter={() =>
                      setHover({
                        type: "income",
                        month: m.month,
                        value: m.income,
                        xPercent: (incomeX + barWidth / 2) / CHART_WIDTH * 100,
                      })
                    }
                    onFocus={() =>
                      setHover({
                        type: "income",
                        month: m.month,
                        value: m.income,
                        xPercent: (incomeX + barWidth / 2) / CHART_WIDTH * 100,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                    className="cursor-pointer outline-none"
                  />
                  <rect
                    x={expenseX}
                    y={expenseY}
                    width={barWidth}
                    height={Math.max(0, baseline - expenseY)}
                    rx={3}
                    fill={COLOR_EXPENSE}
                    opacity={
                      hover && hover.month === m.month && hover.type !== "expense"
                        ? 0.5
                        : 1
                    }
                    tabIndex={0}
                    aria-label={`Saídas em ${monthLabel(m.month)}: ${formatPrice(m.expense)}`}
                    onMouseEnter={() =>
                      setHover({
                        type: "expense",
                        month: m.month,
                        value: m.expense,
                        xPercent: (expenseX + barWidth / 2) / CHART_WIDTH * 100,
                      })
                    }
                    onFocus={() =>
                      setHover({
                        type: "expense",
                        month: m.month,
                        value: m.expense,
                        xPercent: (expenseX + barWidth / 2) / CHART_WIDTH * 100,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                    className="cursor-pointer outline-none"
                  />
                  <text
                    x={centerX}
                    y={CHART_HEIGHT - PADDING_BOTTOM + 16}
                    textAnchor="middle"
                    className="fill-white/40 capitalize"
                    style={{ font: "9px var(--font-label), monospace" }}
                  >
                    {monthLabel(m.month)}
                  </text>
                </g>
              );
            })}

            {/* Linha de base */}
            <line
              x1={PADDING_LEFT}
              x2={CHART_WIDTH - PADDING_RIGHT}
              y1={yFor(0)}
              y2={yFor(0)}
              stroke="#383835"
              strokeWidth={1}
            />
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 -translate-y-full rounded-md border border-white/10 bg-[#0d0d0d] px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
              style={{ left: `${hover.xPercent}%` }}
            >
              <p className="text-white/50 capitalize">{monthLabel(hover.month)}</p>
              <p className="font-label font-bold tabular-nums text-white">
                {hover.type === "income" ? "Entradas: " : "Saídas: "}
                {formatPrice(hover.value)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
