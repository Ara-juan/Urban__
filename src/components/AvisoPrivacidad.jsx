import { useState, useEffect } from 'react';
import './AvisoPrivacidad.css';

const CLAVE_STORAGE = 'americanoshh_privacidad_aceptada';

export default function AvisoPrivacidad() {
  const [mostrarBanner, setMostrarBanner] = useState(() => {
    return localStorage.getItem(CLAVE_STORAGE) !== 'true';
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pestañaLegal, setPestañaLegal] = useState('privacidad');

  // permite abrir el centro legal en la pestaña deseada desde cualquier componente
  useEffect(() => {
    const abrirCentroLegal = (e) => {
      const seccion = e?.detail === 'terminos' ? 'terminos' : 'privacidad';
      setPestañaLegal(seccion);
      setModalAbierto(true);
    };

    const abrirPoliticaCompat = () => {
      setPestañaLegal('privacidad');
      setModalAbierto(true);
    };

    window.addEventListener('abrir-centro-legal', abrirCentroLegal);
    window.addEventListener('abrir-politica-privacidad', abrirPoliticaCompat);

    return () => {
      window.removeEventListener('abrir-centro-legal', abrirCentroLegal);
      window.removeEventListener('abrir-politica-privacidad', abrirPoliticaCompat);
    };
  }, []);

  // permite cerrar el modal completo con la tecla Escape
  useEffect(() => {
    if (!modalAbierto) return;
    const manejarTecla = (e) => {
      if (e.key === 'Escape') setModalAbierto(false);
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [modalAbierto]);

  const aceptarPolitica = () => {
    localStorage.setItem(CLAVE_STORAGE, 'true');
    setMostrarBanner(false);
    setModalAbierto(false);
    window.dispatchEvent(new Event('privacidad-aceptada'));
  };

  return (
    <>
      {/* anuncio inferior al ingresar al sitio */}
      {mostrarBanner && !modalAbierto && (
        <aside
          className="aviso-privacidad-banner"
          role="region"
          aria-label="aviso legal y tratamiento de datos"
        >
          <div className="aviso-privacidad-contenido">
            <div className="aviso-privacidad-texto">
              <strong>Aviso Legal y Tratamiento de Datos — Americanoshh</strong>
              <p>
                Al navegar en nuestro catálogo o registrarte, recolectamos datos básicos de sesión y, en caso de crear cuenta, tu{' '}
                <span>nombre, correo electrónico, contraseña cifrada y datos opcionales de contacto (teléfono y dirección)</span>{' '}
                bajo la Ley 1581 de 2012 y el Estatuto del Consumidor (Ley 1480 de 2011).{' '}
                <button
                  type="button"
                  className="btn-ver-politica"
                  onClick={() => {
                    setPestañaLegal('privacidad');
                    setModalAbierto(true);
                  }}
                >
                  Política de Datos
                </button>
                {' • '}
                <button
                  type="button"
                  className="btn-ver-politica"
                  onClick={() => {
                    setPestañaLegal('terminos');
                    setModalAbierto(true);
                  }}
                >
                  Términos y Garantías
                </button>
              </p>
            </div>

            <div className="aviso-privacidad-acciones">
              <button
                type="button"
                className="btn-aceptar-privacidad"
                onClick={aceptarPolitica}
              >
                Aceptar y continuar
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* modal con el centro legal completo */}
      {modalAbierto && (
        <div
          className="modal-privacidad-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-centro-legal"
          onClick={(e) => e.target === e.currentTarget && setModalAbierto(false)}
        >
          <div className="modal-privacidad-caja">
            <button
              type="button"
              className="cerrar-modal-privacidad"
              aria-label="cerrar ventana legal"
              onClick={() => setModalAbierto(false)}
            >
              &times;
            </button>

            <h2 id="titulo-centro-legal">Información Legal — Americanoshh</h2>
            <p className="subtitulo-legal">
              Urban Clothes • Normativa aplicable en la República de Colombia
            </p>

            {/* pestañas para alternar entre Habeas Data y Estatuto del Consumidor */}
            <div className="legal-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={pestañaLegal === 'privacidad'}
                className={`legal-tab ${pestañaLegal === 'privacidad' ? 'activa' : ''}`}
                onClick={() => setPestañaLegal('privacidad')}
              >
                1. Privacidad y Datos (Ley 1581)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pestañaLegal === 'terminos'}
                className={`legal-tab ${pestañaLegal === 'terminos' ? 'activa' : ''}`}
                onClick={() => setPestañaLegal('terminos')}
              >
                2. Términos, Garantías y Retracto (Ley 1480)
              </button>
            </div>

            {pestañaLegal === 'privacidad' ? (
              <div className="modal-privacidad-cuerpo">
                <h3>1. Datos personales que recolectamos</h3>
                <ul>
                  <li>
                    <strong>Navegación general:</strong> Almacenamiento local técnico (<code>localStorage</code>) para mantener tu sesión activa y recordar tu aceptación de este aviso. No usamos cookies publicitarias de terceros.
                  </li>
                  <li>
                    <strong>Registro de usuario (obligatorios):</strong> Nombre completo, correo electrónico y contraseña (almacenada exclusivamente mediante cifrado hash seguro; nunca en texto plano).
                  </li>
                  <li>
                    <strong>Perfil y contacto (opcionales):</strong> Número de teléfono y dirección de entrega, suministrados voluntariamente por el usuario.
                  </li>
                </ul>

                <h3>2. Finalidad del tratamiento</h3>
                <ul>
                  <li>Gestionar el acceso, autenticación y administración de tu cuenta en la plataforma.</li>
                  <li>Enviar enlaces temporales de restablecimiento de contraseña a tu correo electrónico cuando lo solicites.</li>
                  <li>Facilitar la atención personalizada y coordinación de pedidos cuando decides contactarnos vía WhatsApp (+57 312 436 3561).</li>
                </ul>

                <h3>3. Menores de edad</h3>
                <p>
                  El registro de cuentas en la plataforma está dirigido a personas mayores de 18 años. En caso de menores de edad, el suministro de datos deberá contar con autorización previa de sus padres o representantes legales (Art. 7, Ley 1581 de 2012).
                </p>

                <h3>4. Almacenamiento, seguridad y derechos (Habeas Data)</h3>
                <p>
                  Tus datos se alojan en bases de datos en la nube bajo conexiones cifradas (HTTPS/TLS). Americanoshh no vende ni cede tus datos a terceros. Puedes <strong>conocer, actualizar, rectificar o eliminar</strong> tu cuenta en cualquier momento desde la sección <em>Perfil</em> o escribiendo a nuestro canal oficial de WhatsApp.
                </p>
              </div>
            ) : (
              <div className="modal-privacidad-cuerpo">
                <h3>1. Naturaleza del catálogo y precios</h3>
                <ul>
                  <li>
                    Este sitio web funciona como <strong>catálogo virtual oficial de Americanoshh</strong>. La selección de una prenda redirige a nuestro canal oficial de atención en WhatsApp (<code>+57 312 436 3561</code>) para confirmar disponibilidad en tiempo real, método de pago y costo de envío.
                  </li>
                  <li>
                    Todos los precios publicados están expresados en <strong>pesos colombianos (COP)</strong>. El valor del domicilio o envío nacional se informa antes de confirmar la compra.
                  </li>
                </ul>

                <h3>2. Derecho de Retracto (Art. 47, Ley 1480 de 2011)</h3>
                <p>
                  Al tratarse de ventas a distancia, el comprador podrá ejercer el derecho de retracto dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la entrega de la prenda. El producto debe devolverse en las mismas condiciones en que fue recibido (sin uso, sin lavar, sin olores y con sus etiquetas originales intactas). Los costos de transporte de la devolución corren por cuenta del consumidor, y el reembolso se realizará en un plazo máximo de 30 días calendario.
                </p>

                <h3>3. Cambios por talla y Garantía Legal (Art. 7, Ley 1480 de 2011)</h3>
                <ul>
                  <li>
                    <strong>Cambios por talla:</strong> Pueden solicitarse dentro de los 5 días hábiles posteriores a la entrega, sujetos a disponibilidad de inventario y siempre que la prenda conserve sus etiquetas y estado original.
                  </li>
                  <li>
                    <strong>Garantía por defectos de calidad:</strong> Todas nuestras prendas cuentan con garantía legal de <strong>30 días calendario</strong> por defectos de fabricación (costuras, cremalleras o estampados). No cubre daños ocasionados por lavado inadecuado, uso indebido o desgaste normal.
                  </li>
                </ul>

                <h3>4. Propiedad Intelectual y Protección al Consumidor</h3>
                <p>
                  Las fotografías, logotipos, diseños gráficos y la marca <strong>Americanoshh</strong> están protegidos por las normas de propiedad intelectual vigentes en Colombia; queda prohibida su reproducción comercial sin autorización. Para peticiones, quejas o reclamos (PQR) contáctanos en nuestro WhatsApp oficial, o consulta tus derechos ante la{' '}
                  <a
                    href="https://www.sic.gov.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="enlace-sic-modal"
                  >
                    Superintendencia de Industria y Comercio (SIC)
                  </a>
                  .
                </p>
              </div>
            )}

            <div className="modal-privacidad-footer">
              <button
                type="button"
                className="btn-secundario-privacidad"
                onClick={() => setModalAbierto(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-aceptar-privacidad"
                onClick={aceptarPolitica}
              >
                Aceptar políticas y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}