import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileSpreadsheet, X } from 'lucide-react';
import { columns, type ColumnMapping } from '../core/csv';
import { previewCsv, type CsvPreview } from '../core/csvImport';

export default function CsvImportDialog({
  initialFile,
  onClose,
  onImport,
}: {
  initialFile: File | null;
  onClose: () => void;
  onImport: (file: File, mapping: ColumnMapping) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  const [name, setName] = useState('orders.csv');
  const [file, setFile] = useState<File | null>(initialFile);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  async function inspect(candidate: File) {
    const id = ++request.current;
    setReading(true);
    setError('');
    try {
      const result = await previewCsv(candidate);
      if (request.current !== id) return;
      setFile(candidate);
      setPreview(result);
    } catch (error) {
      if (request.current === id)
        setError(error instanceof Error ? error.message : 'Could not read this CSV.');
    } finally {
      if (request.current === id) setReading(false);
    }
  }
  useEffect(() => {
    dialog.current?.showModal();
    if (initialFile) void inspect(initialFile);
    return () => {
      request.current++;
      dialog.current?.close();
    };
  }, []);
  const valid =
    preview &&
    columns.every((field) => preview.mapping[field] >= 0) &&
    new Set(Object.values(preview.mapping)).size === 5;
  return (
    <dialog
      className="csv-dialog"
      ref={dialog}
      onCancel={onClose}
      aria-labelledby="csv-import-title"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (preview && file && valid) onImport(file, preview.mapping);
          else if (!preview && text.trim())
            void inspect(new File([text], name.trim() || 'orders.csv', { type: 'text/csv' }));
        }}
      >
        <header>
          <div>
            <FileSpreadsheet size={21} />
            <h2 id="csv-import-title">{preview ? 'Match your columns' : 'Import order data'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close import">
            <X size={20} />
          </button>
        </header>
        {preview ? (
          <>
            <p>
              Choose the source column for each field. Extra columns are ignored. Amounts use USD
              with two decimal places; dates use YYYY-MM-DD.
            </p>
            <div className="csv-mapping">
              {columns.map((field) => (
                <label key={field}>
                  <span>
                    {field === 'id' ? 'Order ID' : field[0].toUpperCase() + field.slice(1)}
                  </span>
                  <select
                    aria-label={`Source column for ${field}`}
                    value={preview.mapping[field]}
                    onChange={(event) =>
                      setPreview({
                        ...preview,
                        mapping: { ...preview.mapping, [field]: Number(event.target.value) },
                      })
                    }
                  >
                    <option value={-1}>Choose a column</option>
                    {preview.header.map((label, index) => (
                      <option value={index} key={index}>
                        {index + 1}. {label || '(untitled)'}
                      </option>
                    ))}
                  </select>
                  <small>
                    {preview.mapping[field] < 0
                      ? 'Required'
                      : preview.rows[0]?.[preview.mapping[field]] || 'Empty value'}
                  </small>
                </label>
              ))}
            </div>
            <div className="csv-preview-table">
              <table>
                <caption>
                  Preview · first {preview.rows.length} records of {file?.name}
                </caption>
                <thead>
                  <tr>
                    {columns.map((field) => (
                      <th key={field}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((field) => (
                        <td key={field}>{row[preview.mapping[field]] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!valid && <p className="csv-hint">Select five different columns to continue.</p>}
          </>
        ) : (
          <>
            <p>
              Paste CSV text from your spreadsheet, including the header row. All records are
              validated before the workspace opens.
            </p>
            <label className="csv-name">
              File name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
              />
            </label>
            <label className="csv-paste">
              CSV content
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
                placeholder={
                  'id,date,region,channel,amount\nORDER-1,2026-09-01,Europe,Direct,24.50'
                }
              />
            </label>
          </>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        {reading && <p role="status">Reading the first records…</p>}
        <footer>
          <span>On this device · 25 MB / 500,000 rows</span>
          <button type="submit" disabled={reading || (preview ? !valid : !text.trim())}>
            {preview ? 'Validate & import' : 'Preview columns'}
            <ArrowRight size={16} />
          </button>
        </footer>
      </form>
    </dialog>
  );
}
