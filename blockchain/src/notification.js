const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const wss = new WebSocket.Server({ port: 8080 });

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

const userNotificationStatus = {}; // Đối tượng lưu trữ trạng thái "đã xem" của người dùng

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'notificationSeen') {
      // Cập nhật trạng thái "đã xem" cho người dùng
      userNotificationStatus[data.clientId] = userNotificationStatus[data.clientId] || {};
      userNotificationStatus[data.clientId][data.notificationId] = true; // Đánh dấu thông báo là đã xem
    }
    console.log(`Received message => ${message}`);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Function to send notification to all connected clients
function sendNotification(notification) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  });
}

// Function to fetch notifications from the database and send to clients
async function fetchAndSendNotifications() {
  try {
    const [notifications] = await db.query('SELECT * FROM notifications WHERE role_id = 3');
    notifications.forEach((notification) => {
      sendNotification(notification);
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
}

// Fetch and send notifications every 10 seconds
fetchAndSendNotifications();

module.exports = {
  sendNotification
};
