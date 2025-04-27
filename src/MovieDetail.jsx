import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Normalize title
const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

// Group similar movies by title inclusion
const groupMoviesByInclusion = (movies) => {
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

  return groups;
};

const MovieDetail = () => {
  const { movie_id } = useParams();
  const [movieGroup, setMovieGroup] = useState(null);
  const [mainMovie, setMainMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState("All Cinemas");
  const [cities, setCities] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [imdbRating, setImdbRating] = useState(null);
  const [imdbLoading, setImdbLoading] = useState(false);

  const fetchImdbRating = async (title, year) => {
    setImdbLoading(true);
    try {
      const apiKey = "d850d051"; // OMDb API key
      const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&apikey=${apiKey}`;
      const response = await axios.get(url);

      if (response.data.Response === "True") {
        setImdbRating({
          rating: response.data.imdbRating,
          votes: response.data.imdbVotes,
          imdbID: response.data.imdbID
        });
      } else {
        setImdbRating({ rating: "N/A", error: response.data.Error });
      }
    } catch (error) {
      console.error("Error fetching IMDb data:", error);
      setImdbRating({ rating: "N/A", error: "Failed to fetch rating" });
    } finally {
      setImdbLoading(false);
    }
  };

  useEffect(() => {
    fetch("http://localhost:5000/movies")
      .then((res) => res.json())
      .then((data) => {
        const grouped = groupMoviesByInclusion(data || []);
        const matchedGroup = grouped.find((group) =>
          group.some((m) => m._id === movie_id)
        );

        if (!matchedGroup) return setLoading(false);

        const mergedTimings = matchedGroup.flatMap((m) => m.Timings || []);
        const primary = matchedGroup.find((m) => m._id === movie_id) || matchedGroup[0];

        setMainMovie({ ...primary, Timings: mergedTimings });
        setMovieGroup(matchedGroup);

        // Fetch IMDb Rating after getting movie details
        if (primary.Title) {
          // Extract year from title if available (e.g., "Movie Title (2023)")
          const yearMatch = primary.Title.match(/\((\d{4})\)/);
          const year = yearMatch ? yearMatch[1] : "";

          // Remove year from title for better search results
          const cleanTitle = primary.Title.replace(/\s*\(\d{4}\)\s*/, "");

          fetchImdbRating(cleanTitle, year);
        }

        const citySet = new Set();
        mergedTimings.forEach((timing) => {
          timing.Showtimes?.forEach((show) => {
            if (show.City) citySet.add(show.City);
          });
        });

        const sortedCities = Array.from(citySet).sort((a, b) => {
          if (a === "Jeddah") return -1;
          if (b === "Jeddah") return 1;
          if (a === "Riyadh") return -1;
          if (b === "Riyadh") return 1;
          return a.localeCompare(b);
        });

        const parentCinemas = Array.from(
          new Set(matchedGroup.map((m) => m.Parent).filter(Boolean))
        );

        setCities(sortedCities);
        setCinemas(["All Cinemas", ...parentCinemas]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching movie:", err);
        setLoading(false);
      });
  }, [movie_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p className="text-xl font-semibold">Loading movie details...</p>
      </div>
    );
  }

  if (!mainMovie) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <p className="text-red-500 font-bold text-xl">Movie not found!</p>
      </div>
    );
  }

  const availableDates = Array.from(
    new Set(mainMovie.Timings?.map((t) => t.Date))
  );

  const availableCinemas =
    selectedDate && mainMovie.Timings
      ? mainMovie.Timings
        .filter((t) => t.Date === selectedDate)
        .flatMap((t) => t.Showtimes || [])
        .filter((s) => {
          const cityMatch =
            !selectedCity || s.City.toLowerCase() === selectedCity.toLowerCase();
          const cinemaMatch =
            selectedCinema === "All Cinemas" ||
            movieGroup.some((m) => m.Parent === selectedCinema);
          return cityMatch && cinemaMatch;
        })
        .reduce((acc, show) => {
          const key = `${show.Place}-${show.City}`;
          const existing = acc.find((s) => `${s.Place}-${s.City}` === key);

          if (existing) {
            show.Experiences.forEach((exp) => {
              const existingExp = existing.Experiences.find(
                (e) => e.Experience === exp.Experience
              );
              if (existingExp) {
                existingExp.Times = Array.from(
                  new Set([...existingExp.Times, ...exp.Times])
                );
              } else {
                existing.Experiences.push(exp);
              }
            });
          } else {
            acc.push({ ...show, Experiences: [...show.Experiences] });
          }

          return acc;
        }, [])
      : [];

  // Get parent cinema badge with color
  const getParentBadge = (place) => {
    const parent = movieGroup.find((m) => m.Parent && place.includes(m.Parent))?.Parent;

    const badgeColor =
      parent?.toLowerCase() === "muvi"
        ? "bg-pink-600"
        : parent?.toLowerCase() === "empire"
          ? "bg-red-600"
          : parent?.toLowerCase() === "amc"
            ? "bg-red-600"
            : parent?.toLowerCase() === "vox"
              ? "bg-blue-600"
              : "bg-gray-600";

    return parent ? (
      <span
        className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium text-white ${badgeColor}`}
      >
        {parent}
      </span>
    ) : null;
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen py-10">
      <div className="container mx-auto px-6">
        <h1 className="text-4xl font-bold text-center">{mainMovie.Title}</h1>

        {/* Movie Poster & Details */}
        <div className="mt-8 flex flex-col md:flex-row items-center">
          <img
            src={mainMovie["Image URL"]}
            alt={mainMovie.Title}
            className="w-full md:w-1/2 h-96 object-cover rounded-lg shadow-lg"
          />
          <div className="md:ml-6 mt-6 md:mt-0">
            <p className="text-lg">{mainMovie.Description || "No description available."}</p>
            <p className="text-gray-400 mt-2">
              <strong>Classification:</strong> {mainMovie.Rating}
            </p>
            <p className="text-gray-400">
              <strong>Language:</strong> {mainMovie.Language}
            </p>
            <p className="text-gray-400">
              <strong>Genre:</strong>{" "}
              {Array.isArray(mainMovie.Genre) &&
                mainMovie.Genre.map((genre, index) => (
                  <span key={index} className="text-pink-500">
                    {genre}
                    {index < mainMovie.Genre.length - 1 && ", "}
                  </span>
                ))}
            </p>

            {/* IMDb Rating Display */}
            <div className="mt-3">
              <strong className="text-yellow-400">IMDb Rating:</strong>{" "}
              {imdbLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : imdbRating ? (
                <div className="flex items-center">
                  <span className="text-yellow-400 font-bold text-xl mr-2">
                    {imdbRating.rating}
                  </span>
                  {imdbRating.votes && (
                    <span className="text-gray-400 text-sm">
                      ({imdbRating.votes} votes)
                    </span>
                  )}
                  {imdbRating.imdbID && (
                    <a
                      href={`https://www.imdb.com/title/${imdbRating.imdbID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      View on IMDb
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">Not available</span>
              )}
            </div>
          </div>
        </div>

        {/* Cinema Selector */}
        {cinemas.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-3">Select Cinema</h2>
            <div className="flex overflow-x-auto space-x-4 py-2">
              {cinemas.map((cinema) => (
                <button
                  key={cinema}
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${selectedCinema === cinema
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300"
                    }`}
                  onClick={() => setSelectedCinema(cinema)}
                >
                  {cinema}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* City Selector */}
        {cities.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-3">Select City</h2>
            <div className="flex overflow-x-auto space-x-4 py-2">
              {cities.map((city) => (
                <button
                  key={city}
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${selectedCity === city
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300"
                    }`}
                  onClick={() => setSelectedCity(city)}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date Selector */}
        {selectedCity && availableDates.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-3">Select Date</h2>
            <div className="flex overflow-x-auto space-x-4 py-2">
              {availableDates.map((date, index) => (
                <button
                  key={date}
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${selectedDate === date
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300"
                    }`}
                  onClick={() => setSelectedDate(date)}
                >
                  {index === 0
                    ? "Today"
                    : index === 1
                      ? "Tomorrow"
                      : new Date(date).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Showtimes */}
        {selectedCity && selectedDate && availableCinemas.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-semibold mb-4">Showtimes</h2>
            <div className="p-6 bg-gray-800 rounded-lg">
              {availableCinemas.map((cinema) => (
                <div key={`${cinema.Place}-${cinema.City}`} className="mb-6">
                  <h3 className="text-lg font-semibold text-yellow-400">{cinema.Place}</h3>
                  {getParentBadge(cinema.Place)}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                    {cinema.Experiences.map((exp) => (
                      <div key={exp.Experience}>
                        <h4 className="text-md font-semibold text-gray-300 mb-1">
                          {exp.Experience}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {exp.Times.map((time) => {
                            const matchedMovie = movieGroup.find((m) =>
                              m.Timings?.some(t =>
                                t.Showtimes?.some(s =>
                                  s.Place === cinema.Place && s.City === cinema.City
                                )
                              )
                            );

                            const showtimeUrl = matchedMovie?.["Showtimes URL"] || "#";
                            const parent = matchedMovie?.Parent?.toLowerCase();

                            let fullUrl = showtimeUrl;
                            if (parent === "amc") {
                              fullUrl = "https://www.amccinemas.com" + showtimeUrl;
                            } else if (parent === "vox") {
                              fullUrl = "https://ksa.voxcinemas.com" + showtimeUrl;
                            } else if (parent === "muvi") {
                              fullUrl = "https://www.muvicinemas.com" + showtimeUrl;
                            }

                            return (
                              <a
                                key={time}
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-blue-500 transition inline-block"
                              >
                                {time}
                              </a>
                            );
                          })}



                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetail;
