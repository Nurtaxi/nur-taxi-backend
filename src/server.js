require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const sequelize = require('./config/database');
const { initSocket } = require('./services/socketService');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

initSocket(io);

// app ichidan socket.io ga murojaat qilish uchun (masalan, tripController'dan)
app.set('io', io);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Ma\'lumotlar bazasiga ulanish muvaffaqiyatli');

    // Development uchun: jadvallarni avtomatik sinxronlash
    // Productionda migratsiyalardan foydalanish tavsiya etiladi
    await sequelize.sync({ alter: true });
    console.log('✅ Jadvallar sinxronlandi');

    server.listen(PORT, () => {
      console.log(`🚖 Nur Taxi API ${PORT}-portda ishlayapti`);
    });
  } catch (err) {
    console.error('❌ Serverni ishga tushirishda xatolik:', err);
    process.exit(1);
  }
};

start();
