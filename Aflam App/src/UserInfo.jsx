import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "./UserContext";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export default function UserInfo() {
  const { user, setUser } = useContext(UserContext);
  const [showDetails, setShowDetails] = useState(false);
  const [showWatchHistory, setShowWatchHistory] = useState(false);
  const [watchHistory, setWatchHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's watch history when component mounts or user changes
  useEffect(() => {
    if (showDetails || showWatchHistory) {
      fetchWatchHistory();
    }
  }, [showDetails, showWatchHistory, user?.id]);

  // Fetch user's watch history
  const fetchWatchHistory = async () => {
    if (!user || !user.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}/watch-history`);
      const data = await response.json();
      
      if (response.ok) {
        setWatchHistory(data.watchHistory || []);
        
        // Update user context with latest watch history
        if (user && JSON.stringify(user.userViewHistory) !== JSON.stringify(data.watchHistory)) {
          setUser({
            ...user,
            userViewHistory: data.watchHistory || []
          });
        }
      } else {
        console.error("Error fetching watch history:", data.message);
      }
    } catch (error) {
      console.error("Error fetching watch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle watch history display and fetch data
  const toggleWatchHistory = () => {
    if (!showWatchHistory) {
      fetchWatchHistory();
    }
    setShowWatchHistory(!showWatchHistory);
  };

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
            <button 
              onClick={toggleWatchHistory}
              className="text-lg font-medium hover:text-red-400 transition duration-300 flex items-center justify-center w-full"
            >
              {user.userViewHistory ? user.userViewHistory.length : 0}
              {showWatchHistory ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
            </button>
          </div>
          <div className="bg-gray-800 rounded-xl shadow-md p-6 w-64 text-center">
            <p className="text-sm text-gray-400">Total Duration Watched</p>
            <p className="text-lg font-medium">{user.total_duration} mins</p>
          </div>
        </div>
      )}

      {/* Watch History Modal */}
      {showWatchHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Movies You've Watched</h2>
              <div className="flex items-center">
                <button 
                  onClick={fetchWatchHistory}
                  className="text-gray-400 hover:text-white mr-3"
                  title="Refresh watch history"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                    <path d="M3 22v-6h6"></path>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => setShowWatchHistory(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p>Loading your watch history...</p>
              </div>
            ) : watchHistory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {watchHistory.map((movie, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-center">{movie}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p>You haven't watched any movies yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Movies will appear here when you click "Add to Watched" on a movie.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
