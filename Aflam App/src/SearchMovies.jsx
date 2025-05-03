  import React, { useState, useEffect } from "react";

const normalize = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, "").trim() || "";

const getParentBadge = (place, movieGroup, parentFromShow = null) => {
  let parent = parentFromShow;

  // If not given directly, try finding from the movieGroup
  if (!parent) {
    const matched = movieGroup?.find((m) =>
      m.Group?.some((sub) =>
        sub.Timings?.some((t) =>
          t.Showtimes?.some((s) => s.Place === place)
        )
      )
    );
    parent = matched?.Group?.[0]?.Parent;
  }

  // Fallback guessing
  if (!parent) {
    const lower = place?.toLowerCase() || "";
    if (lower.includes("amc")) parent = "AMC";
    else if (lower.includes("muvi")) parent = "Muvi";
    else if (lower.includes("vox")) parent = "Vox";
    else if (lower.includes("empire")) parent = "Empire";
  }

  if (!parent) return null; // no badge if not found

  const badgeColor =
    parent.toLowerCase() === "muvi"
      ? "bg-pink-600"
      : parent.toLowerCase() === "empire"
      ? "bg-amber-900"
      : parent.toLowerCase() === "amc"
      ? "bg-red-600"
      : parent.toLowerCase() === "vox"
      ? "bg-blue-600"
      : "bg-gray-600";

  return (
    <span
      className={`inline-block ml-2 px-3 py-1 rounded-full text-xs font-medium text-white ${badgeColor}`}
    >
      {parent}
    </span>
  );
};

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

    const mergedTimings = group.flatMap((m) => m.Timings || []);
    groups.push({
      Group: group,
      Title: group[0].Title,
      Timings: mergedTimings,
      Poster: group[0]["Image URL"],
      Rating: group[0].Rating
    });
  }

  return groups;
};

const SearchMovies = () => {
  const [movies, setMovies] = useState([]);
  const [allMovies, setAllMovies] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [results, setResults] = useState([]);
  const [isSearchClicked, setIsSearchClicked] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/movies")
      .then((res) => res.json())
      .then((data) => {
        const rawMovies = data || [];
        const grouped = groupMoviesByInclusion(rawMovies);
        setMovies(grouped);
        setAllMovies(grouped);
        updateCityOptions(grouped, "", "");
      })
      .catch((err) => console.error("Error loading data:", err));
  }, []);

  const updateCityOptions = (movieList, selectedMovie) => {
    const citySet = new Set();

    movieList.forEach((movie) => {
      if (!selectedMovie || movie.Title === selectedMovie) {
        movie.Timings?.forEach((timing) => {
          timing.Showtimes?.forEach((show) => {
            if (show.City) {
              citySet.add(show.City);
            }
          });
        });
      }
    });

    setCities([...citySet]);
  };

  const handleMovieChange = (e) => {
    const movie = e.target.value;
    setSelectedMovie(movie);
    setSelectedCity("");
    setIsSearchClicked(false);
    updateCityOptions(allMovies, movie);
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setIsSearchClicked(false);
    updateCityOptions(allMovies, selectedMovie);
  };

  const handleSearch = () => {
    setIsSearchClicked(true);
    const resultMovies = [];

    // Get current date for filtering
    const today = new Date(new Date().toDateString());

    allMovies.forEach((groupedMovie) => {
      if (selectedMovie && groupedMovie.Title !== selectedMovie) return;

      // Filter out past dates properly
      const filteredTimings = groupedMovie.Timings
        ?.filter(timing => {
          // Skip past dates using the same approach as MovieDetail.jsx
          const showDate = new Date(timing.Date);
          return showDate >= today;
        })
        ?.map((timing) => {
          const cityMatchedShowtimes = timing.Showtimes?.filter((show) =>
            selectedCity ? show.City === selectedCity : true
          ).map((show) => {
            const matched = groupedMovie.Group.find((m) =>
              m.Timings?.some((t) =>
                t.Showtimes?.some((s) =>
                  s.Place === show.Place && s.City === show.City
                )
              )
            );

            return {
              ...show,
              Parent: matched?.Parent,
              "Showtimes URL": matched?.["Showtimes URL"]
            };
          });

          return cityMatchedShowtimes?.length ? { ...timing, Showtimes: cityMatchedShowtimes } : null;
        }).filter(Boolean);

      if (filteredTimings?.length) {
        // Sort the timings by date
        const sortedTimings = [...filteredTimings].sort((a, b) => {
          return new Date(a.Date) - new Date(b.Date);
        });

        resultMovies.push({
          Title: groupedMovie.Title,
          Poster: groupedMovie.Poster,
          Rating: groupedMovie.Rating,
          Timings: sortedTimings
        });
      }
    });

    setResults(resultMovies);
  };

  const handleReset = () => {
    setSelectedMovie("");
    setSelectedCity("");
    setIsSearchClicked(false);
    setResults([]);
    updateCityOptions(allMovies, "");
  };

  return (
    <div className="bg-gray-900 text-white p-6">
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <select
          value={selectedMovie}
          onChange={handleMovieChange}
          className="p-3 rounded-lg bg-gray-800 text-white"
        >
          <option value="">Select Movie</option>
          {movies.map((movie, index) => (
            <option key={index} value={movie.Title}>
              {movie.Title}
            </option>
          ))}
        </select>

        <select
          value={selectedCity}
          onChange={handleCityChange}
          className="p-3 rounded-lg bg-gray-800 text-white"
        >
          <option value="">Select City</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Search
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Reset
          </button>
        </div>
      </div>

      {isSearchClicked && (selectedMovie || selectedCity) && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {results.length > 0 ? (
            <div>
              <h2 className="text-3xl font-semibold mb-6 text-gray-100 mt-10">Search Results</h2>
              {results.map((movie, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-6 mb-8 shadow-lg border border-gray-700">
                  <div className="flex flex-col md:flex-row gap-6 mb-6 items-center">
                    <img
                      src={movie.Poster}
                      alt={movie.Title}
                      className="w-full md:w-64 lg:w-72 h-auto object-contain bg-gray-700 rounded-lg shadow-md"
                    />
                    <div>
                      <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-500 mb-2">{movie.Title}</h3>
                      <p className="text-gray-300">Rating: <span className="text-yellow-400 font-semibold">{movie.Rating}</span></p>
                    </div>
                  </div>

                  {movie.Timings.map((timing, i) => {
                    // Format the date in a more readable way
                    const showDate = new Date(timing.Date);
                    const isToday = new Date().toDateString() === showDate.toDateString();
                    const formattedDate = showDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    }) + (isToday ? " (Today)" : "");

                    return (
                      <div key={i} className="mb-6 last:mb-0">
                        <p className="text-xl font-semibold text-gray-200 mb-4 border-b border-gray-700 pb-2">
                          {formattedDate}
                        </p>
                        <div className="p-4 bg-gray-850 rounded-lg">
                          {timing.Showtimes.map((show, j) => (
                            <div key={j} className="mb-6 last:mb-0">
                              <div className="flex items-center space-x-3 mb-4">
                                <h4 className="text-lg font-semibold text-pink-400">
                                  {show.Place} – {show.City}
                                </h4>
                                {getParentBadge(show.Place, allMovies, show.Parent)}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                                {show.Experiences.map((exp, k) => (
                                  <div key={k}>
                                    <h5 className="text-lg font-semibold text-gray-200 mb-2">
                                      {exp.Experience}
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {exp.Times.map((time, tIdx) => {
                                        const parent = show?.Parent?.toLowerCase();
                                        const showtimeUrl = show?.["Showtimes URL"] || "#";

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
                                            key={tIdx}
                                            href={fullUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-pink-600 transition duration-200 ease-in-out text-sm font-medium shadow-sm"
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
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-semibold text-gray-400 mb-2">No showtimes found</p>
              <p className="text-gray-500 text-center max-w-md">
                No showtimes match your current search criteria. Try selecting different options or reset your search.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchMovies;
