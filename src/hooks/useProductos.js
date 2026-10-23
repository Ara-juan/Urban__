// hook reutilizable: carga productos desde la api, opcionalmente filtrados por categoría
import { useState, useEffect } from 'react';
import { obtenerProductos } from '../services/api.js';

// almacena los datos devueltos, el indicador de carga y cualquier error de red
export default function useProductos(categoria) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // para evitar llamadas a setstate en componentes que ya se han desmontado
    let cancelado = false;
    setCargando(true);
    setError(null);

    // llamada al servicio de api pasando la categoría opcional (ej: hombre, mujer, etc)
    obtenerProductos(categoria)
      .then((data) => {
        if (!cancelado) setProductos(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    // función de limpieza que react ejecuta al desmontar el componente
    return () => {
      cancelado = true;
    };
  }, [categoria]); // se reejecuta automáticamente cada vez que la categoría solicitada cambia

  // retorna los 3 estados fundamentales para que cualquier vista los consuma fácilmente
  return { productos, cargando, error };
}