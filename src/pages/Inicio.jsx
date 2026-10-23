// landing page principal 
import { Link } from 'react-router-dom';
import './Inicio.css';

export default function Inicio() {
  return (
    // cambiamos el div genérico por un main para mejorar la semántica
    <main className="container inicio-container">
      {/* metadatos nativos para seo en la página principal */}
      <title>Americanoshh | Ropa Urbana y Streetwear</title>
      <meta name="description" content="bienvenido a americanoshh. ropa urbana nacida en el asfalto. ingresa a nuestra tienda y descubre colecciones exclusivas." />

      {/* título h1 oculto visualmente pero vital para que google entienda de qué va la página */}
      <h1 className="sr-only">Americanoshh - Tienda Oficial de Ropa Urbana</h1>

      {/* logo de la marca con su atributo alt */}
      <img src="/assets/logo.png" alt="logo principal de americanoshh" className="logo" />

      {/* slogan de la marca, ahora como h2 para mantener la jerarquía de títulos */}
      <h2 className="slogan">
        NACIDOS EN EL ASFALTO<br />CREADOS EN SILENCIO.
      </h2>

      {/* sección de botones agrupada y con accesibilidad */}
      <section className="buttons" aria-label="opciones de ingreso">
        <p>Ingresar sin cuenta</p>
        {/* agregamos aria-label para que los lectores de pantalla sepan la diferencia entre ambos botones */}
        <Link to="/colecciones" aria-label="ingresar a ver las colecciones sin iniciar sesión">
          <button type="button" className="btn">Ingresar</button>
        </Link>

        <p>¿Tienes cuenta o deseas registrarte?</p>
        <Link to="/login" aria-label="ingresar o registrar una cuenta nueva">
          <button type="button" className="btn">Ingresar</button>
        </Link>
      </section>

      {/* enlace inferior */}
      <Link to="/acerca-de" className="footer-link" aria-label="leer más acerca de la historia de americanoshh">
        <p className="footer">ACERCA DE AMERICANOSHH</p>
      </Link>
    </main>
  );
}