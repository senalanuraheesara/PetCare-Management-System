const User = require('../models/User');

const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@petcare.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin user already exists:', adminEmail);
      return;
    }

    const adminUser = new User({
      name: 'System Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });

    await adminUser.save();
    console.log('Seeded admin user:', adminEmail);
  } catch (error) {
    console.error('Failed to seed admin user:', error.message);
    throw error;
  }
};

module.exports = seedAdminUser;
