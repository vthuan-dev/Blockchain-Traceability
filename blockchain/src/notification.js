const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000
});

async function saveNotification(db, actorId, message, type) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Lưu vào bảng register
    const [registerResult] = await connection.query(
      'INSERT INTO register (actor_id, created_on, content) VALUES (?, NOW(), ?)',
      [actorId, message]
    );
    const registerId = registerResult.insertId;

    // Lưu vào bảng notification_object
    const [notificationObjectResult] = await connection.query(
      'INSERT INTO notification_object (entity_type_id, entity_id, created_on) VALUES (?, ?, NOW())',
      [type, registerId]
    );
    const notificationObjectId = notificationObjectResult.insertId;

    // Lưu vào bảng notification_change
    await connection.query(
      'INSERT INTO notification_change (notification_object_id, actor_id) VALUES (?, ?)',
      [notificationObjectId, actorId]
    );

    // Lấy danh sách admin
    const [admins] = await connection.query('SELECT id FROM admin');

    // Lưu vào bảng notification cho từng admin
    for (const admin of admins) {
      await connection.query(
        `INSERT INTO notification (notification_object_id, admin_id, recipient_type) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE notification_object_id = VALUES(notification_object_id)`,
        [notificationObjectId, admin.id, 'admin']
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  saveNotification
};
