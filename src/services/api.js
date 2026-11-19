// Centraliza todas las llamadas al backend FastAPI (Python + PostgreSQL/Supabase)

const API_CONFIGURADA = import.meta.env.VITE_API_URL?.trim();
const API_BASE = (API_CONFIGURADA || '/api').replace(/\/+$/, '');

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

export async function registrarUsuario({ nombre, email, contrasena, telefono, direccion, acepto_politica }) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, contrasena, telefono, direccion, acepto_politica })
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

export async function solicitarRecuperacionContrasena(email) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/recuperar-contrasena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
  );
}

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

// favoritos del usuario:

export async function obtenerFavoritos() {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/favoritos`, {
      headers: { ...authHeaders() }
    })
  );
}

export async function agregarFavorito(idProducto) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/favoritos/${idProducto}`, {
      method: 'POST',
      headers: { ...authHeaders() }
    })
  );
}

export async function eliminarFavorito(idProducto) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/favoritos/${idProducto}`, {
      method: 'DELETE',
      headers: { ...authHeaders() }
    })
  );
}

// administración de usuarios (solo rol administrador):

export async function obtenerUsuarios() {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios`, {
      headers: { ...authHeaders() }
    })
  );
}

export async function cambiarBloqueoUsuario(id, { bloqueado, motivo = null }) {
  return manejarRespuesta(
    await fetch(`${API_BASE}/usuarios/${id}/bloqueo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ bloqueado, motivo })
    })
  );
}