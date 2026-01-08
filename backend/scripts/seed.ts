import { connectMongo } from '../src/config/mongo.js';
import { User } from '../src/models/User.js';
import { Device } from '../src/models/Device.js';
import { hashPassword } from '../src/services/authService.js';
import { log } from '../src/utils/logger.js';

const seed = async () => {
  await connectMongo();

  const adminEmail = 'admin@health.local';
  const userEmail = 'user@health.local';
  const adminPassword = 'admin123';
  const userPassword = 'user1234';

  const [admin, user] = await Promise.all([
    User.findOne({ email: adminEmail }),
    User.findOne({ email: userEmail })
  ]);

  let adminUser = admin;
  if (!adminUser) {
    adminUser = await User.create({
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: 'admin'
    });
  }

  let normalUser = user;
  if (!normalUser) {
    normalUser = await User.create({
      email: userEmail,
      passwordHash: await hashPassword(userPassword),
      role: 'user'
    });
  }

  const existingDevices = await Device.find({ ownerUserId: normalUser._id });
  if (existingDevices.length === 0) {
    await Device.create([
      {
        deviceId: 'demoDevice01',
        name: 'Demo Device 01',
        ownerUserId: normalUser._id,
        isOnline: false
      },
      {
        deviceId: 'demoDevice02',
        name: 'Demo Device 02',
        ownerUserId: normalUser._id,
        isOnline: false
      }
    ]);
  }

  log.info('Seed complete');
  log.info(`Admin: ${adminEmail} / ${adminPassword}`);
  log.info(`User: ${userEmail} / ${userPassword}`);

  process.exit(0);
};

seed().catch((error) => {
  log.error('Seed failed', error);
  process.exit(1);
});
