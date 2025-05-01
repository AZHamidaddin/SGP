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

    const updateCityOptions = (movieList, selectedMovie, selectedCity) => {
      const citySet = new Set();

      movieList.forEach((movie) => {
        if (!selectedMovie || movie.Title === selectedMovie) {
          movie.Timings?.forEach((timing) => {
            timing.Showtimes?.forEach((show) => {
              if ((!selectedCity || show.City === selectedCity) && show.City) {
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
      updateCityOptions(allMovies, movie, "");
    };

    const handleCityChange = (e) => {
      const city = e.target.value;
      setSelectedCity(city);
      setIsSearchClicked(false);
      updateCityOptions(allMovies, selectedMovie, city);
    };

    const handleSearch = () => {
      setIsSearchClicked(true);
      const resultMovies = [];

      allMovies.forEach((groupedMovie) => {
        if (selectedMovie && groupedMovie.Title !== selectedMovie) return;

        const filteredTimings = groupedMovie.Timings?.map((timing) => {
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
          resultMovies.push({
            Title: groupedMovie.Title,
            Poster: groupedMovie.Poster,
            Rating: groupedMovie.Rating,
            Timings: filteredTimings
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
      updateCityOptions(allMovies, "", "");
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
          <div className="max-w-6xl mx-auto">
            {results.length > 0 ? (
              results.map((movie, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md">
                  <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
                    <img
                      src={movie.Poster}
                      alt={movie.Title}
                      className="w-full md:w-24 object-contain bg-gray-700 rounded-md"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-pink-400">{movie.Title}</h3>
                      <p className="text-gray-400">Rating: {movie.Rating}</p>
                    </div>
                  </div>

                  {movie.Timings.map((timing, i) => (
                    <div key={i} className="mb-4">
                      <p className="text-gray-300 font-semibold mb-2">
                        {timing.day_of_week}, {timing.Date}
                      </p>
                      {timing.Showtimes.map((show, j) => (
                        <div key={j} className="mb-2">
                          <p className="text-sm text-yellow-300 font-medium mb-1 flex items-center gap-2">
    {show.Place} – {show.City}
    {getParentBadge(show.Place, allMovies, show.Parent)}
  </p>


                          <div className="flex flex-wrap gap-4">
                            {show.Experiences.map((exp, k) => (
                              <div key={k}>
                                <p className="text-sm text-gray-400">{exp.Experience}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
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
                                        className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1 rounded inline-block"
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
                  ))}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 mt-10">
                No showtimes found for the selected filters.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  export default SearchMovies;
