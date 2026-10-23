// Centraliza todas las llamadas al backend Node.js (Express + PostgreSQL/Supabase)

// Detecta si la app se ejecuta en Netlify (producción) o en local, dirigiendo la petición directamente a Render
const API_BASE = window.location.hostname.includes('netlify.app')
  ? 'https://urban-clothes-slc0.onrender.com/api'
  : '/api';

async function manejarRespuesta(respuesta) {
  const data = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(data.error || 'Error de conexión con el servidor.');
  }
  return data;
}

function authHeaders() {
  const token = localStorage.getItem('urban_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

//productos:

export async function obtenerProductos(categoria) {
  const url = categoria ? `${API_BASE}/productos?categoria=${encodeURIComponent(categoria)}` : `${API_BASE}/productos`;
  return manejarRespuesta(await fetch(url));
}

export async function obtenerProductoPorId(id) {
  return manejarRespuesta(await fetch(`${API_BASE}/productos/${id}`));
}

export async function crearProducto(datos) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(datos)
    })
  );
}

export async function actualizarProducto(id, datos) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(datos)
    })
  );
}

export async function eliminarProducto(id) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/productos/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() }
    })
  );
}

//usuarios:

export async function registrarUsuario({ nombre, email, contrasena, telefono, direccion }) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, contrasena, telefono, direccion })
    })
  );
}

export async function iniciarSesion({ email, contrasena }) {
  const data = await manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, contrasena })
    })
  );

  localStorage.setItem('urban_token', data.token);
  localStorage.setItem('urban_user', JSON.stringify(data.usuario));
  return data;
}

// Solicita el correo con el enlace de recuperación
export async function solicitarRecuperacionContrasena(email) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/recuperar-contrasena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
  );
}

// Envía la nueva contraseña junto con el token enviado por correo
export async function restablecerContrasena({ token, nuevaContrasena }) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/restablecer-contrasena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nuevaContrasena })
    })
  );
}

export function cerrarSesion() {
  localStorage.removeItem('urban_token');
  localStorage.removeItem('urban_user');
}

export async function obtenerPerfil() {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/perfil`, {
      headers: { ...authHeaders() }
    })
  );
}

export async function actualizarPerfil(datos) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(datos)
    })
  );
}

export async function eliminarCuenta() {
  const usuarioRaw = localStorage.getItem('urban_user');
  let id = null;
  try {
    id = usuarioRaw ? JSON.parse(usuarioRaw).id : null;
  } catch {
    id = null;
  }
  if (!id) throw new Error('No hay una sesión activa.');

  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() }
    })
  );
}