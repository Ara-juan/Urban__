// Tarjeta de producto
// Al hacer clic abre el modal con los detalles (via prop onVerDetalle).
export default function ProductoCard({ producto, onVerDetalle }) {
  const precioFormateado = `$${parseInt(producto.precio, 10).toLocaleString('es-CO')}`;

  // Función añadida para accesibilidad SEO: permite interactuar usando teclado
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onVerDetalle(producto);
    }
  };

  return (
    // cambiamos el <div> POR <article> y ponemos accesibilidad para el evento click
    <article
      className="card"
      data-desc={producto.descripcion || 'Sin descripción disponible.'}
      onClick={() => onVerDetalle(producto)}
      role="button"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      aria-label={`Ver detalles de la prenda: ${producto.titulo}`}
    >
      {/* añadimos LOADING="LAZY" y un texto ALT mas descriptivo */}
      <img 
        src={producto.imagen_url} 
        alt={`Prenda urbana: ${producto.titulo}`} 
        loading="lazy" 
      />
      <h3>{producto.titulo}</h3>
      <p className="price">{precioFormateado}</p>
      <p className="desc"></p>
    </article>
  );
}