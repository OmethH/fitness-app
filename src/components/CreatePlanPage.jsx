import { useParams } from "react-router-dom";
import WorkoutPlanEditor from "./WorkoutPlanEditor";
import { useState } from "react";

export default function CreatePlanPage() {
  const { clientId } = useParams();
  const [showEditor, setShowEditor] = useState(true);

  return (
    <div style={{ padding: 20 }}>
      <h1>Create Workout Plan for Client</h1>

      {showEditor && (
        <WorkoutPlanEditor
          clientId={clientId}
          mode="create"
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}