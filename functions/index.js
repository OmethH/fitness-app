const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * 1. Notify on new workout plan
 */
exports.notifyOnNewWorkoutPlan = functions.firestore
  .document("workoutPlans/{planId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const clientId = data.clientId;
    if (!clientId) return null;

    // Get FCM Token
    const userDoc = await db.collection("users").doc(clientId).get();
    if (!userDoc.exists) return null;
    const fcmToken = userDoc.data().fcmToken;

    // Save notification to DB
    const notificationRef = db.collection("notifications").doc(clientId).collection("items").doc();
    const notificationData = {
      title: "New Workout Plan",
      body: `Your trainer has assigned a new workout plan: ${data.title || "Check it out!"}`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "workout_assigned"
    };
    
    await notificationRef.set(notificationData);

    // Send FCM Push
    if (fcmToken) {
      const payload = {
        token: fcmToken,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        }
      };
      try {
        await messaging.send(payload);
        console.log("Successfully sent push notification to", clientId);
      } catch (e) {
        console.error("Failed to send FCM:", e);
      }
    }
    return null;
  });

/**
 * 2. Notify recipient on new message
 */
exports.notifyOnNewMessage = functions.firestore
  .document("messages/{msgId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const chatId = data.chatId; // e.g., "trainerId_clientId"
    const senderId = data.senderId;
    
    if (!chatId || !senderId) return null;

    const parts = chatId.split("_");
    if (parts.length !== 2) return null;

    // Determine the recipient ID
    const recipientId = parts[0] === senderId ? parts[1] : parts[0];

    // Get FCM Token
    const userDoc = await db.collection("users").doc(recipientId).get();
    if (!userDoc.exists) return null;
    const fcmToken = userDoc.data().fcmToken;

    // Save internal notification
    const notificationRef = db.collection("notifications").doc(recipientId).collection("items").doc();
    const notificationData = {
      title: "New Message",
      body: `You have a new message in Chat.`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "new_message",
      chatId: chatId,
    };
    
    await notificationRef.set(notificationData);

    // Send FCM Push
    if (fcmToken) {
      const payload = {
        token: fcmToken,
        notification: {
          title: notificationData.title,
          body: notificationData.body,
        }
      };
      try {
        await messaging.send(payload);
      } catch (e) {
        console.error("Failed to send message FCM:", e);
      }
    }
    return null;
  });

/**
 * 3. Daily Workout Reminder
 * Triggers every day at 8:00 PM UTC.
 */
exports.dailyWorkoutReminder = functions.pubsub
  .schedule("0 20 * * *") // 8:00 PM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    const now = new Date();
    const startOfDay = new Date(now.setUTCHours(0, 0, 0, 0));
    
    // 1. Get all workout logs from today
    const logsSnap = await db.collection("workoutLogs")
      .where("completedAt", ">=", admin.firestore.Timestamp.fromDate(startOfDay))
      .get();
      
    const clientsWhoLoggedToday = new Set();
    logsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.clientId) {
        clientsWhoLoggedToday.add(data.clientId);
      }
    });

    // 2. Scan all active unique clients from workoutPlans
    const plansSnap = await db.collection("workoutPlans").get();
    const activeClients = new Set();
    plansSnap.forEach((doc) => {
      const data = doc.data();
      if (data.clientId) {
        activeClients.add(data.clientId);
      }
    });

    // 3. Find clients who missed logging today
    const stragglers = Array.from(activeClients).filter(cId => !clientsWhoLoggedToday.has(cId));

    // 4. Fire reminders
    const promises = stragglers.map(async (clientId) => {
      const userDoc = await db.collection("users").doc(clientId).get();
      if (!userDoc.exists) return;
      const fcmToken = userDoc.data().fcmToken;

      const notificationData = {
        title: "Workout Reminder!",
        body: "Have you worked out today? Don't forget to push your limits and log your session by tonight!",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        type: "reminder_daily"
      };

      await db.collection("notifications").doc(clientId).collection("items").add(notificationData);

      if (fcmToken) {
        try {
          await messaging.send({
            token: fcmToken,
            notification: {
              title: notificationData.title,
              body: notificationData.body,
            }
          });
        } catch (e) {
          console.error(`Failed to send reminder FCM to ${clientId}:`, e);
        }
      }
    });

    await Promise.all(promises);
    console.log(`Sent daily reminders to ${stragglers.length} clients.`);
    return null;
  });
