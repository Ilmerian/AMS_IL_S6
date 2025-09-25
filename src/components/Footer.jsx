import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer style={styles.footer}>
      <div style={styles.line} />
      <div style={styles.row}>
        <span>{t('footer.tagline')}</span>
        <span>© {year} • {t('footer.rights')}</span>
      </div>
    </footer>
  )
}

const styles = {
  footer: { marginTop: 24, padding: '16px 0' },
  line: { borderTop: '1px solid #e2e2e2', marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', opacity: .85 }
}
