import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function Home() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="hero-heading">
      <h1 id="hero-heading">{t('hero.heading')}</h1>
      <p>{t('hero.sub')}</p>
      <div className="cta">
        <Link to="/login"><button>{t('hero.cta')}</button></Link>
      </div>
    </section>
  )
}
