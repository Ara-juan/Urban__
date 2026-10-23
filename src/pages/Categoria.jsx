// página genérica de categoría: usada por las rutas /hombre, /mujer y /unisex
import { useState } from 'react';
import useProductos from '../hooks/useProductos.js';
import ListaProductos from '../components/ListaProductos.jsx';
import ModalProducto from '../components/ModalProducto.jsx';

export default function Categoria({ categoria, titulo }) {
  const { productos, cargando, error } = useProductos(categoria);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  return (
    <main className="catalog">
      {/* metadatos dinámicos que cambian automáticamente según la categoría seleccionada */}
      <title>{`${titulo} - Ropa Urbana | Americanoshh`}</title>
      <meta name="description" content={`descubre nuestra ${titulo.toLowerCase()}. prendas exclusivas y streetwear para ${categoria}.`} />

      {/* también cambiamos este h2 a h1 para mantener la estructura semántica sana */}
      <h1>{titulo}</h1>
      
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