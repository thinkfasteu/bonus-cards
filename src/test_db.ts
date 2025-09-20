import { dbHealth, closeDb } from './db';

(async () => {
  try {
    const now = await dbHealth();
    console.log('DB OK, server time:', now);
  } catch (err) {
    console.error('DB error:', err);
  } finally {
    await closeDb();
  }
})();
