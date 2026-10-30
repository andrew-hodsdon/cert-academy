import { Badge, EmptyState } from '@madhare/web-ui';
import { listArticles } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sources' };

export default async function Library() {
  const articles = await listArticles();
  return (
    <>
      <h1>Sources</h1>
      <p className="muted">Every standard, document and reference the lessons cite, with our notes on each.</p>
      {articles.length === 0 ? <EmptyState title="No sources yet" appearance="neutral">They arrive as courses load.</EmptyState> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Source</th><th>Kind</th><th>Cited by</th><th>Notes</th></tr></thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.slug}>
                  <td style={{ minWidth: 240 }}>
                    <a href={a.url} target="_blank" rel="noreferrer">{a.title}</a>
                    <div className="tiny">{[a.authors.slice(0, 3).join(', '), a.site, a.published_at?.getFullYear()].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td><Badge>{a.kind.replace('_', ' ')}</Badge></td>
                  <td>{a.cited_by.map((c) => <Badge key={c}>{c}</Badge>)}</td>
                  <td className="tiny">{(a.summary_md ?? '').slice(0, 260)}{(a.summary_md?.length ?? 0) > 260 && '…'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
