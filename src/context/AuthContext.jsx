import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { obtenerFavoritos, agregarFavorito, eliminarFavorito } from '../services/api.js';

// creamos el contexto de autenticación como almacén central del usuario
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // iniciamos el estado leyendo el almacenamiento local una sola vez
  const [usuario, setUsuario] = useState(() => {
    try {
      const raw = localStorage.getItem('urban_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // lista completa de prendas guardadas en favoritos del usuario
  const [favoritos, setFavoritos] = useState([]);

  const token = localStorage.getItem('urban_token');
  const sesionActiva = Boolean(token && usuario);

  // carga o actualiza los favoritos desde el servidor cuando hay sesión activa
  const recargarFavoritos = useCallback(async () => {
    if (!localStorage.getItem('urban_token')) {
      setFavoritos([]);
      return;
    }
    try {
      const lista = await obtenerFavoritos();
      setFavoritos(Array.isArray(lista) ? lista : []);
    } catch {
      setFavoritos([]);
    }
  }, []);

  useEffect(() => {
    if (sesionActiva) {
      recargarFavoritos();
    } else {
      setFavoritos([]);
    }
  }, [sesionActiva, recargarFavoritos]);

  const esFavorito = useCallback(
    (idProducto) => favoritos.some((fav) => Number(fav.id_producto) === Number(idProducto)),
    [favoritos]
  );

  // agrega o quita un producto de favoritos con actualización optimista en pantalla
  const alternarFavorito = useCallback(
    async (producto) => {
      if (!producto?.id_producto) return;
      const yaGuardado = favoritos.some(
        (fav) => Number(fav.id_producto) === Number(producto.id_producto)
      );

      if (yaGuardado) {
        setFavoritos((prev) =>
          prev.filter((fav) => Number(fav.id_producto) !== Number(producto.id_producto))
        );
        try {
          await eliminarFavorito(producto.id_producto);
        } catch {
          recargarFavoritos();
        }
      } else {
        setFavoritos((prev) => [producto, ...prev]);
        try {
          await agregarFavorito(producto.id_producto);
        } catch {
          recargarFavoritos();
        }
      }
    },
    [favoritos, recargarFavoritos]
  );

  // memorizamos el objeto de contexto para evitar re-renders innecesarios
  const valor = useMemo(() => {
    const esAdmin = usuario ? usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'admin' : false;

    return {
      usuario,
      sesionActiva,
      esAdmin,
      favoritos,
      esFavorito,
      alternarFavorito,
      recargarFavoritos,
      // actualiza el estado local y localStorage al iniciar sesión o editar perfil
      iniciarSesionLocal(nuevoUsuario) {
        if (nuevoUsuario) {
          localStorage.setItem('urban_user', JSON.stringify(nuevoUsuario));
        }
        setUsuario(nuevoUsuario);
      },
      // limpia el token y los datos guardados al salir
      cerrarSesionLocal() {
        localStorage.removeItem('urban_token');
        localStorage.removeItem('urban_user');
        setUsuario(null);
        setFavoritos([]);
      }
    };
  }, [usuario, sesionActiva, favoritos, esFavorito, alternarFavorito, recargarFavoritos]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// hook para usar la sesión en cualquier parte
export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
}