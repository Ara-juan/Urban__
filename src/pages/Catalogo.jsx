// página catálogo, muestra todos los productos activos 
import { useState } from 'react';
import useProductos from '../hooks/useProductos.js';
import ListaProductos from '../components/ListaProductos.jsx';
import ModalProducto from '../components/ModalProducto.jsx';

export default function Catalogo() {
  const { productos, cargando, error } = useProductos(); // sin categoría = todo el catálogo
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  return (
    <main className="catalog">
      {/* metadatos seo para la vista completa del catálogo */}
      <title>Catálogo de Ropa Urbana | Americanoshh</title>
      <meta name="description" content="explora todo nuestro catálogo de ropa. camisetas, hoodies y accesorios exclusivos del streetwear." />

      {/* cambiamos h2 por h1 ya que es el título principal de la vista */}
      <h1>Catálogo de Ropa</h1>
      
      <ListaProductos
        productos={productos}
        cargando={cargando}
        error={error}
        onVerDetalle={setProductoSeleccionado}
      />

      {productoSeleccionado && (
        <ModalProducto producto={productoSeleccionado} onCerrar={() => setProductoSeleccionado(null)} />
      )}
    </main>
  );
}