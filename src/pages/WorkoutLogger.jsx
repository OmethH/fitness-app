import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth, storage } from "../firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function WorkoutLogger() {
  const { planId, dayIndex } = useParams();
  const navigate = useNavigate();
  const dayIdx = parseInt(dayIndex, 10);

  const [plan, setPlan] = useState(null);
  const [day, setDay] = useState(null);
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overallComment, setOverallComment] = useState("");
  const [workoutImage, setWorkoutImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);  // -------------------------
  // LOAD PLAN & INIT LOG DATA
  // -------------------------
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const docRef = doc(db, "workoutPlans", planId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const planData = { id: docSnap.id, ...docSnap.data() };
          setPlan(planData);

          const selectedDay = planData.days?.[dayIdx];
          if (selectedDay) {
            setDay(selectedDay);

            // Initialize log entries from the template exercises
            const initialLog = (selectedDay.exercises || []).map((ex) => {
              let numSets = 1;
              const parsedSets = parseInt(ex.sets, 10);
              if (!isNaN(parsedSets) && parsedSets > 0) {
                numSets = parsedSets;
              }
              const actualSets = Array(numSets).fill(null).map(() => ({ weight: "", reps: "" }));

              return {
                name: ex.name || "",
                description: ex.description || "",
                targetSets: ex.sets || "",
                targetReps: ex.reps || "",
                actualSets,
                notes: "",
              };
            });
            setLogData(initialLog);
          }
        }
      } catch (error) {
        console.error("Error loading plan for logging:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, dayIdx]);

  // -------------------------
  // UPDATE A LOG FIELD
  // -------------------------
  const updateLog = (exIndex, field, value) => {
    const updated = [...logData];
    updated[exIndex][field] = value;
    setLogData(updated);
  };

  const updateSet = (exIndex, setIndex, field, value) => {
    const updated = [...logData];
    updated[exIndex].actualSets[setIndex][field] = value;
    setLogData(updated);
  };

  const addSet = (exIndex) => {
    const updated = [...logData];
    updated[exIndex].actualSets.push({ weight: "", reps: "" });
    setLogData(updated);
  };

  const removeSet = (exIndex, setIndex) => {
    const updated = [...logData];
    updated[exIndex].actualSets.splice(setIndex, 1);
    setLogData(updated);
  };

  // -------------------------
  // SUBMIT WORKOUT LOG
  // -------------------------
  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      let imageUrl = null;
      if (workoutImage) {
        setUploadingImage(true);
        const imageRef = ref(storage, `workoutImages/${auth.currentUser.uid}_${Date.now()}_${workoutImage.name}`);
        const snapshot = await uploadBytes(imageRef, workoutImage);
        imageUrl = await getDownloadURL(snapshot.ref);
        setUploadingImage(false);
      }

      await addDoc(collection(db, "workoutLogs"), {
        clientId: auth.currentUser.uid,
        trainerId: plan.trainerId,
        planId: plan.id,
        dayIndex: dayIdx,
        dayName: day.name || `Day ${dayIdx + 1}`,
        exercises: logData,
        overallComment,
        imageUrl,
        completedAt: new Date(),
        status: "completed",
      });

      alert("Workout logged successfully!");
      navigate(-1);
    } catch (error) {
      console.error("Error submitting workout log:", error);
      alert("Failed to submit workout log. Check console for details.");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  // -------------------------
  // RENDER
  // -------------------------
  if (loading) return <h2>Loading workout...</h2>;

  if (!day) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Day not found</h2>
        <p>This workout day doesn't exist in the plan.</p>
        <button onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>
        ← Back
      </button>

      <h1>Log Workout</h1>
      <h2>
        Day {dayIdx + 1}
        {day.name ? ` — ${day.name}` : ""}
      </h2>
      {day.description && <p style={{ color: "#666" }}>{day.description}</p>}

      {logData.length === 0 ? (
        <p>No exercises in this day.</p>
      ) : (
        <div>
          {logData.map((ex, exIndex) => (
            <div
              key={exIndex}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}
            >
              <h3>
                {exIndex + 1}. {ex.name || "Unnamed Exercise"}
              </h3>
              {ex.description && (
                <p style={{ color: "#888", fontSize: 14 }}>{ex.description}</p>
              )}

              <p style={{ fontSize: 14, color: "#555" }}>
                <strong>Target:</strong> {ex.targetSets || "—"} sets ×{" "}
                {ex.targetReps || "—"} reps
              </p>

              <div style={{ marginTop: 15 }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: 14 }}>Sets Log</h4>
                {ex.actualSets.map((set, setIndex) => (
                  <div key={setIndex} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, width: 45 }}>Set {setIndex + 1}</span>
                    <input
                      type="text"
                      placeholder="Weight (e.g. 60kg)"
                      value={set.weight}
                      onChange={(e) => updateSet(exIndex, setIndex, "weight", e.target.value)}
                      style={{ width: 130, padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
                    />
                    <input
                      type="text"
                      placeholder="Reps (e.g. 10)"
                      value={set.reps}
                      onChange={(e) => updateSet(exIndex, setIndex, "reps", e.target.value)}
                      style={{ width: 110, padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
                    />
                    {ex.actualSets.length > 1 && (
                      <button
                        onClick={() => removeSet(exIndex, setIndex)}
                        style={{ padding: "6px 10px", background: "#ff4d4f", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addSet(exIndex)}
                  style={{ marginTop: 5, padding: "6px 12px", background: "#f0f0f0", color: "#333", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 13 }}
                >
                  + Add Set
                </button>
              </div>

              <div style={{ marginTop: 15 }}>
                <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. felt easy, increase next time"
                  value={ex.notes}
                  onChange={(e) => updateLog(exIndex, "notes", e.target.value)}
                  style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
                />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 30, padding: 15, border: "1px solid #ddd", borderRadius: 8, background: "#f9f9f9" }}>
            <h3 style={{ marginTop: 0 }}>Workout Summary</h3>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", fontSize: 14 }}>
                Overall Comment (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="How did the workout feel? Any injuries, extreme fatigue, or new PRs?"
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", fontSize: 14 }}>
                Attach a Picture (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setWorkoutImage(e.target.files[0]);
                  }
                }}
                style={{ display: "block", marginBottom: 5 }}
              />
              {workoutImage && (
                <p style={{ fontSize: 13, color: "#2e7d32", margin: 0 }}>
                  Selected: {workoutImage.name}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || uploadingImage}
            style={{
              marginTop: 20,
              padding: "10px 30px",
              fontSize: 16,
              cursor: submitting || uploadingImage ? "not-allowed" : "pointer",
            }}
          >
            {submitting || uploadingImage ? "Submitting..." : "✅ Submit Workout"}
          </button>
        </div>
      )}
    </div>
  );
}
