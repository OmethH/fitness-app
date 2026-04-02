import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export default function ChatPage() {
  const { trainerId, clientId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const chatId = `${trainerId}_${clientId}`;

  // Automatically scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if user is legally part of this chat
    if (auth.currentUser.uid !== trainerId && auth.currentUser.uid !== clientId) {
      alert("Unauthorized to view this chat.");
      navigate(-1);
      return;
    }

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Sort client-side to avoid needing a composite index in Firestore
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });

      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [chatId, trainerId, clientId, navigate]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: auth.currentUser.uid,
        text: newMessage,
        createdAt: serverTimestamp(),
      });

      // 🔥 Add Notification for Recipient (Frontend-side)
      const parts = chatId.split("_");
      const recipientId = parts[0] === auth.currentUser.uid ? parts[1] : parts[0];
      
      await addDoc(collection(db, "notifications", recipientId, "items"), {
        title: "New Message",
        body: `You have a new message: "${newMessage.substring(0, 30)}${newMessage.length > 30 ? "..." : ""}"`,
        read: false,
        createdAt: serverTimestamp(),
        type: "new_message",
        chatId: chatId
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", background: "#f8f9fa" }}>
        <button onClick={() => navigate(-1)} style={{ marginRight: 15, padding: "8px 12px", cursor: "pointer" }}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Chat</h2>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10, background: "#fff" }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888", marginTop: 20 }}>No messages yet. Send a message to start chatting!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser.uid;
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  background: isMe ? "#007bff" : "#e9ecef",
                  color: isMe ? "#fff" : "#000",
                  padding: "10px 15px",
                  borderRadius: 15,
                  maxWidth: "75%",
                }}
              >
                <p style={{ margin: 0 }}>{msg.text}</p>
                {/* Optional: Add timestamp formatting later */}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ padding: 15, borderTop: "1px solid #ddd", display: "flex", gap: 10, background: "#f8f9fa", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, padding: "12px 15px", borderRadius: 20, border: "1px solid #ccc", outline: "none", fontSize: 15 }}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          style={{ padding: "12px 20px", borderRadius: 20, border: "none", background: newMessage.trim() ? "#007bff" : "#ccc", color: "#fff", cursor: newMessage.trim() ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: 15 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
