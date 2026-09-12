import { useMemo, useState } from 'react';
import { FileSpreadsheet, ArrowDownUp } from 'lucide-react';
import { orderCollector, syntheticCsv, queryOrders, defaultQuery } from '../core/csv';
const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
export default function CurrentPreview() {
  const [region, setRegion] = useState('');
  const [descending, setDescending] = useState(false);
  const rows = useMemo(() => {
    const collector = orderCollector();
    for (const chunk of syntheticCsv(1000)) collector.parser.feed(chunk);
    return collector.finish();
  }, []);
  const result = useMemo(
    () => queryOrders(rows, { ...defaultQuery, region, sort: 'amount', descending }),
    [rows, region, descending],
  );
  const max = Math.max(1, ...result.daily.map(([, cents]) => cents));
  const points = result.daily
    .map(
      ([, cents], i) =>
        `${(i / Math.max(1, result.daily.length - 1)) * 300},${55 - (cents / max) * 48}`,
    )
    .join(' ');
  return (
    <div className="index-csv">
      <div className="index-file">
        <FileSpreadsheet size={19} />
        <span>regional-orders.csv</span>
        <small>Sample</small>
      </div>
      <div className="index-data-filter" role="group" aria-label="Preview region filter">
        {[
          ['', 'All regions'],
          ['Europe', 'Europe'],
          ['Asia Pacific', 'Asia'],
        ].map(([value, label]) => (
          <button key={value} aria-pressed={region === value} onClick={() => setRegion(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="index-csv-grid">
        <div className="index-csv-head">
          <span>Order</span>
          <span>Region</span>
          <button aria-label="Reverse amount sort" onClick={() => setDescending(!descending)}>
            Amount
            <ArrowDownUp size={11} />
          </button>
        </div>
        <div key={region + descending} className="index-csv-rows">
          {result.rows.slice(0, 6).map((row, i) => (
            <div key={row.id} style={{ animationDelay: `${i * 24}ms` }}>
              <span>{row.id.replace('ORD-', '')}</span>
              <span>{row.region === 'Asia Pacific' ? 'Asia Pacific' : row.region}</span>
              <span>{money(row.cents)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="index-csv-total">
        <span>{result.rows.length.toLocaleString()} orders</span>
        <strong aria-live="polite">{money(result.cents)}</strong>
      </div>
      <div className="index-spark">
        <span>Daily totals</span>
        <svg
          viewBox="0 0 300 65"
          role="img"
          aria-label="Daily totals of the filtered sample orders"
        >
          <polygon points={`0,65 ${points} 300,65`} />
          <polyline points={points} />
        </svg>
      </div>
      <p className="index-data-note">Try the filters. Open Current to use your own file.</p>
    </div>
  );
}
