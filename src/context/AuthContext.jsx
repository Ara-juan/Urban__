import { createContext, useContext, useState, useMemo } from 'react';

// creamos el contexto de autenticación como almacén central del usuario
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // iniciamos el estado leyendo el almacenamiento local una sola vez
  const [usuario, setUsuario] = useState(() => {
    try {
      const raw = localStorage.getItem('urban_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      // si el json es inválido, retornamos null por seguridad
      return null;
    }
  });

  // memorizamos el objeto de contexto para evitar re-renders innecesarios
  const valor = useMemo(() => {
    const token = localStorage.getItem('urban_token');
    
    // validamos si la sesión está activa
    const sesionActiva = Boolean(token && usuario);
    
    // verificación flexibilizada de roles
    const esAdmin = usuario ? usuario.rol === 'ADMINISTRADOR' || usuario.rol === 'admin' : false;

    return {
      usuario,
      sesionActiva,
      esAdmin,
      // actualiza el estado local al iniciar sesión
      iniciarSesionLocal(nuevoUsuario) {
        setUsuario(nuevoUsuario);
      },
      // limpia el token y los datos guardados al salir
      cerrarSesionLocal() {
        localStorage.removeItem('urban_token');
        localStorage.removeItem('urban_user');
        setUsuario(null);
      }
    };
  }, [usuario]);

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