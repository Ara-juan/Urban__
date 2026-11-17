import './FooterLegal.css';

export default function FooterLegal() {
  const abrirSeccionLegal = (seccion) => {
    window.dispatchEvent(new CustomEvent('abrir-centro-legal', { detail: seccion }));
  };

  return (
    <footer className="footer-legal" role="contentinfo">
      <div className="footer-legal-contenedor">
        <div className="footer-legal-marca">
          <strong>AMERICANOSHH • URBAN CLOTHES</strong>
          <p>
            Catálogo oficial de moda urbana • Impresión bajo demanda • Precios en COP • Pedidos vía WhatsApp (+57 312 436 3561) • Colombia
          </p>
        </div>

        <nav className="footer-legal-enlaces" aria-label="enlaces legales y protección al consumidor">
          <button
            type="button"
            className="footer-legal-btn"
            onClick={() => abrirSeccionLegal('privacidad')}
          >
            Tratamiento de Datos (Ley 1581 / Dec. 1377)
          </button>
          <span className="separador-footer">•</span>
          <button
            type="button"
            className="footer-legal-btn"
            onClick={() => abrirSeccionLegal('terminos')}
          >
            Términos, Garantías y Retracto (Ley 1480)
          </button>
          <span className="separador-footer">•</span>
          <button
            type="button"
            className="footer-legal-btn"
            onClick={() => abrirSeccionLegal('propiedad')}
          >
            Propiedad Intelectual y Uso (Ley 23 / 527)
          </button>
          <span className="separador-footer">•</span>
          <a
            href="https://wa.me/573124363561?text=Hola%2C%20deseo%20radicar%20una%20PQR%20(Ley%201480%20de%202011)%20sobre%20Americanoshh."
            target="_blank"
            rel="noopener noreferrer"
            className="footer-legal-link"
          >
            Canal PQR (Art. 58, Ley 1480)
          </a>
          <span className="separador-footer">•</span>
          <a
            href="https://www.sic.gov.co"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-legal-link"
          >
            Superintendencia de Industria y Comercio (SIC)
          </a>
        </nav>

        <p className="footer-legal-copy">
          © {new Date().getFullYear()} Americanoshh. Todos los derechos reservados (Decisión Andina 351 de 1993 y Ley 23 de 1982). Prohibida la reproducción total o parcial de este catálogo.
        </p>
      </div>
    </footer>
  );
}