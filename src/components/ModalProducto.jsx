// ventana modal para previsualizar los detalles del producto antes de comprar
import { useEffect, useState } from 'react';
import './ModalProducto.css';

// Guardamos solo el número de teléfono base en una constante
const NUMERO_WHATSAPP = '573124363561';

export default function ModalProducto({ producto, onCerrar }) {
  // guarda la talla que el usuario clica en el modal
  const [tallaSeleccionada, setTallaSeleccionada] = useState(null);
  
  // asegura un listado de tallas aunque la base de datos falle
  const tallas = Array.isArray(producto?.tallas) && producto.tallas.length > 0 ? producto.tallas : ['XS', 'S', 'M', 'L', 'XL'];

  // permite cerrar el modal pulsando esc en el teclado
  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [onCerrar]);

  if (!producto) return null;
  const precioFormateado = `$${parseInt(producto.precio, 10).toLocaleString('es-CO')}`;

  // Armamos el mensaje dinámico para WhatsApp incluyendo el nombre del producto y la talla si fue seleccionada
  const textoTalla = tallaSeleccionada ? ` (Talla: ${tallaSeleccionada})` : '';
  const mensajePrearmado = `Hola, estoy interesado en el producto ${producto.titulo}${textoTalla}, quiero tener más información sobre el producto.`;
  
  // Codificamos el mensaje para que los espacios y caracteres no rompan el enlace web
  const urlWhatsappDinamica = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensajePrearmado)}`;

  // seo avanzado: construimos la metadata estructurada para los rich snippets de google
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": producto.titulo,
    "image": producto.imagen_url,
    "description": producto.descripcion || "prenda de estilo urbano americanoshh",
    "brand": {
      "@type": "Brand",
      "name": "Americanoshh"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "COP",
      "price": producto.precio,
      "availability": "https://schema.org/InStock",
      "url": window.location.href
    }
  };

  return (
    <div 
      id="product-modal" 
      className="modal show" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-titulo"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      {/* inyectamos el schema invisiblemente en el html del modal */}
      <script type="application/ld+json">
        {JSON.stringify(productSchema)}
      </script>

      <div className="modal-content">
        {/* el aspa de cerrar ahora es accesible por teclado */}
        <span 
          className="close-modal" 
          onClick={onCerrar} 
          role="button" 
          tabIndex="0" 
          aria-label="cerrar ventana de producto"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onCerrar()}
        >
          &times;
        </span>

        <div className="modal-body">
          <div className="modal-left">
            <div className="image-container">
              <img src={producto.imagen_url} alt={`vista detallada de ${producto.titulo}`} />
            </div>
          </div>

          <div className="modal-right">
            {/* id dinámico para el aria-labelledby del contenedor del modal */}
            <h2 id="modal-titulo" className="urban-title">{producto.titulo}</h2>
            <p className="modal-stock" aria-live="polite">En stock</p>
            <p className="modal-price" aria-label={`precio: ${precioFormateado}`}>{precioFormateado}</p>

            <div className="modal-sizes" role="group" aria-label="selección de talla">
              <h3 className="urban-subtitle">Tallas</h3>
              <div className="sizes-grid">
                {tallas.map((talla) => (
                  <button
                    key={talla}
                    type="button"
                    className={`size-btn ${tallaSeleccionada === talla ? 'seleccionada' : ''}`}
                    onClick={() => setTallaSeleccionada(talla)}
                    aria-pressed={tallaSeleccionada === talla}
                  >
                    {talla}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="btn-buy" aria-label="comprar producto a través de whatsapp">
              <span>
                {/* Aquí inyectamos la URL dinámica que generamos arriba */}
                <a href={urlWhatsappDinamica} target="_blank" rel="noopener noreferrer">Compra Ahora</a>
              </span>
            </button>

            <p className="modal-desc">{producto.descripcion || 'sin descripción disponible.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}