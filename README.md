# Nur Taxi - Backend API

Taxi platformasi backend asosi. 4 turdagi foydalanuvchi rolini qo'llab-quvvatlaydi:
- **client** — mijoz (taxi chaqiruvchi)
- **driver** — haydovchi
- **region_admin** — hudud admini
- **super_admin** — bosh admin (glavni admin)

## Texnologiyalar
- Node.js + Express
- PostgreSQL + Sequelize (ORM)
- JWT autentifikatsiya
- Socket.io (real-time joylashuv va buyurtma bildirishnomalari)
- To'lov: faqat naqd pul
- Narx: masofa (km) + vaqt (daqiqa) asosida avtomatik hisoblanadi

## O'rnatish

```bash
cd nur-taxi-backend
npm install
cp .env.example .env
# .env faylida DB_USER, DB_PASSWORD, JWT_SECRET kabilarni o'zingizga moslang
```

PostgreSQL'da `nur_taxi` nomli ma'lumotlar bazasini yaratib qo'ying:
```sql
CREATE DATABASE nur_taxi;
```

Boshlang'ich ma'lumotlarni kiritish (bosh admin + namuna hudud):
```bash
npm run seed
```
Bu `+998900000000 / admin123` login-parol bilan bosh adminni yaratadi.

Serverni ishga tushirish:
```bash
npm run dev   # development (auto-restart)
npm start     # production
```

Server `http://localhost:3000` da ishga tushadi.

## Loyiha tuzilishi

```
src/
├── config/        # DB konfiguratsiyasi
├── models/        # Sequelize modellari (User, Region, Driver, Vehicle, Trip, Tariff)
├── controllers/    # Biznes-logika
├── routes/         # API endpointlar
├── middleware/      # Auth, validatsiya, xato boshqaruvi
├── services/         # Narx hisoblash, Socket.io
├── app.js          # Express konfiguratsiyasi
├── server.js       # Kirish nuqtasi (HTTP + Socket.io)
└── seed.js          # Boshlang'ich ma'lumotlar
```

## API Endpointlar

### Autentifikatsiya (`/api/auth`)
| Method | Endpoint | Tavsif | Ruxsat |
|---|---|---|---|
| POST | `/register/client` | Mijoz ro'yxatdan o'tishi | Ochiq |
| POST | `/register/driver` | Haydovchi arizasi (tasdiqlash kerak) | Ochiq |
| POST | `/login` | Barcha rollar uchun kirish | Ochiq |
| GET | `/me` | Joriy foydalanuvchi ma'lumoti | Token kerak |

### Haydovchi (`/api/drivers`) — faqat `driver`
| Method | Endpoint | Tavsif |
|---|---|---|
| GET | `/me` | O'z profili (avtomobil bilan) |
| PATCH | `/me/status` | online/offline o'zgartirish |
| PATCH | `/me/location` | Joylashuvni yangilash |
| POST | `/me/vehicle` | Avtomobil ma'lumotini qo'shish/yangilash |

### Safarlar (`/api/trips`)
| Method | Endpoint | Tavsif | Ruxsat |
|---|---|---|---|
| POST | `/` | Yangi buyurtma yaratish (narx avtomatik hisoblanadi) | client |
| GET | `/available` | O'z hududidagi kutilayotgan buyurtmalar | driver |
| PATCH | `/:id/accept` | Buyurtmani qabul qilish | driver |
| PATCH | `/:id/status` | arrived/on_ride/completed/cancelled | driver, client |
| PATCH | `/:id/rate` | Safarni baholash | client |
| GET | `/my` | O'z safarlar tarixi | hammasi |
| GET | `/:id` | Safar tafsilotlari | hammasi |

### Hudud admini (`/api/region-admin`) — `region_admin`, `super_admin`
| Method | Endpoint | Tavsif |
|---|---|---|
| GET | `/drivers` | O'z hududidagi haydovchilar (filtr: status, search) |
| PATCH | `/drivers/:driverId/approval` | Haydovchi arizasini tasdiqlash/rad etish |
| PATCH | `/drivers/:driverId/block` | Bloklash/blokdan chiqarish |
| GET | `/stats` | Hudud statistikasi |

**Eslatma**: Hudud admini faqat o'z hududidagi (`regionId`) ma'lumotlarni ko'ra oladi. Bosh admin `?regionId=` query orqali istalgan hududni ko'rishi mumkin.

### Bosh admin (`/api/admin`) — faqat `super_admin`
| Method | Endpoint | Tavsif |
|---|---|---|
| POST | `/regions` | Yangi hudud yaratish |
| GET | `/regions` | Hududlar ro'yxati (tarif bilan) |
| PATCH | `/regions/:id` | Hududni yangilash |
| PATCH | `/regions/:id/tariff` | Hudud tarifini o'zgartirish |
| POST | `/region-admins` | Yangi hudud admini tayinlash |
| GET | `/region-admins` | Hudud adminlari ro'yxati |
| PATCH | `/region-admins/:id/block` | Hudud adminini bloklash |
| GET | `/stats` | Butun tizim statistikasi (hududlar bo'yicha taqsimot) |

## Real-time (Socket.io)

Ulanish: `io(url, { auth: { token: '<JWT_TOKEN>' } })`

**Eventlar:**
- `driver:location` (yuborish) — `{ lat, lng, tripId? }` — haydovchi joylashuvini yangilaydi
- `driver:location:update` (qabul qilish) — safar davomida mijoz haydovchi joylashuvini oladi
- `trip:join` / `trip:leave` — `{ tripId }` — safar xonasiga qo'shilish/chiqish
- `trip:new` (qabul qilish) — hudud haydovchilariga yangi buyurtma
- `trip:update` (qabul qilish) — safar holati o'zgarganda ikkala tomonga

## Asosiy oqim (misol)

1. Mijoz ro'yxatdan o'tadi → `POST /api/auth/register/client`
2. Haydovchi ro'yxatdan o'tadi (regionId bilan) → `POST /api/auth/register/driver` → holat `pending_approval`
3. Hudud admini haydovchini tasdiqlaydi → `PATCH /api/region-admin/drivers/:id/approval`
4. Haydovchi `online` bo'ladi → `PATCH /api/drivers/me/status`
5. Mijoz buyurtma beradi → `POST /api/trips` → narx avtomatik hisoblanadi, hudud haydovchilariga socket orqali yuboriladi
6. Haydovchi qabul qiladi → `PATCH /api/trips/:id/accept`
7. Holat ketma-ket o'zgaradi: `arrived` → `on_ride` → `completed`
8. Mijoz naqd to'laydi, baholaydi → `PATCH /api/trips/:id/rate`

## Keyingi qadamlar (loyihaning davomi)

- [ ] Mijoz mobil ilovasi (UI)
- [ ] Haydovchi mobil ilovasi (UI)
- [ ] Hudud admini mobil ilovasi (UI)
- [ ] Bosh admin mobil ilovasi (UI)
- [ ] SMS orqali telefon raqamni tasdiqlash
- [ ] Fayl yuklash (rasm, guvohnoma) uchun storage (S3/local)
- [ ] Productionda migratsiyalar (sequelize-cli) `sync({ alter: true })` o'rniga
