import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Accordion from "../components/Accordion";

function TrainerDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);

  // Plan creation form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  // -------------------------
  // FETCH REQUESTS
  // -------------------------
  const fetchRequests = async () => {
    try {
      console.log("Fetching requests...");
      const q = query(
        collection(db, "requests"),
        where("trainerId", "==", auth.currentUser.uid)
      );
  
      const querySnapshot = await getDocs(q);
  
      const requestList = await Promise.all(
        querySnapshot.docs.map(async (requestDoc) => {
          const requestData = requestDoc.data();
          try {
            const userRef = doc(db, "users", requestData.clientId);
            const userSnap = await getDoc(userRef);
    
            return {
              id: requestDoc.id,
              ...requestData,
              clientEmail: userSnap.exists() ? userSnap.data().email : "Unknown",
            };
          } catch (err) {
            console.error("Error fetching user for request", requestData.clientId, err);
            return {
              id: requestDoc.id,
              ...requestData,
              clientEmail: "Error Loading Data",
            };
          }
        })
      );
  
      setRequests(requestList);
    } catch (err) {
      console.error("Permission error fetching 'requests' collection:", err);
      throw err;
    }
  };

  // -------------------------
  // UPDATE REQUEST STATUS
  // -------------------------
  const updateStatus = async (requestId, newStatus, clientId) => {
    const requestRef = doc(db, "requests", requestId);

    await updateDoc(requestRef, { status: newStatus });

    if (newStatus === "accepted") {
      await addDoc(collection(db, "trainerClients"), {
        trainerId: auth.currentUser.uid,
        clientId,
        createdAt: new Date(),
      });
    }

    fetchRequests();
    fetchClients();
  };

  // -------------------------
  // FETCH CLIENTS & THEIR PLANS
  // -------------------------
  const fetchClients = async () => {
    try {
      console.log("Fetching clients...");
      const q = query(
        collection(db, "trainerClients"),
        where("trainerId", "==", auth.currentUser.uid)
      );
  
      const snapshot = await getDocs(q);
  
      let clientList = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          try {
            const userRef = doc(db, "users", data.clientId);
            const userSnap = await getDoc(userRef);
    
            return {
              id: docSnap.id,          // trainerClients doc ID
              clientId: data.clientId, // actual user ID
              clientEmail: userSnap.exists() ? userSnap.data().email : "Unknown",
            };
          } catch (err) {
            console.error("Error fetching user for client", data.clientId, err);
            return {
              id: docSnap.id,
              clientId: data.clientId,
              clientEmail: "Error Loading Data",
            };
          }
        })
      );
  
      // Attach existing workout plan ID
      for (let client of clientList) {
        try {
          const plansQuery = query(
            collection(db, "workoutPlans"),
            where("trainerId", "==", auth.currentUser.uid),
            where("clientId", "==", client.clientId)
          );
    
          const planSnap = await getDocs(plansQuery);
          client.planId = planSnap.empty ? null : planSnap.docs[0].id;
        } catch (err) {
          console.error("Error fetching workout plans for client", client.clientId, err);
          client.planId = null;
        }
      }
  
      setClients(clientList);
    } catch (err) {
      console.error("Permission error fetching 'trainerClients' collection:", err);
      throw err;
    }
  };

  // -------------------------
  // INIT LOAD
  // -------------------------
  useEffect(() => {
    const load = async () => {
      try {
        await fetchRequests();
        await fetchClients();
      } catch (error) {
        console.error("Error loading trainer dashboard:", error);
      }
    };
    load();
  }, []);

  // -------------------------
  // PLAN CREATION
  // -------------------------
  const openPlanForm = (clientId) => {
    setSelectedClient(clientId);
  };

  const createPlan = async () => {
    const docRef = await addDoc(collection(db, "workoutPlans"), {
      trainerId: auth.currentUser.uid,
      clientId: selectedClient,
      title,
      description,
      days: [],
      createdAt: new Date(),
    });

    alert("Workout plan created!");

    setTitle("");
    setDescription("");
    setSelectedClient(null);

    fetchClients();
    navigate(`/edit-plan/${docRef.id}`);
  };

  return (
    <div>
      <h1>Trainer Dashboard</h1>

      {/* --------------- Requests Section --------------- */}
      <Accordion title={`Requests (${requests.length})`}>
        {requests.length === 0 && <p>No requests yet</p>}
        {requests.map((req) => (
          <div
            key={req.id}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              borderRadius: 5,
              marginBottom: 10,
            }}
          >
            <p><strong>Client Email:</strong> {req.clientEmail}</p>
            <p>Status: {req.status}</p>

            {req.status === "pending" && (
              <>
                <button
                  onClick={() => updateStatus(req.id, "accepted", req.clientId)}
                >
                  Accept
                </button>
                <button
                  onClick={() => updateStatus(req.id, "rejected", req.clientId)}
                >
                  Reject
                </button>
              </>
            )}
          </div>
        ))}
      </Accordion>

      {/* --------------- Plan Creation Form --------------- */}
      {selectedClient && (
        <div style={{ marginTop: 20 }}>
          <h3>Create Workout Plan</h3>

          <input
            placeholder="Plan Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <br />
          <textarea
            placeholder="Plan Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <br />
          <button onClick={createPlan}>Save Plan</button>
        </div>
      )}

      {/* --------------- Clients Section --------------- */}
      <Accordion title={`Clients (${clients.length})`}>
        {clients.length === 0 && <p>No clients yet</p>}

        {clients.map((client) => (
          <div
            key={client.id}
            style={{
              border: "1px solid #999",
              borderRadius: 8,
              padding: 15,
              marginBottom: 10,
              cursor: "pointer",
            }}
            onClick={() => navigate(`/client/${client.clientId}`)}
          >
            <p><strong>{client.clientEmail}</strong></p>
            <p>{client.planId ? "Has workout plan" : "No workout plan yet"}</p>
          </div>
        ))}
      </Accordion>
    </div>
  );
}

export default TrainerDashboard;