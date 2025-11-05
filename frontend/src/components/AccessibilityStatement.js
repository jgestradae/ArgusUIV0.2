import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Info, Mail } from 'lucide-react';

const AccessibilityStatement = () => {
  const { t } = useTranslation();

  return (
    <main id="main-content" className="accessibility-statement" role="main">
      <div className="max-w-4xl mx-auto p-8">
        <header>
          <h1 className="text-3xl font-bold text-white mb-4">
            Declaración de Accesibilidad / Accessibility Statement
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            {t('app.name')} - {t('app.version')}
          </p>
        </header>

        <section className="glass-card p-6 mb-6" aria-labelledby="commitment">
          <h2 id="commitment" className="text-2xl font-semibold text-white mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-green-400" aria-hidden="true" />
            Compromiso de Accesibilidad / Accessibility Commitment
          </h2>
          <div className="space-y-4 text-slate-300">
            <p>
              <strong className="text-white">Español:</strong> La Agencia Nacional de Infraestructura (ANE) 
              se compromete a garantizar que ArgusUI sea accesible para todas las personas, incluidas aquellas 
              con discapacidades. Nos esforzamos por cumplir con los estándares de accesibilidad establecidos 
              en la NTC 5854, las Pautas de Accesibilidad para el Contenido Web (WCAG) 2.1 nivel AA, y el 
              Manual de Gobierno en Línea (GEL) de Colombia.
            </p>
            <p>
              <strong className="text-white">English:</strong> The National Infrastructure Agency (ANE) is 
              committed to ensuring that ArgusUI is accessible to all people, including those with disabilities. 
              We strive to comply with accessibility standards established in NTC 5854, Web Content Accessibility 
              Guidelines (WCAG) 2.1 Level AA, and Colombia's Government Online Manual (GEL).
            </p>
          </div>
        </section>

        <section className="glass-card p-6 mb-6" aria-labelledby="standards">
          <h2 id="standards" className="text-2xl font-semibold text-white mb-4">
            Estándares de Cumplimiento / Compliance Standards
          </h2>
          <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-white">NTC 5854:</strong> Accesibilidad a páginas web (Colombian Standard)</li>
            <li><strong className="text-white">WCAG 2.1 Level AA:</strong> Web Content Accessibility Guidelines</li>
            <li><strong className="text-white">G.SIS.04:</strong> Guía de Usabilidad del Gobierno Colombiano</li>
            <li><strong className="text-white">GEL v4/v5:</strong> Manual de Gobierno en Línea</li>
          </ul>
        </section>

        <section className="glass-card p-6 mb-6" aria-labelledby="features">
          <h2 id="features" className="text-2xl font-semibold text-white mb-4">
            Características de Accesibilidad / Accessibility Features
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-300">Navegación / Navigation</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                <li>Navegación completa por teclado / Full keyboard navigation</li>
                <li>Saltar al contenido principal / Skip to main content</li>
                <li>Orden lógico de tabulación / Logical tab order</li>
                <li>Atajos de teclado / Keyboard shortcuts</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-300">Visual</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                <li>Modo de alto contraste / High contrast mode</li>
                <li>Contraste mínimo 4.5:1 / Minimum contrast 4.5:1</li>
                <li>Tamaños de fuente legibles / Readable font sizes</li>
                <li>Diseño responsivo / Responsive design</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-300">Lectores de Pantalla / Screen Readers</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                <li>Etiquetas ARIA / ARIA labels</li>
                <li>Textos alternativos / Alternative texts</li>
                <li>Estructura semántica / Semantic structure</li>
                <li>Regiones ARIA live / ARIA live regions</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-300">Usabilidad / Usability</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
                <li>Mensajes claros de error / Clear error messages</li>
                <li>Ayuda contextual / Contextual help</li>
                <li>Retroalimentación visible / Visible feedback</li>
                <li>Soporte multiidioma / Multilingual support</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="glass-card p-6 mb-6" aria-labelledby="technologies">
          <h2 id="technologies" className="text-2xl font-semibold text-white mb-4">
            Tecnologías Utilizadas / Technologies Used
          </h2>
          <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li>HTML5 semántico / Semantic HTML5</li>
            <li>ARIA (Accessible Rich Internet Applications)</li>
            <li>React con soporte de accesibilidad / React with accessibility support</li>
            <li>react-aria para componentes accesibles / react-aria for accessible components</li>
            <li>Tailwind CSS con contraste verificado / Tailwind CSS with verified contrast</li>
          </ul>
        </section>

        <section className="glass-card p-6 mb-6" aria-labelledby="testing">
          <h2 id="testing" className="text-2xl font-semibold text-white mb-4">
            Pruebas de Accesibilidad / Accessibility Testing
          </h2>
          <div className="space-y-4 text-slate-300">
            <p>Esta aplicación ha sido probada con:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong className="text-white">Herramientas automatizadas / Automated tools:</strong>
                <ul className="list-circle list-inside ml-6 mt-1 space-y-1">
                  <li>axe-core accessibility audits</li>
                  <li>eslint-plugin-jsx-a11y</li>
                  <li>WAVE Web Accessibility Evaluation Tool</li>
                </ul>
              </li>
              <li><strong className="text-white">Lectores de pantalla / Screen readers:</strong>
                <ul className="list-circle list-inside ml-6 mt-1 space-y-1">
                  <li>NVDA (NonVisual Desktop Access)</li>
                  <li>JAWS (Job Access With Speech)</li>
                  <li>VoiceOver (macOS/iOS)</li>
                </ul>
              </li>
              <li><strong className="text-white">Navegadores / Browsers:</strong> Chrome, Firefox, Safari, Edge</li>
            </ul>
          </div>
        </section>

        <section className="glass-card p-6 mb-6" aria-labelledby="limitations">
          <h2 id="limitations" className="text-2xl font-semibold text-white mb-4">
            <Info className="w-6 h-6 inline mr-2 text-blue-400" aria-hidden="true" />
            Limitaciones Conocidas / Known Limitations
          </h2>
          <div className="space-y-3 text-slate-300">
            <p>
              Trabajamos continuamente para mejorar la accesibilidad. Algunas limitaciones conocidas incluyen:
              / We continuously work to improve accessibility. Some known limitations include:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Visualizaciones de gráficos complejos 3D pueden tener accesibilidad limitada / 
                  Complex 3D graph visualizations may have limited accessibility</li>
              <li>Mapas de geolocalización requieren mejoras adicionales / 
                  Geolocation maps require additional improvements</li>
              <li>Algunas funciones avanzadas están siendo optimizadas / 
                  Some advanced features are being optimized</li>
            </ul>
          </div>
        </section>

        <section className="glass-card p-6 mb-6" aria-labelledby="feedback">
          <h2 id="feedback" className="text-2xl font-semibold text-white mb-4">
            <Mail className="w-6 h-6 inline mr-2 text-green-400" aria-hidden="true" />
            Retroalimentación / Feedback
          </h2>
          <div className="space-y-4 text-slate-300">
            <p>
              <strong className="text-white">Español:</strong> Si encuentra algún problema de accesibilidad 
              o tiene sugerencias para mejorar, por favor contáctenos:
            </p>
            <p>
              <strong className="text-white">English:</strong> If you encounter any accessibility issues 
              or have suggestions for improvement, please contact us:
            </p>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-blue-500/30 mt-4">
              <p className="text-white font-semibold mb-2">Contacto / Contact:</p>
              <p>Email: <a href="mailto:accesibilidad@ane.gov.co" className="text-blue-400 hover:text-blue-300">
                accesibilidad@ane.gov.co
              </a></p>
              <p className="mt-2 text-sm">
                Responderemos dentro de 5 días hábiles / We will respond within 5 business days
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center text-sm text-slate-400 mt-8 pt-6 border-t border-slate-700">
          <p>Última actualización / Last updated: {new Date().toLocaleDateString('es-CO')}</p>
          <p className="mt-2">{t('app.footer.organization')} © 2025</p>
        </footer>
      </div>

      <style jsx>{`
        .accessibility-statement {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding-top: 4rem;
        }

        .glass-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 0.75rem;
        }

        /* High Contrast Mode */
        :global(.high-contrast) .accessibility-statement {
          background: #000;
        }

        :global(.high-contrast) .glass-card {
          background: #000;
          border: 3px solid #fff;
        }

        :global(.high-contrast) h1,
        :global(.high-contrast) h2,
        :global(.high-contrast) h3,
        :global(.high-contrast) strong {
          color: #ffff00 !important;
        }

        :global(.high-contrast) p,
        :global(.high-contrast) li {
          color: #fff !important;
        }

        :global(.high-contrast) a {
          color: #00ffff !important;
          text-decoration: underline;
        }
      `}</style>
    </main>
  );
};

export default AccessibilityStatement;
