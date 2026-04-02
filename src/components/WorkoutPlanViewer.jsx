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

  const [plan, setPlan] = useState(null);
  const [trainerEmail, setTrainerEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trainer email
        const trainerRef = doc(db, "users", trainerId);
        const trainerSnap = await getDoc(trainerRef);
        if (trainerSnap.exists()) {
          setTrainerEmail(trainerSnap.data().email);
        }

        // Fetch workout plan for this client from this trainer
        const q = query(
          collection(db, "workoutPlans"),
          where("clientId", "==", auth.currentUser.uid),
          where("trainerId", "==", trainerId)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const planDoc = snapshot.docs[0];
          setPlan({ id: planDoc.id, ...planDoc.data() });
        }
      } catch (error) {
        console.error("Error loading workout plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trainerId]);

  if (loading) return <h2>Loading plan...</h2>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        ← Back
      </button>

      <h1>Workout Plan</h1>
      <p>
        <strong>Trainer:</strong> {trainerEmail || "Unknown"}
      </p>

      {!plan ? (
        <div
          style={{
            padding: 30,
            textAlign: "center",
            border: "1px dashed #ccc",
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <h3>No workout plan yet</h3>
          <p>Your trainer hasn't created a workout plan for you yet.</p>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <h2>{plan.title}</h2>
          {plan.description && (
            <p style={{ color: "#555" }}>{plan.description}</p>
          )}

          {(!plan.days || plan.days.length === 0) ? (
            <p>This plan has no days added yet.</p>
          ) : (
            plan.days.map((day, dayIndex) => (
              <div
                key={dayIndex}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 15,
                }}
              >
                <h3>
                  Day {dayIndex + 1}
                  {day.name ? ` — ${day.name}` : ""}
                </h3>
                {day.description && (
                  <p style={{ color: "#666", marginBottom: 10 }}>
                    {day.description}
                  </p>
                )}

                {(!day.exercises || day.exercises.length === 0) ? (
                  <p style={{ fontStyle: "italic" }}>No exercises added</p>
                ) : (
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "2px solid #ddd" }}>
                        <th style={{ textAlign: "left", padding: 8 }}>#</th>
                        <th style={{ textAlign: "left", padding: 8 }}>
                          Exercise
                        </th>
                        <th style={{ textAlign: "left", padding: 8 }}>
                          Description
                        </th>
                        <th style={{ textAlign: "left", padding: 8 }}>Sets</th>
                        <th style={{ textAlign: "left", padding: 8 }}>Reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.exercises.map((ex, exIndex) => (
                        <tr
                          key={exIndex}
                          style={{ borderBottom: "1px solid #eee" }}
                        >
                          <td style={{ padding: 8 }}>{exIndex + 1}</td>
                          <td style={{ padding: 8, fontWeight: "bold" }}>
                            {ex.name || "—"}
                          </td>
                          <td style={{ padding: 8 }}>
                            {ex.description || "—"}
                          </td>
                          <td style={{ padding: 8 }}>{ex.sets || "—"}</td>
                          <td style={{ padding: 8 }}>{ex.reps || "—"}</td>
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
  );
}
