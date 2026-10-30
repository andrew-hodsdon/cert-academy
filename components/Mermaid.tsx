'use client';
import { useEffect, useId, useState } from 'react';

/** Renders a mermaid diagram client-side; falls back to the source if it fails to parse. */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'neutral',
        fontFamily: 'var(--font-body)',
      });
      try {
        const out = await mermaid.render(`m${id}`, chart);
        if (live) setSvg(out.svg);
      } catch {
        if (live) setFailed(true);
      }
    });
    return () => { live = false; };
  }, [chart, id]);

  if (failed) return <pre className="mermaid-error"><code>{chart}</code></pre>;
  if (!svg) return <div className="mermaid-loading">Loading diagram…</div>;
  return <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
