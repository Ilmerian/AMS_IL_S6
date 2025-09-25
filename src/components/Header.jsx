import { useTranslation } from 'react-i18next'
import { useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { AuthService } from '../services/AuthService'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const current = i18n.language?.slice(0,2) || 'en'

  const switchLang = useCallback((lng) => {
    if (lng && lng !== current) i18n.changeLanguage(lng)
  }, [i18n, current])

  const langs = useMemo(() => ([
    { code: 'en', label: t('lang.en') || 'EN' },
    { code: 'fr', label: t('lang.fr') || 'FR' },
    { code: 'ru', label: t('lang.ru') || 'RU' }
  ]), [t])

  const onLangKeyDown = (e) => {
    const idx = langs.findIndex(l => l.code === current)
    if (idx === -1) return
    if (e.key === 'ArrowRight') { e.preventDefault(); switchLang(langs[(idx + 1) % langs.length].code) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); switchLang(langs[(idx - 1 + langs.length) % langs.length].code) }
  }

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <span style={styles.logo} aria-hidden>🎬</span>
        <span style={styles.title}>{t('app.title')}</span>
      </div>

      <nav style={styles.nav} aria-label="Primary">
        <Link to="/" style={styles.link}>{t('nav.home')}</Link>
        <Link to="/pitches" style={styles.link}>Pitches</Link>
        {user ? (
          <>
            <Link to="/pitches/new" style={styles.link}>New</Link>
            <button style={styles.link} onClick={() => AuthService.signOut()}>{t('nav.logout')}</button>
          </>
        ) : (
          <Link to="/login" style={styles.link}>{t('nav.login')}</Link>
        )}
      </nav>

      {/* Segmented language switcher */}
      <div role="group" aria-label="Language" style={styles.langGroup} onKeyDown={onLangKeyDown} tabIndex={0}>
        <div style={styles.segment}>
          {langs.map(({ code, label }) => {
            const active = code === current
            return (
              <button
                key={code}
                type="button"
                onClick={() => switchLang(code)}
                aria-pressed={active}
                style={{ ...styles.langBtn, ...(active ? styles.langBtnActive : null) }}
                title={label}
              >
                {label}
              </button>
            )
          })}
          <span aria-hidden style={{ ...styles.segmentIndicator, transform: `translateX(${langs.findIndex(l => l.code === current) * 100}%)` }} />
        </div>
      </div>
    </header>
  )
}
const styles = {
  header:{position:'sticky',top:0,display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:12,padding:'12px clamp(12px, 2vw, 24px)',borderBottom:'1px solid rgba(100,108,255,0.18)',background:'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.06))',backdropFilter:'blur(8px)',zIndex:10},
  brand:{display:'inline-flex',alignItems:'center',gap:10,minWidth:0},
  logo:{fontSize:20},
  title:{fontWeight:800,letterSpacing:'0.2px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  nav:{justifySelf:'center',display:'inline-flex',gap:14},
  link:{textDecoration:'none',fontWeight:600,padding:'8px 10px',borderRadius:10,border:'1px solid transparent',transition:'transform .06s ease, border-color .2s',background:'transparent',color:'inherit',cursor:'pointer'},
  langGroup:{justifySelf:'end',outline:'none'},
  segment:{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',alignItems:'center',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:999,padding:4,gap:4,minWidth:156},
  segmentIndicator:{position:'absolute',top:4,left:4,width:'calc((100% - 8px) / 3)',height:'calc(100% - 8px)',background:'rgba(100,108,255,0.2)',border:'1px solid rgba(100,108,255,0.35)',borderRadius:999,transition:'transform .18s ease'},
  langBtn:{position:'relative',zIndex:1,appearance:'none',background:'transparent',border:'none',padding:'8px 0',borderRadius:999,fontWeight:700,cursor:'pointer',color:'inherit',transition:'opacity .15s ease',opacity:.85},
  langBtnActive:{opacity:1}
}
