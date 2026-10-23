// página institucional sobre la historia y redes de la marca
import './AcercaDe.css';

export default function AcercaDe() {
  return (
    <main className="about">
      {/* seo técnico de la sección institucional */}
      <title>Acerca de Americanoshh | Nuestra Historia</title>
      <meta name="description" content="conoce la historia detrás de americanoshh. calidad no cantidad es nuestra identidad. descubre nuestro estilo urbano." />

      {/* reemplazamos el div general por un article semántico */}
      <article className="about-content">
        <div className="about-logo">
          <img src="/assets/logo.png" alt="logotipo oficial de la marca americanoshh" loading="lazy" />
        </div>

        <section className="about-text">
          {/* elevamos la etiqueta de h2 a h1 para estructurar correctamente la vista */}
          <h1>¿QUÉ ES AMERICANOSHH?</h1>
          <p>Americanos! una revelación en la estética y el diseño urbano.</p>
          <p>Descubre tu esencia y muestra tu estilo con nuestra marca de ropa.</p>
          <p><strong>Calidad no cantidad</strong> es la identidad del clan.</p>

          <h2>SÍGUENOS EN NUESTROS CANALES</h2>
          <ul className="socials">
            <li>Instagram: <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="visitar nuestro perfil en instagram">@americanos</a></li>
            <li>TikTok: <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="visitar nuestro perfil en tiktok">@americanos</a></li>
            <li>Facebook: <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="visitar nuestra página en facebook">Americanoshh</a></li>
          </ul>
        </section>
      </article>
    </main>
  );
}