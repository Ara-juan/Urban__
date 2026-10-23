require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

//comprobamos la presencia de JWT_SECRET antes de arrancar
// y detenemos la ejecución inmediatamente si falta para evitar que la app funcione sin seguridad
if (!JWT_SECRET) {
  console.error("ERROR FATAL: JWT_SECRET no está definida en el archivo .env");
  process.exit(1);
}

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token." });
  }

  try {
    const verificado = jwt.verify(token, JWT_SECRET);
    req.usuario = verificado;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido o expirado." });
  }
};

const verificarAdmin = (req, res, next) => {
  if (req.usuario && (req.usuario.rol === 'ADMINISTRADOR' || req.usuario.rol === 'admin')) {
    next();
  } else {
    return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." });
  }
};

// RUTAS DE USUARIOS:

// Registro de usuarios
app.post('/api/usuarios/registro', async (req, res) => {
  const { nombre, email, contrasena, telefono, direccion } = req.body;

  if (!nombre || !email || !contrasena) {
    return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios." });
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "El correo electrónico no tiene un formato válido." });
  }

  if (contrasena.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener como mínimo 8 caracteres." });
  }

  if (telefono && !/^\d+$/.test(telefono)) {
    return res.status(400).json({ error: "El campo teléfono solo debe contener números." });
  }

  try {
    const passwordHash = await bcrypt.hash(contrasena, SALT_ROUNDS);

    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios (nombre, email, contrasena, telefono, direccion) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id_usuario, nombre, email, rol, fecha_registro`,
      [nombre, email, passwordHash, telefono, direccion]
    );

    res.status(201).json({
      mensaje: "Usuario registrado con éxito",
      usuario: nuevoUsuario.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El correo electrónico ya se encuentra registrado." });
    }
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Login
app.post('/api/usuarios/login', async (req, res) => {
  const { email, contrasena } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({ error: "Por favor ingresa email y contraseña." });
  }

  try {
    const usuario = await pool.query(
      'SELECT id_usuario, nombre, email, contrasena, rol FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "El correo electrónico no existe en el sistema." });
    }

    const usuarioEncontrado = usuario.rows[0];

    const esPasswordValida = await bcrypt.compare(contrasena, usuarioEncontrado.contrasena);
    if (!esPasswordValida) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    const token = jwt.sign(
      { id: usuarioEncontrado.id_usuario, email: usuarioEncontrado.email, rol: usuarioEncontrado.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensaje: "Inicio de sesión exitoso.",
      token,
      usuario: {
        id: usuarioEncontrado.id_usuario,
        nombre: usuarioEncontrado.nombre,
        email: usuarioEncontrado.email,
        rol: usuarioEncontrado.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor al intentar iniciar sesión." });
  }
});

// recuperar contraseña, enviar correo mediante Resend API HTTP
// endpoint para iniciar la recuperación de la contraseña.
// genera un token temporal y envia un correo maquetado en HTLM utilizando la API de resend
app.post('/api/usuarios/recuperar-contrasena', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Por favor ingresa tu correo electrónico." });
  }

  try {
    const consulta = await pool.query('SELECT id_usuario, nombre FROM usuarios WHERE email = $1', [email]);
    if (consulta.rows.length === 0) {
      return res.status(404).json({ error: "No existe ninguna cuenta registrada con este correo." });
    }

    const usuario = consulta.rows[0];

    //Creamos un token JWT firmado exclusivo para recuperar la contraseña, con una validez corta de 1 hora
    const tokenRecuperacion = jwt.sign(
      { id: usuario.id_usuario, email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    //Enlace apuntando al cliente en Netlify pasando el token en la URL como parámetro de consulta 
    // o sea; URL limpia sin depender de variables con corchetes
    const enlaceRecuperacion = `https://americanos-hh.netlify.app/login?resetToken=${tokenRecuperacion}`;

    // Plantilla HTML con estilos inline optimizada para clientes de correo (Outlook, Gmail, Apple Mail)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 25px; border-radius: 10px;">
        <h2 style="color: #007BFF; text-align: center;">Americanoshh</h2>
        <p>Hola, <strong>${usuario.nombre || 'Cliente'}</strong>.</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña (expira en 1 hora):</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlaceRecuperacion}" target="_blank" style="background-color: #007BFF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>

        <p style="font-size: 13px; color: #cccccc; word-break: break-all;">
          Si el botón no abre automáticamente, copia y pega este enlace directo en tu navegador:<br><br>
          <a href="${enlaceRecuperacion}" target="_blank" style="color: #007BFF;">${enlaceRecuperacion}</a>
        </p>

        <p style="font-size: 12px; color: #aaaaaa; margin-top: 20px;">Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
      </div>
    `;

    // Petición HTTP directa a la API REST de Resend usando la API Key configurada en variables de entorno
    const respuestaResend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Americanoshh Support <onboarding@resend.dev>',
        to: [email],
        subject: 'Recuperación de Contraseña — Americanoshh',
        html: htmlBody
      })
    });

    if (!respuestaResend.ok) {
      const errorData = await respuestaResend.json();
      console.error("Error devuelto por Resend API:", errorData);
      throw new Error("No se pudo enviar el correo a través de Resend.");
    }

    res.json({ mensaje: "Hemos enviado las instrucciones a tu correo electrónico." });
  } catch (error) {
    console.error("Error al enviar correo:", error);
    res.status(500).json({ error: "No se pudo enviar el correo de recuperación. Revisa la configuración del servidor." });
  }
});

// recuperacion de contraseña, o sea restablecer contraseña con el token
app.post('/api/usuarios/restablecer-contrasena', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ error: "El token y la nueva contraseña son obligatorios." });
  }

  if (nuevaContrasena.length < 8) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  try {
    // Si el token fue alterado o ya pasó la hora de expiración, jwt.verify lanzará un error y caerá en el catch
    const verificado = jwt.verify(token, JWT_SECRET);
    // Encriptamos la nueva clave antes de persistirla en la base de datos
    const passwordHash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);

    await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id_usuario = $2', [passwordHash, verificado.id]);

    res.json({ mensaje: "¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión." });
  } catch (error) {
    return res.status(400).json({ error: "El enlace es inválido o ha expirado. Vuelve a solicitar la recuperación." });
  }
});

// Perfil
app.get('/api/usuarios/perfil', verificarToken, async (req, res) => {
  try {
    const usuario = await pool.query(
      'SELECT id_usuario, nombre, email, telefono, direccion, rol FROM usuarios WHERE id_usuario = $1',
      [req.usuario.id]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json(usuario.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al consultar el perfil." });
  }
});

// Actualizar Perfil
app.put('/api/usuarios/perfil', verificarToken, async (req, res) => {
  const userId = req.usuario.id;
  const { contrasenaActual, nuevaContrasena, telefono, direccion } = req.body;

  if (telefono && !/^\d+$/.test(telefono)) {
    return res.status(400).json({ error: "El teléfono solo debe contener dígitos numéricos." });
  }

  try {
    let nuevoPasswordHash = null;

    if (nuevaContrasena) {
      if (!contrasenaActual) {
        return res.status(400).json({ error: "Debes ingresar tu contraseña actual para establecer una nueva." });
      }

      if (nuevaContrasena.length < 8) {
        return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres." });
      }

      const consultaUsuario = await pool.query('SELECT contrasena FROM usuarios WHERE id_usuario = $1', [userId]);
      const passActualHash = consultaUsuario.rows[0].contrasena;

      const esValida = await bcrypt.compare(contrasenaActual, passActualHash);
      if (!esValida) {
        return res.status(401).json({ error: "La contraseña actual es incorrecta." });
      }

      nuevoPasswordHash = await bcrypt.hash(nuevaContrasena, SALT_ROUNDS);
    }

    const usuarioActualizado = await pool.query(
      `UPDATE usuarios 
       SET contrasena = COALESCE($1, contrasena), 
           telefono = COALESCE($2, telefono), 
           direccion = COALESCE($3, direccion) 
       WHERE id_usuario = $4 
       RETURNING id_usuario, nombre, email, telefono, direccion`,
      [nuevoPasswordHash, telefono !== undefined ? telefono : null, direccion !== undefined ? direccion : null, userId]
    );

    res.json({
      mensaje: "Datos actualizados correctamente.",
      usuario: usuarioActualizado.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno al actualizar la información." });
  }
});

// Eliminar Usuario
app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const esAdmin = req.usuario.rol === 'ADMINISTRADOR' || req.usuario.rol === 'admin';
  if (req.usuario.id !== parseInt(id, 10) && !esAdmin) {
    return res.status(403).json({ error: "No tienes permiso para eliminar esta cuenta." });
  }

  try {
    const resultado = await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado para eliminar." });
    }

    res.json({ mensaje: "Usuario eliminado correctamente del sistema." });
  } catch (error) {
    res.status(500).json({ error: "Error al intentar eliminar el usuario." });
  }
});

// rutas de productos

app.get('/api/productos', async (req, res) => {
  const { categoria } = req.query;

  try {
    let consulta = "SELECT * FROM productos WHERE estado = 'activo'";
    const params = [];
    if (categoria) {
      consulta += " AND categoria = $1";
      params.push(categoria);
    }

    consulta += " ORDER BY id_producto DESC";

    const resultado = await pool.query(consulta, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar productos:", error);
    res.status(500).json({ error: "Error al consultar el catálogo de productos." });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query("SELECT * FROM productos WHERE id_producto = $1", [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la información del producto." });
  }
});

// Permite a los administradores registrar nuevos artículos en el inventario
app.post('/api/productos', verificarToken, verificarAdmin, async (req, res) => {
  const { titulo, descripcion, precio, imagen_url, categoria, tallas } = req.body;

  if (!titulo || !precio || !imagen_url || !categoria) {
    return res.status(400).json({ 
      error: "Título, precio, URL de imagen y categoría son obligatorios." 
    });
  }

  try {
    const nuevoProducto = await pool.query(
      `INSERT INTO productos (titulo, descripcion, precio, imagen_url, categoria, tallas, estado)
       VALUES ($1, $2, $3, $4, $5, $6, 'activo')
       RETURNING *`,
      [
        titulo, 
        descripcion || null, 
        precio, 
        imagen_url, 
        categoria, 
        tallas || ['XS', 'S', 'M', 'L', 'XL']
      ]
    );

    res.status(201).json({
      mensaje: "Producto creado exitosamente.",
      producto: nuevoProducto.rows[0]
    });
  } catch (error) {
    console.error("Error al registrar producto:", error);
    res.status(500).json({ error: "Error interno al guardar el producto." });
  }
});

app.put('/api/productos/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, precio, imagen_url, categoria, tallas, estado } = req.body;

  if (estado && !['activo', 'inactivo'].includes(estado)) {
    return res.status(400).json({ error: "El estado debe ser 'activo' o 'inactivo'." });
  }

  try {
    const productoActualizado = await pool.query(
      `UPDATE productos
       SET titulo = COALESCE($1, titulo),
           descripcion = COALESCE($2, descripcion),
           precio = COALESCE($3, precio),
           imagen_url = COALESCE($4, imagen_url),
           categoria = COALESCE($5, categoria),
           tallas = COALESCE($6, tallas),
           estado = COALESCE($7, estado)
       WHERE id_producto = $8
       RETURNING *`,
      [titulo, descripcion, precio, imagen_url, categoria, tallas, estado, id]
    );

    if (productoActualizado.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado para actualizar." });
    }

    res.json({
      mensaje: "Producto actualizado correctamente.",
      producto: productoActualizado.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ error: "Error al actualizar la información del producto." });
  }
});

app.delete('/api/productos/:id', verificarToken, verificarAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query("DELETE FROM productos WHERE id_producto = $1", [id]);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: "Producto no encontrado para eliminar." });
    }

    res.json({ mensaje: "Producto eliminado correctamente del sistema." });
  } catch (error) {
    res.status(500).json({ error: "Error al intentar eliminar el usuario." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Urban Clothes activo en el puerto ${PORT}`);
});