'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/* Nenhuma cor aqui: as cores do markdown vêm das variáveis `--tw-prose-*`,
   redefinidas em tailwind.config.ts para os tokens do tema. Escrever
   `text-gray-700` ou `prose-headings:text-gray-900` nesta classe é o que
   deixava o documento ilegível no escuro — o cinza fixo ganhava do tema. */
export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none
      prose-headings:font-bold
      prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-line prose-h2:pb-2
      prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
      prose-p:leading-relaxed prose-p:my-2
      prose-ul:my-2 prose-li:my-0.5
      prose-hr:my-6
      prose-table:w-full prose-th:text-left prose-th:font-semibold
      prose-td:align-top prose-td:text-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
