import { useState, useEffect } from 'react';
import './AvisoPrivacidad.css';

const CLAVE_STORAGE = 'americanoshh_privacidad_aceptada';

export default function AvisoPrivacidad() {
  const [mostrarBanner, setMostrarBanner] = useState(() => {
    return localStorage.getItem(CLAVE_STORAGE) !== 'true';
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  // pestañas disponibles: 'privacidad' | 'terminos' | 'propiedad'
  const [pestañaLegal, setPestañaLegal] = useState('privacidad');

  // permite abrir el centro legal en la pestaña deseada desde cualquier componente
  useEffect(() => {
    const abrirCentroLegal = (e) => {
      const destino = e?.detail;
      if (destino === 'terminos' || destino === 'propiedad' || destino === 'privacidad') {
        setPestañaLegal(destino);
      } else {
        setPestañaLegal('privacidad');
      }
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
              <strong>Aviso Legal, Consumo y Protección de Datos — Americanoshh (Colombia)</strong>
              <p>
                Al navegar o registrarte, tratamos tus datos técnicos de sesión (<code>localStorage</code>) y los datos suministrados en tu cuenta conforme a la{' '}
                <span>Ley 1581 de 2012 y el Decreto 1377 de 2013 (Habeas Data)</span>. Nuestras ventas bajo demanda, garantías y retracto se rigen por la{' '}
                <span>Ley 1480 de 2011 (Estatuto del Consumidor)</span> y la <span>Ley 527 de 1999</span>.{' '}
                <button
                  type="button"
                  className="btn-ver-politica"
                  onClick={() => {
                    setPestañaLegal('privacidad');
                    setModalAbierto(true);
                  }}
                >
                  Datos (Ley 1581)
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
                  Términos y Garantías (Ley 1480)
                </button>
                {' • '}
                <button
                  type="button"
                  className="btn-ver-politica"
                  onClick={() => {
                    setPestañaLegal('propiedad');
                    setModalAbierto(true);
                  }}
                >
                  Propiedad y Uso (Ley 23 / 527)
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

            <h2 id="titulo-centro-legal">Marco Legal y Condiciones — Americanoshh</h2>
            <p className="subtitulo-legal">
              Urban Clothes • Legislación vigente de la República de Colombia
            </p>

            {/* pestañas para alternar entre los 3 cuerpos normativos */}
            <div className="legal-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={pestañaLegal === 'privacidad'}
                className={`legal-tab ${pestañaLegal === 'privacidad' ? 'activa' : ''}`}
                onClick={() => setPestañaLegal('privacidad')}
              >
                1. Datos (Ley 1581)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pestañaLegal === 'terminos'}
                className={`legal-tab ${pestañaLegal === 'terminos' ? 'activa' : ''}`}
                onClick={() => setPestañaLegal('terminos')}
              >
                2. Consumo y Garantías (Ley 1480)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pestañaLegal === 'propiedad'}
                className={`legal-tab ${pestañaLegal === 'propiedad' ? 'activa' : ''}`}
                onClick={() => setPestañaLegal('propiedad')}
              >
                3. Propiedad y Uso (Ley 23 / 527)
              </button>
            </div>

            {pestañaLegal === 'privacidad' && (
              <div className="modal-privacidad-cuerpo">
                <h3>1. Marco Constitucional y Legal Aplicable</h3>
                <p>
                  La presente Política de Tratamiento de Datos Personales de <strong>Americanoshh (Urban Clothes)</strong> se expide en cumplimiento del <strong>Artículo 15 de la Constitución Política de Colombia</strong> (derecho fundamental al Habeas Data y a la intimidad), la <strong>Ley Estatutaria 1581 de 2012</strong> (Arts. 4, 8, 9 y 17), el <strong>Decreto Reglamentario 1377 de 2013</strong> (compilado en el <strong>Decreto Único Reglamentario 1074 de 2015, Capítulo 25</strong>) y las disposiciones sobre seguridad informática de la <strong>Ley 1273 de 2009</strong>.
                </p>

                <h3>2. Responsable del Tratamiento y Prueba de Autorización (Art. 9, Ley 1581 de 2012 y Art. 7, Decreto 1377 de 2013)</h3>
                <ul>
                  <li>
                    <strong>Responsable:</strong> Americanoshh — Urban Clothes, con domicilio operativo en Villavicencio, Meta, Colombia, y canal oficial de atención en WhatsApp <code>+57 312 436 3561</code>.
                  </li>
                  <li>
                    <strong>Prueba de autorización:</strong> Al marcar la casilla obligatoria de aceptación durante el registro, nuestro sistema almacena una constancia booleana verificable junto con la fecha y hora exacta (<em>timestamp</em>) de tu consentimiento previo, expreso e informado.
                  </li>
                </ul>

                <h3>3. Datos Recolectados y Uso de Almacenamiento Local (Principio de Finalidad — Art. 4, Ley 1581 de 2012)</h3>
                <ul>
                  <li>
                    <strong>Almacenamiento técnico (<code>localStorage</code>):</strong> Conforme a las guías de la Superintendencia de Industria y Comercio (SIC), utilizamos almacenamiento local estrictamente necesario para conservar tu token de sesión y recordar la aceptación de este aviso legal. No empleamos cookies de rastreo publicitario de terceros.
                  </li>
                  <li>
                    <strong>Datos obligatorios de cuenta:</strong> Nombre, correo electrónico y contraseña (protegida mediante algoritmo de cifrado hash irreversible <code>bcrypt</code>, conforme al principio de seguridad del Art. 4 lit. g de la Ley 1581 de 2012).
                  </li>
                  <li>
                    <strong>Datos facultativos de contacto:</strong> Número de teléfono y dirección física de entrega, suministrados voluntariamente para coordinar despachos.
                  </li>
                </ul>

                <h3>4. Finalidades del Tratamiento</h3>
                <ul>
                  <li>Gestionar el registro, autenticación, control de acceso y seguridad de tu cuenta en la plataforma.</li>
                  <li>Enviar correos transaccionales de recuperación de contraseña mediante enlaces temporales cifrados cuando lo solicites.</li>
                  <li>Coordinar la producción bajo demanda, cotización de envíos y entrega de pedidos iniciados por el usuario a través de WhatsApp.</li>
                  <li>Prevenir fraudes, suplantación de identidad, spam o accesos automatizados maliciosos (Ley 1273 de 2009).</li>
                </ul>

                <h3>5. Derechos de los Menores de Edad (Art. 7, Ley 1581 de 2012 y Art. 12, Decreto 1377 de 2013)</h3>
                <p>
                  El registro de cuentas está dirigido a personas mayores de 18 años. El tratamiento de datos personales de niños, niñas y adolescentes está prohibido salvo aquellos datos de naturaleza pública, o cuando medie autorización previa y expresa de sus padres o representantes legales respetando siempre el interés superior del menor.
                </p>

                <h3>6. Derechos del Titular y Procedimiento de Consultas y Reclamos (Arts. 8, 14 y 15, Ley 1581 de 2012)</h3>
                <p>
                  Como titular puedes <strong>conocer, actualizar, rectificar y suprimir</strong> tus datos o revocar la autorización en cualquier momento directamente desde la sección <em>Perfil</em> (botón de eliminación de cuenta) o escribiendo a nuestro canal oficial de WhatsApp. Conforme a los <strong>Arts. 14 y 15 de la Ley 1581 de 2012</strong>, las consultas se atenderán en un término máximo de <strong>diez (10) días hábiles</strong> y los reclamos o solicitudes de supresión en un máximo de <strong>quince (15) días hábiles</strong>.
                </p>
              </div>
            )}

            {pestañaLegal === 'terminos' && (
              <div className="modal-privacidad-cuerpo">
                <h3>1. Naturaleza del Catálogo y Contratación Electrónica (Ley 527 de 1999 y Art. 50, Ley 1480 de 2011)</h3>
                <ul>
                  <li>
                    Este sitio web funciona como catálogo digital informativo de <strong>Americanoshh</strong>. La compraventa se perfecciona mediante mensajes de datos a través de nuestro canal oficial de WhatsApp (<code>+57 312 436 3561</code>), los cuales gozan de plena validez jurídica y fuerza obligatoria conforme a los <strong>Artículos 5, 6, 10 y 14 de la Ley 527 de 1999</strong> (Ley de Comercio Electrónico).
                  </li>
                  <li>
                    En cumplimiento de los <strong>Artículos 23, 24 y 26 de la Ley 1480 de 2011</strong> (Estatuto del Consumidor), todos los precios se exhiben en <strong>Pesos Colombianos (COP)</strong>. El valor exacto del transporte o domicilio nacional se informa expresamente antes de que el comprador confirme y pague el pedido.
                  </li>
                </ul>

                <h3>2. Modalidad de Impresión bajo Demanda y Plazos de Entrega (Art. 50 lit. h, Ley 1480 de 2011)</h3>
                <ul>
                  <li>
                    <strong>Producción sobre pedido:</strong> Las prendas de Americanoshh operan bajo la modalidad de <strong>impresión bajo demanda (Print-on-Demand)</strong>. No manejamos inventario físico pre-estampado; la disponibilidad depende de que el diseño esté activo en el catálogo.
                  </li>
                  <li>
                    <strong>Tiempos de despacho:</strong> Dado que cada camiseta se estampa tras confirmarse la orden, <strong>el envío tarda días hábiles adicionales</strong> frente a mercancía de entrega inmediata. El plazo estimado exacto de producción y transporte se acuerda por escrito en WhatsApp antes del pago, sin exceder en ningún caso el término legal supletorio de <strong>treinta (30) días calendario</strong> previsto en el <strong>Art. 50 literal h) de la Ley 1480 de 2011</strong>.
                  </li>
                </ul>

                <h3>3. Derecho de Retracto y Excepción por Personalización (Art. 47, Ley 1480 de 2011)</h3>
                <ul>
                  <li>
                    <strong>Referencias estándar del catálogo:</strong> De conformidad con el <strong>Artículo 47 de la Ley 1480 de 2011</strong>, el consumidor podrá ejercer el derecho de retracto dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la entrega del producto, devolviéndolo por los mismos medios y en las mismas condiciones en que lo recibió (sin uso, sin lavar, sin olores y con etiquetas originales). Los costos de transporte y los demás que conlleve la devolución serán cubiertos por el consumidor.
                  </li>
                  <li>
                    <strong>Excepción legal (Art. 47, Numeral 3, Ley 1480 de 2011):</strong> El derecho de retracto <strong>no aplica</strong> cuando el comprador solicite prendas confeccionadas o estampadas conforme a especificaciones personalizadas a medida (diseños propios, textos o modificaciones solicitadas por el cliente).
                  </li>
                </ul>

                <h3>4. Reversión del Pago (Art. 51, Ley 1480 de 2011 y Decreto 587 de 2016)</h3>
                <p>
                  Cuando la compra se realice mediante mecanismos de comercio electrónico y el pago se efectúe con tarjeta de crédito, débito o cualquier otro instrumento de pago electrónico, el consumidor podrá solicitar la reversión del pago dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la fecha en que tuvo noticia de la operación fraudulenta o no solicitada, o de que recibió un producto defectuoso o no correspondiente a lo solicitado, conforme al <strong>Artículo 51 de la Ley 1480 de 2011</strong> y el <strong>Decreto 587 de 2016</strong>.
                </p>

                <h3>5. Garantía Legal, Cambios por Talla y Exoneración (Arts. 7, 8, 11 y 16, Ley 1480 de 2011)</h3>
                <ul>
                  <li>
                    <strong>Garantía legal de calidad e idoneidad:</strong> En virtud de los <strong>Artículos 7, 8 y 11 de la Ley 1480 de 2011</strong>, todas nuestras prendas cuentan con una garantía de <strong>treinta (30) días calendario</strong> contados desde la entrega, por defectos de confección, costura o adherencia del estampado.
                  </li>
                  <li>
                    <strong>Causales de exoneración (Art. 16, Ley 1480 de 2011):</strong> La garantía no cubrirá daños derivados de fuerza mayor, caso fortuito, el hecho de un tercero, o el <strong>uso indebido del bien por parte del consumidor</strong> (incluyendo el incumplimiento de las instrucciones de lavado, uso de blanqueadores, secadora a alta temperatura o planchado directo sobre el estampado).
                  </li>
                  <li>
                    <strong>Cambios voluntarios por talla:</strong> Podrán solicitarse dentro de los <strong>5 días hábiles</strong> posteriores a la entrega siempre que la prenda esté sin uso y con etiquetas intactas, asumiendo el cliente los fletes correspondientes y sujeto al tiempo de producción de la nueva talla.
                  </li>
                </ul>
              </div>
            )}

            {pestañaLegal === 'propiedad' && (
              <div className="modal-privacidad-cuerpo">
                <h3>1. Derechos de Autor y Propiedad Industrial (Decisión Andina 351 de 1993, Ley 23 de 1982 y Decisión 486 de 2000)</h3>
                <ul>
                  <li>
                    <strong>Obras artísticas y código fuente:</strong> Todos los diseños gráficos, ilustraciones urbanas, fotografías de producto, textos, interfaces y código de software de esta plataforma están protegidos por la <strong>Decisión Andina 351 de 1993</strong> y la <strong>Ley 23 de 1982</strong> (modificada por la <strong>Ley 1915 de 2018</strong>). Queda estrictamente prohibida su copia, descarga comercial, estampación no autorizada o distribución sin autorización previa y escrita de su titular.
                  </li>
                  <li>
                    <strong>Signos distintivos y marca:</strong> La denominación <strong>Americanoshh</strong>, sus logotipos y elementos visuales se encuentran amparados por las normas de propiedad industrial vigentes en Colombia (<strong>Decisión Andina 486 de 2000</strong>).
                  </li>
                </ul>

                <h3>2. Reglas de Uso Aceptable, Seguridad Informática y Bloqueo de Cuentas (Art. 1602 Código Civil y Ley 1273 de 2009)</h3>
                <ul>
                  <li>
                    En virtud del principio de buena fe contractual (<strong>Artículo 1602 del Código Civil Colombiano</strong> y <strong>Artículo 871 del Código de Comercio</strong>) y de la protección de sistemas informáticos establecida en la <strong>Ley 1273 de 2009</strong>, el usuario se obliga a suministrar información veraz y a utilizar la plataforma de forma lícita.
                  </li>
                  <li>
                    <strong>Suspensión o bloqueo preventivo:</strong> Americanoshh se reserva el derecho de suspender o bloquear cuentas de usuario cuando se detecte envío de spam o mensajes abusivos a nuestro canal de WhatsApp, realización de pedidos falsos o fraudulentos, suplantación de identidad o tráfico automatizado mediante <em>bots</em>. Dicho bloqueo impide el acceso operativo a la cuenta sin afectar el derecho del titular a solicitar información o supresión de sus datos personales bajo la Ley 1581 de 2012.
                  </li>
                </ul>

                <h3>3. Atención de PQR, Jurisdicción y Autoridades de Protección al Consumidor (Art. 58, Ley 1480 de 2011)</h3>
                <ul>
                  <li>
                    <strong>Canal directo de PQR:</strong> Las Peticiones, Quejas y Reclamos (PQR) se reciben en nuestro WhatsApp oficial (<code>+57 312 436 3561</code>) y se responden dentro de los <strong>quince (15) días hábiles</strong> siguientes a su recepción, conforme al <strong>Artículo 58, numeral 5, literal c) de la Ley 1480 de 2011</strong>.
                  </li>
                  <li>
                    <strong>Autoridad administrativa y jurisdiccional:</strong> Estas condiciones se rigen íntegramente por las leyes de la República de Colombia. Para información adicional o presentación de denuncias administrativas, el consumidor puede acudir a la{' '}
                    <a
                      href="https://www.sic.gov.co"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="enlace-sic-modal"
                    >
                      Superintendencia de Industria y Comercio (SIC)
                    </a>
                    {' '}o a la Red Nacional de Protección al Consumidor.
                  </li>
                </ul>
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