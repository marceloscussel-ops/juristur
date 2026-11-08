/**
 * Tema claro/escuro.
 *
 * A preferência tem três estados: 'system' (padrão — segue o browser ou o
 * celular), 'light' e 'dark'. Ela fica no localStorage; quem pinta é o
 * atributo data-theme no <html>, que o THEME_INIT_SCRIPT escreve antes da
 * primeira pintura — é isso que evita o flash branco ao abrir a página.
 *
 * As cores em si estão em src/styles/juristur.css.
 */

export type ThemePref     = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'tg-theme'

/** Cor da barra do navegador/sistema em cada tema (meta theme-color). */
export const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#F7F9FB',
  dark:  '#0D131C',
}

export const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isThemePref(value: unknown): value is ThemePref {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function prefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(DARK_QUERY).matches
}

export function readThemePref(): ThemePref {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    return isThemePref(stored) ? stored : 'system'
  } catch {
    // localStorage bloqueado (navegação privada, cookies desligados):
    // segue o sistema, sem persistir.
    return 'system'
  }
}

export function resolveTheme(pref: ThemePref, systemDark = prefersDark()): ResolvedTheme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

/** Aplica a preferência no documento e devolve o tema que ficou valendo. */
export function applyTheme(pref: ThemePref): ResolvedTheme {
  const resolved = resolveTheme(pref)
  const root = document.documentElement

  root.dataset.theme     = resolved
  root.dataset.themePref = pref

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])

  return resolved
}

export function storeThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') window.localStorage.removeItem(THEME_KEY)
    else window.localStorage.setItem(THEME_KEY, pref)
  } catch {
    // sem persistência; a escolha vale só nesta aba
  }
}

/**
 * Roda no <head>, antes de qualquer pintura. Precisa ser pequeno, sem
 * dependências e à prova de localStorage bloqueado. Mantém a mesma lógica
 * de applyTheme() — se mudar uma, mude a outra.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var p=localStorage.getItem('${THEME_KEY}');
if(p!=='light'&&p!=='dark')p='system';
var d=p==='dark'||(p==='system'&&window.matchMedia('${DARK_QUERY}').matches);
var r=document.documentElement;
r.dataset.theme=d?'dark':'light';
r.dataset.themePref=p;
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute('content',d?'${THEME_COLOR.dark}':'${THEME_COLOR.light}');
}catch(e){document.documentElement.dataset.theme='light';}})()`
