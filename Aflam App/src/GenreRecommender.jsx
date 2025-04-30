import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:5050";

const similarity = (a, b) => {
  const maxLen = Math.max(a.length, b.length);
  let match = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) match++;
  }
  return match / maxLen;
};

const mergeSimilarTitles = (recommendations) => {
  const groups = [];
  const visited = new Set();

  for (let i = 0; i < recommendations.length; i++) {
    if (visited.has(i)) continue;
    const group = [recommendations[i]];
    visited.add(i);

    for (let j = i + 1; j < recommendations.length; j++) {
      if (visited.has(j)) continue;
      const sim = similarity(recommendations[i].title, recommendations[j].title);
      if (sim >= 0.9) {
        group.push(recommendations[j]);
        visited.add(j);
      }
    }

    const avgRating = Math.round(group.reduce((sum, m) => sum + m.rating, 0) / group.length);
    groups.push({ title: group[0].title, rating: avgRating });
  }

  return groups;
};

const GenreRecommender = () => {
  const [allMovies, setAllMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCount, setShowCount] = useState(10);

  useEffect(() => {
    fetch(`${API_URL}/movies`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.movies)) {
          const sorted = data.movies.sort((a, b) => a.title.localeCompare(b.title));
          setAllMovies(sorted);
          setFilteredMovies(sorted);
        }
      })
      .catch((err) => console.error("Error fetching movies:", err));
  }, []);

  useEffect(() => {
    const filtered = allMovies.filter((m) =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMovies(filtered);
  }, [searchTerm, allMovies]);

  const toggleSelect = (movieId) => {
    setSelectedMovies((prev) => {
      return prev.includes(movieId)
        ? prev.filter((id) => id !== movieId)
        : [...prev, movieId];
    });
  };

  const getRecommendations = () => {
    if (selectedMovies.length === 0) {
      alert("Please select at least one movie.");
      return;
    }

    fetch(`${API_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie_ids: selectedMovies })
    })
      .then((res) => res.json())
      .then((data) => {
        const unique = mergeSimilarTitles(data.recommendations || []);
        const sorted = unique.sort((a, b) => b.rating - a.rating);
        setRecommendations(sorted);
      })
      .catch((err) => console.error("Error getting recommendations:", err));
  };

  const removeTag = (movieId) => {
    setSelectedMovies((prev) => prev.filter((id) => id !== movieId));
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white min-h-screen p-6 relative">
      <div className="container mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-red-400">
          🎬 Movie Recommender
        </h1>
        <p className="text-center text-gray-300 mb-6">
          Select your favorite movies and get personalized recommendations!
        </p>

        <div className="flex justify-center mb-6">
          <input
            type="text"
            placeholder="Search for a movie..."
            className="p-3 w-full max-w-lg rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-red-400 focus:ring focus:ring-red-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {selectedMovies.map((id) => {
            const movie = allMovies.find((m) => m.movieId === id);
            return (
              <span
                key={id}
                className="px-3 py-1 bg-red-500 text-white rounded-lg cursor-pointer hover:bg-red-600 transition"
                onClick={() => removeTag(id)}
              >
                {movie?.title || id}
              </span>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMovies.slice(0, showCount).map((movie) => (
            <button
              key={movie.movieId}
              className={`p-4 border rounded-lg shadow-md w-full text-sm font-semibold text-center transition transform hover:scale-105 ${
                selectedMovies.includes(movie.movieId)
                  ? "bg-red-500 text-white"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
              onClick={() => toggleSelect(movie.movieId)}
            >
              <div className="flex flex-col items-center justify-between h-full">
                <span className="font-bold">{movie.title}</span>
              </div>
            </button>
          ))}
        </div>

        {showCount < filteredMovies.length && (
          <div className="text-center mt-6">
            <button
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
              onClick={() => setShowCount((prev) => prev + 10)}
            >
              Show More Movies
            </button>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg"
            onClick={getRecommendations}
          >
            Get Recommendations
          </button>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-semibold text-center text-yellow-400 mb-6">
              🎥 Recommended Movies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 p-5 rounded-lg shadow-md hover:shadow-xl transition-transform"
                >
                  <h3 className="text-xl font-bold text-white mb-2">{rec.title}</h3>
                  <p
                    className={`text-md font-semibold ${
                      rec.rating < 50
                        ? "text-red-400"
                        : rec.rating < 70
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {rec.rating}% Liked
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Button */}
      <Link
        to="/home"
        className="fixed bottom-6 right-6 z-50 bg-white text-red-600 font-bold py-3 px-6 rounded-full shadow-2xl hover:bg-red-100 dark:bg-pink-900 dark:text-white dark:hover:bg-red-700 transition-all duration-300 animate-bounce-slow"
      >
        Back to Home
      </Link>
    </div>
  );
};

export default GenreRecommender;
