import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";

export default function DietLogger() {
  const { planId, dayIndex } = useParams();
  const navigate = useNavigate();
  const dayIdx = parseInt(dayIndex, 10);

  const [plan, setPlan] = useState(null);
  const [day, setDay] = useState(null);
  const [mealsLogged, setMealsLogged] = useState([]); 
  const [customMeals, setCustomMeals] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overallComment, setOverallComment] = useState("");

  // -------------------------
  // LOAD PLAN & INIT LOG DATA
  // -------------------------
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const docRef = doc(db, "dietPlans", planId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const planData = { id: docSnap.id, ...docSnap.data() };
          setPlan(planData);

          const selectedDay = planData.days?.[dayIdx];
          if (selectedDay) {
            setDay(selectedDay);

            // Initialize log entries from the template meals
            const initialLog = (selectedDay.meals || []).map((meal) => ({
              name: meal.name || "",
              description: meal.description || "",
              calories: meal.calories || "",
              checked: false, // Default un-checked
            }));
            setMealsLogged(initialLog);
          }
        }
      } catch (error) {
        console.error("Error loading diet plan for logging:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [planId, dayIdx]);

  const toggleMealCheck = (index) => {
    const updated = [...mealsLogged];
    updated[index].checked = !updated[index].checked;
    setMealsLogged(updated);
  };

  const addCustomMeal = () => {
    setCustomMeals([...customMeals, { name: "", description: "" }]);
  };

  const updateCustomMeal = (index, field, value) => {
    const updated = [...customMeals];
    updated[index][field] = value;
    setCustomMeals(updated);
  };

  const removeCustomMeal = (index) => {
    const updated = [...customMeals];
    updated.splice(index, 1);
    setCustomMeals(updated);
  };

  // -------------------------
  // SUBMIT DIET LOG
  // -------------------------
  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      await addDoc(collection(db, "dietLogs"), {
        clientId: auth.currentUser.uid,
        trainerId: plan.trainerId,
        planId: plan.id,
        dayIndex: dayIdx,
        dayName: day.name || `Day ${dayIdx + 1}`,
        mealsLogged,
        customMeals,
        overallComment,
        completedAt: new Date(),
        status: "completed",
      });

      alert("Diet logged successfully!");
      navigate(-1);
    } catch (error) {
      console.error("Error submitting diet log:", error);
      alert("Failed to submit diet log. Check console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <h2 style={{ padding: 20 }}>Loading diet day...</h2>;

  if (!day) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Day not found</h2>
        <p>This diet day doesn't exist in the plan.</p>
        <button onClick={() => navigate(-1)}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20, padding: "8px 12px", cursor: "pointer" }}>
        ← Back
      </button>

      <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 10, marginBottom: 30 }}>
        <h1 style={{ margin: "0 0 10px 0", color: "#2E7D32" }}>Log Diet</h1>
        <h2 style={{ margin: "0 0 10px 0" }}>
          Day {dayIdx + 1}
          {day.name ? ` — ${day.name}` : ""}
        </h2>
        {day.description && <p style={{ color: "#666", margin: 0, fontSize: 16 }}>{day.description}</p>}
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #ddd", marginBottom: 30 }}>
        <h3 style={{ marginTop: 0, borderBottom: "2px solid #eee", paddingBottom: 10, color: "#333" }}>Prepared Meals Checklist</h3>
        <p style={{ color: "#666", fontSize: 14 }}>Mark the meals you have successfully eaten today as instructed by your trainer.</p>

        {mealsLogged.length === 0 ? (
          <p style={{ fontStyle: "italic", color: "#888" }}>No prepared meals for this day.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            {mealsLogged.map((meal, index) => (
              <label 
                key={index} 
                style={{ 
                  display: "flex", 
                  alignItems: "flex-start", 
                  gap: 15, 
                  padding: 15, 
                  background: meal.checked ? "#e8f5e9" : "#f8f9fa", 
                  border: `1px solid ${meal.checked ? "#4caf50" : "#ddd"}`, 
                  borderRadius: 8, 
                  cursor: "pointer",
                  transition: "0.2s"
                }}
              >
                <div style={{ marginTop: 2 }}>
                  <input 
                    type="checkbox" 
                    checked={meal.checked} 
                    onChange={() => toggleMealCheck(index)} 
                    style={{ width: 22, height: 22, cursor: "pointer" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <strong style={{ fontSize: 16, color: meal.checked ? "#2e7d32" : "#333", textDecoration: meal.checked ? "line-through" : "none" }}>{meal.name}</strong>
                    {meal.calories && <span style={{ fontSize: 13, color: "#1565c0", fontWeight: "bold", background: "#e3f2fd", padding: "2px 8px", borderRadius: 10 }}>{meal.calories}</span>}
                  </div>
                  <p style={{ margin: 0, color: "#666", fontSize: 14, textDecoration: meal.checked ? "line-through" : "none" }}>{meal.description}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #ddd", marginBottom: 30 }}>
        <h3 style={{ marginTop: 0, borderBottom: "2px solid #eee", paddingBottom: 10, color: "#d32f2f" }}>Custom / Extra Items</h3>
        <p style={{ color: "#666", fontSize: 14 }}>Did you eat anything else not on the plan? Log it honestly here.</p>

        <button 
          onClick={addCustomMeal}
          style={{ padding: "8px 16px", background: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb", borderRadius: 4, cursor: "pointer", fontWeight: "bold", marginBottom: 20 }}
        >
          ➕ Add Extra Item
        </button>

        {customMeals.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
            {customMeals.map((meal, index) => (
              <div key={index} style={{ padding: 15, background: "#fff", border: "1px solid #ffcdd2", borderRadius: 8, borderLeft: "4px solid #ef5350" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong style={{ color: "#c62828" }}>Extra Item {index + 1}</strong>
                  <button 
                    onClick={() => removeCustomMeal(index)}
                    style={{ padding: "4px 8px", background: "#ff4d4f", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                  >
                    Remove
                  </button>
                </div>
                
                <input
                  type="text"
                  placeholder="What did you eat? (e.g. 1 slice of pizza)"
                  value={meal.name}
                  onChange={(e) => updateCustomMeal(index, "name", e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", marginBottom: 10, boxSizing: "border-box" }}
                />
                <textarea
                  placeholder="Optional details, portion size, or estimated calories..."
                  rows={2}
                  value={meal.description}
                  onChange={(e) => updateCustomMeal(index, "description", e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #ddd" }}>
        <h3 style={{ marginTop: 0, borderBottom: "2px solid #eee", paddingBottom: 10 }}>Daily Summary</h3>
        <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", fontSize: 14 }}>
          Overall Notes (Optional)
        </label>
        <textarea
          rows={3}
          placeholder="How did you feel today? Hungry, full, good energy?"
          value={overallComment}
          onChange={(e) => setOverallComment(e.target.value)}
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", fontFamily: "inherit", boxSizing: "border-box" }}
        />
        
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            marginTop: 20,
            padding: "12px 30px",
            fontSize: 16,
            fontWeight: "bold",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 30,
            cursor: submitting ? "not-allowed" : "pointer",
            width: "100%"
          }}
        >
          {submitting ? "Submitting..." : "✅ Submit Diet Log"}
        </button>
      </div>

    </div>
  );
}
