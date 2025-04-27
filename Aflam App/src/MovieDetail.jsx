import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

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
  const [imdbRating, setImdbRating] = useState(null);
  const navigate = useNavigate();
  const [cinemas, setCinemas] = useState([]);

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

        // Fetch IMDB rating
        if (primary.Title) {
          fetch(`http://www.omdbapi.com/?t=${encodeURIComponent(primary.Title)}&apikey=d850d051`)
            .then(res => res.json())
            .then(data => {
              if (data.imdbRating && data.imdbRating !== "N/A") {
                setImdbRating(data.imdbRating);
              }
            })
            .catch(err => console.error("Error fetching IMDB rating:", err));
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching movie:", err);
        setLoading(false);
      });
  }, [movie_id]);

  const getParentByPlace = (place) => {
    const matched = movieGroup?.find((m) =>
      m.Timings?.some((t) =>
        t.Showtimes?.some((s) => s.Place === place)
      )
    );
    return matched?.Parent || "";
  };

  const getParentBadge = (place) => {
    const matched = movieGroup?.find((m) =>
      m.Timings?.some((t) =>
        t.Showtimes?.some((s) => s.Place === place && s.City)
      )
    );

    let parent = matched?.Parent;

    // Fallback logic based on Place name
    if (!parent) {
      const lower = place.toLowerCase();
      if (lower.includes("amc")) parent = "AMC";
      else if (lower.includes("muvi")) parent = "Muvi";
      else if (lower.includes("vox")) parent = "Vox";
      else if (lower.includes("empire")) parent = "Empire";
    }

    const badgeColor =
      parent?.toLowerCase() === "muvi"
        ? "bg-pink-600"
        : parent?.toLowerCase() === "empire"
        ? "bg-amber-900"
        : parent?.toLowerCase() === "amc"
        ? "bg-red-600"
        : parent?.toLowerCase() === "vox"
        ? "bg-blue-600"
        : "bg-gray-600";

    return parent ? (
      <span
        className={`inline-block ml-2 px-3 py-1 rounded-full text-xs font-medium text-white ${badgeColor}`}
      >
        {parent}
      </span>
    ) : (
      <span className="inline-block ml-2 px-3 py-1 rounded-full text-xs font-medium text-white bg-gray-600">
        Unknown
      </span>
    );
  };

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
    selectedCity && selectedDate && mainMovie.Timings
      ? mainMovie.Timings
          .filter((t) => t.Date === selectedDate)
          .flatMap((t) => t.Showtimes || [])
          .filter((s) => {
            const cityMatch =
              !selectedCity || s.City.toLowerCase() === selectedCity.toLowerCase();
            const cinemaMatch =
              selectedCinema === "All Cinemas" ||
              getParentByPlace(s.Place) === selectedCinema;
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

  return (
    <div className="bg-gray-900 text-white min-h-screen py-10">
      <div className="container mx-auto px-6">
        <h1 className="text-4xl font-bold text-center">{mainMovie.Title}</h1>

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
            <p className="text-gray-400">
              <strong>IMDB Rating:</strong> {imdbRating && `⭐ ${imdbRating}/10`}
            </p>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold"
              >
                Back to Home
              </button>
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
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${
                    selectedCinema === cinema
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
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${
                    selectedCity === city
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
              {availableDates
                .filter((date) => new Date(date) >= new Date(new Date().toDateString()))
                .map((date) => {
                  const today = new Date();
                  const showDate = new Date(date);

                  const isToday =
                    today.toDateString() === showDate.toDateString();

                  const label = showDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }) + (isToday ? " (Today)" : "");

                  return (
                    <button
                      key={date}
                      className={`px-4 py-2 rounded-md text-sm font-semibold ${
                        selectedDate === date
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300"
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      {label}
                    </button>
                  );
                })}
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
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-yellow-400">
                      {cinema.Place} - {cinema.City}
                    </h3>
                    {getParentBadge(cinema.Place)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                    {cinema.Experiences.map((exp) => (
                      <div key={exp.Experience}>
                        <h4 className="text-md font-semibold text-gray-300 mb-1">
                          {exp.Experience}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {exp.Times.map((time) => {
                            const matchedMovie = movieGroup.find((m) =>
                              m.Timings?.some((t) =>
                                t.Showtimes?.some(
                                  (s) =>
                                    s.Place === cinema.Place &&
                                    s.City === cinema.City
                                )
                              )
                            );

                            const showtimeUrl =
                              matchedMovie?.["Showtimes URL"] || "#";
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
