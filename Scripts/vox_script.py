import re
import requests
import json
from bs4 import BeautifulSoup
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any
from datetime import datetime, timedelta

# Define the base URL for VOX Cinemas (adjust if needed)
BASE_URL = "https://ksa.voxcinemas.com"

@dataclass
class Movie:
    title: str
    slug: str
    identifier: str
    parent: str = "Vox"            # Defaulted to Vox
    image_url: str = ""
    rating: str = ""               # Will be extracted from classification if available
    language: str = ""
    description: str = ""
    genre: List[str] = field(default_factory=list)  # Default empty list
    showtimes_url: str = ""
    timings: List[Dict[str, Any]] = field(default_factory=list)  # List of daily timings

def fetch_page(url: str) -> str:
    """Fetches the HTML content of a given URL."""
    response = requests.get(url)
    response.raise_for_status()
    return response.text

def parse_movies(html: str) -> List[Movie]:
    """
    Parses the "What’s On" page to extract movie details.
    Adjust the selectors if the website structure changes.
    """
    soup = BeautifulSoup(html, 'html.parser')
    movie_articles = soup.find_all("article", class_="movie-summary")
    movies = []

    for article in movie_articles:
        slug = article.get("data-slug", "").strip()
        identifier = article.get("data-identifier", "").strip()
        title = article.get("data-title", "").strip()

        # Extract movie description (adjust class name if needed)
        description = ""
        desc_tag = article.find("p", class_="movie-description")
        if desc_tag:
            description = desc_tag.get_text(strip=True)

        # Extract image URL
        image_url = ""
        a_tag = article.find("a")
        if a_tag:
            img_tag = a_tag.find("img")
            if img_tag:
                image_url = img_tag.get("data-src", "").strip()

        # Extract classification as rating
        rating = ""
        class_span = article.find("span", class_="classification")
        if class_span:
            rating = class_span.get_text(strip=True)

        # Extract language (remove prefix if needed)
        language = ""
        language_p = article.find("p", class_="language")
        if language_p:
            language = language_p.get_text(strip=True).replace("Language:", "").strip()

        # Extract showtimes URL (assumed relative URL)
        showtimes_url = ""
        showtimes_a = article.find("a", string=lambda s: s and "Showtimes" in s)
        if showtimes_a:
            showtimes_url = showtimes_a.get("href", "").strip()

        movie = Movie(
            title=title,
            slug=slug,
            identifier=identifier,
            image_url=image_url,
            rating=rating,
            language=language,
            description=description,
            showtimes_url=showtimes_url
        )
        movies.append(movie)

    return movies

def extract_city(place: str) -> str:
    """
    Extract a city name from the place string using simple substring matching.
    Adjust these rules as needed.
    """
    if "Tabuk" in place:
        return "Tabuk"
    if "Riyadh" in place:
        return "Riyadh"
    if "Khobar" in place or "Ajdan" in place:
        return "Al Khobar"
    if "Hail" in place:
        return "Hail"
    if "Jeddah" in place or "Stars" in place:
        return "Jeddah"
    # default if no match
    return ""

def extract_showtimes(detail_html: str) -> Dict[str, Dict[str, List[str]]]:
    """
    Extracts the raw showtimes information from a movie’s detail page.
    Returns a dictionary mapping place names to a dictionary of experience -> list of times.
    """
    soup = BeautifulSoup(detail_html, 'html.parser')
    dates_div = soup.find("div", class_="dates")
    if not dates_div:
        return {}

    timings_by_place = {}

    # For each cinema name (inside an <h3 class_="highlight"> tag)
    for place_header in dates_div.find_all("h3", class_="highlight"):
        place = place_header.get_text(" ", strip=True)
        showtimes_ol = place_header.find_next_sibling("ol", class_="showtimes")
        if not showtimes_ol:
            continue

        experience_dict = {}
        # Each top-level <li> in the <ol> corresponds to an experience
        for li in showtimes_ol.find_all("li", recursive=False):
            strong_tag = li.find("strong")
            if not strong_tag:
                continue
            experience = strong_tag.get_text(" ", strip=True)
            nested_ol = li.find("ol")
            if not nested_ol:
                continue

            timings = []
            for time_li in nested_ol.find_all("li"):
                a_tag = time_li.find("a")
                if a_tag:
                    time_text = a_tag.get_text(" ", strip=True)
                else:
                    time_text = time_li.get_text(" ", strip=True)
                time_pattern = re.compile(r'\b\d{1,2}:\d{2}\b')
                found_times = time_pattern.findall(time_text)
                if found_times:
                    timings.extend(found_times)
                elif time_text:
                    timings.append(time_text)
            experience_dict[experience] = timings

        timings_by_place[place] = experience_dict

    return timings_by_place

def enrich_movie_with_timings_for_dates(
    movie: Movie,
    days_to_check: int = 7
) -> None:
    """
    For a single Movie object, loops over a date range (from today for days_to_check days),
    builds URLs such as:
      https://ksa.voxcinemas.com/movies/{movie.slug}?d=YYYYMMDD#showtimes
    and stores daily timings (with day-of-week) as a list in movie.timings.
    """
    date_format = "%Y%m%d"         # format for URL construction
    output_date_format = "%Y-%m-%d"  # format for output date string
    start_date = datetime.now()

    # Clear any existing timings data
    movie.timings = []

    for i in range(days_to_check):
        current_date = start_date + timedelta(days=i)
        date_str = current_date.strftime(date_format)
        pretty_date = current_date.strftime(output_date_format)
        day_of_week = current_date.strftime("%A")
        detail_url = f"{BASE_URL}/movies/{movie.slug}?d={date_str}#showtimes"
        print(f"  => Fetching showtimes for '{movie.title}' on {pretty_date} ({day_of_week})")

        try:
            detail_html = fetch_page(detail_url)
            raw_timings = extract_showtimes(detail_html)
            # Convert raw timings to desired structure: a list of showtime objects.
            showtimes_list = []
            for place, experiences in raw_timings.items():
                exp_list = []
                for exp, times in experiences.items():
                    exp_list.append({
                        "Experience": exp,
                        "Times": times
                    })
                showtimes_list.append({
                    "Place": place,
                    "City": extract_city(place),
                    "Experiences": exp_list
                })
            movie.timings.append({
                "Date": pretty_date,
                "day_of_week": day_of_week,
                "Showtimes": showtimes_list
            })
        except Exception as e:
            print(f"     [Error] {e}")
            movie.timings.append({
                "Date": pretty_date,
                "day_of_week": day_of_week,
                "Showtimes": []
            })

def save_movies_to_json_file(movies: List[Movie], filename: str = "vox_movies.json") -> None:
    """Saves the movie data to a JSON file with the expected keys and structure."""
    movies_list = []
    for movie in movies:
        movie_dict = {
            "Title": movie.title,
            "Slug": movie.slug,
            "Identifier": movie.identifier,
            "Parent": movie.parent,
            "Image URL": movie.image_url,
            "Rating": movie.rating,
            "Language": movie.language,
            "Description": movie.description,
            "Genre": movie.genre,
            "Showtimes URL": movie.showtimes_url,
            "Timings": movie.timings
        }
        movies_list.append(movie_dict)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(movies_list, f, indent=2)
    print(f"Data saved to {filename}")

def main():
    """
    Main function to:
      1. Fetch the "What’s On" page listing.
      2. Parse movie details.
      3. For each movie, enrich it with daily showtimes (for today until 7 days ahead).
      4. Save all the results to a JSON file.
    """
    whatson_url = BASE_URL + "/movies/whatson"
    print(f"Fetching movie listings from: {whatson_url}")

    try:
        html = fetch_page(whatson_url)
        movies = parse_movies(html)
        print(f"Found {len(movies)} movies.\n")

        # Enrich each movie with daily showtimes (for today until 7 days ahead)
        for movie in movies:
            print(f"Enriching '{movie.title}' with daily showtimes...")
            enrich_movie_with_timings_for_dates(movie, days_to_check=7)

        # Save the movie data to a JSON file with keys matching the desired output.
        save_movies_to_json_file(movies, filename="vox_movies.json")
    except Exception as e:
        print(f"Error fetching movie data: {e}")

if __name__ == "__main__":
    main()
