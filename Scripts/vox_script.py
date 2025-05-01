import re
import requests
import json
from bs4 import BeautifulSoup
from dataclasses import dataclass, field
from typing import List, Dict, Any
from datetime import datetime, timedelta

# Define the base URL for VOX Cinemas
BASE_URL = "https://ksa.voxcinemas.com"

@dataclass
class Movie:
    title: str
    slug: str
    identifier: str
    parent: str = "Vox"
    image_url: str = ""
    rating: str = ""
    language: str = ""
    description: str = ""
    genre: List[str] = field(default_factory=list)
    showtimes_url: str = ""
    timings: List[Dict[str, Any]] = field(default_factory=list)

def fetch_page(url: str) -> str:
    """Fetches the HTML content of a given URL."""
    response = requests.get(url)
    response.raise_for_status()
    return response.text

def parse_movies(html: str) -> List[Movie]:
    """
    Parses the "What’s On" page to extract movie details.
    Description and genre will be fetched later from each movie's detail page.
    """
    soup = BeautifulSoup(html, 'html.parser')
    movie_articles = soup.find_all("article", class_="movie-summary")
    movies = []

    for article in movie_articles:
        slug = article.get("data-slug", "").strip()
        identifier = article.get("data-identifier", "").strip()
        title = article.get("data-title", "").strip()

        # description left blank; will fill in detail step
        description = ""

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

        # Extract language
        language = ""
        language_p = article.find("p", class_="language")
        if language_p:
            language = language_p.get_text(strip=True).replace("Language:", "").strip()

        # Extract showtimes URL (relative)
        showtimes_url = ""
        showtimes_a = article.find("a", string=lambda s: s and "Showtimes" in s)
        if showtimes_a:
            showtimes_url = showtimes_a.get("href", "").strip()

        movies.append(Movie(
            title=title,
            slug=slug,
            identifier=identifier,
            image_url=image_url,
            rating=rating,
            language=language,
            description=description,
            showtimes_url=showtimes_url
        ))

    return movies

def extract_movie_details(detail_html: str) -> (str, List[str]):
    """
    From a movie’s detail page HTML, extract:
      - description (from section[3]/article/p)
      - genres      (from section[3]/aside/p[1])
    """
    soup = BeautifulSoup(detail_html, 'html.parser')
    main = soup.find('main')
    if not main:
        return "", []
    sections = main.find_all('section')
    if len(sections) < 3:
        return "", []

    sec = sections[2]  # the third <section>
    # description
    desc = ""
    if (art := sec.find('article')) and (p := art.find('p')):
        desc = p.get_text(strip=True)

    # genres
    genres: List[str] = []
    if (aside := sec.find('aside')):
        p_tags = aside.find_all('p')
        if p_tags:
            raw = p_tags[0].get_text(strip=True) \
                  .replace("Genres:", "") \
                    .replace("Genre:", "") \
                      .strip()
            genres = [g.strip() for g in raw.split(',') if g.strip()]

    return desc, genres

def extract_showtimes(detail_html: str) -> Dict[str, Dict[str, List[str]]]:
    """
    Extracts the raw showtimes information from a movie’s detail page.
    Returns a dictionary mapping place names to a dictionary of experience -> list of times.
    """
    soup = BeautifulSoup(detail_html, 'html.parser')
    dates_div = soup.find("div", class_="dates")
    if not dates_div:
        return {}

    timings_by_place: Dict[str, Dict[str, List[str]]] = {}

    # For each cinema name (inside an <h3 class_="highlight"> tag)
    for place_header in dates_div.find_all("h3", class_="highlight"):
        place = place_header.get_text(" ", strip=True)
        showtimes_ol = place_header.find_next_sibling("ol", class_="showtimes")
        if not showtimes_ol:
            continue

        experience_dict: Dict[str, List[str]] = {}
        # Each top-level <li> in the <ol> corresponds to an experience
        for li in showtimes_ol.find_all("li", recursive=False):
            strong_tag = li.find("strong")
            if not strong_tag:
                continue
            experience = strong_tag.get_text(" ", strip=True)
            nested_ol = li.find("ol")
            if not nested_ol:
                continue

            timings: List[str] = []
            for time_li in nested_ol.find_all("li"):
                a_tag = time_li.find("a")
                if a_tag:
                    time_text = a_tag.get_text(" ", strip=True)
                else:
                    time_text = time_li.get_text(" ", strip=True)
                found_times = re.findall(r'\b\d{1,2}:\d{2}\b', time_text)
                if found_times:
                    timings.extend(found_times)
                elif time_text:
                    timings.append(time_text)
            experience_dict[experience] = timings

        timings_by_place[place] = experience_dict

    return timings_by_place

def extract_city(place: str) -> str:
    """
    Simple city extractor from place string.
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
    return ""

def enrich_movie_with_timings_for_dates(
    movie: Movie,
    days_to_check: int = 7
) -> None:
    """
    For a single Movie object:
      1. Fetch the base detail page once to get description & genre.
      2. Loop over the next 'days_to_check' days to build showtimes.
    """
    # — fetch description & genre from detail page —
    try:
        detail_html = fetch_page(f"{BASE_URL}/movies/{movie.slug}")
        desc, genres = extract_movie_details(detail_html)
        movie.description = desc
        movie.genre = genres
    except Exception as e:
        print(f"[Error fetching details for '{movie.title}']: {e}")

    # — now fetch date-based showtimes —
    movie.timings = []
    date_format = "%Y%m%d"
    output_date_format = "%Y-%m-%d"
    start_date = datetime.now()

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
            showtimes_list = []
            for place, experiences in raw_timings.items():
                exp_list = [{"Experience": exp, "Times": times}
                            for exp, times in experiences.items()]
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

        for movie in movies:
            print(f"Enriching '{movie.title}' with daily showtimes...")
            enrich_movie_with_timings_for_dates(movie, days_to_check=7)

        save_movies_to_json_file(movies, filename="vox_movies.json")
    except Exception as e:
        print(f"Error fetching movie data: {e}")

if __name__ == "__main__":
    main()
