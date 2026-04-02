import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export default function WorkoutPlanViewer() {
  const { trainerId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("workouts");
  const [trainerEmail, setTrainerEmail] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [plan, setPlan] = useState(null);
  const [loggedDays, setLoggedDays] = useState({}); // { dayIndex: count }

  const [dietPlan, setDietPlan] = useState(null);
  const [dietLoggedDays, setDietLoggedDays] = useState({}); // { dayIndex: count }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trainer email
        const trainerRef = doc(db, "users", trainerId);
        const trainerSnap = await getDoc(trainerRef);
        if (trainerSnap.exists()) {
          setTrainerEmail(trainerSnap.data().email);
        }

        // Fetch WORKOUT plan
        const q = query(
          collection(db, "workoutPlans"),
          where("clientId", "==", auth.currentUser.uid),
          where("trainerId", "==", trainerId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          // Sort client-side by newest first
          const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          plans.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
          });
          const planData = plans[0];
          setPlan(planData);

          try {
            const logsQuery = query(
              collection(db, "workoutLogs"),
              where("clientId", "==", auth.currentUser.uid),
              where("planId", "==", planData.id)
            );
            const logsSnap = await getDocs(logsQuery);

            const dayLogCounts = {};
            logsSnap.docs.forEach((logDoc) => {
              const idx = logDoc.data().dayIndex;
              dayLogCounts[idx] = (dayLogCounts[idx] || 0) + 1;
            });
            setLoggedDays(dayLogCounts);
          } catch (err) {
            console.error("Error fetching workout logs:", err);
          }
        }

        // Fetch DIET plan
        const dq = query(
          collection(db, "dietPlans"),
          where("clientId", "==", auth.currentUser.uid),
          where("trainerId", "==", trainerId)
        );
        const dSnapshot = await getDocs(dq);

        if (!dSnapshot.empty) {
          // Sort client-side by newest first
          const dPlans = dSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          dPlans.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
          });
          const dPlanData = dPlans[0];
          setDietPlan(dPlanData);

          try {
            const dLogsQuery = query(
              collection(db, "dietLogs"),
              where("clientId", "==", auth.currentUser.uid),
              where("planId", "==", dPlanData.id)
            );
            const dLogsSnap = await getDocs(dLogsQuery);

            const dLogCounts = {};
            dLogsSnap.docs.forEach((logDoc) => {
              const idx = logDoc.data().dayIndex;
              dLogCounts[idx] = (dLogCounts[idx] || 0) + 1;
            });
            setDietLoggedDays(dLogCounts);
          } catch (err) {
            console.error("Error fetching diet logs:", err);
          }
        }
      } catch (error) {
        console.error("Error loading plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainerId]);

  if (loading) return <h2 style={{ padding: 20 }}>Loading plans...</h2>;

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20, padding: "8px 12px", cursor: "pointer" }}>
        ← Back
      </button>

      <div style={{ marginBottom: 20, background: "#f8f9fa", padding: 20, borderRadius: 10 }}>
        <h1 style={{ margin: "0 0 5px 0" }}>My Schedule</h1>
        <p style={{ margin: 0, color: "#666" }}>
          <strong>Trainer:</strong> {trainerEmail || "Unknown"}
        </p>
      </div>

      {/* --------------- TABS --------------- */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "2px solid #ddd" }}>
        <button 
          onClick={() => setActiveTab("workouts")}
          style={{
            padding: "12px 24px",
            background: activeTab === "workouts" ? "#007bff" : "transparent",
            color: activeTab === "workouts" ? "white" : "#333",
            border: "none",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 16
          }}
        >
          🏋️ Workouts
        </button>
        <button 
          onClick={() => setActiveTab("diet")}
          style={{
            padding: "12px 24px",
            background: activeTab === "diet" ? "#28a745" : "transparent",
            color: activeTab === "diet" ? "white" : "#333",
            border: "none",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 16
          }}
        >
          🥗 Diet
        </button>
      </div>

      {/* ========================================================= */}
      {/* WORKOUTS TAB                                              */}
      {/* ========================================================= */}
      {activeTab === "workouts" && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          {!plan ? (
            <div style={{ padding: 30, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8 }}>
              <h3>No workout plan yet</h3>
              <p style={{ color: "#666" }}>Your trainer hasn't created a workout plan for you yet.</p>
            </div>
          ) : (
            <div>
              <h2 style={{ color: "#007bff", marginTop: 0 }}>{plan.title}</h2>
              {plan.description && <p style={{ color: "#555", marginBottom: 20 }}>{plan.description}</p>}

              {!plan.days || plan.days.length === 0 ? (
                <p>This plan has no days added yet.</p>
              ) : (
                plan.days.map((day, dayIndex) => (
                  <div key={dayIndex} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 20, marginBottom: 20, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                      <div>
                        <h3 style={{ margin: "0 0 5px 0" }}>
                          Day {dayIndex + 1} {day.name ? ` — ${day.name}` : ""}
                        </h3>
                        {day.description && <p style={{ color: "#666", margin: 0 }}>{day.description}</p>}
                        
                        {loggedDays[dayIndex] && (
                          <span style={{ fontSize: 13, color: "#2e7d32", marginTop: 8, display: "inline-block", fontWeight: "bold" }}>
                            ✅ Logged {loggedDays[dayIndex]} time{loggedDays[dayIndex] > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/log-workout/${plan.id}/${dayIndex}`)}
                        style={{ padding: "10px 16px", cursor: "pointer", background: "#007bff", color: "white", border: "none", borderRadius: 20, fontWeight: "bold" }}
                      >
                        🏋️ Start Workout
                      </button>
                    </div>

                    {!day.exercises || day.exercises.length === 0 ? (
                      <p style={{ fontStyle: "italic", color: "#888" }}>No exercises added</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #eee", background: "#f8f9fa" }}>
                            <th style={{ textAlign: "left", padding: 10 }}>#</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Exercise</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Description</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Sets</th>
                            <th style={{ textAlign: "left", padding: 10 }}>Reps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.exercises.map((ex, exIndex) => (
                            <tr key={exIndex} style={{ borderBottom: "1px solid #f1f1f1" }}>
                              <td style={{ padding: 10, color: "#666" }}>{exIndex + 1}</td>
                              <td style={{ padding: 10, fontWeight: "bold" }}>{ex.name || "—"}</td>
                              <td style={{ padding: 10, color: "#555", fontSize: 14 }}>{ex.description || "—"}</td>
                              <td style={{ padding: 10 }}>{ex.sets || "—"}</td>
                              <td style={{ padding: 10 }}>{ex.reps || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* DIET TAB                                                  */}
      {/* ========================================================= */}
      {activeTab === "diet" && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          {!dietPlan ? (
            <div style={{ padding: 30, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8 }}>
              <h3>No diet plan yet</h3>
              <p style={{ color: "#666" }}>Your trainer hasn't created a diet plan for you yet.</p>
            </div>
          ) : (
            <div>
              <h2 style={{ color: "#2E7D32", marginTop: 0 }}>{dietPlan.title}</h2>
              {dietPlan.description && <p style={{ color: "#555", marginBottom: 20 }}>{dietPlan.description}</p>}

              {!dietPlan.days || dietPlan.days.length === 0 ? (
                <p>This plan has no days added yet.</p>
              ) : (
                dietPlan.days.map((day, dayIndex) => (
                  <div key={dayIndex} style={{ border: "1px solid #e0e0e0", borderRadius: 8, padding: 20, marginBottom: 20, background: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                      <div>
                        <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>
                          Day {dayIndex + 1} {day.name ? ` — ${day.name}` : ""}
                        </h3>
                        {day.description && <p style={{ color: "#666", margin: 0 }}>{day.description}</p>}
                        
                        {dietLoggedDays[dayIndex] && (
                          <span style={{ fontSize: 13, color: "#2e7d32", marginTop: 8, display: "inline-block", fontWeight: "bold" }}>
                            ✅ Logged {dietLoggedDays[dayIndex]} time{dietLoggedDays[dayIndex] > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/log-diet/${dietPlan.id}/${dayIndex}`)}
                        style={{ padding: "10px 16px", cursor: "pointer", background: "#28a745", color: "white", border: "none", borderRadius: 20, fontWeight: "bold" }}
                      >
                        🥗 Log Diet
                      </button>
                    </div>

                    {!day.meals || day.meals.length === 0 ? (
                      <p style={{ fontStyle: "italic", color: "#888" }}>No meals added</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {day.meals.map((meal, mealIndex) => (
                          <div key={mealIndex} style={{ padding: 15, background: "#f8f9fa", borderRadius: 8, borderLeft: "4px solid #4caf50" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <h4 style={{ margin: 0, fontSize: 16, color: "#333" }}>{meal.name || "Meal"}</h4>
                              {meal.calories && <span style={{ fontSize: 13, color: "#1565c0", fontWeight: "bold", background: "#e3f2fd", padding: "2px 8px", borderRadius: 10 }}>{meal.calories}</span>}
                            </div>
                            <p style={{ margin: 0, color: "#555", fontSize: 14 }}>{meal.description || "No description provided."}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
