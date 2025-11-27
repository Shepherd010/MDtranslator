import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Mermaid from './Mermaid';

interface PreviewProps {
  content: string;
}

export default function Preview({ content }: PreviewProps) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match && match[1] === 'mermaid') {
              return <Mermaid chart={String(children).replace(/\n$/, '')} />;
            }
            // Inline code
            if (inline) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }
            // Block code
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom components for better styling
          h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
          p: ({ children }) => <p className="md-p">{children}</p>,
          ul: ({ children }) => <ul className="md-ul">{children}</ul>,
          ol: ({ children }) => <ol className="md-ol">{children}</ol>,
          li: ({ children }) => <li className="md-li">{children}</li>,
          blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} className="md-link" target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children }) => <div className="table-wrapper"><table className="md-table">{children}</table></div>,
          thead: ({ children }) => <thead className="md-thead">{children}</thead>,
          tbody: ({ children }) => <tbody className="md-tbody">{children}</tbody>,
          tr: ({ children }) => <tr className="md-tr">{children}</tr>,
          th: ({ children }) => <th className="md-th">{children}</th>,
          td: ({ children }) => <td className="md-td">{children}</td>,
          hr: () => <hr className="md-hr" />,
          img: ({ src, alt }) => <img src={src} alt={alt} className="md-img" />,
          pre: ({ children }) => <pre className="md-pre">{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        .markdown-preview {
          height: 100%;
          width: 100%;
          overflow: auto;
          padding: 24px 32px;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
          font-size: 15px;
          line-height: 1.7;
          color: #24292f;
        }

        /* Headings */
        .md-h1 {
          font-size: 2em;
          font-weight: 600;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #d8dee4;
          margin: 24px 0 16px 0;
          line-height: 1.25;
        }

        .md-h2 {
          font-size: 1.5em;
          font-weight: 600;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #d8dee4;
          margin: 24px 0 16px 0;
          line-height: 1.25;
        }

        .md-h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 24px 0 16px 0;
          line-height: 1.25;
        }

        .md-h4 {
          font-size: 1em;
          font-weight: 600;
          margin: 24px 0 16px 0;
          line-height: 1.25;
        }

        /* Paragraph */
        .md-p {
          margin: 0 0 16px 0;
        }

        /* Lists */
        .md-ul, .md-ol {
          margin: 0 0 16px 0;
          padding-left: 2em;
        }

        .md-li {
          margin: 4px 0;
        }

        .md-li > .md-ul, .md-li > .md-ol {
          margin: 4px 0;
        }

        /* Blockquote */
        .md-blockquote {
          margin: 0 0 16px 0;
          padding: 0 1em;
          color: #57606a;
          border-left: 4px solid #d0d7de;
          background: #f6f8fa;
          border-radius: 0 6px 6px 0;
        }

        .md-blockquote p {
          margin: 8px 0;
        }

        /* Links */
        .md-link {
          color: #0969da;
          text-decoration: none;
        }

        .md-link:hover {
          text-decoration: underline;
        }

        /* Inline code */
        .inline-code {
          padding: 0.2em 0.4em;
          margin: 0 2px;
          font-size: 85%;
          background: rgba(175, 184, 193, 0.2);
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
        }

        /* Code block */
        .md-pre {
          margin: 0 0 16px 0;
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background: #f6f8fa;
          border-radius: 6px;
          border: 1px solid #d0d7de;
        }

        .md-pre code {
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
          background: transparent;
          padding: 0;
          border: none;
        }

        /* Table */
        .table-wrapper {
          overflow-x: auto;
          margin: 0 0 16px 0;
        }

        .md-table {
          border-collapse: collapse;
          width: 100%;
          border-spacing: 0;
        }

        .md-thead {
          background: #f6f8fa;
        }

        .md-th, .md-td {
          padding: 8px 16px;
          border: 1px solid #d0d7de;
          text-align: left;
        }

        .md-th {
          font-weight: 600;
        }

        .md-tr:nth-child(even) {
          background: #f6f8fa;
        }

        /* Horizontal rule */
        .md-hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: #d8dee4;
          border: 0;
          border-radius: 2px;
        }

        /* Images */
        .md-img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          margin: 8px 0;
        }

        /* Task lists */
        .markdown-preview input[type="checkbox"] {
          margin-right: 8px;
        }

        /* Highlight.js overrides for GitHub style */
        .hljs {
          background: transparent !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
}
