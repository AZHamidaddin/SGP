import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "./UserContext"; // Import UserContext to check user info
import { FaPen, FaPlus } from "react-icons/fa"; // Pen and Plus icons for editing and adding
import Navbar from "./Navbar";
import SearchMovies from "./SearchMovies";
import { FaArrowLeft } from "react-icons/fa";



// Utility function to normalize movie titles
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9\s]+/g, "").trim() || "";

// Function to calculate Jaccard Similarity (for word-based comparison)
const jaccardSimilarity = (str1, str2) => {
  const set1 = new Set(str1.split(" "));
  const set2 = new Set(str2.split(" "));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
};

// Levenshtein Distance Algorithm to calculate string similarity
const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  let i, j, alen = a.length, blen = b.length, ch, hl, res;

  if (alen === 0) { return blen; }
  if (blen === 0) { return alen; }

  for (i = 0; i <= alen; i++) { tmp[i] = [i]; }
  for (j = 0; j <= blen; j++) { tmp[0][j] = j; }

  for (i = 1; i <= alen; i++) {
    ch = a.charAt(i - 1);
    for (j = 1; j <= blen; j++) {
      hl = (b.charAt(j - 1) === ch) ? 0 : 1;
      res = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + hl);
      tmp[i][j] = res;
    }
  }

  return tmp[alen][blen];
};

// Function to calculate enhanced similarity score
const calculateEnhancedSimilarity = (str1, str2) => {
  const normalizedStr1 = normalize(str1);
  const normalizedStr2 = normalize(str2);

  const jaccardSim = jaccardSimilarity(normalizedStr1, normalizedStr2);
  const levenshteinSim = 1 - getLevenshteinDistance(normalizedStr1, normalizedStr2) / Math.max(normalizedStr1.length, normalizedStr2.length);

  // Combine both measures with weighting
  const combinedSim = (jaccardSim + levenshteinSim) / 2;

  return combinedSim;
};

// Function to merge movies based on similarity of titles
const mergeSimilarMovies = (movies, threshold = 0.8) => {
  let mergedMovies = [];

  movies.forEach((movie) => {
    // Find if this movie is similar to any already existing movie in mergedMovies
    let merged = false;
    mergedMovies.forEach((mergedMovie) => {
      const similarity = calculateEnhancedSimilarity(movie.Title, mergedMovie.Title);
      if (similarity >= threshold) {
        mergedMovie.Timings = [...mergedMovie.Timings, ...movie.Timings];
        mergedMovie.ShowtimesURL = mergedMovie.ShowtimesURL || movie.ShowtimesURL; // Merge URL if needed
        merged = true;
      }
    });

    // If movie was not merged, add it as a new entry
    if (!merged) {
      mergedMovies.push(movie);
    }
  });

  return mergedMovies;
};

// AllMovies Component
const AllMovies = () => {
  const { user } = useContext(UserContext); // Get the current user
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedTitles, setEditedTitles] = useState({});
  const [errors, setErrors] = useState({});
  const [watchedMovies, setWatchedMovies] = useState([]); // Store watched movies

  const isAdmin = user?.isAdmin ?? false; // If isAdmin is null, set it to false by default

  useEffect(() => {
    fetch("http://localhost:5000/movies")
      .then((res) => res.json())
      .then((data) => {
        const merged = mergeSimilarMovies(data, 0.8);
        setMovies(merged);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Handle title change for editing
  const handleTitleChange = (e, movieId) => {
    setEditedTitles((prev) => ({
      ...prev,
      [movieId]: e.target.value,
    }));
  };

  // Handle movie update submission (for admins)
  const handleEditSubmit = async (movieId, newTitle) => {
    console.log("Submitting movie update with:", { movieId, Title: newTitle });

    try {
      const response = await fetch(`http://localhost:5000/movies/${movieId}`, {
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
        fetch("http://localhost:5000/movies")
          .then((res) => res.json())
          .then((data) => {
            const merged = mergeSimilarMovies(data, 0.8);
            setMovies(merged);
          })
          .catch((err) => console.error("Error fetching updated data:", err));

        setEditedTitles((prev) => ({ ...prev, [movieId]: "" }));
        alert("Movie title updated successfully!");
      }
    } catch (err) {
      setErrors({ general: "Error updating movie title" });
      console.error("Error updating title:", err);
    }
  };

  // Sort movies alphabetically
  const sortMovies = () => {
    const sortedMovies = [...movies].sort((a, b) => a.Title.localeCompare(b.Title));
    setMovies(sortedMovies);
  };

  // Handle adding a movie to watched list (for non-admin users)
  const handleAddToWatched = (movie) => {
    setWatchedMovies((prev) => [...prev, movie]);
    alert(`Added "${movie.Title}" to your watched list.`);
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
          <button
            onClick={sortMovies} // Always sort movies
            className="inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Sort Alphabetically
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
          {movies.map((movie) => (
            <div
              key={movie._id}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:scale-105 transition-transform relative"
            >
              <img
                src={movie["Image URL"]}
                alt={movie.Title}
                className="w-full h-56 object-contain bg-gray-800 rounded-t-lg"
              />
              <div className="p-5">
                <h3 className="text-lg font-bold flex justify-between items-center">
                  {/* Allow user to edit movie title if admin */}
                  {isAdmin ? (
                    <div className="flex items-center w-full">
                      <input
                        type="text"
                        value={editedTitles[movie._id] || movie.Title}
                        onChange={(e) => handleTitleChange(e, movie._id)}
                        className="text-lg font-bold bg-transparent border-none text-white focus:ring-2 focus:ring-purple-500 w-full"
                      />
                      <button
                        onClick={() => handleEditSubmit(movie._id, editedTitles[movie._id] || movie.Title)}
                        className="ml-2 text-purple-600 hover:text-purple-500 absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        <FaPen />
                      </button>
                    </div>
                  ) : (
                    <span>{movie.Title}</span>
                  )}
                </h3>
                <p className="text-sm text-gray-400">{movie.Language}</p>
                <Link
                  to={`/movie/${movie._id}`}
                  className="mt-3 inline-block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold py-2 rounded-lg transition"
                >
                  View Details
                </Link>

                {!isAdmin && (
                  <button
                    onClick={() => handleAddToWatched(movie)}
                    className="mt-3 inline-block text-green-500 hover:text-green-400"
                  >
                    <FaPlus /> Add to Watched
                  </button>
                )}
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default AllMovies;
