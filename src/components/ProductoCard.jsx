// Tarjeta de producto con botón de guardar en favoritos
// Al hacer clic abre el modal con los detalles (via prop onVerDetalle).
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './ProductoCard.css';

export default function ProductoCard({ producto, onVerDetalle }) {
  const { sesionActiva, esFavorito, alternarFavorito } = useAuth();
  const navigate = useNavigate();

  const precioFormateado = `$${parseInt(producto.precio, 10).toLocaleString('es-CO')}`;
  const guardado = esFavorito(producto.id_producto);

  // Función añadida para accesibilidad SEO: permite interactuar usando teclado
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onVerDetalle(producto);
    }
  };

  const manejarClickFavorito = (e) => {
    e.stopPropagation();
    if (!sesionActiva) {
      navigate('/login?tab=register');
      return;
    }
    alternarFavorito(producto);
  };

  return (
    <article
      className="card"
      data-desc={producto.descripcion || 'Sin descripción disponible.'}
      onClick={() => onVerDetalle(producto)}
      role="button"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      aria-label={`Ver detalles de la prenda: ${producto.titulo}`}
    >
      <button
        type="button"
        className={`btn-favorito-card ${guardado ? 'guardado' : ''}`}
        onClick={manejarClickFavorito}
        aria-label={guardado ? `Quitar ${producto.titulo} de favoritos` : `Guardar ${producto.titulo} en favoritos`}
        aria-pressed={guardado}
        title={
          sesionActiva
            ? guardado
              ? 'Guardado en tus favoritos'
              : 'Guardar en favoritos'
            : 'Inicia sesión o regístrate para guardar favoritos'
        }
      >
        {guardado ? '♥' : '♡'}
      </button>

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