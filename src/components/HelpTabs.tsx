'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ListChecks, BookOpen, HelpCircle, ChevronDown, MessageCircle } from 'lucide-react'
import { passos, funcionalidades, faq, faqGrupos } from '@/lib/help-content'

type SecaoId = 'primeiros-passos' | 'funcionalidades' | 'faq'

const TABS: { id: SecaoId; label: string; icon: typeof ListChecks }[] = [
  { id: 'primeiros-passos', label: 'Primeiros passos',     icon: ListChecks },
  { id: 'funcionalidades',  label: 'Funcionalidades',      icon: BookOpen   },
  { id: 'faq',              label: 'Perguntas frequentes', icon: HelpCircle },
]

interface Props {
  supportUrl: string
}

export default function HelpTabs({ supportUrl }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()

  const param   = searchParams.get('secao')
  const active: SecaoId = TABS.some(t => t.id === param) ? (param as SecaoId) : 'primeiros-passos'

  function selectTab(id: SecaoId) {
    router.replace(id === 'primeiros-passos' ? pathname : `${pathname}?secao=${id}`, { scroll: false })
  }

  return (
    <div>
      {/* Abas */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                isActive
                  ? 'bg-indigo text-white border-indigo'
                  : 'bg-white text-ink-40 border-[rgba(13,13,26,0.12)] hover:border-indigo hover:text-indigo'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 1 — Primeiros passos */}
      {active === 'primeiros-passos' && (
        <div className="space-y-3">
          {passos.map((p, i) => (
            <div key={i} className="j-card flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo text-white flex items-center justify-center font-semibold text-sm">
                {i + 1}
              </div>
              <div>
                <p className="j-h4 mb-1">{p.titulo}</p>
                <p className="j-body text-ink-80">{p.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2 — Funcionalidades */}
      {active === 'funcionalidades' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {funcionalidades.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="j-card">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-8 h-8 rounded-md bg-indigo-pale text-indigo flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <p className="j-h4">{f.titulo}</p>
                </div>
                <p className="j-body text-ink-80">{f.descricao}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* 3 — Perguntas frequentes */}
      {active === 'faq' && (
        <div className="space-y-6">
          {faqGrupos.map(grupo => {
            const itens = faq.filter(q => q.grupo === grupo)
            if (itens.length === 0) return null
            return (
              <div key={grupo}>
                <p className="j-overline mb-2">{grupo}</p>
                <div className="space-y-2">
                  {itens.map((q, i) => (
                    <details key={i} className="j-card group py-0">
                      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none py-4 [&::-webkit-details-marker]:hidden">
                        <span className="j-h4">{q.pergunta}</span>
                        <ChevronDown className="w-4 h-4 text-ink-40 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="j-body text-ink-80 pb-4 -mt-1">{q.resposta}</p>
                    </details>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Suporte — presente em todas as abas */}
      <div className="j-card j-card-gradient mt-8 text-center">
        <p className="j-h3 mb-1">Ainda com dúvida?</p>
        <p className="j-caption mb-4">Fale com a nossa equipe no WhatsApp — respondemos por lá.</p>
        <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary no-underline inline-flex">
          <MessageCircle className="w-4 h-4" />
          Falar com o suporte
        </a>
      </div>
    </div>
  )
}
