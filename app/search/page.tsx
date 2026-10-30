import Link from 'next/link';
import { Badge, Button, EmptyState } from '@madhare/web-ui';
import { searchLibrary } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search' };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const term = ((await searchParams).q ?? '').trim().slice(0, 200);
  const results = term ? await searchLibrary(term) : [];
  return (
    <>
      <h1>Search</h1>
      <p className="muted">Full-text search across every lesson and source. Use quotes for phrases and a minus sign to exclude words.</p>
      <form style={{ maxWidth: 700, display: 'flex', gap: 10 }}>
        <input type="search" name="q" defaultValue={term} placeholder='e.g. "chain of custody" or kerberos -ntlm' autoFocus />
        <Button type="submit">Search</Button>
      </form>
      {term && results.length === 0 && <div style={{ marginTop: 20 }}><EmptyState title="No matches" appearance="neutral">Try fewer or different words.</EmptyState></div>}
      <div style={{ maxWidth: 860, marginTop: 20 }}>
        {results.map((r) => (
          <div key={r.href} className="question">
            <Badge>{r.kind}</Badge>{' '}
            {r.href.startsWith('http') ? <a href={r.href} target="_blank" rel="noreferrer">{r.title}</a> : <Link href={r.href}>{r.title}</Link>}
            <p className="tiny" >
              {r.snippet.split(/⟦|⟧/).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
