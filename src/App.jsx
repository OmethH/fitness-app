import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db, messaging } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import WorkoutPlanEditor from "./components/WorkoutPlanEditor";
import ClientPage from "./pages/ClientPage";
import CreatePlanPage from "./components/CreatePlanPage";
import WorkoutPlanViewer from "./pages/WorkoutPlanViewer";
import WorkoutLogger from "./pages/WorkoutLogger";
import DietLogger from "./pages/DietLogger";
import ChatPage from "./pages/ChatPage";
import NotificationBell from "./components/NotificationBell";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // 🔥 Fetch role from Firestore
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setRole(docSnap.data().role);

            // Fetch and save FCM Token
            try {
              const msg = await messaging;
              if (msg) {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                  const token = await getToken(msg);
                  if (token) {
                    await updateDoc(docRef, { fcmToken: token });
                    console.log("FCM Token successfully registered.");
                  }
                }
              }
            } catch (fcmError) {
              console.warn("Could not register FCM token:", fcmError);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUser(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <h2>Loading...</h2>;

  return (
    <div>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", background: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
        <div>
          <Link to="/" style={{ marginRight: 10 }}>Home</Link>
          {!user && <Link to="/signup" style={{ marginRight: 10 }}>Signup</Link>}
          {!user && <Link to="/login">Login</Link>}
          {user && <Link to="/dashboard">Dashboard</Link>}
        </div>
        <div>
          {user && <NotificationBell />}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<h1>Welcome to Fitness App</h1>} />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard role={role} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/edit-plan/:planId" element={<WorkoutPlanEditor />} />
        <Route path="/client/:clientId" element={<ClientPage />} />
        <Route path="/create-plan/:clientId" element={<CreatePlanPage />} />
        <Route path="/my-plan/:trainerId" element={<WorkoutPlanViewer />} />
        <Route path="/log-workout/:planId/:dayIndex" element={<WorkoutLogger />} />
        <Route path="/log-diet/:planId/:dayIndex" element={<DietLogger />} />
        <Route path="/chat/:trainerId/:clientId" element={<ChatPage />} />
      </Routes>
    </div>
  );
}

export default App;