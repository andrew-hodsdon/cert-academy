import Link from 'next/link';
import { Button } from '@madhare/web-ui';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div className="score">404</div>
      <h1>Page not found</h1>
      <p className="muted">That page doesn't exist, or the course hasn't been loaded.</p>
      <Button href="/">Back to courses</Button>
    </div>
  );
}
