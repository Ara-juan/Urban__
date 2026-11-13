// Página de administración de productos y control de usuarios
// Protegida: solo administradores. CRUD de prendas + bloqueo/desbloqueo de usuarios.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  obtenerUsuarios,
  cambiarBloqueoUsuario
} from '../services/api.js';
import { subirImagenASupabase } from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import AlertaMensaje from '../components/AlertaMensaje.jsx';
import './AdminProductos.css';

const TALLAS_POR_DEFECTO = ['XS', 'S', 'M', 'L', 'XL'];

const MOTIVOS_BLOQUEO_RAPIDOS = [
  'Spam o mensajes abusivos por WhatsApp',
  'Pedidos falsos / cuentas múltiples',
  'Actividad automatizada o comportamiento de bot',
  'Datos falsos o suplantación de identidad',
  'Otro motivo'
];

export default function AdminProductos() {
  const { sesionActiva, esAdmin } = useAuth();
  const navigate = useNavigate();

  // pestaña principal del panel: 'productos' | 'usuarios'
  const [seccionActiva, setSeccionActiva] = useState('productos');

  // estado de productos
  const [productos, setProductos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState(null);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [prodId, setProdId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('activo');
  const [tallas, setTallas] = useState('XS, S, M, L, XL');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState(null);
  const [mensajeError, setMensajeError] = useState(false);

  // estado de gestión de usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState(null);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [filtroEstadoUsuario, setFiltroEstadoUsuario] = useState('todos');
  const [mensajeUsuario, setMensajeUsuario] = useState(null);
  const [mensajeUsuarioError, setMensajeUsuarioError] = useState(false);

  // modal de bloqueo
  const [usuarioABloquear, setUsuarioABloquear] = useState(null);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_BLOQUEO_RAPIDOS[0]);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [procesandoBloqueo, setProcesandoBloqueo] = useState(false);

  const mostrarMensaje = (texto, esError = false) => {
    setMensaje(texto);
    setMensajeError(esError);
  };

  const mostrarMensajeUsuario = (texto, esError = false) => {
    setMensajeUsuario(texto);
    setMensajeUsuarioError(esError);
  };

  // Protección de la ruta, exige sesión de administrador
  useEffect(() => {
    if (!sesionActiva) {
      alert('Acceso restringido. Por favor inicia sesión.');
      navigate('/login');
    } else if (!esAdmin) {
      alert('Acceso denegado. Esta sección es exclusiva para administradores.');
      navigate('/');
    }
  }, [sesionActiva, esAdmin, navigate]);

  // Carga la tabla de productos registrados (activos e inactivos)
  const cargarLista = () => {
    setCargandoLista(true);
    setErrorLista(null);
    obtenerProductos()
      .then((data) => setProductos(Array.isArray(data) ? data : []))
      .catch((err) => setErrorLista(err.message))
      .finally(() => setCargandoLista(false));
  };

  // Carga la lista de usuarios registrados
  const cargarUsuarios = () => {
    setCargandoUsuarios(true);
    setErrorUsuarios(null);
    obtenerUsuarios()
      .then((data) => setUsuarios(Array.isArray(data) ? data : []))
      .catch((err) => setErrorUsuarios(err.message))
      .finally(() => setCargandoUsuarios(false));
  };

  useEffect(() => {
    if (sesionActiva && esAdmin) {
      cargarLista();
      cargarUsuarios();
    }
  }, [sesionActiva, esAdmin]);

  // Genera una url temporal en memoria del navegador para mostrar vista previa
  const manejarSeleccionImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);
    setVistaPrevia(URL.createObjectURL(file));
  };

  // Guarda (crea o actualiza) el producto
  const manejarGuardar = async (event) => {
    event.preventDefault();
    setMensaje(null);
    setGuardando(true);

    try {
      let imagenUrl = null;

      if (archivo) {
        mostrarMensaje('Subiendo imagen a la nube...', false);
        imagenUrl = await subirImagenASupabase(archivo);
      } else if (modoEdicion) {
        const productoActual = productos.find((p) => String(p.id_producto) === String(prodId));
        imagenUrl = productoActual?.imagen_url || null;
      }

      if (!imagenUrl) {
        mostrarMensaje('Por favor selecciona una imagen para la prenda.', true);
        return;
      }

      const tallasArray = tallas.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

      const datos = {
        titulo,
        descripcion: descripcion || null,
        precio: parseFloat(precio),
        imagen_url: imagenUrl,
        categoria,
        estado,
        tallas: tallasArray.length > 0 ? tallasArray : TALLAS_POR_DEFECTO
      };

      const resultado = modoEdicion
        ? await actualizarProducto(prodId, datos)
        : await crearProducto(datos);

      mostrarMensaje(resultado.mensaje || 'Operación realizada con éxito', false);
      resetearFormulario();
      cargarLista();
    } catch (error) {
      mostrarMensaje(error.message || 'Error de conexión con el servidor.', true);
    } finally {
      setGuardando(false);
    }
  };

  const prepararEdicion = (prod) => {
    setModoEdicion(true);
    setProdId(prod.id_producto);
    setTitulo(prod.titulo);
    setPrecio(prod.precio);
    setCategoria(prod.categoria);
    setEstado(prod.estado);
    setTallas(Array.isArray(prod.tallas) ? prod.tallas.join(', ') : '');
    setDescripcion(prod.descripcion || '');
    setVistaPrevia(prod.imagen_url);
    setArchivo(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const alternarEstado = async (prod) => {
    const nuevoEstado = prod.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await actualizarProducto(prod.id_producto, { estado: nuevoEstado });
      cargarLista();
    } catch (error) {
      alert(error.message || 'Error al cambiar el estado del producto.');
    }
  };

  const manejarEliminar = async (prod) => {
    if (!window.confirm('¿Estás seguro de que deseas borrar definitivamente esta prenda?')) return;

    try {
      await eliminarProducto(prod.id_producto);
      cargarLista();
    } catch (error) {
      alert(error.message || 'No se pudo eliminar el producto.');
    }
  };

  const resetearFormulario = () => {
    setModoEdicion(false);
    setProdId('');
    setTitulo('');
    setPrecio('');
    setCategoria('');
    setEstado('activo');
    setTallas('XS, S, M, L, XL');
    setDescripcion('');
    setArchivo(null);
    setVistaPrevia('');
  };

  // Funciones de bloqueo / desbloqueo de usuarios
  const abrirModalBloqueo = (usr) => {
    setUsuarioABloquear(usr);
    setMotivoSeleccionado(MOTIVOS_BLOQUEO_RAPIDOS[0]);
    setMotivoPersonalizado('');
    setMensajeUsuario(null);
  };

  const confirmarBloqueo = async (event) => {
    event.preventDefault();
    if (!usuarioABloquear) return;

    const motivoFinal =
      motivoSeleccionado === 'Otro motivo'
        ? motivoPersonalizado.trim() || 'Incumplimiento de políticas de uso.'
        : motivoPersonalizado.trim()
          ? `${motivoSeleccionado}: ${motivoPersonalizado.trim()}`
          : motivoSeleccionado;

    setProcesandoBloqueo(true);
    try {
      const res = await cambiarBloqueoUsuario(usuarioABloquear.id_usuario, {
        bloqueado: true,
        motivo: motivoFinal
      });
      mostrarMensajeUsuario(res.mensaje || 'Usuario bloqueado correctamente.', false);
      setUsuarioABloquear(null);
      cargarUsuarios();
    } catch (error) {
      mostrarMensajeUsuario(error.message || 'No se pudo bloquear al usuario.', true);
    } finally {
      setProcesandoBloqueo(false);
    }
  };

  const manejarDesbloqueo = async (usr) => {
    if (!window.confirm(`¿Deseas desbloquear la cuenta de ${usr.nombre} (${usr.email})?`)) return;

    setMensajeUsuario(null);
    try {
      const res = await cambiarBloqueoUsuario(usr.id_usuario, {
        bloqueado: false,
        motivo: null
      });
      mostrarMensajeUsuario(res.mensaje || 'Usuario desbloqueado correctamente.', false);
      cargarUsuarios();
    } catch (error) {
      mostrarMensajeUsuario(error.message || 'No se pudo desbloquear al usuario.', true);
    }
  };

  const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '—';
    try {
      return new Date(fechaIso).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  if (!sesionActiva || !esAdmin) return null;

  const totalBloqueados = usuarios.filter((u) => u.bloqueado).length;
  const totalActivos = usuarios.length - totalBloqueados;

  const usuariosFiltrados = usuarios.filter((usr) => {
    if (filtroEstadoUsuario === 'activos' && usr.bloqueado) return false;
    if (filtroEstadoUsuario === 'bloqueados' && !usr.bloqueado) return false;

    const termino = busquedaUsuario.trim().toLowerCase();
    if (!termino) return true;

    return (
      (usr.nombre || '').toLowerCase().includes(termino) ||
      (usr.email || '').toLowerCase().includes(termino) ||
      (usr.telefono || '').toLowerCase().includes(termino)
    );
  });

  return (
    <main className="container my-4 admin-main">
      {/* Selector de pestañas del Panel de Administración */}
      <div className="admin-tabs mb-4" role="tablist" aria-label="secciones de administración">
        <button
          type="button"
          role="tab"
          aria-selected={seccionActiva === 'productos'}
          className={`admin-tab-btn ${seccionActiva === 'productos' ? 'activa' : ''}`}
          onClick={() => setSeccionActiva('productos')}
        >
          Gestión de Productos ({productos.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={seccionActiva === 'usuarios'}
          className={`admin-tab-btn ${seccionActiva === 'usuarios' ? 'activa' : ''}`}
          onClick={() => setSeccionActiva('usuarios')}
        >
          Gestión de Usuarios ({usuarios.length})
          {totalBloqueados > 0 && (
            <span className="badge bg-danger ms-2">{totalBloqueados} bloqueados</span>
          )}
        </button>
      </div>

      {seccionActiva === 'productos' ? (
        <>
          {/* Formulario para Crear / Editar Producto */}
          <div className="profile-card mb-5">
            <h2 className="text-center">{modoEdicion ? 'Editar Prenda' : 'Agregar Nuevo Producto'}</h2>
            <p className="text-center subtitle">Impresión bajo demanda — Sube o edita la información de la prenda</p>

            <form onSubmit={manejarGuardar}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Título de la prenda *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej: Camiseta Urban Skull"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Precio ($ COP) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Ej: 60000"
                    min="0"
                    step="500"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Imagen de la prenda *</label>
                <input
                  type="file"
                  className="form-control bg-dark text-white border-secondary"
                  accept="image/*"
                  onChange={manejarSeleccionImagen}
                />
                {vistaPrevia && (
                  <div className="mt-2 text-center">
                    <img
                      src={vistaPrevia}
                      alt="Vista previa"
                      style={{ maxHeight: 150, borderRadius: 8, border: '1px solid #444' }}
                    />
                  </div>
                )}
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Categoría *</label>
                  <select
                    className="form-control bg-dark text-white border-secondary"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    required
                  >
                    <option value="">Selecciona categoría</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Estado del Producto *</label>
                  <select
                    className="form-control bg-dark text-white border-secondary"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    required
                  >
                    <option value="activo">Activo (Visible en el catálogo)</option>
                    <option value="inactivo">Inactivo (Oculto)</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Tallas disponibles (separadas por comas)</label>
                <input
                  type="text"
                  className="form-control"
                  value={tallas}
                  onChange={(e) => setTallas(e.target.value)}
                  placeholder="XS, S, M, L, XL"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Descripción corta o historia de la prenda</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Describe el concepto o diseño de la prenda..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn-save" disabled={guardando}>
                  {guardando ? 'Procesando...' : modoEdicion ? 'Guardar Cambios' : 'Publicar Prenda'}
                </button>
                {modoEdicion && (
                  <button type="button" className="btn btn-outline-secondary w-50" onClick={resetearFormulario}>
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>

            <AlertaMensaje mensaje={mensaje} esError={mensajeError} />
          </div>

          {/* Lista / Tabla de Productos Existentes */}
          <div className="profile-card">
            <h3 className="section-title">Productos Registrados</h3>
            <p className="text-white-50 small mb-3">Gestiona el estado o modifica los precios y fotos de tus prendas.</p>

            <div className="table-responsive">
              <table className="table table-dark table-hover align-middle">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Título</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoLista ? (
                    <tr><td colSpan={6} className="text-center text-muted">Cargando productos...</td></tr>
                  ) : errorLista ? (
                    <tr>
                      <td colSpan={6} className="text-center text-warning">
                        Conectando servidor...
                        <button className="btn btn-sm btn-outline-light ms-2" onClick={cargarLista}>Reintentar</button>
                      </td>
                    </tr>
                  ) : productos.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted">No hay prendas registradas aún. ¡Sube la primera arriba!</td></tr>
                  ) : (
                    productos.map((prod) => (
                      <tr key={prod.id_producto}>
                        <td>
                          <img
                            src={prod.imagen_url}
                            alt={prod.titulo}
                            style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 4 }}
                          />
                        </td>
                        <td className="fw-bold">{prod.titulo}</td>
                        <td className="text-capitalize">{prod.categoria}</td>
                        <td>${parseInt(prod.precio, 10).toLocaleString('es-CO')}</td>
                        <td>
                          <span className={`badge ${prod.estado === 'activo' ? 'bg-success' : 'bg-danger'}`}>
                            {prod.estado.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-info me-1"
                            onClick={() => prepararEdicion(prod)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${prod.estado === 'activo' ? 'btn-outline-warning' : 'btn-outline-success'} me-1`}
                            onClick={() => alternarEstado(prod)}
                          >
                            {prod.estado === 'activo' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => manejarEliminar(prod)}
                          >
                            Borrar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Sección de Gestión y Bloqueo de Usuarios */
        <div className="profile-card">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h2 className="mb-1">Control y Bloqueo de Usuarios</h2>
              <p className="subtitle mb-0">
                Bloquea cuentas sospechosas, bots o usuarios que realicen spam por WhatsApp.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-info"
              onClick={cargarUsuarios}
              disabled={cargandoUsuarios}
            >
              {cargandoUsuarios ? 'Actualizando...' : 'Actualizar lista'}
            </button>
          </div>

          {/* Métricas rápidas */}
          <div className="admin-stats-grid mb-4">
            <div className="admin-stat-card">
              <span className="stat-numero">{usuarios.length}</span>
              <span className="stat-etiqueta">Total registrados</span>
            </div>
            <div className="admin-stat-card activo">
              <span className="stat-numero">{totalActivos}</span>
              <span className="stat-etiqueta">Cuentas activas</span>
            </div>
            <div className="admin-stat-card bloqueado">
              <span className="stat-numero">{totalBloqueados}</span>
              <span className="stat-etiqueta">Cuentas bloqueadas</span>
            </div>
          </div>

          {/* Buscador y filtro */}
          <div className="row g-2 mb-3">
            <div className="col-md-8">
              <input
                type="search"
                className="form-control"
                placeholder="Buscar por nombre, correo o número de teléfono..."
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-control bg-dark text-white border-secondary"
                value={filtroEstadoUsuario}
                onChange={(e) => setFiltroEstadoUsuario(e.target.value)}
              >
                <option value="todos">Mostrar: Todos</option>
                <option value="activos">Solo Activos</option>
                <option value="bloqueados">Solo Bloqueados</option>
              </select>
            </div>
          </div>

          <AlertaMensaje mensaje={mensajeUsuario} esError={mensajeUsuarioError} />

          <div className="table-responsive mt-3">
            <table className="table table-dark table-hover align-middle">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Teléfono / Dirección</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {cargandoUsuarios ? (
                  <tr><td colSpan={6} className="text-center text-muted">Cargando usuarios...</td></tr>
                ) : errorUsuarios ? (
                  <tr>
                    <td colSpan={6} className="text-center text-warning">
                      {errorUsuarios}
                      <button className="btn btn-sm btn-outline-light ms-2" onClick={cargarUsuarios}>Reintentar</button>
                    </td>
                  </tr>
                ) : usuariosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted">No se encontraron usuarios con ese filtro.</td></tr>
                ) : (
                  usuariosFiltrados.map((usr) => {
                    const esCuentaAdmin = usr.rol === 'ADMINISTRADOR' || usr.rol === 'admin';
                    return (
                      <tr key={usr.id_usuario} className={usr.bloqueado ? 'fila-usuario-bloqueado' : ''}>
                        <td>
                          <div className="fw-bold">{usr.nombre}</div>
                          <div className="small text-white-50">{usr.email}</div>
                        </td>
                        <td>
                          <div className="small">{usr.telefono || 'Sin teléfono'}</div>
                          <div className="small text-white-50">{usr.direccion || 'Sin dirección'}</div>
                        </td>
                        <td>
                          <span className={`badge ${esCuentaAdmin ? 'bg-info text-dark' : 'bg-secondary'}`}>
                            {esCuentaAdmin ? 'ADMIN' : 'CLIENTE'}
                          </span>
                        </td>
                        <td className="small">{formatearFecha(usr.fecha_registro)}</td>
                        <td>
                          {usr.bloqueado ? (
                            <div>
                              <span className="badge bg-danger">BLOQUEADO</span>
                              {usr.motivo_bloqueo && (
                                <div className="motivo-texto-tabla" title={usr.motivo_bloqueo}>
                                  {usr.motivo_bloqueo}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="badge bg-success">ACTIVO</span>
                          )}
                        </td>
                        <td>
                          {esCuentaAdmin ? (
                            <span className="small text-white-50">Protegido</span>
                          ) : usr.bloqueado ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => manejarDesbloqueo(usr)}
                            >
                              Desbloquear
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => abrirModalBloqueo(usr)}
                            >
                              Bloquear
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmación y motivo de bloqueo */}
      {usuarioABloquear && (
        <div
          className="modal-bloqueo-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-bloqueo"
          onClick={(e) => e.target === e.currentTarget && !procesandoBloqueo && setUsuarioABloquear(null)}
        >
          <div className="modal-bloqueo-caja">
            <h3 id="titulo-modal-bloqueo" className="mb-1">Bloquear cuenta de usuario</h3>
            <p className="small text-white-50 mb-3">
              Vas a suspender el acceso de <strong className="text-white">{usuarioABloquear.nombre}</strong> ({usuarioABloquear.email}). Su sesión se cerrará inmediatamente y no podrá volver a ingresar.
            </p>

            <form onSubmit={confirmarBloqueo}>
              <label className="form-label">Selecciona el motivo del bloqueo:</label>
              <div className="motivos-grid mb-3">
                {MOTIVOS_BLOQUEO_RAPIDOS.map((motivo) => (
                  <button
                    key={motivo}
                    type="button"
                    className={`motivo-chip ${motivoSeleccionado === motivo ? 'activo' : ''}`}
                    onClick={() => setMotivoSeleccionado(motivo)}
                  >
                    {motivo}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <label className="form-label">
                  {motivoSeleccionado === 'Otro motivo'
                    ? 'Escribe el motivo del bloqueo *'
                    : 'Detalle adicional (opcional)'}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Envió 30 mensajes falsos al WhatsApp..."
                  value={motivoPersonalizado}
                  onChange={(e) => setMotivoPersonalizado(e.target.value)}
                  required={motivoSeleccionado === 'Otro motivo'}
                />
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setUsuarioABloquear(null)}
                  disabled={procesandoBloqueo}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-danger fw-bold"
                  disabled={procesandoBloqueo}
                >
                  {procesandoBloqueo ? 'Bloqueando...' : 'Confirmar Bloqueo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}