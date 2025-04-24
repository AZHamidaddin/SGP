import React, { useContext, useState } from "react";
import { UserContext } from "./UserContext";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function UserInfo() {
  const { user } = useContext(UserContext);
  const [showDetails, setShowDetails] = useState(false);

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
        <div className="flex flex-wrap justify-center gap-4">
          <div className="bg-gray-800 rounded-xl shadow-md p-6 w-64 text-center">
            <p className="text-sm text-gray-400">Email</p>
            <p className="text-lg font-medium">{user.email}</p>
          </div>
          <div className="bg-gray-800 rounded-xl shadow-md p-6 w-64 text-center">
            <p className="text-sm text-gray-400">Total Movies Watched</p>
            <p className="text-lg font-medium">{user.total_movies}</p>
          </div>
          <div className="bg-gray-800 rounded-xl shadow-md p-6 w-64 text-center">
            <p className="text-sm text-gray-400">Total Duration Watched</p>
            <p className="text-lg font-medium">{user.total_duration} mins</p>
          </div>
        </div>
      )}
    </div>
  );
}
