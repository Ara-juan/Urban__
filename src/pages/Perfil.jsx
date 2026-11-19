// Página Perfil con insignia de Prioridad POD, datos de envío express y Lista de Favoritos
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerPerfil, actualizarPerfil, eliminarCuenta, cerrarSesion } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AlertaMensaje from '../components/AlertaMensaje.jsx';
import './Perfil.css';

const NUMERO_WHATSAPP = '573124363561';

export default function Perfil() {
  const [perfil, setPerfil] = useState({ id: null, nombre: '', email: '', telefono: '', direccion: '', rol: 'CLIENTE' });
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [mensajeError, setMensajeError] = useState(false);

  const { usuario, iniciarSesionLocal, cerrarSesionLocal, favoritos, alternarFavorito } = useAuth();
  const navigate = useNavigate();

  const mostrarMensaje = (texto, esError = false) => {
    setMensaje(texto);
    setMensajeError(esError);
  };

  // Si el token dejó de ser válido, se limpia la sesión y se va al login
  const manejarSesionExpirada = () => {
    cerrarSesion();
    cerrarSesionLocal();
    navigate('/login');
  };

  // Obtiene los datos del usuario desde el backend
  useEffect(() => {
    const token = localStorage.getItem('urban_token');
    if (!token) {
      navigate('/login');
      return;
    }

    obtenerPerfil()
      .then((datosUsuario) => {
        const actualizado = {
          id: datosUsuario.id_usuario || usuario?.id || null,
          nombre: datosUsuario.nombre || '',
          email: datosUsuario.email || '',
          telefono: datosUsuario.telefono || '',
          direccion: datosUsuario.direccion || '',
          rol: datosUsuario.rol || usuario?.rol || 'CLIENTE'
        };
        setPerfil(actualizado);
        iniciarSesionLocal(actualizado);
      })
      .catch((error) => {
        if (error.message.includes('Token') || error.message.includes('denegado') || error.message.includes('bloqueada')) {
          manejarSesionExpirada();
        } else {
          mostrarMensaje('No se pudieron cargar los datos del perfil.', true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envía la actualización de datos opcionales y/o contraseña
  const manejarActualizacion = async (event) => {
    event.preventDefault();
    setMensaje(null);

    if (nuevaContrasena && !contrasenaActual) {
      mostrarMensaje('Debes ingresar tu contraseña actual para cambiarla.', true);
      return;
    }

    try {
      const resultado = await actualizarPerfil({
        contrasenaActual: contrasenaActual || null,
        nuevaContrasena: nuevaContrasena || null,
        telefono: perfil.telefono || null,
        direccion: perfil.direccion || null
      });

      if (resultado.usuario) {
        iniciarSesionLocal({
          id: resultado.usuario.id_usuario || perfil.id,
          nombre: resultado.usuario.nombre || perfil.nombre,
          email: resultado.usuario.email || perfil.email,
          telefono: resultado.usuario.telefono || '',
          direccion: resultado.usuario.direccion || '',
          rol: resultado.usuario.rol || perfil.rol
        });
      }

      mostrarMensaje(resultado.mensaje, false);
      setContrasenaActual('');
      setNuevaContrasena('');
    } catch (error) {
      mostrarMensaje(error.message || 'Error de conexión con el servidor.', true);
    }
  };

  // Elimina la cuenta tras confirmación
  const manejarEliminarCuenta = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar tu cuenta definitivamente?')) return;

    try {
      await eliminarCuenta();
      cerrarSesion();
      cerrarSesionLocal();
      navigate('/');
    } catch (error) {
      mostrarMensaje(error.message || 'No se pudo eliminar la cuenta.', true);
    }
  };

  const construirUrlPedidoFavorito = (prod) => {
    const precioFormateado = `$${parseInt(prod.precio, 10).toLocaleString('es-CO')}`;
    const texto =
      `Hola Americanoshh, soy miembro verificado:\n` +
      `• ID Cliente: #${perfil.id || usuario?.id || ''}\n` +
      `• Nombre: ${perfil.nombre}\n` +
      `• Teléfono: ${perfil.telefono || 'Por confirmar'}\n` +
      `• Dirección de entrega: ${perfil.direccion || 'Por confirmar'}\n\n` +
      `Quiero pedir desde mis Favoritos con [PRIORIDAD POD]:\n` +
      `• Prenda: ${prod.titulo}\n` +
      `• Precio catálogo: ${precioFormateado} COP\n\n` +
      `Quedo atento para confirmar talla, disponibilidad y envío.`;
    return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(texto)}`;
  };

  return (
    <main className="profile-wrapper">
      <div className="profile-card">
        <div className="perfil-insignia-pod">
          <span>⚡ Miembro Verificado {perfil.id ? `#${perfil.id}` : ''} • Prioridad de Producción POD</span>
        </div>

        <h2 className="text-center">Mi Perfil</h2>
        <p className="text-center subtitle">Gestiona tus datos de envío express, seguridad y prendas favoritas</p>

        <form onSubmit={manejarActualizacion}>
          {/* Información básica */}
          <div className="mb-3 text-start">
            <label className="form-label">Nombre Completo</label>
            <input type="text" value={perfil.nombre} readOnly className="form-control" />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label">Correo Electrónico</label>
            <input type="email" value={perfil.email} readOnly className="form-control" />
          </div>

          <hr className="profile-divider" />

          {/* Datos Opcionales para Compra Express */}
          <h3 className="section-title text-start">Datos de Envío Express (WhatsApp)</h3>
          <p className="texto-ayuda-express text-start">
            Al guardar tu teléfono y dirección, se incluirán automáticamente cuando pidas una prenda por WhatsApp.
          </p>

          <div className="mb-3 text-start">
            <label htmlFor="perfilTelefono" className="form-label">Teléfono</label>
            <input
              type="tel"
              id="perfilTelefono"
              className="form-control"
              placeholder="Ingresa tu teléfono (solo números)"
              pattern="^[0-9]*$"
              value={perfil.telefono}
              onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
            />
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="perfilDireccion" className="form-label">Dirección de entrega</label>
            <input
              type="text"
              id="perfilDireccion"
              className="form-control"
              placeholder="Ej: Barrio, calle, ciudad..."
              value={perfil.direccion}
              onChange={(e) => setPerfil({ ...perfil, direccion: e.target.value })}
            />
          </div>

          <hr className="profile-divider" />

          {/* Cambio de Contraseña */}
          <h3 className="section-title text-start">Cambiar Contraseña</h3>

          <div className="mb-3 text-start">
            <label htmlFor="contrasenaActual" className="form-label">Contraseña Actual</label>
            <input
              type="password"
              id="contrasenaActual"
              className="form-control"
              placeholder="Requerida solo si vas a cambiarla"
              minLength={8}
              value={contrasenaActual}
              onChange={(e) => setContrasenaActual(e.target.value)}
            />
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="nuevaContrasena" className="form-label">Nueva Contraseña</label>
            <input
              type="password"
              id="nuevaContrasena"
              className="form-control"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              value={nuevaContrasena}
              onChange={(e) => setNuevaContrasena(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-save mt-3">Guardar Cambios</button>
        </form>

        {/* Mensajes dinámicos */}
        <AlertaMensaje mensaje={mensaje} esError={mensajeError} />

        <hr className="profile-divider" />

        {/* Sección de Lista de Favoritos ("Guardar para quincena") */}
        <section className="favoritos-perfil-seccion" aria-label="mis prendas favoritas">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="section-title mb-0">Mis Favoritos ({favoritos.length})</h3>
            <span className="small text-white-50">Guardados para tu próxima compra</span>
          </div>

          {favoritos.length === 0 ? (
            <p className="favoritos-vacio">
              Aún no tienes prendas guardadas. Pulsa el ícono <strong>♡</strong> en cualquier diseño del catálogo para guardarlo aquí.
            </p>
          ) : (
            <div className="favoritos-lista-perfil">
              {favoritos.map((prod) => (
                <div key={prod.id_producto} className="favorito-item-card">
                  <img src={prod.imagen_url} alt={prod.titulo} className="favorito-item-img" />
                  <div className="favorito-item-info">
                    <div className="favorito-item-titulo">{prod.titulo}</div>
                    <div className="favorito-item-precio">
                      ${parseInt(prod.precio, 10).toLocaleString('es-CO')} COP
                    </div>
                  </div>
                  <div className="favorito-item-acciones">
                    <a
                      href={construirUrlPedidoFavorito(prod)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pedir-favorito"
                    >
                      Pedir Express
                    </a>
                    <button
                      type="button"
                      className="btn-quitar-favorito"
                      onClick={() => alternarFavorito(prod)}
                      title="Quitar de favoritos"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <hr className="profile-divider" />

        <button type="button" className="btn-eliminar mt-2" onClick={manejarEliminarCuenta}>
          Eliminar mi cuenta
        </button>
      </div>
    </main>
  );
}