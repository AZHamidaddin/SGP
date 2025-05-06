import React, { useContext, useState, useEffect } from "react";
import { UserContext } from "./UserContext";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

const WatchedHistory = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
const [successMessage, setSuccessMessage] = useState("");

  const itemsPerPage = 5;

  useEffect(() => {
    if (user?.id) {
      fetch(`http://localhost:5000/api/users/${user.id}/watch-history`)
        .then((res) => res.json())
        .then((data) => {
          setWatchHistory(data.watchHistory || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch watch history:", err);
          setLoading(false);
        });
    }
  }, [user?.id]);

  // Handles deleting a movie from watch history
  // Shows success message for 5 seconds
  // Updates pagination if needed after deletion
  const handleDelete = async (movieId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/users/${user.id}/watch-history/${movieId}`,
        {
          method: "DELETE",
        }
      );
  
      if (!res.ok) throw new Error("Failed to delete");
  
      const deletedMovie = watchHistory.find((m) => m._id === movieId);
      setSuccessMessage(`"${deletedMovie?.Title || 'Movie'}" removed from your watch history.`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
  
      setWatchHistory((prev) => {
        const updated = prev.filter((movie) => movie._id !== movieId);
        const totalPages = Math.ceil(updated.length / itemsPerPage);
        if (currentPage > totalPages) {
          setCurrentPage(Math.max(1, totalPages));
        }
        return updated;
      });
    } catch (err) {
      console.error("Error deleting movie:", err);
    }
  };
  

  // Calculate which movies to show on the current page
  // Filter out any invalid entries missing required fields
  // Then slice to get just the movies for this page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const validMovies = watchHistory.filter(
    (m) => m?.Title || m?.Language || m?.Parent || m?.date
  );
  const currentMovies = validMovies.slice(startIndex, startIndex + itemsPerPage);

  // Figures out which cinema chain the user visits most often
  // Counts up how many times they've been to each cinema
  // Returns the one with the highest count, or "None" if no history
  const favoriteCinema = () => {
    const counts = watchHistory.reduce((acc, movie) => {
      const parent = movie.Parent || "Unknown";
      acc[parent] = (acc[parent] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "None";
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold">
          Welcome, {user ? user.name : "Guest"}!
        </h1>
        <p className="text-gray-400 mt-2">Email: {user?.email}</p>
        <p className="text-gray-400">Favorite Cinema: {favoriteCinema()}</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-300">Loading...</p>
      ) : validMovies.length === 0 ? (
        <p className="text-center text-gray-300">You haven't watched any movies yet.</p>
      ) : (
        <div className="max-w-6xl mx-auto bg-gray-800 rounded-lg shadow-md p-6 overflow-x-auto">
          <h2 className="text-2xl font-bold text-gray-300 mb-4 text-center">Watch History</h2>
          <table className="w-full table-fixed text-gray-300 text-sm md:text-base">
            <thead>
              <tr className="bg-gray-700 text-left">
              
                <th className="px-2 py-2 w-1/5">Title</th>
                <th className="px-2 py-2 w-1/5">Language</th>
                <th className="px-2 py-2 w-1/5">Cinema</th>
                <th className="px-2 py-2 w-1/5">Date</th>
                <th className="px-2 py-2 w-1/10 text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {currentMovies.map((movie, index) => (
                <tr key={index} className="border-t border-gray-600">
                 
                  <td className="px-2 py-2 truncate">{movie.Title}</td>
                  <td className="px-2 py-2">{movie.Language}</td>
                  <td className="px-2 py-2">{movie.Parent || ""}</td>
                  <td className="px-2 py-2">{movie.date}</td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => handleDelete(movie._id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-gray-300">
              Page {currentPage} of {Math.ceil(validMovies.length / itemsPerPage)}
            </p>
            <button
              disabled={currentPage === Math.ceil(validMovies.length / itemsPerPage)}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate("/home")}
          className="px-6 py-3 bg-pink-500 text-white rounded-lg shadow-md hover:bg-pink-600"
        >
          Back
        </button>
      </div>
      {showSuccess && (
  <div className="fixed top-10 right-5 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 border-green-500 z-50 flex items-center gap-4">
    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
    <div>
      <p className="font-semibold">Success</p>
      <p className="text-sm text-gray-300">{successMessage}</p>
    </div>
  </div>
)}


    </div>
  );
};

export default WatchedHistory;
