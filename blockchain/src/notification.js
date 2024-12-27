const mysql = require('mysql2/promise');
const path = require('node:path');
const { sendEmail } = require("./components/user/sendmail");

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
      `SELECT u.uid, u.email, u.name, u.region_id 
       FROM users u 
       WHERE u.role_id = 2 AND u.region_id = ?`, 
      [regionId]
    );
    // Log để debug
    console.log('Danh sách người kiểm định:', inspectors);

    if (!inspectors || inspectors.length === 0) {
      console.log('Không tìm thấy người kiểm định cho khu vực:', regionId);
      return;
    }

     // Lưu vào bảng notification
     await connection.query(
      `INSERT INTO notification (notification_object_id, user_id, recipient_type) 
       VALUES (?, ?, ?)`,
      [notificationObjectId, inspectors[0].uid, 'user']
    );

    for (const inspector of inspectors) {
      // Kiểm tra email tồn tại trước khi gửi
      if (inspector.email) {
        try {
          console.log('Chuẩn bị gửi email cho:', {
            email: inspector.email,
            name: inspector.name,
            uid: inspector.uid
          });

          await sendEmail(
            inspector.email,
            inspector.name || 'Người kiểm định',
            null,
            'Thông báo: Có lô hàng mới cần kiểm duyệt',
            path.join(__dirname, './public/kiem-duyet/thongbaoNKD.html')
          );
          
          console.log('Đã gửi email thành công cho:', inspector.email);
        } catch (emailError) {
          console.error('Lỗi khi gửi email:', emailError);
          console.error('Chi tiết người nhận:', inspector);
        }
      } else {
        console.log('Không tìm thấy email cho người kiểm định:', inspector.uid);
      }
    }

    //  await connection.commit();
    return batchId;
  } catch (error) {
    console.error("Lỗi khi lưu thông báo lô hàng mới:", error);
    throw error;
  }
} 

async function notifyApproveBatch(connection, batchId, approveId, status) {
  try {
    // Cập nhật trạng thái phê duyệt trong bảng batch
    await connection.query(
      'UPDATE batch SET approved_by = ?, approved_on = NOW() WHERE id = ?',
      [approveId, batchId]
    );

    // Lưu vào bảng notification_object với entity_type_id = 3 (batch_approval)
    const [notificationObjectResult] = await connection.query(
      'INSERT INTO notification_object (entity_type_id, entity_id, created_on) VALUES (?, ?, NOW())',
      [3, batchId] 
    );
    const notificationObjectId = notificationObjectResult.insertId;

    // Lưu vào bảng notification_change
    await connection.query(
      'INSERT INTO notification_change (notification_object_id, actor_id) VALUES (?, ?)',
      [notificationObjectId, approveId]
    );

    // Lấy thông tin nhà sản xuất của lô hàng
    const [producer] = await connection.query(
      'SELECT u.* FROM users u JOIN batch b ON u.uid = b.actor_id WHERE b.id = ?',
      [batchId]
    );

    // Lưu thông báo cho nhà sản xuất
    if (producer && producer.length > 0) {
      await connection.query(
        `INSERT INTO notification (notification_object_id, status, user_id, recipient_type) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE notification_object_id = VALUES(notification_object_id)`,
        [notificationObjectId, status, producer[0].uid, 'user']
      );

      // Gửi email thông báo cho nhà sản xuất
      if (producer[0].email) {
        try {
          console.log('Chuẩn bị gửi email cho nhà sản xuất:', {
            email: producer[0].email,
            name: producer[0].name,
            batchName: producer[0].batch_name,
            status: status
          });

          // Xác định tiêu đề và template email dựa trên trạng thái
          let emailSubject;
          let emailTemplate;
          if (status === 1) {
            emailSubject = 'Thông báo: Lô hàng của bạn đã được phê duyệt';
            emailTemplate = path.join(__dirname, './public/san-xuat/thongbao-pheduyet.html');
          } else if (status === 2) {
            emailSubject = 'Thông báo: Lô hàng của bạn đã bị từ chối';
            emailTemplate = path.join(__dirname, './public/san-xuat/thongbao-tuchoi.html');
          }

          await sendEmail(
            producer[0].email,
            producer[0].name || 'Nhà sản xuất',
            {
              batchName: producer[0].batch_name,
              status: status
            },
            emailSubject,
            emailTemplate
          );
          
          console.log('Đã gửi email thành công cho nhà sản xuất:', producer[0].email);
        } catch (emailError) {
          console.error('Lỗi khi gửi email cho nhà sản xuất:', emailError);
          console.error('Chi tiết người nhận:', producer[0]);
        }
      } else {
        console.log('Không tìm thấy email cho nhà sản xuất:', producer[0].uid);
      }
    }

    return approveId;
  } catch (error) {
    console.error("Lỗi khi lưu thông báo phê duyệt lô hàng:", error);
    throw error;
  }
}

module.exports = {
  registerNotification,
  notifyNewBatch,
  notifyApproveBatch
};
