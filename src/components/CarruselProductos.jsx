// carrusel horizontal de productos con flechas de navegación 
import { useRef } from 'react';
import ProductoCard from './ProductoCard.jsx';
import './CarruselProductos.css';

export default function CarruselProductos({ productos, cargando, error, onVerDetalle }) {
  // useref guarda una referencia directa al nodo del dom sin provocar renders extra
  const contenedorRef = useRef(null);

  // desplaza el carrusel horizontalmente de forma suave
  const desplazar = (direccion) => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    contenedor.scrollBy({ left: contenedor.offsetWidth * direccion, behavior: 'smooth' });
  };

  // retornos tempranos para controlar las fases de carga y error usando las clases css personalizadas
  if (cargando) {
    return <div className="text-center w-100 py-4 estado-carga" role="status">cargando colección...</div>;
  }

  if (error) {
    return <div className="text-center w-100 py-4 estado-error" role="alert">error al conectar con el servidor de productos.</div>;
  }

  if (productos.length === 0) {
    return <div className="text-center w-100 py-4 estado-vacio" role="status">no hay prendas disponibles en esta colección por el momento.</div>;
  }

  return (
    // envolvemos en un section con etiqueta aria para mejorar la semántica
    <section className="carousel-container" aria-label="carrusel de prendas destacadas">
      <button className="arrow left-arrow" onClick={() => desplazar(-1)} aria-label="ver productos anteriores">&#10094;</button>

      <div className="products" ref={contenedorRef} tabIndex="0" aria-label="lista desplazable de productos">
        {productos.map((producto) => (
          <ProductoCard key={producto.id_producto} producto={producto} onVerDetalle={onVerDetalle} />
        ))}
      </div>

      <button className="arrow right-arrow" onClick={() => desplazar(1)} aria-label="ver más productos">&#10095;</button>
    </section>
  );
}