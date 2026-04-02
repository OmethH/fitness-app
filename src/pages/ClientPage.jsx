import { useParams, useNavigate } from "react-router-dom";
import WorkoutPlanEditor from "../components/WorkoutPlanEditor";
import DietPlanEditor from "../components/DietPlanEditor";
import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import Accordion from "../components/Accordion";
import { ClientProgressCard } from "../components/ProgressDashboard";

function ClientPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("workouts");
  const [mode, setMode] = useState(null); // "create" or "edit" for workouts
  const [dietMode, setDietMode] = useState(null); // "create" or "edit" for diet

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);

  const [dietLogs, setDietLogs] = useState([]);
  const [loadingDietLogs, setLoadingDietLogs] = useState(true);
  const [expandedDietLog, setExpandedDietLog] = useState(null);

  // -------------------------
  // FETCH LOGS
  // -------------------------
  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const wq = query(
          collection(db, "workoutLogs"),
          where("clientId", "==", clientId),
          where("trainerId", "==", auth.currentUser.uid)
        );
        const wSnapshot = await getDocs(wq);
        const wList = wSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        wList.sort((a, b) => {
          const dateA = a.completedAt?.toDate?.() || new Date(0);
          const dateB = b.completedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setLogs(wList);

        const dq = query(
          collection(db, "dietLogs"),
          where("clientId", "==", clientId),
          where("trainerId", "==", auth.currentUser.uid)
        );
        const dSnapshot = await getDocs(dq);
        const dList = dSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        dList.sort((a, b) => {
          const dateA = a.completedAt?.toDate?.() || new Date(0);
          const dateB = b.completedAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setDietLogs(dList);

      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoadingLogs(false);
        setLoadingDietLogs(false);
      }
    };

    fetchAllLogs();
  }, [clientId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown date";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20, padding: "8px 12px", cursor: "pointer" }}>
        ← Back
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "#f8f9fa", padding: 20, borderRadius: 10 }}>
        <div>
          <h1 style={{ margin: "0 0 5px 0" }}>Client Profile</h1>
          <p style={{ margin: 0, color: "#666" }}>Client ID: {clientId}</p>
        </div>
        <button 
          onClick={() => navigate(`/chat/${auth.currentUser.uid}/${clientId}`)}
          style={{ padding: "10px 20px", borderRadius: 20, background: "#007bff", color: "white", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: 15 }}
        >
          💬 Chat with Client
        </button>
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
        <button 
          onClick={() => setActiveTab("progress")}
          style={{
            padding: "12px 24px",
            background: activeTab === "progress" ? "#6366f1" : "transparent",
            color: activeTab === "progress" ? "white" : "#333",
            border: "none",
            borderRadius: "8px 8px 0 0",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: 16
          }}
        >
          📊 Progress
        </button>
      </div>

      {/* ========================================================= */}
      {/* WORKOUTS TAB                                              */}
      {/* ========================================================= */}
      {activeTab === "workouts" && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: 30 }}>
            <h2 style={{ marginTop: 0 }}>Workout Management</h2>
            {!mode && (
              <div style={{ display: "flex", gap: 15 }}>
                <button 
                  onClick={() => setMode("edit")}
                  style={{ padding: "10px 20px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
                >
                  📝 View/Edit Workout Plan
                </button>
                <button 
                  onClick={() => setMode("create")} 
                  style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
                >
                  ➕ Create New Workout Plan
                </button>
              </div>
            )}

            {mode && (
              <WorkoutPlanEditor
                clientId={clientId}
                mode={mode}
                onClose={() => setMode(null)}
              />
            )}
          </div>

          <Accordion title={`Workout Logs (${logs.length})`}>
            {loadingLogs ? (
              <p>Loading logs...</p>
            ) : logs.length === 0 ? (
              <p style={{ color: "#888" }}>No workout logs submitted by this client yet.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 15, marginBottom: 10 }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{log.dayName || `Day ${log.dayIndex + 1}`}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                        {formatDate(log.completedAt)} • {log.exercises?.length || 0} exercises
                      </p>
                    </div>
                    <span>{expandedLog === log.id ? "▲" : "▼"}</span>
                  </div>

                  {expandedLog === log.id && (
                    <div style={{ marginTop: 15 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #ddd" }}>
                            <th style={{ textAlign: "left", padding: 8 }}>Exercise</th>
                            <th style={{ textAlign: "left", padding: 8 }}>Target</th>
                            <th style={{ textAlign: "left", padding: 8 }}>Actual (Weight / Reps)</th>
                            <th style={{ textAlign: "left", padding: 8 }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(log.exercises || []).map((ex, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                              <td style={{ padding: 8, fontWeight: "bold", verticalAlign: "top" }}>{ex.name || "—"}</td>
                              <td style={{ padding: 8, color: "#888", verticalAlign: "top" }}>{ex.targetSets || "—"} × {ex.targetReps || "—"}</td>
                              <td style={{ padding: 8, verticalAlign: "top" }}>
                                {ex.actualSets && ex.actualSets.length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {ex.actualSets.map((s, idx) => (
                                      <div key={idx} style={{ fontSize: 13 }}>
                                        <span style={{ display: "inline-block", width: 45, color: "#666" }}>Set {idx + 1}:</span>
                                        <span style={{ display: "inline-block", minWidth: 60, fontWeight: 500 }}>{s.weight || "—"}</span>
                                        <span style={{ color: "#888", margin: "0 4px" }}>×</span>
                                        <span style={{ fontWeight: 500 }}>{s.reps || "—"} {s.reps ? "reps" : ""}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 13 }}>
                                    <div>Weight: <span style={{ fontWeight: 500 }}>{ex.actualWeight || "—"}</span></div>
                                    <div>Reps: <span style={{ fontWeight: 500 }}>{ex.actualReps || "—"}</span></div>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: 8, fontSize: 13, color: "#555", verticalAlign: "top" }}>{ex.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {(log.overallComment || log.imageUrl) && (
                        <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px dashed #ccc" }}>
                          <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>Workout Summary</h4>
                          {log.overallComment && (
                            <div style={{ marginBottom: 15 }}>
                              <p style={{ margin: 0, fontSize: 13, color: "#444", fontStyle: "italic" }}>"{log.overallComment}"</p>
                            </div>
                          )}
                          {log.imageUrl && (
                            <div>
                              <p style={{ margin: "0 0 5px 0", fontSize: 13, fontWeight: "bold" }}>Attached Picture:</p>
                              <img src={log.imageUrl} alt="Workout" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid #ddd" }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </Accordion>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIET TAB                                                  */}
      {/* ========================================================= */}
      {activeTab === "diet" && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.05)", marginBottom: 30 }}>
            <h2 style={{ marginTop: 0, color: "#2E7D32" }}>Diet Management</h2>
            {!dietMode && (
              <div style={{ display: "flex", gap: 15 }}>
                <button 
                  onClick={() => setDietMode("edit")}
                  style={{ padding: "10px 20px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
                >
                  📝 View/Edit Diet Plan
                </button>
                <button 
                  onClick={() => setDietMode("create")} 
                  style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}
                >
                  🥑 Create New Diet Plan
                </button>
              </div>
            )}

            {dietMode && (
              <DietPlanEditor
                clientId={clientId}
                mode={dietMode}
                onClose={() => setDietMode(null)}
              />
            )}
          </div>

          <Accordion title={`Diet Logs (${dietLogs.length})`}>
            {loadingDietLogs ? (
              <p>Loading diet logs...</p>
            ) : dietLogs.length === 0 ? (
              <p style={{ color: "#888" }}>No diet logs submitted by this client yet.</p>
            ) : (
              dietLogs.map((log) => (
                <div key={log.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 15, marginBottom: 10 }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                    onClick={() => setExpandedDietLog(expandedDietLog === log.id ? null : log.id)}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{log.dayName || `Day ${log.dayIndex + 1}`}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                        {formatDate(log.completedAt)} • {log.mealsLogged?.length || 0} prepared meals, {log.customMeals?.length || 0} custom
                      </p>
                    </div>
                    <span>{expandedDietLog === log.id ? "▲" : "▼"}</span>
                  </div>

                  {expandedDietLog === log.id && (
                    <div style={{ marginTop: 15 }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>Prepared Meals Log</h4>
                      {(!log.mealsLogged || log.mealsLogged.length === 0) ? (
                        <p style={{ color: "#888", fontSize: 14 }}>No prepared meals logged.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                          {log.mealsLogged.map((meal, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8f9fa", padding: "10px 15px", borderRadius: 6 }}>
                              <span style={{ fontSize: 20 }}>{meal.checked ? "✅" : "❌"}</span>
                              <div>
                                <strong style={{ textDecoration: !meal.checked ? "line-through" : "none", color: !meal.checked ? "#999" : "#000" }}>{meal.name}</strong>
                                <p style={{ margin: "2px 0 0 0", fontSize: 13, color: "#666" }}>{meal.description} {meal.calories ? `(${meal.calories})` : ""}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <h4 style={{ margin: "0 0 10px 0", color: "#d32f2f" }}>Custom / Extra Items</h4>
                      {(!log.customMeals || log.customMeals.length === 0) ? (
                        <p style={{ color: "#888", fontSize: 14 }}>No extra items eaten.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                          {log.customMeals.map((meal, idx) => (
                            <div key={idx} style={{ background: "#ffebee", padding: "10px 15px", borderRadius: 6 }}>
                              <strong style={{ color: "#d32f2f" }}>{meal.name}</strong>
                              {meal.description && <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#666" }}>{meal.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {log.overallComment && (
                        <div style={{ marginTop: 10, paddingTop: 15, borderTop: "1px dashed #ccc" }}>
                          <h4 style={{ margin: "0 0 5px 0", fontSize: 14 }}>Client Notes:</h4>
                          <p style={{ margin: 0, fontSize: 14, color: "#444", fontStyle: "italic" }}>"{log.overallComment}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </Accordion>
        </div>
      )}

      {/* ========================================================= */}
      {/* PROGRESS TAB                                              */}
      {/* ========================================================= */}
      {activeTab === "progress" && (
        <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
          <ClientProgressCard clientId={clientId} />
        </div>
      )}
    </div>
  );
}

export default ClientPage;