import { useState, useEffect } from 'react';
import './AvisoPrivacidad.css';

const CLAVE_STORAGE = 'americanoshh_privacidad_aceptada';

export default function AvisoPrivacidad() {
  const [mostrarBanner, setMostrarBanner] = useState(() => {
    return localStorage.getItem(CLAVE_STORAGE) !== 'true';
  });
  const [modalAbierto, setModalAbierto] = useState(false);

  // permite abrir el modal legal desde cualquier parte de la app (ej. formulario de registro)
  useEffect(() => {
    const abrirModal = () => setModalAbierto(true);
    window.addEventListener('abrir-politica-privacidad', abrirModal);
    return () => window.removeEventListener('abrir-politica-privacidad', abrirModal);
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
          aria-label="aviso de privacidad y tratamiento de datos"
        >
          <div className="aviso-privacidad-contenido">
            <div className="aviso-privacidad-texto">
              <strong>Aviso de Privacidad y Tratamiento de Datos — Americanoshh</strong>
              <p>
                Al navegar en nuestro catálogo o crear una cuenta, recolectamos datos básicos de sesión y, en caso de registro, tu{' '}
                <span>nombre, correo electrónico, contraseña cifrada y datos opcionales de contacto (teléfono y dirección)</span>{' '}
                conforme a la Ley 1581 de 2012.{' '}
                <button
                  type="button"
                  className="btn-ver-politica"
                  onClick={() => setModalAbierto(true)}
                >
                  Leer política completa
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

      {/* modal con el detalle legal completo */}
      {modalAbierto && (
        <div
          className="modal-privacidad-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-politica-privacidad"
          onClick={(e) => e.target === e.currentTarget && setModalAbierto(false)}
        >
          <div className="modal-privacidad-caja">
            <button
              type="button"
              className="cerrar-modal-privacidad"
              aria-label="cerrar política de privacidad"
              onClick={() => setModalAbierto(false)}
            >
              &times;
            </button>

            <h2 id="titulo-politica-privacidad">
              Política de Tratamiento de Datos Personales
            </h2>
            <p className="subtitulo-legal">
              Americanoshh (Urban Clothes) • Cumplimiento Ley 1581 de 2012 (Colombia)
            </p>

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

              <h3>3. Almacenamiento y seguridad</h3>
              <p>
                Tus datos se alojan en bases de datos en la nube con cifrado en tránsito (HTTPS/TLS) y controles de acceso restringido. Americanoshh no vende, alquila ni cede tus datos personales a terceros con fines comerciales.
              </p>

              <h3>4. Derechos del titular (Habeas Data)</h3>
              <p>
                Como titular de los datos tienes derecho a <strong>conocer, actualizar, rectificar y suprimir</strong> tu información en cualquier momento directamente desde la sección <em>Perfil</em> de tu cuenta o escribiendo a nuestro canal oficial de atención en WhatsApp.
              </p>
            </div>

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
                Aceptar política y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}