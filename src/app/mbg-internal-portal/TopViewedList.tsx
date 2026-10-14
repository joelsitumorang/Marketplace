type TopViewedItem = {
  id: number;
  sku: string;
  title: string;
  viewCount: number;
  branchName: string;
};

// Pemecahan hanya untuk tampilan; nama di database tidak diubah.
const pecahNama = (nama: string) => {
  const kondisi = nama.match(/^\[(BARU|BEKAS)\]\s*/i)?.[1]?.toUpperCase() ?? null;
  const bersih = nama.replace(/^\[(BARU|BEKAS)\]\s*/i, "");
  const [judul, ...sisa] = bersih.split(/\s[-–]\s/);
  return { kondisi, judul, keterangan: sisa.join(" – ") };
};

export function TopViewedList({ items }: { items: TopViewedItem[] }) {
  const sorted = [...items].sort((a, b) => b.viewCount - a.viewCount);
  const maxViews = sorted[0]?.viewCount ?? 0;
  const multiBranch = new Set(sorted.map((i) => i.branchName)).size > 1;

  return (
    <ul>
      {sorted.map((item, i) => {
        const { kondisi, judul, keterangan } = pecahNama(item.title);
        const lebar = maxViews > 0 ? (item.viewCount / maxViews) * 100 : 0;
        return (
          <li
            key={item.id}
            className="grid grid-cols-[20px_minmax(0,1fr)_auto] gap-2.5 border-t border-slate-100 py-3 first:border-t-0"
          >
            <span className="text-[13px] text-slate-400">{i + 1}</span>
            <div className="min-w-0">
              <p
                className="line-clamp-2 break-words text-sm font-medium leading-snug text-slate-900"
                title={item.title}
              >
                {judul}
              </p>
              {keterangan && (
                <p className="truncate text-xs text-slate-500">{keterangan}</p>
              )}
              <div className="mt-1.5 flex items-center gap-2">
                {kondisi && (
                  <span className="shrink-0 rounded bg-slate-100 px-1.5 text-[11px] text-slate-600">
                    {kondisi}
                  </span>
                )}
                <span className="shrink-0 rounded bg-slate-100 px-1.5 font-mono text-[11px] text-slate-500">
                  {item.sku}
                </span>
                {multiBranch && (
                  <span className="min-w-0 truncate text-[11px] text-slate-400">
                    {item.branchName}
                  </span>
                )}
                <div className="h-1 min-w-4 flex-1 rounded bg-slate-100" aria-hidden="true">
                  <div
                    className="h-full rounded bg-blue-600"
                    style={{ width: `${lebar}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-medium tabular-nums text-slate-900">
                {item.viewCount}
              </p>
              <p className="whitespace-nowrap text-[11px] text-slate-400">views</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
