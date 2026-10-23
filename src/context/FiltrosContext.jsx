import { createContext, useContext, useState, useMemo } from 'react';

// contexto para compartir el texto de búsqueda y límite de precio
const FiltrosContext = createContext(null);

export function FiltrosProvider({ children }) {
  const [busqueda, setBusqueda] = useState('');
  const [precioMax, setPrecioMax] = useState('all');

  // memoriza los filtros para evitar renders innecesarios
  const valor = useMemo(
    () => ({
      busqueda,
      setBusqueda,
      precioMax,
      setPrecioMax
    }),
    [busqueda, precioMax]
  );

  return <FiltrosContext.Provider value={valor}>{children}</FiltrosContext.Provider>;
}

// hook para acceder fácilmente a los filtros
export function useFiltros() {
  const contexto = useContext(FiltrosContext);
  if (!contexto) {
    throw new Error('useFiltros debe usarse dentro de un FiltrosProvider');
  }
  return contexto;
}

// aplica los filtros de la barra superior a la lista de productos
export function filtrarProductos(productos, busqueda, precioMax) {
  // convertimos a minúsculas para ignorar diferencias en la búsqueda
  const query = busqueda.toLowerCase().trim();

  return productos.filter((producto) => {
    const titulo = (producto.titulo || '').toLowerCase();
    const descripcion = (producto.descripcion || '').toLowerCase();
    
    // revisa si el texto coincide con título o descripción
    const coincideTexto = titulo.includes(query) || descripcion.includes(query);
    
    // evalúa si el precio respeta el tope máximo
    const coincidePrecio = precioMax === 'all' || Number(producto.precio) <= parseInt(precioMax, 10);
    
    return coincideTexto && coincidePrecio;
  });
}