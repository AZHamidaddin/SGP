import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:5050";

// IDs of the top 250 movies found in movie.csv (add the actual list here)
// NOTE: Replace this placeholder with the actual list of IDs
const TOP_MOVIE_IDS = new Set([
  318, 858, 49915, 1221, 1203, 50, 296, 1193, 1213, 2019, 1196, 1136, 593,
  260, 1207, 1225, 527, 1172, 1198, 1104, 1208, 1252, 1237, 47, 1247, 1250,
  1197, 1784, 1212, 904, 1265, 2959, 750, 1204, 4226, 912, 608, 58549, 1259,
  1228, 1219, 922, 1089, 2858, 2571, 1, 1206, 1199, 1210, 1270, 48516, 356,
  5618, 1276, 1617, 1240, 923, 588, 1201, 68954, 110, 1217, 292, 1704, 1291,
  1266, 122906, 908, 2762, 1222, 595, 1230, 111, 337, 4973, 913, 1302, 898,
  1214, 1200, 1278, 541, 349, 475, 1288, 1148, 1261, 1246, 2028, 1097, 1287,
  1178, 903, 1035, 1233, 11, 1242, 1258, 4011, 1248, 1234, 7361, 2329, 112542,
  364, 2324, 6016, 1923, 5970, 1079, 1267, 119145, 44555, 1263, 3147, 1272,
  1282, 4975, 905, 924, 919, 1260, 1304, 1300, 1209, 1285, 293, 122918, 112852,
  110102, 122920, 920, 116797, 122886, 122904, 46578, 4246, 778, 1256, 2005,
  122892, 16, 1275, 253, 44, 1748, 1262, 120735, 2115, 1283, 551, 1211, 1235,
  1254, 2000, 1286, 1299, 515, 1036, 1296, 1293, 1220, 2302, 122882, 1249,
  1188, 1271, 1218, 1269, 1264, 1307, 1292, 1223, 539, 1245, 508, 1179, 1306,
  1243, 1268, 1279, 1280, 1290, 1303, 1305, 1281, 1202, 1289, 1277, 1185,
  1187, 1189, 1190, 1191, 1192, 1227, 1236, 1238, 1241, 1244, 1251, 1253,
  1255, 1257, 1273, 1274, 1284, 1286, 1295, 1297, 1298, 1301
]); // This list contains ~220 IDs found from the Top 250 list in movie.csv

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
  const [showCount, setShowCount] = useState(21);

  // The list of specific movie IDs to display initially
  const initialMovieIds = new Set([
    106782, 193610, 193611, 193612, 193617, 356, 1213, 2959, 4973, 4993,
    5618, 77846, 79132, 177765, 193625, 193627, 193631, 193629,
    193642, 113186
  ]);

  useEffect(() => {
    fetch(`${API_URL}/movies`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.movies)) {
          // Filter the fetched movies to include only the initial set
          const initialMovies = data.movies.filter(movie => initialMovieIds.has(movie.movieId));

          // Optional: Sort these initial movies if needed (e.g., alphabetically)
          initialMovies.sort((a, b) => a.title.localeCompare(b.title));

          // Set both allMovies and filteredMovies to this initial set
          setAllMovies(initialMovies);
          setFilteredMovies(initialMovies);
        }
      })
      .catch((err) => console.error("Error fetching movies:", err));
  }, []); // Empty dependency array ensures this runs only once on mount

  // Filter based on search term, now searches within the initial 20 movies
  useEffect(() => {
    if (searchTerm === "") {
      setFilteredMovies(allMovies);
    } else {
      const filtered = allMovies.filter((m) =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMovies(filtered);
    }
  }, [searchTerm, allMovies]); // Keep dependency on allMovies

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
