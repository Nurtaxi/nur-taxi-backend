const { verifyToken } = require('../utils/jwt');
const { Driver } = require('../models');

/**
 * Socket.io ni ishga tushiradi.
 * Xonalar (rooms) tuzilishi:
 *  - `region:<regionId>` - shu hududdagi online haydovchilar (yangi buyurtmalarni eshitadi)
 *  - `trip:<tripId>` - mijoz va haydovchi bitta safar davomida ulanadi (joylashuv/holat almashinuvi)
 *  - `user:<userId>` - shaxsiy bildirishnomalar uchun
 */
const initSocket = (io) => {
  // Har bir ulanish uchun token tekshiruvi
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token topilmadi'));

      const decoded = verifyToken(token);
      socket.user = decoded; // { id, phone, role, regionId }
      next();
    } catch (err) {
      next(new Error('Token yaroqsiz'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role, regionId } = socket.user;

    // Shaxsiy xonaga qo'shish
    socket.join(`user:${userId}`);

    // Haydovchi - hudud xonasiga qo'shiladi (yangi buyurtmalarni olish uchun)
    if (role === 'driver' && regionId) {
      socket.join(`region:${regionId}`);
    }

    /**
     * Haydovchi joylashuvini real-time yangilash.
     * payload: { lat, lng, tripId? }
     */
    socket.on('driver:location', async (payload) => {
      try {
        if (role !== 'driver') return;

        const { lat, lng, tripId } = payload;

        await Driver.update(
          { currentLat: lat, currentLng: lng, lastLocationUpdate: new Date() },
          { where: { userId } }
        );

        // Agar safar davomida bo'lsa, mijozga joylashuvni yuborish
        if (tripId) {
          io.to(`trip:${tripId}`).emit('driver:location:update', { lat, lng, tripId });
        }
      } catch (err) {
        socket.emit('error', { message: 'Joylashuvni yangilashda xatolik' });
      }
    });

    /**
     * Mijoz va haydovchi bitta safar xonasiga qo'shiladi
     * payload: { tripId }
     */
    socket.on('trip:join', (payload) => {
      const { tripId } = payload;
      if (tripId) socket.join(`trip:${tripId}`);
    });

    socket.on('trip:leave', (payload) => {
      const { tripId } = payload;
      if (tripId) socket.leave(`trip:${tripId}`);
    });

    socket.on('disconnect', () => {
      // Kerak bo'lsa, offline holatga avtomatik o'tkazish logikasi shu yerga qo'shiladi
    });
  });
};

/**
 * Yangi buyurtmani hudud bo'yicha online haydovchilarga yuborish.
 * Bu funksiya tripController ichidan chaqiriladi.
 */
const notifyNewTrip = (io, regionId, trip) => {
  io.to(`region:${regionId}`).emit('trip:new', trip);
};

/**
 * Safar holati o'zgarishini ishtirokchilarga yuborish.
 */
const notifyTripUpdate = (io, tripId, trip) => {
  io.to(`trip:${tripId}`).emit('trip:update', trip);
};

module.exports = { initSocket, notifyNewTrip, notifyTripUpdate };
