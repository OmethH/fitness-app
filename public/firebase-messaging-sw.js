importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyDpQuDPPQSOMKR4uBeDEldOXYImhEgpJk0",
  authDomain: "fitnessapp-acba1.firebaseapp.com",
  projectId: "fitnessapp-acba1",
  storageBucket: "fitnessapp-acba1.firebasestorage.app",
  messagingSenderId: "555724150523",
  appId: "1:555724150523:web:4c6489d9a6e39d1cd4025e",
  measurementId: "G-PBS8SY5H49"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new update in the Fitness App.",
    icon: "/vite.svg"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
