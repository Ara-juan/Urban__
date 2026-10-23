// página de colecciones, renderiza los catálogos separados por categoría
import { useState } from 'react';
import { Link } from 'react-router-dom';
import useProductos from '../hooks/useProductos.js';
import CarruselProductos from '../components/CarruselProductos.jsx';
import ModalProducto from '../components/ModalProducto.jsx';
import { useFiltros, filtrarProductos } from '../context/FiltrosContext.jsx';
import './Colecciones.css';

export default function Colecciones() {
  const hombre = useProductos('hombre');
  const mujer = useProductos('mujer');
  const unisex = useProductos('unisex');

  // traemos el estado global de los filtros de la barra superior
  const { busqueda, precioMax } = useFiltros();
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // ejecutamos el filtrado para cada categoría independientemente
  const productosHombreFiltrados = filtrarProductos(hombre.productos, busqueda, precioMax);
  const productosMujerFiltrados = filtrarProductos(mujer.productos, busqueda, precioMax);
  const productosUnisexFiltrados = filtrarProductos(unisex.productos, busqueda, precioMax);

  return (
    <main>
      {/* seo técnico nativo de react 19 para la vista completa */}
      <title>Colecciones de Ropa Urbana | Americanoshh</title>
      <meta name="description" content="explora nuestras colecciones divididas por categoría. moda streetwear para hombre, mujer y estilos unisex." />
      
      {/* encabezado principal oculto para mantener el diseño visual pero informar a google */}
      <h1 className="sr-only">Colecciones Americanoshh</h1>

      <section className="catalog" aria-labelledby="titulo-hombre">
        <Link to="/hombre" aria-label="ver todo el catálogo para hombres">
          <h2 id="titulo-hombre">Hombres</h2>
        </Link>
        <CarruselProductos 
          productos={productosHombreFiltrados} 
          cargando={hombre.cargando} 
          error={hombre.error} 
          onVerDetalle={setProductoSeleccionado} 
        />
      </section>

      <section className="catalog" aria-labelledby="titulo-mujer">
        <Link to="/mujer" aria-label="ver todo el catálogo para mujeres">
          <h2 id="titulo-mujer">Mujeres</h2>
        </Link>
        <CarruselProductos 
          productos={productosMujerFiltrados} 
          cargando={mujer.cargando} 
          error={mujer.error} 
          onVerDetalle={setProductoSeleccionado} 
        />
      </section>

      <section className="catalog" aria-labelledby="titulo-unisex">
        <Link to="/unisex" aria-label="ver todo el catálogo unisex">
          <h2 id="titulo-unisex">Unisex</h2>
        </Link>
        <CarruselProductos 
          productos={productosUnisexFiltrados} 
          cargando={unisex.cargando} 
          error={unisex.error} 
          onVerDetalle={setProductoSeleccionado} 
        />
      </section>

      {productoSeleccionado && (
        <ModalProducto producto={productoSeleccionado} onCerrar={() => setProductoSeleccionado(null)} />
      )}
    </main>
  );
}