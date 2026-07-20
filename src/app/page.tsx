'use client'

import { useState } from 'react'
import Link from 'next/link'
import TGLogo from '@/components/TGLogo'
import { PLANS } from '@/lib/plans'
import '@/styles/landing.css'

const faqData = [
  {
    q: 'O TurisGuard substitui um advogado?',
    a: 'Não. As orientações são informativas, geradas por IA com base na legislação, e não constituem parecer jurídico (Provimento OAB). Para decisões com risco relevante, você escala o caso para um advogado de verdade direto na plataforma.',
  },
  {
    q: 'De onde vem a informação jurídica?',
    a: 'Das fontes oficiais aplicáveis ao turismo: a Lei 11.771/08, as resoluções da ANAC e o Código de Defesa do Consumidor — sempre com a referência citada na resposta.',
  },
  {
    q: 'Preciso entender de Direito para usar?',
    a: 'Não. Você descreve a situação em português comum e recebe uma orientação clara, com os próximos passos práticos para a sua agência.',
  },
  {
    q: 'Como funciona a escalada para advogado?',
    a: 'Quando a IA sinaliza um caso complexo — ou quando você preferir —, o caso é encaminhado para atendimento humano, com resposta em até 2h úteis* nos planos com escalada inclusa.',
  },
  {
    q: 'Meus dados e os dos clientes ficam seguros?',
    a: 'Sim. As informações dos casos são armazenadas com segurança e usadas apenas para gerar e registrar as orientações da sua agência.',
  },
]

const D = {
  display: 'var(--font-display, Sora, sans-serif)',
  body: 'var(--font-body, Inter, system-ui, sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", monospace)',
}

export default function HomePage() {
  const [billing, setBilling] = useState<'anual' | 'mensal'>('anual')
  const [faqAberto, setFaqAberto] = useState(0)

  function toggleFaq(i: number) {
    setFaqAberto(prev => (prev === i ? -1 : i))
  }

  return (
    <div style={{ fontFamily: D.body, color: '#16202F', background: '#fff', minHeight: '100%', overflowX: 'hidden' }}>

      {/* ===== NAV ===== */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEF1F5' }}>
        <div className="lp-nav-inner" style={{ maxWidth: 1160, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <TGLogo size={32} variant="color" withWordmark />
          </Link>
          <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 26, marginLeft: 12 }}>
            <a href="#como" style={{ fontSize: 14.5, fontWeight: 500, color: '#344259', textDecoration: 'none' }}>Como funciona</a>
            <a href="#recursos" style={{ fontSize: 14.5, fontWeight: 500, color: '#344259', textDecoration: 'none' }}>Recursos</a>
            <a href="#precos" style={{ fontSize: 14.5, fontWeight: 500, color: '#344259', textDecoration: 'none' }}>Preços</a>
            <a href="#faq" style={{ fontSize: 14.5, fontWeight: 500, color: '#344259', textDecoration: 'none' }}>Dúvidas</a>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <Link className="lp-nav-entrar" href="/login" style={{ fontSize: 14.5, fontWeight: 600, color: '#16202F', textDecoration: 'none' }}>Entrar</Link>
            <a className="lp-nav-cta" href="#precos" style={{ fontSize: 14.5, fontWeight: 600, color: '#fff', background: '#5B57E8', textDecoration: 'none', padding: '9px 18px', borderRadius: 10, boxShadow: '0 8px 18px -8px rgba(91,87,232,.6)', whiteSpace: 'nowrap' }}>Começar grátis</a>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <header style={{ position: 'relative', background: '#FBFBFE', backgroundImage: 'radial-gradient(80% 70% at 92% 0%, rgba(91,87,232,.10), transparent 60%)', overflow: 'hidden' }}>
        <div className="lp-hero-grid" style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 32px 80px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 56, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: 1, color: '#4842D4', background: '#EEF0FF', border: '1px solid #DEE2FF', borderRadius: 999, padding: '6px 13px', textTransform: 'uppercase' }}>Legaltech para turismo</span>
            <h1 className="lp-h1" style={{ fontFamily: D.display, fontWeight: 800, fontSize: 52, lineHeight: 1.05, letterSpacing: '-2px', color: '#0B121C', margin: '22px 0 18px', textWrap: 'balance' } as React.CSSProperties}>Segurança jurídica para cada decisão da sua agência.</h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#344259', margin: '0 0 30px', maxWidth: 520 }}>Tire dúvidas do dia a dia com base na legislação brasileira de turismo — em linguagem clara, sem juridiquês. E quando o caso é sério, fale com um advogado de verdade, direto na plataforma.</p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <a href="#precos" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5, fontWeight: 600, color: '#fff', background: '#5B57E8', textDecoration: 'none', padding: '15px 26px', borderRadius: 13, boxShadow: '0 12px 26px -10px rgba(91,87,232,.6)' }}>
                Começar grátis <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
              </a>
              <a href="#como" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5, fontWeight: 600, color: '#16202F', background: '#fff', border: '1.5px solid #E6EAF0', textDecoration: 'none', padding: '14px 24px', borderRadius: 13 }}>Ver como funciona</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 24, color: '#7A879B', fontSize: 13.5, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ color: '#0E9E7A', fontWeight: 700 }}>✓</span>Sem cartão de crédito</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ color: '#0E9E7A', fontWeight: 700 }}>✓</span>7 dias grátis</span>
              <span style={{ fontFamily: D.mono, fontSize: 12.5 }}>Lei 11.771/08 · ANAC · CDC</span>
            </div>
          </div>

          {/* Product mock */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -18, right: -10, bottom: -22, left: -10, background: 'radial-gradient(60% 50% at 70% 30%, rgba(91,87,232,.12), transparent 70%)', filter: 'blur(8px)' }} />
            <div style={{ position: 'relative', background: '#fff', border: '1px solid #E6EAF0', borderRadius: 20, boxShadow: '0 1px 2px rgba(11,18,28,.04),0 30px 60px -28px rgba(11,18,28,.32)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px', borderBottom: '1px solid #EEF1F5' }}>
                <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: '#F4F6F9', color: '#5A6B82', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>A</span>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: '#16202F' }}>Um cliente cancelou o pacote 8 dias antes da viagem por motivo médico. Preciso devolver tudo?</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '15px 20px', background: '#0B121C', backgroundImage: 'radial-gradient(120% 120% at 100% 0%, rgba(91,87,232,.35), transparent 55%)' }}>
                <svg width="26" height="26" viewBox="0 0 96 96" aria-hidden="true">
                  <defs><clipPath id="cp-hero-mock"><path d="M16 15 L80 15 C84 15 86 18 86 22 L86 50 C86 72 70 86 48 92 C26 86 10 72 10 50 L10 22 C10 18 12 15 16 15 Z"/></clipPath></defs>
                  <g clipPath="url(#cp-hero-mock)"><rect width="96" height="96" fill="#fff"/></g>
                  <text x="48" y="52" textAnchor="middle" dominantBaseline="central" fontFamily="Sora,sans-serif" fontWeight="800" fontSize="33" letterSpacing="-1.5" fill="#0B121C">TG</text>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: D.display, fontWeight: 600, fontSize: 13.5, color: '#fff' }}>Orientação TurisGuard</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, background: 'rgba(255,248,235,.14)', color: '#FBC04D', fontSize: 11.5, fontWeight: 600, border: '1px solid rgba(247,168,35,.4)' }}>Risco Médio</span>
              </div>
              <div style={{ padding: '18px 20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 13.5, lineHeight: 1.6, color: '#344259' }}>Em regra, o cancelamento por <strong>motivo de saúde comprovado</strong> afasta a multa integral. Você deve restituir o valor pago, descontando apenas as despesas não recuperáveis junto aos fornecedores.</p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ fontFamily: D.mono, fontSize: 11.5, color: '#16202F', background: '#F4F6F9', border: '1px solid #E6EAF0', borderRadius: 6, padding: '3px 8px' }}>Lei 11.771/08, art. 22</span>
                  <span style={{ fontFamily: D.mono, fontSize: 11.5, color: '#16202F', background: '#F4F6F9', border: '1px solid #E6EAF0', borderRadius: 6, padding: '3px 8px' }}>CDC, art. 49</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF1EF', border: '1px solid #FFC0B7', borderRadius: 11, padding: '11px 13px' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3 L20 6 V12 C20 17 16.5 19.8 12 21.5 C7.5 19.8 4 17 4 12 V6 Z" stroke="#AF2719" strokeWidth="1.8" strokeLinejoin="round"/>
                    <circle cx="12" cy="10.5" r="2.1" fill="#AF2719"/>
                    <path d="M8.4 15.5 C8.8 13.6 10.2 12.8 12 12.8 C13.8 12.8 15.2 13.6 15.6 15.5" stroke="#AF2719" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#AF2719' }}>Quer confirmar com um advogado? Escale em 1 clique.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== SLOGAN BAND ===== */}
      <section style={{ background: '#0B121C' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '30px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span className="lp-slogan" style={{ fontFamily: D.display, fontWeight: 500, fontSize: 21, letterSpacing: '-.4px', color: '#C2C7FF' }}>&ldquo;uma segunda opinião antes de uma primeira decisão&rdquo;</span>
        </div>
      </section>

      {/* ===== PROBLEMA ===== */}
      <section style={{ background: '#fff' }}>
        <div className="lp-section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 48px' }}>
            <div style={{ fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: '#4842D4', textTransform: 'uppercase', marginBottom: 14 }}>O dia a dia de uma agência</div>
            <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: '-1px', color: '#0B121C', margin: '0 0 14px', textWrap: 'balance' } as React.CSSProperties}>Toda semana surge uma decisão que parece simples — mas tem peso jurídico.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: '#5A6B82', margin: 0 }}>E adivinhar errado custa caro: multa, Procon, reembolso indevido ou cliente perdido.</p>
          </div>
          <div className="lp-problem-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {([
              { bg: '#FFF8EB', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h10" stroke="#C26F07" strokeWidth="2" strokeLinecap="round"/></svg>, title: 'Cancelamento e reembolso', desc: 'Quanto devolver? Em quanto tempo? O que pode reter?' },
              { bg: '#EEF0FF', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4L19 6" stroke="#4842D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'No-show e overbooking', desc: 'De quem é a responsabilidade quando o serviço falha?' },
              { bg: '#EAFBF5', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="#067F64" strokeWidth="2"/><path d="M9 8h6M9 12h6M9 16h3" stroke="#067F64" strokeWidth="2" strokeLinecap="round"/></svg>, title: 'Cláusulas de contrato', desc: 'O que pode (e o que não pode) entrar no seu termo.' },
              { bg: '#FFF1EF', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v6M12 16v.5" stroke="#D33420" strokeWidth="2.2" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="#D33420" strokeWidth="2"/></svg>, title: 'Reclamações e Procon', desc: 'Como responder sem assumir o que não deve.' },
            ] as const).map(card => (
              <div key={card.title} style={{ background: '#FBFBFE', border: '1px solid #EEF1F5', borderRadius: 16, padding: 24 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{card.icon}</div>
                <h3 style={{ fontFamily: D.display, fontWeight: 600, fontSize: 16, color: '#16202F', margin: '0 0 6px' }}>{card.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#7A879B', margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como" style={{ background: '#F7F9FB', borderTop: '1px solid #EEF1F5', borderBottom: '1px solid #EEF1F5' }}>
        <div className="lp-section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
            <div style={{ fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: '#4842D4', textTransform: 'uppercase', marginBottom: 14 }}>Como funciona</div>
            <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: '-1px', color: '#0B121C', margin: 0, textWrap: 'balance' } as React.CSSProperties}>Da dúvida à decisão segura em três passos.</h2>
          </div>
          <div className="lp-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
            {[
              { num: '01', numColor: '#9DA1FB', title: 'Pergunte em português comum', desc: 'Descreva a situação do jeito que ela aconteceu. Sem formulários jurídicos, sem termos técnicos.' },
              { num: '02', numColor: '#9DA1FB', title: 'Receba uma orientação fundamentada', desc: 'Resposta clara, com os próximos passos e a base legal citada — gerada com IA e fundamentada em casos reais já resolvidos.' },
              { num: '03', numColor: '#FB6A57', title: 'Escale para um advogado, se precisar', desc: 'Caso sério ou na dúvida? Encaminhe para atendimento humano com um clique e tenha respaldo profissional.' },
            ].map(step => (
              <div key={step.num} style={{ background: '#fff', border: '1px solid #E6EAF0', borderRadius: 18, padding: 30 }}>
                <span style={{ fontFamily: D.mono, fontSize: 13, fontWeight: 600, color: step.numColor }}>{step.num}</span>
                <h3 style={{ fontFamily: D.display, fontWeight: 600, fontSize: 19, color: '#0B121C', margin: '14px 0 8px', letterSpacing: '-.3px' }}>{step.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A6B82', margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RECURSOS ===== */}
      <section id="recursos" style={{ background: '#fff' }}>
        <div className="lp-section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ maxWidth: 620, margin: '0 0 48px' }}>
            <div style={{ fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: '#4842D4', textTransform: 'uppercase', marginBottom: 14 }}>Recursos</div>
            <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: '-1px', color: '#0B121C', margin: 0, textWrap: 'balance' } as React.CSSProperties}>Pensado para quem toca uma agência — não um escritório de advocacia.</h2>
          </div>
          <div className="lp-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {[
              { bg: '#EAFBF5', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3 L20 6 V12 C20 17 16.5 19.8 12 21.5 C7.5 19.8 4 17 4 12 V6 Z" stroke="#067F64" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 11.5l2 2 4-4.5" stroke="#067F64" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Base legal sempre citada', desc: 'Toda orientação mostra de onde veio — Lei 11.771/08, ANAC ou CDC.' },
              { bg: '#FFF8EB', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h10" stroke="#C26F07" strokeWidth="1.8" strokeLinecap="round"/><circle cx="17" cy="17" r="4" stroke="#C26F07" strokeWidth="1.8"/><path d="M15.5 17h3M17 15.5v3" stroke="#C26F07" strokeWidth="1.6" strokeLinecap="round"/></svg>, title: 'Base de casos reais + IA', desc: 'Orientações geradas com IA e enriquecidas por processos já resolvidos no setor de turismo.' },
              { bg: '#FFF1EF', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="#D33420" strokeWidth="1.8"/><path d="M3.5 19c.5-3 2.7-4.5 5.5-4.5s5 1.5 5.5 4.5" stroke="#D33420" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 8.5c1.6.3 2.7 1.4 2.7 3M15 14.8c2.3.2 3.8 1.6 4.2 4.2" stroke="#D33420" strokeWidth="1.8" strokeLinecap="round"/></svg>, title: 'Escalada para advogado real', desc: 'Quando a IA não basta, fale com um profissional — sem trocar de ferramenta.' },
              { bg: '#EEF0FF', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#4842D4" strokeWidth="1.8"/><path d="M8 9h8M8 13h8M8 17h5" stroke="#4842D4" strokeWidth="1.8" strokeLinecap="round"/></svg>, title: 'Histórico de casos', desc: 'Cada consulta vira um registro consultável, com ID e fundamentação.' },
              { bg: '#EAFBF5', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 2" stroke="#067F64" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#067F64" strokeWidth="1.8"/></svg>, title: 'Resposta em segundos', desc: 'Sem esperar dias por um parecer para uma dúvida que precisa de resposta agora.' },
              { bg: '#FFF8EB', icon: <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M12 3 L20 6 V12 C20 17 16.5 19.8 12 21.5 C7.5 19.8 4 17 4 12 V6 Z" stroke="#C26F07" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 9v4" stroke="#C26F07" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16.2" r="0.6" fill="#C26F07"/></svg>, title: 'Severidade do caso', desc: 'Cada caso é classificado por risco — leve, médio ou elevado — para você priorizar e saber quando chamar um advogado.' },
            ].map(feat => (
              <div key={feat.title} style={{ border: '1px solid #EEF1F5', borderRadius: 16, padding: 26 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: feat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{feat.icon}</div>
                <h3 style={{ fontFamily: D.display, fontWeight: 600, fontSize: 16.5, color: '#16202F', margin: '0 0 7px' }}>{feat.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#7A879B', margin: 0 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LINGUAGEM CLARA ===== */}
      <section style={{ background: '#FBFBFE', borderTop: '1px solid #EEF1F5', borderBottom: '1px solid #EEF1F5' }}>
        <div className="lp-2col-lang" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px', display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: '#4842D4', textTransform: 'uppercase', marginBottom: 14 }}>Feito para o não-jurista</div>
            <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 36, lineHeight: 1.12, letterSpacing: '-1px', color: '#0B121C', margin: '0 0 16px', textWrap: 'balance' } as React.CSSProperties}>Você não precisa entender de Direito.</h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.65, color: '#5A6B82', margin: 0 }}>A lei fala difícil. O TurisGuard traduz para a linguagem da sua operação — com o passo prático que você toma hoje, e a fonte por trás dele caso queira ir mais fundo.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', border: '1px solid #FDD88A', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontFamily: D.mono, fontSize: 11, fontWeight: 600, letterSpacing: '1px', color: '#C26F07', textTransform: 'uppercase', marginBottom: 8 }}>A lei diz</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#7C420E', fontStyle: 'italic' }}>&ldquo;...resta configurado o caso fortuito, eximindo o fornecedor da cobrança da cláusula penal, ressalvadas as despesas comprovadamente irrecuperáveis perante terceiros...&rdquo;</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', color: '#9FACC0', fontSize: 20 }}>↓</div>
            <div style={{ background: '#fff', border: '1px solid #C8F4E5', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontFamily: D.mono, fontSize: 11, fontWeight: 600, letterSpacing: '1px', color: '#067F64', textTransform: 'uppercase', marginBottom: 8 }}>O TurisGuard diz</div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: '#16202F' }}>Como foi um imprevisto fora do controle do cliente, você <strong>não cobra a multa</strong> — mas pode descontar o que já pagou aos fornecedores e não consegue reaver.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHATSAPP ===== */}
      <section style={{ background: '#fff', borderTop: '1px solid #EEF1F5' }}>
        <div className="lp-2col-wa" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 56, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1px', color: '#067F64', background: '#EAFBF5', border: '1px solid #C8F4E5', borderRadius: 999, padding: '6px 13px', textTransform: 'uppercase' }}>Onde você já está</span>
            <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 36, lineHeight: 1.12, letterSpacing: '-1px', color: '#0B121C', margin: '18px 0 16px', textWrap: 'balance' } as React.CSSProperties}>Use o TurisGuard direto do WhatsApp.</h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.65, color: '#5A6B82', margin: '0 0 26px', maxWidth: 480 }}>Mande a dúvida por mensagem ou áudio, do jeito que você já fala com seus clientes — e receba a orientação fundamentada na hora, sem abrir o computador.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                <span key="1">Pergunte por <strong>texto ou áudio</strong>, a qualquer hora do dia.</span>,
                <span key="2">Receba a resposta com a <strong>base legal citada</strong>, na mesma conversa.</span>,
                <span key="3">Tudo sincroniza com o seu painel e o histórico de casos.</span>,
              ] as const).map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', background: '#EAFBF5', color: '#0E9E7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, color: '#16202F' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat mock */}
          <div style={{ position: 'relative', maxWidth: 344, margin: '0 auto', width: '100%' }}>
            <div style={{ position: 'absolute', top: -20, right: -10, bottom: -20, left: -10, background: 'radial-gradient(60% 50% at 50% 30%, rgba(14,158,122,.14), transparent 70%)', filter: 'blur(6px)' }} />
            <div style={{ position: 'relative', background: '#fff', border: '1px solid #E6EAF0', borderRadius: 28, boxShadow: '0 1px 2px rgba(11,18,28,.04),0 30px 60px -28px rgba(11,18,28,.32)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', background: '#0A4339' }}>
                <svg width="30" height="30" viewBox="0 0 96 96" aria-hidden="true">
                  <defs><clipPath id="cp-wa-mock"><path d="M16 15 L80 15 C84 15 86 18 86 22 L86 50 C86 72 70 86 48 92 C26 86 10 72 10 50 L10 22 C10 18 12 15 16 15 Z"/></clipPath></defs>
                  <g clipPath="url(#cp-wa-mock)"><rect width="96" height="96" fill="#fff"/></g>
                  <text x="48" y="52" textAnchor="middle" dominantBaseline="central" fontFamily="Sora,sans-serif" fontWeight="800" fontSize="33" letterSpacing="-1.5" fill="#0A4339">TG</text>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: D.display, fontWeight: 600, fontSize: 14, color: '#fff' }}>TurisGuard</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#93E8CD', marginTop: 1 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25BB92', display: 'inline-block' }} />
                    online agora
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5h14a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 3V6a1 1 0 011-1z" stroke="#93E8CD" strokeWidth="1.7" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ padding: '18px 14px', background: '#F4F8F6', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: '#CFF3E4', color: '#0B2620', borderRadius: '14px 14px 4px 14px', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.45 }}>Posso cobrar taxa de remarcação de um pacote já fechado?</div>
                <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#fff', border: '1px solid #E6EAF0', borderRadius: '14px 14px 14px 4px', padding: '11px 13px' }}>
                  <p style={{ margin: '0 0 9px', fontSize: 13.5, lineHeight: 1.5, color: '#344259' }}>Pode, desde que <strong>prevista em contrato</strong> e proporcional ao custo real da alteração. Não pode ser abusiva nem confiscar o valor pago.</p>
                  <span style={{ fontFamily: D.mono, fontSize: 11, color: '#16202F', background: '#F4F6F9', border: '1px solid #E6EAF0', borderRadius: 6, padding: '3px 7px' }}>CDC, art. 51</span>
                </div>
                <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: '#CFF3E4', color: '#0B2620', borderRadius: '14px 14px 4px 14px', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.45 }}>E se não teve contrato assinado?</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: '#fff', borderTop: '1px solid #EEF1F5' }}>
                <div style={{ flex: 1, background: '#F4F6F9', border: '1px solid #E6EAF0', borderRadius: 999, padding: '9px 15px', fontSize: 13, color: '#9FACC0' }}>Escreva ou grave um áudio…</div>
                <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: '#0E9E7A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ESCALADA ===== */}
      <section style={{ background: '#fff' }}>
        <div className="lp-section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px' }}>
          <div className="lp-escalation-inner" style={{ background: '#FFF1EF', border: '1px solid #FFC0B7', borderRadius: 24, padding: 56 }}>
            <div className="lp-escalation-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 48, alignItems: 'center' }}>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1px', color: '#AF2719', background: '#fff', border: '1px solid #FFC0B7', borderRadius: 999, padding: '6px 13px', textTransform: 'uppercase' }}>Atendimento humano</span>
                <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 34, lineHeight: 1.12, letterSpacing: '-.8px', color: '#0B121C', margin: '18px 0 14px', textWrap: 'balance' } as React.CSSProperties}>Quando a IA não basta, fale com um advogado de verdade.</h2>
                <p style={{ fontSize: 16, lineHeight: 1.65, color: '#76221B', margin: '0 0 26px', maxWidth: 460 }}>Casos complexos, valores altos ou disputas em andamento não são para tentar adivinhar. Escale o caso e receba respaldo profissional — com todo o histórico já organizado.</p>
                <a href="#precos" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, background: '#D33420', color: '#fff', borderRadius: 13, padding: '15px 24px', fontWeight: 600, fontSize: 15, textDecoration: 'none', boxShadow: '0 12px 26px -10px rgba(211,52,32,.55)' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 3 L20 6 V12 C20 17 16.5 19.8 12 21.5 C7.5 19.8 4 17 4 12 V6 Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
                    <circle cx="12" cy="10.5" r="2.2" fill="#fff"/>
                    <path d="M8.4 15.5 C8.8 13.6 10.2 12.8 12 12.8 C13.8 12.8 15.2 13.6 15.6 15.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  Conhecer a escalada
                </a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { emoji: '⏱', title: 'Resposta em até 2h úteis*', sub: 'Nos planos com escalada inclusa.' },
                  { emoji: '§', title: 'Advogados de turismo', sub: 'Especializados no setor, inscritos na OAB.' },
                  { emoji: '↪', title: 'Contexto já organizado', sub: 'O advogado recebe o caso com a base legal anexada.' },
                ].map(item => (
                  <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#fff', border: '1px solid #FFDFDA', borderRadius: 14, padding: '16px 18px' }}>
                    <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, background: '#FFF1EF', color: '#D33420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{item.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: '#16202F' }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: '#7A879B' }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#B07070' }}>* Prazo contado em dias úteis, dentro do horário comercial (seg–sex, 9h–18h).</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PREÇOS ===== */}
      <section id="precos" style={{ background: '#F7F9FB', borderTop: '1px solid #EEF1F5' }}>
        <div className="lp-section-pad" style={{ maxWidth: 1160, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 36px' }}>
            <div style={{ fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: '#4842D4', textTransform: 'uppercase', marginBottom: 14 }}>Preços</div>
            <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: '-1px', color: '#0B121C', margin: '0 0 10px', textWrap: 'balance' } as React.CSSProperties}>Planos para o tamanho da sua agência.</h2>
            <p style={{ fontSize: 16, color: '#5A6B82', margin: 0 }}>Comece grátis por 7 dias. Cancele quando quiser.</p>
          </div>

          {/* Billing toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #E6EAF0', borderRadius: 999, padding: 4, gap: 2 }}>
              <button onClick={() => setBilling('mensal')} style={{ border: 'none', cursor: 'pointer', fontFamily: D.body, fontWeight: 600, fontSize: 13.5, padding: '8px 18px', borderRadius: 999, background: billing === 'mensal' ? '#fff' : 'transparent', color: billing === 'mensal' ? '#16202F' : '#7A879B', transition: 'all .15s' }}>Mensal</button>
              <button onClick={() => setBilling('anual')} style={{ border: 'none', cursor: 'pointer', fontFamily: D.body, fontWeight: 600, fontSize: 13.5, padding: '8px 18px', borderRadius: 999, background: billing === 'anual' ? '#fff' : 'transparent', color: billing === 'anual' ? '#16202F' : '#7A879B', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'all .15s' }}>
                Anual
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#067F64', background: '#EAFBF5', borderRadius: 999, padding: '1px 7px' }}>−20%</span>
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="lp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
            {PLANS.map(plan => {
              const preco = billing === 'anual' ? plan.anual : plan.mensal
              const nota = billing === 'anual' ? 'cobrado anualmente · economize 20%' : 'no plano mensal'
              return (
                <div key={plan.id} style={{ background: '#fff', border: `1.5px solid ${plan.ativo ? '#5B57E8' : '#E6EAF0'}`, borderRadius: 20, padding: 30, position: 'relative', boxShadow: plan.ativo ? '0 1px 2px rgba(11,18,28,.04),0 24px 50px -26px rgba(91,87,232,.5)' : '0 1px 2px rgba(11,18,28,.04)', opacity: plan.ativo ? 1 : .6, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontFamily: D.mono, fontSize: 11, fontWeight: 600, letterSpacing: '.5px', color: plan.ativo ? '#fff' : '#9A530A', background: plan.ativo ? '#5B57E8' : '#FFF8EB', border: plan.ativo ? 'none' : '1px solid #FDD88A', borderRadius: 999, padding: '4px 13px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {plan.ativo ? 'Disponível agora' : 'Em breve'}
                  </span>
                  <h3 style={{ fontFamily: D.display, fontWeight: 700, fontSize: 20, color: '#0B121C', margin: '0 0 4px' }}>{plan.nome}</h3>
                  <p style={{ fontSize: 13.5, color: '#7A879B', margin: '0 0 20px', minHeight: 38 }}>{plan.tagline}</p>

                  {plan.ativo ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                        <span style={{ fontFamily: D.display, fontWeight: 800, fontSize: 40, letterSpacing: '-1.5px', color: '#0B121C' }}>R$ {preco}</span>
                        <span style={{ fontSize: 14, color: '#7A879B' }}>/mês</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: '#9FACC0', margin: '0 0 22px' }}>{nota}</p>
                      <Link
                        href="/cadastro"
                        style={{ display: 'block', textAlign: 'center', textDecoration: 'none', fontWeight: 600, fontSize: 14.5, padding: 12, borderRadius: 12, marginBottom: 24, background: '#5B57E8', color: '#fff' }}
                      >
                        Começar grátis
                      </Link>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {plan.features.map(feat => (
                          <div key={feat} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.45, color: '#344259' }}>
                            <span style={{ color: '#0E9E7A', fontWeight: 700, flexShrink: 0 }}>✓</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8, padding: '32px 0' }}>
                      <span style={{ fontFamily: D.display, fontWeight: 700, fontSize: 20, color: '#7A879B' }}>Em breve</span>
                      <p style={{ fontSize: 13.5, color: '#9FACC0', margin: 0, maxWidth: 200 }}>Valores e recursos serão divulgados em breve.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" style={{ background: '#fff' }}>
        <div className="lp-faq-pad" style={{ maxWidth: 760, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontFamily: D.mono, fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', color: '#4842D4', textTransform: 'uppercase', marginBottom: 14 }}>Dúvidas frequentes</div>
            <h2 className="lp-h2-sm" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 34, lineHeight: 1.1, letterSpacing: '-.8px', color: '#0B121C', margin: 0 }}>O que as agências mais perguntam.</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqData.map((item, i) => {
              const aberto = faqAberto === i
              return (
                <div key={i} style={{ border: '1px solid #E6EAF0', borderRadius: 14, overflow: 'hidden', background: aberto ? '#FBFBFE' : '#fff' }}>
                  <button onClick={() => toggleFaq(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 22px', fontFamily: D.body, fontWeight: 600, fontSize: 16, color: '#16202F' }}>
                    {item.q}
                    <span style={{ flexShrink: 0, fontSize: 20, color: '#5B57E8', transform: aberto ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .2s', display: 'inline-block' }}>+</span>
                  </button>
                  {aberto && (
                    <div style={{ padding: '0 22px 20px', fontSize: 14.5, lineHeight: 1.65, color: '#5A6B82' }}>{item.a}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{ background: '#0B121C', backgroundImage: 'radial-gradient(70% 90% at 80% 0%, rgba(91,87,232,.28), transparent 60%)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 96 96" aria-hidden="true" style={{ marginBottom: 22 }}>
            <path d="M16 15 L80 15 C84 15 86 18 86 22 L86 50 C86 72 70 86 48 92 C26 86 10 72 10 50 L10 22 C10 18 12 15 16 15 Z" fill="#FFFFFF"/>
            <text x="48" y="52" textAnchor="middle" dominantBaseline="central" fontFamily="Sora,sans-serif" fontWeight="800" fontSize="33" letterSpacing="-1.5" fill="#0B121C">TG</text>
          </svg>
          <h2 className="lp-h2" style={{ fontFamily: D.display, fontWeight: 700, fontSize: 42, lineHeight: 1.1, letterSpacing: '-1.2px', color: '#fff', margin: '0 0 16px', textWrap: 'balance' } as React.CSSProperties}>Decida com segurança, ainda hoje.</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: '#9FACC0', margin: '0 auto 32px', maxWidth: 520 }}>Comece grátis e tenha uma segunda opinião sempre que precisar — antes da primeira decisão.</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15.5, fontWeight: 600, color: '#fff', background: '#5B57E8', textDecoration: 'none', padding: '15px 28px', borderRadius: 13, boxShadow: '0 12px 30px -8px rgba(91,87,232,.7)' }}>
              Começar grátis <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
            </Link>
            <a href="#precos" style={{ display: 'inline-flex', alignItems: 'center', fontSize: 15.5, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)', textDecoration: 'none', padding: '14px 26px', borderRadius: 13 }}>Ver planos</a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: '#080D15', color: '#9FACC0' }}>
        <div className="lp-footer-inner" style={{ maxWidth: 1160, margin: '0 auto', padding: '54px 32px 40px' }}>
          <div className="lp-footer-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', marginBottom: 40 }}>
            <div style={{ maxWidth: 300 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <svg width="26" height="26" viewBox="0 0 96 96" aria-hidden="true">
                  <path d="M16 15 L80 15 C84 15 86 18 86 22 L86 50 C86 72 70 86 48 92 C26 86 10 72 10 50 L10 22 C10 18 12 15 16 15 Z" fill="#FFFFFF"/>
                  <text x="48" y="52" textAnchor="middle" dominantBaseline="central" fontFamily="Sora,sans-serif" fontWeight="800" fontSize="33" letterSpacing="-1.5" fill="#080D15">TG</text>
                </svg>
                <span style={{ fontFamily: D.display, fontWeight: 700, fontSize: 17, color: '#fff' }}>TurisGuard</span>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: '#6E7E98' }}>Orientação jurídica por IA para agências de turismo brasileiras, com escalada para advogado.</p>
            </div>
            <div className="lp-footer-links" style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: D.mono, fontSize: 11, letterSpacing: '1px', color: '#4A5A75', textTransform: 'uppercase', marginBottom: 14 }}>Produto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <a href="#como" style={{ color: '#9FACC0', textDecoration: 'none' }}>Como funciona</a>
                  <a href="#recursos" style={{ color: '#9FACC0', textDecoration: 'none' }}>Recursos</a>
                  <a href="#precos" style={{ color: '#9FACC0', textDecoration: 'none' }}>Preços</a>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: D.mono, fontSize: 11, letterSpacing: '1px', color: '#4A5A75', textTransform: 'uppercase', marginBottom: 14 }}>Empresa</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <a href="#" style={{ color: '#9FACC0', textDecoration: 'none' }}>Sobre</a>
                  <a href="#" style={{ color: '#9FACC0', textDecoration: 'none' }}>Contato</a>
                  <a href="#faq" style={{ color: '#9FACC0', textDecoration: 'none' }}>Dúvidas</a>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: D.mono, fontSize: 11, letterSpacing: '1px', color: '#4A5A75', textTransform: 'uppercase', marginBottom: 14 }}>Legal</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
                  <a href="#" style={{ color: '#9FACC0', textDecoration: 'none' }}>Termos</a>
                  <a href="#" style={{ color: '#9FACC0', textDecoration: 'none' }}>Privacidade</a>
                </div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #16202F', paddingTop: 22, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, color: '#4A5A75', maxWidth: 640 }}>As orientações geradas por IA são informativas e não constituem parecer jurídico (Provimento OAB). Para decisões com risco relevante, escale para atendimento humano.</p>
            <span style={{ fontFamily: D.mono, fontSize: 12, color: '#4A5A75' }}>© 2026 TurisGuard</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
