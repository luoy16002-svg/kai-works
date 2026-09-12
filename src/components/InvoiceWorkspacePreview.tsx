import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import PreviewTabs from './PreviewTabs';
const command =
  'python invoice_gate.py check fixtures/valid.json --vendor demo-supplier --currency USD --number-format en-US';
export default function InvoiceWorkspacePreview() {
  const [tab, setTab] = useState<'run' | 'code'>('run');
  const [copied, setCopied] = useState(false);
  return (
    <div className="index-invoice">
      <PreviewTabs
        className="invoice-tabs"
        label="Invoice Gate preview"
        items={['Recorded run', 'Command']}
        selected={tab === 'run' ? 0 : 1}
        onChange={(index) => setTab(index === 0 ? 'run' : 'code')}
      >
        <Terminal size={15} />
      </PreviewTabs>
      <div key={tab} className="invoice-window" role="tabpanel">
        {tab === 'run' ? (
          <>
            <div className="invoice-run-heading">
              <span className="run-dot" />
              demo.py <span>Python / SQLite</span>
            </div>
            <ol className="invoice-run-steps">
              <li>
                <Check size={13} />
                <span>Consistent invoice</span>
                <code>7,366</code>
              </li>
              <li>
                <span className="review-mark">!</span>
                <span>Wrong arithmetic</span>
                <code>review</code>
              </li>
              <li>
                <span className="review-mark">!</span>
                <span>Missing decimal</span>
                <code>review</code>
              </li>
              <li>
                <Check size={13} />
                <span>First import</span>
                <code>imported</code>
              </li>
              <li>
                <Check size={13} />
                <span>Identical retry</span>
                <code>duplicate</code>
              </li>
              <li>
                <Check size={13} />
                <span>Conflicting batch</span>
                <code>rollback</code>
              </li>
            </ol>
            <div className="invoice-ledger">
              <span>Final ledger</span>
              <strong>
                1 invoice <span>/ 7,366 minor units</span>
              </strong>
            </div>
            <p>Captured from the included Python demo with synthetic fixtures.</p>
          </>
        ) : (
          <>
            <pre>
              {'$ ' +
                command +
                '\n\n# Exercise validation, retries and rollback\npython demo.py\n\n# Run the test suite\npython -m unittest -v'}
            </pre>
            <button
              className="copy-cli"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(command);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Copied command' : 'Copy check command'}</span>
            </button>
          </>
        )}
      </div>
      <div className="invoice-language">
        <span>Python 3.12+</span>
        <span>No external packages</span>
      </div>
    </div>
  );
}
