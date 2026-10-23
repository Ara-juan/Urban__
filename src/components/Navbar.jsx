import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useFiltros } from '../context/FiltrosContext.jsx';
import { cerrarSesion } from '../services/api.js';
import './Navbar.css';

export default function Navbar() {
  // traemos la info del usuario y las herramientas de filtrado desde el contexto
  const { sesionActiva, usuario, esAdmin, cerrarSesionLocal } = useAuth();
  const { busqueda, setBusqueda, precioMax, setPrecioMax } = useFiltros();
  
  // hooks básicos para mover al usuario de una vista a otra
  const navigate = useNavigate();
  const location = useLocation();

  // hacemos que el nav se quede pegado arriba solo si estamos en perfil o admin
  const esFija = location.pathname === '/perfil' || location.pathname === '/admin-productos';
  
  // listado de páginas principales para pintar el menú fácilmente
  const enlaces = [
    { ruta: '/catalogo', texto: 'Catálogo' },
    { ruta: '/hombre', texto: 'Hombre' },
    { ruta: '/mujer', texto: 'Mujer' },
    { ruta: '/unisex', texto: 'Unisex' },
    { ruta: '/colecciones', texto: 'Colecciones' },
    { ruta: '/acerca-de', texto: 'Acerca de' }
  ];

  // borramos datos de sesión y mandamos al usuario al login
  const manejarCerrarSesion = () => {
    cerrarSesion();
    cerrarSesionLocal();
    navigate('/login');
  };

  return (
    <header>
      {/* le indicamos a los motores de búsqueda que esta es la navegación principal */}
      <nav className={`navbar ${esFija ? 'navbar-fija' : ''}`} aria-label="navegación principal">
        <div className="logo">
          {/* el logo siempre debe llevar de vuelta al inicio y tener un alt claro */}
          <Link to="/acerca-de" aria-label="ir al inicio de americanoshh">
            <img src="/assets/logo.png" alt="logo de americanoshh" />
          </Link>
        </div>

        <ul className="nav-links"> 
          {enlaces.map((enlace) => (
            <li key={enlace.ruta}>
              <NavLink to={enlace.ruta} className={({ isActive }) => (isActive ? 'active' : '')}>
                {enlace.texto}
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink to="/perfil" className={({ isActive }) => (isActive ? 'active' : '')}>
              Perfil
            </NavLink>
          </li>
        </ul>

        {/* cambiamos un simple div por un formulario real para mejorar el seo y accesibilidad */}
        <form 
          className="search-bar" 
          role="search" 
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="search"
            aria-label="buscar prendas por nombre"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select 
            aria-label="filtrar por precio" 
            value={precioMax} 
            onChange={(e) => setPrecioMax(e.target.value)}
          >
            <option value="all">Todos los precios</option>
            <option value="50000">Hasta $50.000</option>
            <option value="60000">Hasta $60.000</option>
          </select>
          <button type="submit" aria-label="iniciar búsqueda">🔍</button>
        </form>

        {/* zona de perfil, botones de login o administración */}
        <div className="menu-usuario d-flex align-items-center ms-3">
          {sesionActiva ? (
            <>
              <span className="text-white small me-2">
                Hola, <strong>{usuario?.nombre || usuario?.email}</strong>
              </span>
              {esAdmin && (
                <Link to="/admin-productos" className="btn btn-warning btn-sm me-2 fw-bold">
                  ⚙️ Admin
                </Link>
              )}
              <Link to="/perfil" className="btn btn-outline-info btn-sm me-2">Perfil</Link>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={manejarCerrarSesion}>
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Iniciar Sesión / Registrarse</Link>
          )}
        </div>
      </nav>
    </header>
  );
}