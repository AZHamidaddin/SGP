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
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-gray-200 min-h-screen p-8 relative font-sans">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-4 text-rose-500 tracking-tight" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' }}>
          🎬 Movie Recommender
        </h1>
        <p className="text-center text-gray-400 mb-8 text-lg leading-relaxed">
          Select your favorite movies below and discover new ones!
        </p>

        <div className="flex justify-center mb-8">
          <input
            type="text"
            placeholder="Search movies..."
            className="p-3 w-full max-w-xl rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/50 outline-none transition duration-200 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {selectedMovies.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center mb-8 items-center">
            <span className="text-sm font-medium text-gray-400 mr-2">Selected:</span>
            {selectedMovies.map((id) => {
              const movie = allMovies.find((m) => m.movieId === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center px-3 py-1.5 bg-rose-600 text-white text-sm rounded-full shadow-md border border-rose-700 hover:bg-rose-700 transition-colors cursor-pointer duration-150 ease-in-out"
                  onClick={() => removeTag(id)}
                >
                  {movie?.title || id}
                </span>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {filteredMovies.slice(0, showCount).map((movie) => (
            <button
              key={movie.movieId}
              className={`p-3 border rounded-lg shadow-md w-full text-sm font-medium text-center transition duration-200 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 min-h-[60px] flex items-center justify-center ${selectedMovies.includes(movie.movieId)
                ? "bg-rose-600 text-white border-rose-700 ring-2 ring-rose-400 scale-105 shadow-lg"
                : "bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 text-gray-300 hover:text-white hover:scale-105"
                }`}
              onClick={() => toggleSelect(movie.movieId)}
            >
              {movie.title}
            </button>
          ))}
        </div>

        {showCount < filteredMovies.length && (
          <div className="text-center mb-8">
            <button
              className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-rose-500"
              onClick={() => setShowCount((prev) => prev + 10)}
            >
              Show More Movies
            </button>
          </div>
        )}

        <div className="text-center my-8">
          <button
            className={`px-8 py-4 text-lg rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed ${selectedMovies.length > 0
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white focus:ring-emerald-400 cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed focus:ring-gray-500'
              }`}
            onClick={getRecommendations}
            disabled={selectedMovies.length === 0}
          >
            {selectedMovies.length > 0 ? "✨ Get Recommendations ✨" : "Select movies first"}
          </button>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-700">
            <h2 className="text-3xl md:text-4xl font-semibold text-center text-amber-400 mb-8 tracking-tight" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.3)' }}>
              🎥 Recommended For You
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800/70 p-5 rounded-lg shadow-lg hover:shadow-xl border border-gray-700 hover:border-gray-600 transition-all duration-300 ease-in-out transform hover:scale-105 flex flex-col justify-between"
                >
                  <h3 className="text-xl font-bold text-white mb-2">{rec.title}</h3>
                  <p
                    className={`text-lg font-semibold ${rec.rating < 50
                      ? "text-red-400"
                      : rec.rating < 75
                        ? "text-yellow-400"
                        : "text-green-400"
                      }`}
                  >
                    {rec.rating}% Match
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Link
        to="/home"
        className="fixed bottom-6 right-6 z-50 bg-rose-500 text-white font-bold py-3 px-6 rounded-full shadow-2xl hover:bg-rose-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-rose-400 transition-all duration-200 ease-in-out"
        title="Back to Home"
      >
        Back to Home
      </Link>
    </div>
  );
};

export default GenreRecommender;
