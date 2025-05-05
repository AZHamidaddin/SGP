import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "./UserContext"; // Import UserContext to check user info
import Navbar from "./Navbar";
import SearchMovies from "./SearchMovies";
import { FaPen, FaPlus, FaCheckCircle, FaTimesCircle } from "react-icons/fa";


// Utility function to normalize movie titles for grouping
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

// Helper function to find the best image URL based on source priority
const getPrioritizedImageUrl = (group, priority) => {
  // Find the image based on priority
  for (const sourceName of priority) {
    // Check the 'Parent' field for the source name
    const movie = group.find(m => m.Parent?.toUpperCase() === sourceName.toUpperCase());
    if (movie && movie["Image URL"]) {
      return movie["Image URL"];
    }
  }
  // Fallback to the first movie's image URL if no prioritized source is found or if the group is empty
  return group[0]?.["Image URL"] || ""; // Use optional chaining and provide a default empty string
};

// Function to group movies based on title similarity (from MovieGrid)
const mergeMoviesByTitle = (movies) => {
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < movies.length; i++) {
    if (visited.has(i)) continue;
    const group = [movies[i]];
    visited.add(i);
    const titleA = normalize(movies[i].Title);
    for (let j = i + 1; j < movies.length; j++) {
      if (visited.has(j)) continue;
      const titleB = normalize(movies[j].Title);
      if (titleA.includes(titleB) || titleB.includes(titleA)) {
        group.push(movies[j]);
        visited.add(j);
      }
    }
    groups.push(group);
  }

  // Sort groups alphabetically by the title of the first movie in each group
  return groups.sort((a, b) =>
    a[0].Title.localeCompare(b[0].Title, undefined, { sensitivity: "base" })
  );
};

// AllMovies Component
const AllMovies = () => {
  const { user, setUser } = useContext(UserContext); // Get the current user
  const [movieGroups, setMovieGroups] = useState([]); // State now holds groups of movies
  const [loading, setLoading] = useState(true);
  const [editedTitles, setEditedTitles] = useState({});
  const [errors, setErrors] = useState({});
  const [watchedMovies, setWatchedMovies] = useState([]); // Store watched movies
  const [imageAspectRatios, setImageAspectRatios] = useState({}); // State for image aspect ratios
  const [showModal, setShowModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);


  const isAdmin = user?.isAdmin ?? false; // If isAdmin is null, set it to false by default

  useEffect(() => {
    fetch("http://localhost:5000/movies")
      .then((res) => res.json())
      .then((data) => {
        const grouped = mergeMoviesByTitle(data || []); // Use the grouping function
        setMovieGroups(grouped); // Store the groups
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Handler for image loading
  const handleImageLoad = (event, url) => {
    const { naturalWidth, naturalHeight } = event.target;
    if (naturalHeight > 0) { // Avoid division by zero
      const aspectRatio = naturalWidth / naturalHeight;
      setImageAspectRatios(prev => ({ ...prev, [url]: aspectRatio }));
    } else {
      // Handle cases where height is 0 or image fails to load dimension data
      setImageAspectRatios(prev => ({ ...prev, [url]: 1 })); // Default to aspect ratio 1 (square-ish)
    }
  };

  // Handle title change for editing (applies to the main movie in the group)
  const handleTitleChange = (e, mainMovieId) => {
    setEditedTitles((prev) => ({
      ...prev,
      [mainMovieId]: e.target.value,
    }));
  };

  // Handle movie update submission (for admins)
  const handleEditSubmit = async (mainMovieId, newTitle) => {
    console.log("Submitting movie update with:", { movieId: mainMovieId, Title: newTitle });

    // Find the group associated with this mainMovieId
    const groupToUpdate = movieGroups.find(group => group[0]._id === mainMovieId);
    if (!groupToUpdate) {
      console.error("Could not find group to update for ID:", mainMovieId);
      setErrors({ general: "Error finding movie group to update." });
      return;
    }

    // --- Potential improvement: Update all movies in the group? ---
    // For now, we only update the main movie record identified by mainMovieId.
    // If the title change should apply to all records in the group,
    // additional API calls or backend logic would be needed.

    try {
      const response = await fetch(`http://localhost:5000/movies/${mainMovieId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Title: newTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.message || "Error updating movie title" });
      } else {
        // Re-fetch and re-group data to reflect the change immediately
        fetch("http://localhost:5000/movies")
          .then((res) => res.json())
          .then((updatedData) => {
            const grouped = mergeMoviesByTitle(updatedData || []);
            setMovieGroups(grouped);
          })
          .catch((err) => console.error("Error fetching updated data:", err));

        setEditedTitles((prev) => ({ ...prev, [mainMovieId]: undefined })); // Clear edited title for this movie
        alert("Movie title updated successfully!");
      }
    } catch (err) {
      setErrors({ general: "Error updating movie title" });
      console.error("Error updating title:", err);
    }
  };

  // Sort movie groups alphabetically based on the main movie's title
  const sortMovieGroups = () => {
    const sortedGroups = [...movieGroups].sort((a, b) =>
      a[0].Title.localeCompare(b[0].Title, undefined, { sensitivity: 'base' })
    );
    setMovieGroups(sortedGroups);
  };

  // Handle adding a movie to watched list (adds the main movie of the group)
  const handleAddToWatched = async (mainMovie, selectedSource) => {
    if (!user || (!user._id && !user.id)) {
      alert("Please log in to add movies to your watch history.");
      return;
    }

    const userId = user._id || user.id;

    const movieDetails = {
      _id: mainMovie._id,
      Title: mainMovie.Title,
      Language: mainMovie.Language,
      Parent: selectedSource,
      image_url: mainMovie["Image URL"],
      date: new Date().toISOString().split("T")[0],
    };

    try {
      const response = await fetch("http://localhost:5000/api/users/watch-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, movie: movieDetails }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          response.status === 400 && data.message === "Movie already in watch history"
            ? `"${mainMovie.Title}" is already in your watch history.`
            : data.message || "Error adding movie to watch history";

        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setSuccessMessage(`Added "${mainMovie.Title}" to your watch history.`);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);

        setWatchedMovies((prev) => [...prev, mainMovie]);
        if (data.watchHistory && setUser) {
          setUser({
            ...user,
            userViewHistory: data.watchHistory,
            total_movies: data.total_movies,
          });
        }
      }
    } catch (error) {
      console.error("Error adding movie to watch history:", error);
      setSuccessMessage("Failed to add movie to watch history. Please try again.");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  };




  if (loading) {
    return (
      <div className="loading-screen flex items-center justify-center h-screen bg-gradient-to-r from-red-500 via-pink-500 to-red-500">
        <p className="text-white text-2xl font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="w-full bg-gray-950 shadow-md">
        <Navbar />
      </div>

      <div className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">All Movies</h1>
        <SearchMovies />

        <div className="text-center mb-8">

        </div>

        {errors.general && (
          <div className="bg-red-700 text-white p-3 rounded mb-4 text-center">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
          {movieGroups.map((group, index) => {
            const main = group[0]; // Use the first movie in the group as the primary reference
            const priority = ['VOX', 'Muvi', 'Empire', 'AMC'];
            const imageUrl = getPrioritizedImageUrl(group, priority);

            // Determine classes based on aspect ratio
            const aspectRatio = imageAspectRatios[imageUrl];
            let wrapperClass = 'h-[350px] w-full flex items-center justify-center bg-gray-800 rounded-t-lg overflow-hidden';
            let imageClass = '';

            if (aspectRatio === undefined) {
              wrapperClass += ' animate-pulse';
              imageClass = 'opacity-0';
            } else {
              imageClass = 'object-contain w-full h-full'; // Always contain image fully
            }

            return (
              <div
                key={main._id || index} // Use main movie's ID as key
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform relative flex flex-col h-[500px]"
              >
                {/* Image Wrapper for consistent aspect ratio and centering */}
                <div className={wrapperClass}>
                  <img
                    src={imageUrl} // Use the prioritized image URL
                    alt={main.Title}
                    onLoad={(e) => handleImageLoad(e, imageUrl)} // Add onLoad handler
                    className={`transition-opacity duration-300 ${imageClass}`} // Apply dynamic class for img content
                  />
                </div>
                {/* Text Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold flex justify-between items-center">
                    {isAdmin ? (
                      <div className="flex items-center w-full">
                        <input
                          type="text"
                          value={editedTitles[main._id] !== undefined ? editedTitles[main._id] : main.Title}
                          onChange={(e) => handleTitleChange(e, main._id)}
                          className="text-lg font-bold bg-transparent border-none text-white focus:ring-2 focus:ring-purple-500 w-full mr-8" // Added margin-right for button space
                          placeholder="Enter new title"
                        />
                        <button
                          onClick={() => handleEditSubmit(main._id, editedTitles[main._id] !== undefined ? editedTitles[main._id] : main.Title)}
                          className="ml-2 text-blue-600 cursor-pointer hover:text-blue-200 absolute right-4 bottom-[100px] transform -translate-y-1/2" // Adjusted positioning slightly
                          title="Save Title Change"
                          disabled={editedTitles[main._id] === undefined} // Disable if no change
                        >
                          <FaPen />
                        </button>
                      </div>
                    ) : (
                      <span>{main.Title}</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {main.Language?.charAt(0).toUpperCase() + main.Language?.slice(1).toLowerCase()}
                  </p>
                  <div className="mt-auto">
                    <Link
                      to={`/movie/${main._id}`} // Link to the main movie's details page
                      className="inline-block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold py-2 rounded-lg transition"
                    >
                      View Details
                    </Link>

                    {!isAdmin && (
                      watchedMovies.some((m) => m._id === main._id) ? (
                        <div className="mt-3 inline-block w-full text-center font-semibold text-red-500 bg-red-100/10 py-2 rounded-lg border border-red-600">
                          <FaPlus className="inline mr-1" /> Already Watched
                        </div>

                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMovie(main);
                            setShowModal(true);
                          }}
                          className="mt-3 inline-block text-green-500 hover:text-green-400 w-full text-center"
                        >
                          <FaPlus className="inline mr-1" />
                        </button>
                      )
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-block bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-80 text-white">
            <h2 className="text-xl font-semibold mb-4 text-center">Select a Cinema Source</h2>
            <div className="space-y-2">
              {["Vox", "AMC", "Muvi", "Empire", "Online"].map((source) => (
                <button
                  key={source}
                  className="w-full py-2 px-4 rounded-lg bg-gray-700 hover:bg-blue-600 transition"
                  onClick={() => {
                    handleAddToWatched(selectedMovie, source);
                    setShowModal(false);
                    setSelectedMovie(null);
                  }}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>
        </div>

      )}

      {showSuccess && (
        <div
          className="fixed top-[100px] right-5 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg border-l-4 z-50 flex items-center gap-4"
          style={{ borderColor: successMessage.includes("already") ? "#dc2626" : "#16a34a" }} // red-600 or green-600
        >
          {successMessage.includes("already") ? (
            <FaTimesCircle className="text-red-500 w-6 h-6" />
          ) : (
            <FaCheckCircle className="text-green-400 w-6 h-6" />
          )}
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-sm text-gray-300">{successMessage}</p>
          </div>
        </div>
      )}




    </div>
  );
};

export default AllMovies;
