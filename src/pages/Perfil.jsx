// Página Perfil
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerPerfil, actualizarPerfil, eliminarCuenta, cerrarSesion } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AlertaMensaje from '../components/AlertaMensaje.jsx';
import './Perfil.css';

export default function Perfil() {
  const [perfil, setPerfil] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [mensajeError, setMensajeError] = useState(false);

  const { cerrarSesionLocal } = useAuth();
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
      .then((usuario) => {
        setPerfil({
          nombre: usuario.nombre || '',
          email: usuario.email || '',
          telefono: usuario.telefono || '',
          direccion: usuario.direccion || ''
        });
      })
      .catch((error) => {
        if (error.message.includes('Token') || error.message.includes('denegado')) {
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

  return (
    <main className="profile-wrapper">
      <div className="profile-card">
        <h2 className="text-center">Mi Perfil</h2>
        <p className="text-center subtitle">Gestiona tu información personal y de seguridad</p>

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

          {/* Datos Opcionales */}
          <h3 className="section-title text-start">Datos de Envío (Opcionales)</h3>

          <div className="mb-3 text-start">
            <label htmlFor="perfilTelefono" className="form-label">Teléfono</label>
            <input
              type="tel"
              id="perfilTelefono"
              className="form-control"
              placeholder="Ingresa tu teléfono (Opcional)"
              pattern="^[0-9]*$"
              value={perfil.telefono}
              onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
            />
          </div>

          <div className="mb-3 text-start">
            <label htmlFor="perfilDireccion" className="form-label">Dirección</label>
            <input
              type="text"
              id="perfilDireccion"
              className="form-control"
              placeholder="Ingresa tu dirección (Opcional)"
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

        <button type="button" className="btn-eliminar mt-3" onClick={manejarEliminarCuenta}>
          Eliminar mi cuenta
        </button>

        {/* Mensajes dinámicos */}
        <AlertaMensaje mensaje={mensaje} esError={mensajeError} />
      </div>
    </main>
  );
}