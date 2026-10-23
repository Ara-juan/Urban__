// página de login, registro y recuperación
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  iniciarSesion,
  registrarUsuario,
  solicitarRecuperacionContrasena,
  restablecerContrasena
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AlertaMensaje from '../components/AlertaMensaje.jsx';
import './Login.css';

export default function Login() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken');

  const [pestañaActiva, setPestañaActiva] = useState(resetToken ? 'reset' : 'login');
  const [mensaje, setMensaje] = useState(null);
  const [mensajeError, setMensajeError] = useState(false);
  const [cargando, setCargando] = useState(false);

  const { iniciarSesionLocal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resetToken) {
      setPestañaActiva('reset');
    }
  }, [resetToken]);

  const mostrarMensaje = (texto, esError = false) => {
    setMensaje(texto);
    setMensajeError(esError);
  };

  const manejarLogin = async (event) => {
    event.preventDefault();
    setMensaje(null);
    setCargando(true);

    const formData = new FormData(event.target);
    const datos = {
      email: formData.get('email'),
      contrasena: formData.get('contrasena')
    };

    try {
      const resultado = await iniciarSesion(datos);
      iniciarSesionLocal(resultado.usuario);
      mostrarMensaje(resultado.mensaje, false);

      setTimeout(() => navigate('/colecciones'), 1000);
    } catch (error) {
      mostrarMensaje(error.message || 'error de conexión con el servidor.', true);
    } finally {
      setCargando(false);
    }
  };

  const manejarRegistro = async (event) => {
    event.preventDefault();
    setMensaje(null);
    setCargando(true);

    const formData = new FormData(event.target);
    const datos = {
      nombre: formData.get('nombre'),
      email: formData.get('email'),
      contrasena: formData.get('contrasena'),
      telefono: formData.get('telefono') || null,
      direccion: formData.get('direccion') || null
    };

    try {
      const resultado = await registrarUsuario(datos);
      mostrarMensaje(resultado.mensaje, false);
      event.target.reset();

      setTimeout(() => setPestañaActiva('login'), 1500);
    } catch (error) {
      mostrarMensaje(error.message || 'error de conexión con el servidor.', true);
    } finally {
      setCargando(false);
    }
  };

  const manejarSolicitudRecuperacion = async (event) => {
    event.preventDefault();
    setMensaje(null);
    setCargando(true);

    const formData = new FormData(event.target);
    const email = formData.get('email');

    try {
      const resultado = await solicitarRecuperacionContrasena(email);
      mostrarMensaje(resultado.mensaje, false);
      event.target.reset();
    } catch (error) {
      mostrarMensaje(error.message || 'no se pudo enviar el correo de recuperación.', true);
    } finally {
      setCargando(false);
    }
  };

  const manejarRestablecer = async (event) => {
    event.preventDefault();
    setMensaje(null);
    setCargando(true);

    const formData = new FormData(event.target);
    const nuevaContrasena = formData.get('nuevaContrasena');

    try {
      const resultado = await restablecerContrasena({ token: resetToken, nuevaContrasena });
      mostrarMensaje(resultado.mensaje, false);

      setTimeout(() => {
        setPestañaActiva('login');
        navigate('/login');
      }, 2000);
    } catch (error) {
      mostrarMensaje(error.message || 'error al restablecer contraseña.', true);
    } finally {
      setCargando(false);
    }
  };

  return (
    // reemplazamos div por main y añadimos el seo básico
    <main className="login-container">
      <title>Ingresar o Registrarse | Americanoshh</title>
      <meta name="description" content="inicia sesión en americanoshh para gestionar tu perfil y acceder a streetwear exclusivo." />

      <Link to="/" aria-label="volver al inicio">
        <img src="/assets/logo.png" alt="logo americanoshh" className="logo" />
      </Link>

      <section className="form-box" aria-live="polite">
        {pestañaActiva !== 'reset' && (
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={pestañaActiva === 'login'}
              className={`tab ${pestañaActiva === 'login' ? 'active' : ''}`}
              onClick={() => { setPestañaActiva('login'); setMensaje(null); }}
            >
              Ingresar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pestañaActiva === 'register'}
              className={`tab ${pestañaActiva === 'register' ? 'active' : ''}`}
              onClick={() => { setPestañaActiva('register'); setMensaje(null); }}
            >
              Registrarse
            </button>
          </div>
        )}

        {pestañaActiva === 'login' && (
          <form className="form active" onSubmit={manejarLogin} aria-label="formulario de inicio de sesión">
            <h1>Bienvenidos</h1>
            <input type="email" name="email" aria-label="correo electrónico" placeholder="Email" required />
            <input type="password" name="contrasena" aria-label="contraseña" placeholder="Contraseña" minLength={8} required />
            <button type="submit" className="btn" disabled={cargando}>
              {cargando ? 'ingresando...' : 'Ingresar'}
            </button>
            <p className="link">¿No tienes cuenta? <span role="button" tabIndex="0" onKeyDown={(e) => e.key === 'Enter' && setPestañaActiva('register')} onClick={() => { setPestañaActiva('register'); setMensaje(null); }}>Regístrate aquí</span></p>
            <p className="link"><span role="button" tabIndex="0" onKeyDown={(e) => e.key === 'Enter' && setPestañaActiva('forgot')} onClick={() => { setPestañaActiva('forgot'); setMensaje(null); }}>¿Olvidaste tu contraseña?</span></p>
          </form>
        )}

        {pestañaActiva === 'register' && (
          <form className="form active" onSubmit={manejarRegistro} aria-label="formulario de registro">
            <h1>Crear cuenta</h1>
            <input type="text" name="nombre" aria-label="nombre completo" placeholder="Nombre completo" required />
            <input type="email" name="email" aria-label="correo electrónico" placeholder="Email" required />
            <input type="password" name="contrasena" aria-label="crear contraseña" placeholder="Contraseña (Mín. 8 caracteres)" minLength={8} required />
            <input type="tel" name="telefono" aria-label="teléfono opcional" placeholder="Teléfono (opcional, solo números)" pattern="^[0-9]*$" />
            <input type="text" name="direccion" aria-label="dirección opcional" placeholder="Dirección (opcional)" />
            <button type="submit" className="btn" disabled={cargando}>
              {cargando ? 'registrando...' : 'Registrarse'}
            </button>
            <p className="link" role="button" tabIndex="0" onKeyDown={(e) => e.key === 'Enter' && setPestañaActiva('login')} onClick={() => { setPestañaActiva('login'); setMensaje(null); }}>¿Ya tienes cuenta? Inicia sesión</p>
          </form>
        )}

        {pestañaActiva === 'forgot' && (
          <form className="form active" onSubmit={manejarSolicitudRecuperacion} aria-label="formulario de recuperación de contraseña">
            <h1>Recuperar Contraseña</h1>
            <p className="subtitle text-center mb-3" style={{ fontSize: '13px', color: '#ccc' }}>
              ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <input type="email" name="email" aria-label="correo electrónico registrado" placeholder="Ingresa tu Email registrado" required />
            <button type="submit" className="btn" disabled={cargando}>
              {cargando ? 'enviando...' : 'Enviar Enlace'}
            </button>
            <p className="link" role="button" tabIndex="0" onKeyDown={(e) => e.key === 'Enter' && setPestañaActiva('login')} onClick={() => { setPestañaActiva('login'); setMensaje(null); }}>Volver al inicio de sesión</p>
          </form>
        )}

        {pestañaActiva === 'reset' && (
          <form className="form active" onSubmit={manejarRestablecer} aria-label="formulario de nueva contraseña">
            <h1>Nueva Contraseña</h1>
            <p className="subtitle text-center mb-3" style={{ fontSize: '13px', color: '#ccc' }}>
              crea una nueva contraseña para tu cuenta.
            </p>
            <input type="password" name="nuevaContrasena" aria-label="escribir nueva contraseña" placeholder="Nueva Contraseña (Mín. 8 caracteres)" minLength={8} required />
            <button type="submit" className="btn" disabled={cargando}>
              {cargando ? 'guardando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        )}

        <AlertaMensaje mensaje={mensaje} esError={mensajeError} />
      </section>
    </main>
  );
}