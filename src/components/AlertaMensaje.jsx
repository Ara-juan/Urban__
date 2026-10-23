// mensaje reutilizable para mostrar respuestas de la api (éxito/error)
export default function AlertaMensaje({ mensaje, esError }) {
  if (!mensaje) return null;

  return (
    // usamos role="alert" y aria-live para que los lectores de pantalla anuncien el mensaje de inmediato
    <div 
      role="alert" 
      aria-live={esError ? "assertive" : "polite"} 
      className={`mt-3 text-center fw-bold ${esError ? 'text-danger' : 'text-success'}`}
    >
      {mensaje}
    </div>
  );
}