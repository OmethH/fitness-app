import { useState, useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { messaging, db, auth } from "../firebase";
import { collection, query, limit, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notifications", auth.currentUser.uid, "items"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      let unread = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        notifs.push({ id: docSnap.id, ...data });
        if (!data.read) unread++;
      });
      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.warn("Notifications permission denied or error:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const setupMessaging = async () => {
      const msg = await messaging;
      if (msg) {
        onMessage(msg, (payload) => {
          console.log("Foreground message received:", payload);
          setToast(payload.notification);
          setTimeout(() => setToast(null), 5000);
        });
      }
    };
    setupMessaging();
  }, []);

  const handleOpenDropdown = () => {
    setIsOpen(!isOpen);
    // When opening, mark all currently unread notifications as read
    if (!isOpen && unreadCount > 0) {
      notifications.forEach((n) => {
        if (!n.read) {
          const docRef = doc(db, "notifications", auth.currentUser.uid, "items", n.id);
          updateDoc(docRef, { read: true }).catch(console.error);
        }
      });
      setUnreadCount(0);
    }
  };

  if (!auth.currentUser) return null;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* BELL BUTTON */}
      <button
        onClick={handleOpenDropdown}
        style={{
          background: "transparent",
          border: "none",
          fontSize: 24,
          cursor: "pointer",
          position: "relative",
          padding: 5
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: 12,
              fontWeight: "bold"
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 300,
            maxHeight: 400,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #eee", fontWeight: "bold", background: "#f8f9fa", borderRadius: "8px 8px 0 0" }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 14 }}>
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px 15px",
                  borderBottom: "1px solid #f1f1f1",
                  background: n.read ? "#fff" : "#f0f8ff",
                  transition: "background 0.3s"
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: 14, color: "#333", marginBottom: 4 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 13, color: "#666" }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
                  {n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : "Just now"}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* FOREGROUND TOAST OVERLAY */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#333",
            color: "#fff",
            padding: 15,
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            zIndex: 2000,
            width: 300,
            animation: "fadeIn 0.3s ease-in-out"
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 5 }}>{toast.title}</div>
          <div style={{ fontSize: 14, color: "#ddd" }}>{toast.body}</div>
        </div>
      )}
    </div>
  );
}
