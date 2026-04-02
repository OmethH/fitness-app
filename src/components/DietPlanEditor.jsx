import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";

export default function DietPlanEditor({ clientId, mode, onClose, planId }) {
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
          const docRef = doc(db, "dietPlans", activePlanId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTitle(data.title);
            setDescription(data.description);
            setDays(data.days || []);
          }
        } else if (clientId) {
          const q = query(
            collection(db, "dietPlans"),
            where("clientId", "==", clientId),
            where("trainerId", "==", auth.currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            plans.sort((a, b) => {
              const dateA = a.createdAt?.toMillis() || 0;
              const dateB = b.createdAt?.toMillis() || 0;
              return dateB - dateA;
            });
            const latestPlan = plans[0];
            setActivePlanId(latestPlan.id);
            setTitle(latestPlan.title);
            setDescription(latestPlan.description);
            setDays(latestPlan.days || []);
          }
        }
      }
    };
    fetchPlan();
  }, [actualMode, activePlanId, clientId]);

  // -------------------------
  // Day & Meal Handlers
  // -------------------------
  const addDay = () => {
    saveToHistory();
    setDays([...days, { 
      name: "", 
      description: "", 
      meals: [
        { name: "Breakfast", description: "", calories: "" },
        { name: "Lunch", description: "", calories: "" },
        { name: "Dinner", description: "", calories: "" }
      ] 
    }]);
  };

  const updateDay = (index, field, value) => {
    saveToHistory();
    const updated = [...days];
    updated[index][field] = value;
    setDays(updated);
  };

  const addMeal = (dayIndex) => {
    saveToHistory();
    const updated = [...days];
    updated[dayIndex].meals.push({ name: "", description: "", calories: "" });
    setDays(updated);
  };

  const updateMeal = (dayIndex, mealIndex, field, value) => {
    saveToHistory();
    const updated = [...days];
    updated[dayIndex].meals[mealIndex][field] = value;
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

    if (actualMode === "create" && !activePlanId) {
      const docRef = await addDoc(collection(db, "dietPlans"), {
        trainerId,
        clientId,
        title,
        description,
        days,
        createdAt: new Date(),
      });
      setActivePlanId(docRef.id);

      // 🔥 Add Notification (Frontend-side)
      await addDoc(collection(db, "notifications", clientId, "items"), {
        title: "New Diet Plan",
        body: `Your trainer has assigned a new diet plan: ${title}`,
        read: false,
        createdAt: new Date(),
        type: "diet_assigned"
      });

      alert("Diet plan created!");
    } else if (actualMode === "edit" || activePlanId) {
      const docRef = doc(db, "dietPlans", activePlanId);
      await updateDoc(docRef, { title, description, days });

      // 🔥 Add Notification (Frontend-side)
      await addDoc(collection(db, "notifications", clientId, "items"), {
        title: "Diet Plan Updated",
        body: `Your trainer has updated your diet plan: ${title}`,
        read: false,
        createdAt: new Date(),
        type: "diet_updated"
      });

      alert("Diet plan updated!");
    }

    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div style={{ padding: 20, border: "1px solid #ccc", marginTop: 20, borderRadius: 8, background: "#fdfdfd" }}>
      <h2 style={{ marginTop: 0 }}>{actualMode === "create" && !activePlanId ? "Create Diet Plan" : "Edit Diet Plan"}</h2>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>Plan Title:</label>
        <input
          value={title}
          onChange={(e) => { saveToHistory(); setTitle(e.target.value); }}
          placeholder="e.g., 4-Week Cut Diet"
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>Plan Description:</label>
        <textarea
          value={description}
          onChange={(e) => { saveToHistory(); setDescription(e.target.value); }}
          placeholder="Overall goals, allergies, hydration notes..."
          rows={3}
          style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", fontFamily: "inherit", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <button 
          onClick={undo} 
          disabled={history.length === 0}
          style={{ padding: "8px 15px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4, cursor: history.length === 0 ? "not-allowed" : "pointer", opacity: history.length === 0 ? 0.5 : 1 }}
        >
          ↩️ Undo
        </button>
        <button 
          onClick={redo} 
          disabled={future.length === 0}
          style={{ padding: "8px 15px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4, cursor: future.length === 0 ? "not-allowed" : "pointer", opacity: future.length === 0 ? 0.5 : 1 }}
        >
          ↪️ Redo
        </button>
      </div>

      <button 
        onClick={addDay}
        style={{ padding: "8px 15px", background: "#e0e0e0", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}
      >
        ➕ Add Day
      </button>

      <hr style={{ margin: "20px 0" }} />

      {days.map((day, dayIndex) => (
        <div key={dayIndex} style={{ marginBottom: 30, padding: 15, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
          <h3 style={{ marginTop: 0, color: "#2E7D32" }}>Day {dayIndex + 1}</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
            <input
              value={day.name}
              onChange={(e) => updateDay(dayIndex, "name", e.target.value)}
              placeholder="e.g., High Carb Day, Monday"
              style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              value={day.description}
              onChange={(e) => updateDay(dayIndex, "description", e.target.value)}
              placeholder="Daily goal or notes"
              style={{ flex: 2, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
          </div>

          <button 
            onClick={() => addMeal(dayIndex)}
            style={{ padding: "6px 12px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 13, marginBottom: 15 }}
          >
            ➕ Add Meal
          </button>

          { (day.meals || []).map((meal, mealIndex) => (
            <div key={mealIndex} style={{ padding: 15, borderLeft: "3px solid #2E7D32", background: "#f9f9f9", marginBottom: 15, borderRadius: "0 8px 8px 0" }}>
              <h4 style={{ margin: "0 0 10px 0" }}>Meal {mealIndex + 1}</h4>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", boxSizing: "border-box" }}>
                <input
                  value={meal.name}
                  onChange={(e) => updateMeal(dayIndex, mealIndex, "name", e.target.value)}
                  placeholder="e.g., Breakfast, Pre-workout"
                  style={{ flex: 1, minWidth: 150, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                />
                <input
                  value={meal.calories}
                  onChange={(e) => updateMeal(dayIndex, mealIndex, "calories", e.target.value)}
                  placeholder="e.g., 450 kcal, 30g Protein"
                  style={{ flex: 1, minWidth: 150, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                />
              </div>
              <textarea
                value={meal.description}
                onChange={(e) => updateMeal(dayIndex, mealIndex, "description", e.target.value)}
                placeholder="Meal details (e.g., 2 whole eggs, 1 cup oats)"
                rows={2}
                style={{ width: "100%", marginTop: 10, padding: 8, borderRadius: 4, border: "1px solid #ccc", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          ))}
        </div>
      ))}

      <hr style={{ margin: "20px 0" }} />
      <div style={{ display: "flex", gap: 10 }}>
        <button 
          onClick={savePlan}
          style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: 15 }}
        >
          💾 Save Diet Plan
        </button>
        {onClose && (
          <button 
            onClick={onClose}
            style={{ padding: "10px 20px", background: "#dc3545", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold", fontSize: 15 }}
          >
            ❌ Close
          </button>
        )}
      </div>
    </div>
  );
}
