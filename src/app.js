const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');
const tripRoutes = require('./routes/tripRoutes');
const regionAdminRoutes = require('./routes/regionAdminRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const publicRoutes = require('./routes/publicRoutes');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ success: true, message: 'Nur Taxi API ishlayapti' }));

// API routes
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/region-admin', regionAdminRoutes);
app.use('/api/admin', superAdminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
