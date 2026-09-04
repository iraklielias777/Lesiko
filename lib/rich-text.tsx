import React from 'react';

/**
 * Long-form editable copy (the legal pages) uses a three-rule format so the
 * admin textarea needs no toolbar and nothing typed into it can become markup:
 *
 *   ## Heading      a section heading
 *   - item          a bullet in a list
 *   (blank line)    ends a paragraph
 *
 * Everything else is a paragraph. supabase/functions/seo/seo-core.ts carries
 * the same parser for the bot-facing HTML; keep the two in step.
 */
export type RichBlock =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

export const parseRichText = (text: string): RichBlock[] => {
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
    if (list.length) {
      blocks.push({ type: 'ul', items: list });
      list = [];
    }
  };

  for (const raw of (text || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (paragraph.length) {
        blocks.push({ type: 'p', text: paragraph.join(' ') });
        paragraph = [];
      }
      list.push(line.slice(2).trim());
    } else {
      if (list.length) {
        blocks.push({ type: 'ul', items: list });
        list = [];
      }
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
};

/** The plain first paragraph, for meta descriptions. */
export const richTextExcerpt = (text: string, max = 160): string => {
  const first = parseRichText(text).find(block => block.type === 'p');
  const value = first && first.type === 'p' ? first.text : '';
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
};

export const RichText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div className={className}>
    {parseRichText(text).map((block, index) => {
      if (block.type === 'h2') {
        return (
          <h2 key={index} className="font-heading text-xl md:text-2xl font-bold text-gray-900 mt-10 mb-3 first:mt-0">
            {block.text}
          </h2>
        );
      }
      if (block.type === 'ul') {
        return (
          <ul key={index} className="list-disc pl-5 space-y-1.5 text-gray-600 leading-relaxed mb-4">
            {block.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        );
      }
      return (
        <p key={index} className="text-gray-600 leading-relaxed mb-4">
          {block.text}
        </p>
      );
    })}
  </div>
);
