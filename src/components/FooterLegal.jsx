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
            Catálogo oficial de moda urbana • Impresión bajo demanda • Precios en COP • Pedidos vía WhatsApp (+57 312 436 3561)
          </p>
        </div>

        <nav className="footer-legal-enlaces" aria-label="enlaces legales y protección al consumidor">
          <button
            type="button"
            className="footer-legal-btn"
            onClick={() => abrirSeccionLegal('privacidad')}
          >
            Política de Tratamiento de Datos
          </button>
          <span className="separador-footer">•</span>
          <button
            type="button"
            className="footer-legal-btn"
            onClick={() => abrirSeccionLegal('terminos')}
          >
            Términos, Producción y Garantías
          </button>
          <span className="separador-footer">•</span>
          <a
            href="https://wa.me/573124363561?text=Hola%2C%20tengo%20una%20consulta%20o%20PQR%20sobre%20Americanoshh."
            target="_blank"
            rel="noopener noreferrer"
            className="footer-legal-link"
          >
            Canal PQR / Contacto
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
          © {new Date().getFullYear()} Americanoshh. Todos los derechos reservados. Prohibida la reproducción total o parcial de este catálogo.
        </p>
      </div>
    </footer>
  );
}