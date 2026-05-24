'use client'

import ReactMarkdown from 'react-markdown'

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-blue max-w-none text-gray-700
      prose-headings:text-gray-900 prose-headings:font-bold
      prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2
      prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
      prose-p:leading-relaxed prose-p:my-2
      prose-ul:my-2 prose-li:my-0.5
      prose-strong:text-gray-900
      prose-hr:border-gray-200 prose-hr:my-6">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
