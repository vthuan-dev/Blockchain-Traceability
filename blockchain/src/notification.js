const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000
});

async function registerNotification(connection, actorId, message, type) {
  try {
    // Không cần getConnection vì đã có connection từ transaction
    const [registerResult] = await connection.query(
      'INSERT INTO register (actor_id, created_on, content) VALUES (?, NOW(), ?)',
      [actorId, message]
    );
    
    // Lưu vào bảng notification_object
    const [notificationObjectResult] = await connection.query(
      'INSERT INTO notification_object (entity_type_id, entity_id, created_on) VALUES (?, ?, NOW())',
      [type, registerResult.insertId]
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
    console.error("Lỗi khi lưu thông báo:", error);
    throw error;
  }
}

async function notifyNewBatch(connection, batchName, actorId, regionId) {
  try {
    // Lưu thông tin lô hàng mới vào bảng batch
    const [batchResult] = await connection.query(
      'INSERT INTO batch (batch_name, actor_id, created_on) VALUES (?, ?, NOW())',
      [batchName, actorId]
    );
    const batchId = batchResult.insertId;
    
    // Lưu vào bảng notification_object
    const [notificationObjectResult] = await connection.query(
      'INSERT INTO notification_object (entity_type_id, entity_id, created_on) VALUES (?, ?, NOW())',
      [2, batchId]
    );
    const notificationObjectId = notificationObjectResult.insertId;
     // Lưu vào bảng notification_change
    await connection.query(
      'INSERT INTO notification_change (notification_object_id, actor_id) VALUES (?, ?)',
      [notificationObjectId, actorId]
    );
     // Lấy danh sách người kiểm định
    const [inspectors] = await connection.query(
      'SELECT id FROM users WHERE role_id = 2 AND region_id = ?', [regionId]
    );
     // Lưu thông báo cho từng người kiểm định
    for (const inspector of inspectors) {
      await connection.query(
        `INSERT INTO notification (notification_object_id, user_id, recipient_type) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE notification_object_id = VALUES(notification_object_id)`,
        [notificationObjectId, inspector.id, 'user']
      );
    }
     await connection.commit();
    return batchId;
  } catch (error) {
    console.error("Lỗi khi lưu thông báo lô hàng mới:", error);
    throw error;
  }
} 

module.exports = {
  registerNotification,
  notifyNewBatch
};
