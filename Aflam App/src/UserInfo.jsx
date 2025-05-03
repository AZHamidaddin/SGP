import React, { useContext, useState } from "react";
import { UserContext } from "./UserContext";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserInfo() {
  const { user } = useContext(UserContext);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (!user) return null;

  return (
    <div className="w-full py-8 px-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="text-center mb-4 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {getGreeting()}, {user.name} 👋
          </h1>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-white hover:text-red-400 transition duration-300"
            title={showDetails ? "Hide Info" : "Show Info"}
          >
            {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="flex flex-col items-center gap-6">
          

          <button
            onClick={() => navigate("/history")}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            View Watch History
          </button>
        </div>
      )}
    </div>
  );
}
