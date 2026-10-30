import type { Metadata } from 'next';
import Link from 'next/link';
import { themeAttributes } from '@madhare/web-themes';
import { LiveRefresh } from '@/components/LiveRefresh';
// Mad Hare kit: compiled controls and tokens, the theme records, and the Mona Sans face.
import '@madhare/web-ui/styles.css';
import '@madhare/web-themes/themes.css';
import '@madhare/web-themes/fonts/madhare.css';
import 'katex/dist/katex.min.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Cert Academy', template: '%s · Cert Academy' },
  description: 'Certification prep: CISSP and Google Cloud Professional Cloud Architect.',
};

const NAV = [
  ['/', 'Courses'],
  ['/library', 'Sources'],
  ['/search', 'Search'],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* The kit scopes a theme to a wrapper, not to <html>. */}
        <div {...themeAttributes('madhare')} className="mh-app">
        <header className="site-header">
          <Link href="/" className="logo">Cert Academy</Link>
          <nav>
            {NAV.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
        </header>
        <main className="page">{children}</main>
        <footer className="site-footer">
          Original study material and questions. Not affiliated with ISC2 or Google.
        </footer>
        <LiveRefresh />
        </div>
      </body>
    </html>
  );
}
