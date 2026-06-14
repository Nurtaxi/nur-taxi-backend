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

app.set('io', io);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Ma\'lumotlar bazasiga ulanish muvaffaqiyatli');

    await sequelize.sync();
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
