type KategoriRow = { name: string; value: number };

const MAX_ROWS = 6;

export function KategoriBarList({ data }: { data: KategoriRow[] }) {
  const sorted = data
    .filter((r) => Number.isFinite(r.value) && r.value > 0)
    .sort((a, b) => b.value - a.value);

  // Lebih dari 6 kategori: 5 teratas + satu baris "Lainnya"
  const rows =
    sorted.length > MAX_ROWS
      ? [
          ...sorted.slice(0, MAX_ROWS - 1),
          {
            name: "Lainnya",
            value: sorted.slice(MAX_ROWS - 1).reduce((s, r) => s + r.value, 0),
          },
        ]
      : sorted;

  const total = rows.reduce((s, r) => s + r.value, 0);
  // "Lainnya" bisa lebih besar dari kategori teratas, jadi max dihitung dari baris akhir
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  if (total === 0 || max === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Belum ada penjualan pada periode ini.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r, i) => {
        const persen = Math.round((r.value / total) * 100);
        return (
          <li key={`${r.name}-${i}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-slate-900">{r.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {r.value} item · {persen}%
              </span>
            </div>
            <div className="h-2 rounded bg-slate-100" aria-hidden="true">
              <div
                className="h-full rounded bg-blue-600"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
