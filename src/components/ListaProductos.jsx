// Cuadrícula de productos con manejo de carga, error y lista vacía.
// Envuelve ProductoCard y aplica los filtros globales de la navbar.
import ProductoCard from './ProductoCard.jsx';
import './GridCatalogo.css';
import { filtrarProductos, useFiltros } from '../context/FiltrosContext.jsx';

export default function ListaProductos({ productos, cargando, error, onVerDetalle }) {
  // obtenemos los valores de busqueda de texto y precio máximo configurados por el usuario desde la barra de navegación
  // mediante un custom hook global
  const { busqueda, precioMax } = useFiltros();
  
  // Evaluamos primero las condiciones de red antes de aplicar filtros o procesar la lista
  // 1. Mensaje visual mientras la petición a la base de datos o API sigue pendiente.
  if (cargando) {
    return <div className="text-center w-100 py-4 text-muted" role="alert" aria-live="polite">Cargando productos del catálogo...</div>;
  }
  
  // 2. Mensaje de advertencia si falló la conexión con el servidor
  if (error) {
    return <div className="text-center w-100 py-4 text-warning" role="alert">Error al conectar con el servidor de productos.</div>;
  }
  
  // Aplica los filtros de texto y rango de precio sobre la lista original de productos 
  // recibida por props, generando una nueva lista filtrada para el renderizado
  const productosFiltrados = filtrarProductos(productos, busqueda, precioMax);
  
  // miramos la causa si no hay producto pa mostrar.
  if (productosFiltrados.length === 0) {
    // Primer caso; el usuario aplico filtros que no arrojan coincidencias
    if (busqueda.trim() !== '' || precioMax !== 'all') {
      return <div className="text-center w-100 py-4 text-muted" role="status">No hay prendas que coincidan con la búsqueda.</div>;
    }
    // segundo caso; La categoría o catalogo directamente no tienen items registrados
    return <div className="text-center w-100 py-4 text-muted" role="status">No hay prendas disponibles en esta categoría por el momento.</div>;
  }

  return (
    // SE CAMBIÓ <div> POR <section> PARA MEJORAR LA SEMÁNTICA SEO
    <section className="catalog-grid" aria-label="Catálogo de ropa">
      {productosFiltrados.map((producto) => (
        <ProductoCard key={producto.id_producto} producto={producto} onVerDetalle={onVerDetalle} />
      ))}
    </section>
  );
}