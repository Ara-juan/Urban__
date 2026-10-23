// Página de administración de productos
// Protegida: solo administradores. CRUD completo + subida de imágenes a Supabase Storage.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  obtenerProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto
} from '../services/api.js';
import { subirImagenASupabase } from '../services/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import AlertaMensaje from '../components/AlertaMensaje.jsx';
import './AdminProductos.css';

const TALLAS_POR_DEFECTO = ['XS', 'S', 'M', 'L', 'XL'];

export default function AdminProductos() {
  const { sesionActiva, esAdmin } = useAuth();
  const navigate = useNavigate();

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

  const mostrarMensaje = (texto, esError = false) => {
    setMensaje(texto);
    setMensajeError(esError);
  };

  // Protección de la ruta, exige sesión de administrador
  //verifica que haya una sesion iniciada y que el usuario tenga el rol administrador
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

  useEffect(() => {
    if (sesionActiva && esAdmin) cargarLista();
  }, [sesionActiva, esAdmin]);

  // Genera una url temporal en memoria del navegador, pa mostrar una vista previa de la imagen
  // seleccionada antes de subirla a la nube
  const manejarSeleccionImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivo(file);
    setVistaPrevia(URL.createObjectURL(file));
  };

  // Guarda (crea o actualiza) el producto
  // gestiona el envio del formulario. si se selecciono un archivo nuevo
  //Primero lo sube a supabase storage y luego guarda el producto en postgreSQL
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
        // En edición, si no se sube una nueva imagen se conserva la actual
        const productoActual = productos.find((p) => String(p.id_producto) === String(prodId));
        imagenUrl = productoActual?.imagen_url || null;
      }

      if (!imagenUrl) {
        mostrarMensaje('Por favor selecciona una imagen para la prenda.', true);
        return;
      }

      // Convierte la cadena separada por comas (ej: "S, M, L") en un arreglo limpio para la BD
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

      // Alterna dinámicamente entre la API de actualizar o crear según la variable "modoEdicion"
      const resultado = modoEdicion
        ? await actualizarProducto(prodId, datos)
        : await crearProducto(datos);

      mostrarMensaje(resultado.mensaje || 'Operación realizada con éxito', false);
      resetearFormulario();
      cargarLista(); //recarga la tabla de productos
    } catch (error) {
      mostrarMensaje(error.message || 'Error de conexión con el servidor.', true);
    } finally {
      setGuardando(false);
    }
  };

  //carga los datos seleccionados  en los campos del formulario
  // Llena el formulario con los datos del producto a editar
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

  // Activa / desactiva un producto (no lo borra)
  const alternarEstado = async (prod) => {
    const nuevoEstado = prod.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await actualizarProducto(prod.id_producto, { estado: nuevoEstado });
      cargarLista();
    } catch (error) {
      alert(error.message || 'Error al cambiar el estado del producto.');
    }
  };

  // Elimina el producto definitivamente
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

  if (!sesionActiva || !esAdmin) return null;

  return (
    <main className="container my-4 admin-main">
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
    </main>
  );
}