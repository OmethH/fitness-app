import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";

export default function WorkoutPlanEditor({ clientId, mode, onClose, planId }) {
  const { planId: routePlanId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState([]);

  // --- UNDO/REDO LOGIC (STACKS) ---
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const saveToHistory = () => {
    const currentState = { title, description, days: JSON.parse(JSON.stringify(days)) };
    setHistory(prev => [...prev.slice(-19), currentState]);
    setFuture([]); // Clear redo stack on new action
  };

  const undo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    const currentState = { title, description, days: JSON.parse(JSON.stringify(days)) };
    
    setFuture(prev => [currentState, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    
    setTitle(prevState.title);
    setDescription(prevState.description);
    setDays(prevState.days);
  };

  const redo = () => {
    if (future.length === 0) return;
    const nextState = future[0];
    const currentState = { title, description, days: JSON.parse(JSON.stringify(days)) };
    
    setHistory(prev => [...prev, currentState]);
    setFuture(prev => prev.slice(1));
    
    setTitle(nextState.title);
    setDescription(nextState.description);
    setDays(nextState.days);
  };

  const actualMode = mode || (routePlanId ? "edit" : "create");
  const [activePlanId, setActivePlanId] = useState(planId || routePlanId);

  // -------------------------
  // If editing, load existing plan
  // -------------------------
  useEffect(() => {
    const fetchPlan = async () => {
      if (actualMode === "edit") {
        if (activePlanId) {
          const docRef = doc(db, "workoutPlans", activePlanId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTitle(data.title);
            setDescription(data.description);
            setDays(data.days || []);
          }
        } else if (clientId) {
          const q = query(
            collection(db, "workoutPlans"),
            where("clientId", "==", clientId),
            where("trainerId", "==", auth.currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            setActivePlanId(docSnap.id);
            const data = docSnap.data();
            setTitle(data.title);
            setDescription(data.description);
            setDays(data.days || []);
          }
        }
      }
    };
    fetchPlan();
  }, [actualMode, activePlanId, clientId]);

  // -------------------------
  // Day & Exercise Handlers
  // -------------------------
  const addDay = () => {
    saveToHistory();
    setDays([...days, { name: "", description: "", exercises: [] }]);
  };

  const updateDay = (index, field, value) => {
    saveToHistory();
    const updated = [...days];
    updated[index][field] = value;
    setDays(updated);
  };

  const addExercise = (dayIndex) => {
    saveToHistory();
    const updated = [...days];
    updated[dayIndex].exercises.push({ name: "", description: "", sets: "", reps: "" });
    setDays(updated);
  };

  const updateExercise = (dayIndex, exIndex, field, value) => {
    saveToHistory();
    const updated = [...days];
    updated[dayIndex].exercises[exIndex][field] = value;
    setDays(updated);
  };

  // -------------------------
  // Save Plan
  // -------------------------
  const savePlan = async () => {
    if (!title.trim()) {
      alert("Plan needs a title");
      return;
    }

    const trainerId = auth.currentUser.uid;

    if (actualMode === "create") {
      await addDoc(collection(db, "workoutPlans"), {
        trainerId,
        clientId,
        title,
        description,
        days,
        createdAt: new Date(),
      });
      
      // 🔥 Add Notification (Frontend-side)
      await addDoc(collection(db, "notifications", clientId, "items"), {
        title: "New Workout Plan",
        body: `Your trainer has assigned a new workout plan: ${title}`,
        read: false,
        createdAt: new Date(),
        type: "workout_assigned"
      });

      alert("Workout plan created!");
    } else if (actualMode === "edit" && activePlanId) {
      const docRef = doc(db, "workoutPlans", activePlanId);
      await updateDoc(docRef, { title, description, days });

      // 🔥 Add Notification (Frontend-side)
      await addDoc(collection(db, "notifications", clientId, "items"), {
        title: "Workout Plan Updated",
        body: `Your trainer has updated your plan: ${title}`,
        read: false,
        createdAt: new Date(),
        type: "workout_updated"
      });

      alert("Workout plan updated!");
    }

    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ padding: 20, border: "1px solid #ccc", marginTop: 20 }}>
      <h1>{actualMode === "create" ? "Create Workout Plan" : "Edit Workout Plan"}</h1>

      <label>Plan Title:</label>
      <input
        value={title}
        onChange={(e) => { saveToHistory(); setTitle(e.target.value); }}
        placeholder="e.g., 6-Week Strength Program"
      />
      <br />

      <label>Plan Description:</label>
      <textarea
        value={description}
        onChange={(e) => { saveToHistory(); setDescription(e.target.value); }}
        placeholder="Overall goal, notes, instructions..."
      />
      <br />

      <div style={{ margin: "10px 0", display: "flex", gap: 10 }}>
        <button onClick={undo} disabled={history.length === 0} style={{ opacity: history.length === 0 ? 0.5 : 1 }}>↩️ Undo</button>
        <button onClick={redo} disabled={future.length === 0} style={{ opacity: future.length === 0 ? 0.5 : 1 }}>↪️ Redo</button>
      </div>

      <button onClick={addDay}>➕ Add Day</button>
      <hr />

      {days.map((day, dayIndex) => (
        <div key={dayIndex} style={{ marginBottom: 30 }}>
          <h2>Day {dayIndex + 1}</h2>

          <input
            value={day.name}
            onChange={(e) => updateDay(dayIndex, "name", e.target.value)}
            placeholder="Chest Day, Back Day..."
          />

          <textarea
            value={day.description}
            onChange={(e) => updateDay(dayIndex, "description", e.target.value)}
            placeholder="Description for this day"
          />

          <button onClick={() => addExercise(dayIndex)}>➕ Add Exercise</button>

          {day.exercises.map((ex, exIndex) => (
            <div key={exIndex} style={{ padding: 10, borderLeft: "2px solid #999" }}>
              <h4>Exercise {exIndex + 1}</h4>

              <input
                value={ex.name}
                onChange={(e) => updateExercise(dayIndex, exIndex, "name", e.target.value)}
                placeholder="Exercise name"
              />
              <input
                value={ex.description}
                onChange={(e) => updateExercise(dayIndex, exIndex, "description", e.target.value)}
                placeholder="Description"
              />
              <input
                value={ex.sets}
                onChange={(e) => updateExercise(dayIndex, exIndex, "sets", e.target.value)}
                placeholder="Sets"
              />
              <input
                value={ex.reps}
                onChange={(e) => updateExercise(dayIndex, exIndex, "reps", e.target.value)}
                placeholder="Reps"
              />
            </div>
          ))}
        </div>
      ))}

      <hr />
      <button onClick={savePlan}>💾 {actualMode === "create" ? "Create Plan" : "Update Plan"}</button>
      <button onClick={onClose ? onClose : () => navigate(-1)} style={{ marginLeft: 10 }}>❌ Close</button>
    </div>
  );
}