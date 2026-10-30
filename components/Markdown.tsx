import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import type { Element, Root, RootContent } from 'hast';
import { Mermaid } from './Mermaid';

// Math needs $$…$$ (single dollars are prices: "$40,000 a month").
// Raw HTML is allowed for <details>/<summary> answer blocks, then sanitised. KaTeX and
// highlight run after sanitising, so their own markup is never stripped.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./, 'math-inline', 'math-display']],
    div: [...(defaultSchema.attributes?.div ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
  },
};

const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/;
const ALERT_TITLE: Record<string, string> = {
  NOTE: 'Note', TIP: 'Tip', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution',
};

/** GitHub alert syntax (`> [!WARNING]`) → <blockquote class="callout callout-warning">. */
function rehypeAlerts() {
  const walk = (node: Root | Element) => {
    for (const child of node.children as RootContent[]) {
      if (child.type !== 'element') continue;
      if (child.tagName === 'blockquote') {
        const p = child.children.find((c): c is Element => c.type === 'element' && c.tagName === 'p');
        const first = p?.children[0];
        const m = first?.type === 'text' ? ALERT.exec(first.value) : null;
        if (p && first?.type === 'text' && m) {
          first.value = first.value.slice(m[0].length);
          const kind = m[1].toLowerCase();
          child.properties = { ...child.properties, className: ['callout', `callout-${kind}`] };
          child.children.unshift({
            type: 'element', tagName: 'div', properties: { className: ['callout-title'] },
            children: [{ type: 'text', value: ALERT_TITLE[m[1]] }],
          });
        }
      }
      walk(child);
    }
  };
  return (tree: Root) => walk(tree);
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeAlerts, rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={{
          pre({ node, children: inner, ...rest }) {
            // Mermaid fences become a diagram instead of a <pre><code> block.
            const code = node?.children[0];
            const cls = code?.type === 'element' ? code.properties.className : undefined;
            if (code?.type === 'element' && Array.isArray(cls) && cls.includes('language-mermaid')) {
              const text = code.children.map((c) => (c.type === 'text' ? c.value : '')).join('');
              return <Mermaid chart={text.trim()} />;
            }
            return <pre {...rest}>{inner}</pre>;
          },
          a({ href, children: text, ...rest }) {
            const external = href?.startsWith('http');
            return <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{text}</a>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
