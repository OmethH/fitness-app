import { signOut } from "firebase/auth";
import { auth } from "../firebase";

import TrainerDashboard from "./TrainerDashboard";
import ClientDashboard from "./ClientDashboard";

function Dashboard({ role }) {

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div>
      {role === "trainer" && <TrainerDashboard />}
      {role === "client" && <ClientDashboard />}

      <br />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;