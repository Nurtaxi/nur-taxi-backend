const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

// Tizimdagi barcha rollar
const ROLES = {
  CLIENT: 'client', // Mijoz (taxi chaqiruvchi)
  DRIVER: 'driver', // Haydovchi
  REGION_ADMIN: 'region_admin', // Hudud admini
  SUPER_ADMIN: 'super_admin', // Bosh admin (glavni admin)
};

class User extends Model {
  // Parolni tekshirish
  async checkPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
  }

  // JSON ga chiqarishda parolni yashirish
  toSafeJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Asosiy login - telefon raqami, masalan: +998901234567',
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(ROLES)),
      allowNull: false,
      defaultValue: ROLES.CLIENT,
    },
    regionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Foydalanuvchi qaysi hududga tegishli (haydovchi/hudud admini uchun majburiy)',
      references: {
        model: 'regions',
        key: 'id',
      },
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Bloklangan foydalanuvchilar uchun false',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Telefon raqami SMS orqali tasdiqlangan',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
    },
  }
);

module.exports = { User, ROLES };
