const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const path = require('path');

// Crear cliente de WhatsApp Web con autenticación local
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let connectionStatus = "Conectando...";
let currentQRCode = null;
let reminderInterval = null; // Variable para guardar el intervalo
let currentReminder = {
  numero: "",
  mensaje: "",
  tiempo: 0
};

// Generar el QR cada vez que cambia
client.on('qr', (qr) => {
  connectionStatus = "Escanea este QR para iniciar sesión.";
  qrcode.toDataURL(qr, (err, url) => {
    if (err) {
      console.error('Error al generar el QR: ', err);
    } else {
      currentQRCode = url; // Actualizar la URL del QR cada vez que cambia
    }
  });
});

// Evento cuando el cliente está listo
client.on('ready', () => {
  connectionStatus = "Conexión exitosa!";
  console.log('¡Cliente listo!');
  currentQRCode = null; // Ya no necesitamos el QR cuando está listo
});

// Evento de error
client.on('error', (error) => {
  connectionStatus = "Error al conectar: " + error.message;
  console.error('Error de conexión: ', error);
});

// Enviar el estado y QR a los clientes
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    qr: currentQRCode // Enviar el QR actualizado
  });
});

client.initialize();

// Ruta para servir la página
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para actualizar el recordatorio
app.post('/updateReminder', (req, res) => {
  const { numero, mensaje, tiempo } = req.body;

  if (!numero || !mensaje || !tiempo) {
    return res.status(400).send('Datos incompletos');
  }

  // Actualizar la configuración del recordatorio
  currentReminder = {
    numero,
    mensaje,
    tiempo
  };

  // Detener el recordatorio si está activo y reiniciar con la nueva configuración
  if (reminderInterval) {
    clearInterval(reminderInterval);
  }

  // Establecer el nuevo intervalo para enviar el mensaje
  reminderInterval = setInterval(() => {
    client.sendMessage(currentReminder.numero + '@c.us', currentReminder.mensaje)
      .then(() => console.log(`Recordatorio enviado a ${currentReminder.numero}`))
      .catch((err) => console.error('Error al enviar mensaje: ', err));
  }, currentReminder.tiempo * 60000); // tiempo en minutos convertido a milisegundos

  res.send('Recordatorio actualizado correctamente');
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
