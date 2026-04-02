import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Accordion from "../components/Accordion";
import ProgressDashboard from "../components/ProgressDashboard";

function ClientDashboard() {
  const navigate = useNavigate();

  const [trainerEmail, setTrainerEmail] = useState("");
  const [foundTrainer, setFoundTrainer] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(true);

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);
  // -------------------------
  // FETCH MY TRAINERS
  // -------------------------
  const fetchTrainers = async () => {
    try {
      const q = query(
        collection(db, "trainerClients"),
        where("clientId", "==", auth.currentUser.uid)
      );

      const snapshot = await getDocs(q);

      const trainerList = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          try {
            const userRef = doc(db, "users", data.trainerId);
            const userSnap = await getDoc(userRef);

            return {
              id: docSnap.id,
              trainerId: data.trainerId,
              trainerEmail: userSnap.exists()
                ? userSnap.data().email
                : "Unknown",
            };
          } catch (err) {
            console.error(
              "Error fetching trainer info",
              data.trainerId,
              err
            );
            return {
              id: docSnap.id,
              trainerId: data.trainerId,
              trainerEmail: "Error loading",
            };
          }
        })
      );

      setTrainers(trainerList);
    } catch (err) {
      console.error("Error fetching trainers:", err);
    } finally {
      setLoadingTrainers(false);
    }
  };

  // -------------------------
  // FETCH WORKOUT LOGS
  // -------------------------
  const fetchLogs = async () => {
    try {
      const q = query(
        collection(db, "workoutLogs"),
        where("clientId", "==", auth.currentUser.uid)
      );

      const snapshot = await getDocs(q);

      const logList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Sort by completedAt descending (newest first)
      logList.sort((a, b) => {
        const dateA = a.completedAt?.toDate?.() || new Date(0);
        const dateB = b.completedAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      setLogs(logList);
    } catch (err) {
      console.error("Error fetching workout logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
    fetchLogs();
  }, []);

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

  // -------------------------
  // SEARCH FOR TRAINER
  // -------------------------
  const handleSearch = async () => {
    const q = query(
      collection(db, "users"),
      where("email", "==", trainerEmail),
      where("role", "==", "trainer")
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const trainerDoc = querySnapshot.docs[0];
      setFoundTrainer({ id: trainerDoc.id, ...trainerDoc.data() });
    } else {
      alert("Trainer not found");
      setFoundTrainer(null);
    }
  };

  // -------------------------
  // SEND REQUEST TO TRAINER
  // -------------------------
  const handleSendRequest = async () => {
    await addDoc(collection(db, "requests"), {
      clientId: auth.currentUser.uid,
      trainerId: foundTrainer.id,
      status: "pending",
      createdAt: new Date(),
    });

    alert("Request sent!");
    setFoundTrainer(null);
    setTrainerEmail("");
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Client Dashboard</h1>

      {/* --------------- Progress Analytics --------------- */}
      <div style={{ marginBottom: 40 }}>
        <ProgressDashboard />
      </div>

      {/* --------------- Find a Trainer Search Bar --------------- */}
      <div style={{ marginBottom: 30, padding: 20, background: "#f8f9fa", borderRadius: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <h3 style={{ marginTop: 0, marginBottom: 15, fontSize: 16, color: "#333" }}>Find a Trainer</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="email"
              placeholder="Search by trainer email..."
              value={trainerEmail}
              onChange={(e) => setTrainerEmail(e.target.value)}
              style={{ width: "100%", padding: "10px 15px", borderRadius: 20, border: "1px solid #ccc", fontSize: 15, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <button 
            onClick={handleSearch} 
            style={{ padding: "10px 20px", borderRadius: 20, background: "#007bff", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            🔍 Search
          </button>
        </div>

        {foundTrainer && (
          <div style={{ marginTop: 15, padding: 15, background: "white", borderRadius: 8, border: "1px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ color: "#666", fontSize: 13, display: "block", marginBottom: 4 }}>Trainer Found:</span>
              <strong>{foundTrainer.email}</strong>
            </div>
            <button 
              onClick={handleSendRequest}
              style={{ padding: "8px 16px", borderRadius: 20, background: "#28a745", color: "white", border: "none", cursor: "pointer", fontWeight: "bold" }}
            >
              Send Request
            </button>
          </div>
        )}
      </div>

      {/* --------------- My Trainers Section --------------- */}
      <h2>My Trainers</h2>

      {loadingTrainers ? (
        <p>Loading trainers...</p>
      ) : trainers.length === 0 ? (
        <p style={{ color: "#888" }}>
          You don't have any trainers yet. Search for a trainer below and send
          them a request!
        </p>
      ) : (
        <div>
          {trainers.map((trainer) => (
            <div
              key={trainer.id}
              style={{
                border: "1px solid #999",
                borderRadius: 8,
                padding: 15,
                marginBottom: 10,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
              onClick={() => navigate(`/my-plan/${trainer.trainerId}`)}
            >
              <div>
                <p style={{ margin: "0 0 5px 0" }}>
                  <strong>{trainer.trainerEmail}</strong>
                </p>
                <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
                  Click to view workout plan →
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/chat/${trainer.trainerId}/${auth.currentUser.uid}`);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                💬 Chat
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --------------- My Workout History Section --------------- */}
      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Accordion title={`My Workout History (${logs.length})`}>
          {loadingLogs ? (
            <p>Loading logs...</p>
          ) : logs.length === 0 ? (
            <p style={{ color: "#888" }}>
              You haven't logged any workouts yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setExpandedLog(expandedLog === log.id ? null : log.id)
                  }
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: "bold" }}>
                      {log.dayName || `Day ${log.dayIndex + 1}`}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                      {formatDate(log.completedAt)} •{" "}
                      {log.exercises?.length || 0} exercises
                    </p>
                  </div>
                  <span>{expandedLog === log.id ? "▲" : "▼"}</span>
                </div>

                {expandedLog === log.id && (
                  <div style={{ marginTop: 15 }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: "2px solid #ddd" }}>
                          <th style={{ textAlign: "left", padding: 8 }}>
                            Exercise
                          </th>
                          <th style={{ textAlign: "left", padding: 8 }}>
                            Target
                          </th>
                          <th style={{ textAlign: "left", padding: 8 }}>
                            Actual (Weight / Reps)
                          </th>
                          <th style={{ textAlign: "left", padding: 8 }}>
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(log.exercises || []).map((ex, i) => (
                          <tr
                            key={i}
                            style={{ borderBottom: "1px solid #eee" }}
                          >
                            <td
                              style={{ padding: 8, fontWeight: "bold", verticalAlign: "top" }}
                            >
                              {ex.name || "—"}
                            </td>
                            <td style={{ padding: 8, color: "#888", verticalAlign: "top" }}>
                              {ex.targetSets || "—"} × {ex.targetReps || "—"}
                            </td>
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
                            <td
                              style={{
                                padding: 8,
                                fontSize: 13,
                                color: "#555",
                                verticalAlign: "top"
                              }}
                            >
                              {ex.notes || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {(log.overallComment || log.imageUrl) && (
                      <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px dashed #ccc" }}>
                        <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>Workout Summary</h4>
                        
                        {log.overallComment && (
                          <div style={{ marginBottom: 15 }}>
                            <p style={{ margin: 0, fontSize: 13, color: "#444", fontStyle: "italic" }}>
                              "{log.overallComment}"
                            </p>
                          </div>
                        )}
                        
                        {log.imageUrl && (
                          <div>
                            <p style={{ margin: "0 0 5px 0", fontSize: 13, fontWeight: "bold" }}>Attached Picture:</p>
                            <img 
                              src={log.imageUrl} 
                              alt="Workout" 
                              style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8, border: "1px solid #ddd" }} 
                            />
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


    </div>
  );
}

export default ClientDashboard;