from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import time
import json
import os
import re
from datetime import datetime

# Create directory for data
if not os.path.exists("amc_data"):
    os.makedirs("amc_data")

# Map for converting abbreviated day names to full names
day_name_map = {
    "Mon": "Monday",
    "Tue": "Tuesday",
    "Wed": "Wednesday",
    "Thu": "Thursday",
    "Fri": "Friday",
    "Sat": "Saturday",
    "Sun": "Sunday",
    "Today": "Today"
}

# Convert extracted date to desired string
def get_date_key(date_text):
    current_year = datetime.now().year
    if date_text == "Today":
        return datetime.now().strftime("%Y-%m-%d")
    parts = date_text.split(', ')
    if len(parts) > 1:
        day_month = parts[1].split()
        if len(day_month) >= 2:
            day = int(day_month[0])
            month_str = day_month[1]
            months = {
                "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
                "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
            }
            month = months.get(month_str, 1)
            return f"{current_year}-{month:02d}-{day:02d}"
    return f"{datetime.now().strftime('%Y-%m-%d')}-{date_text}"

# format the place and city strings to remove undesired characters
def format_place_and_city(raw_text):
    parts = raw_text.split("-")
    place = parts[0].strip() if parts else raw_text.strip()
    city = ""
    if len(parts) > 1:
        city_raw = "-".join(parts[1:]).strip()
        city = re.sub(r'\d+', '', city_raw).strip()
        if ',' in city:
            city = city.split(',', 1)[0].strip()
        if '.' in city:
            city = city.split('.', 1)[0].strip()
        city = city.replace("KM(S)", "").strip()
    return place, city

# Extract each individual movie's information
def extract_movie_info(movie_section):
    info_section = movie_section.find("section", class_="amc-title-info")
    if not info_section:
        return "", "", []
    li_tags = info_section.find_all("li")
    classification = li_tags[0].text.strip() if len(li_tags) > 0 else ""
    lang = li_tags[2].text.strip() if len(li_tags) > 2 else ""
    genres = []
    for li_tag in li_tags[3:]:
        raw_text = li_tag.get_text(strip=True)
        if raw_text:
            splitted = [g.strip() for g in raw_text.split(',') if g.strip()]
            genres.extend(splitted)
    return classification, lang, genres

# Extract the description or synopsis
def extract_synopsis(movie_section):
    desc_tag = movie_section.find("p", class_="amc-synopsis")
    if not desc_tag:
        return ""
    desc_text = desc_tag.get_text(strip=True)
    if desc_text.lower().startswith("synopsis:"):
        desc_text = desc_text[9:].strip()
    return desc_text


all_movies = []

options = Options()
driver = webdriver.Chrome(options=options)
driver.get('https://www.amccinemas.com/showtime')
time.sleep(3)  # Initial page load

try:
    # Open the dropdown and get the full list of date options.
    date_button = driver.find_element(By.CSS_SELECTOR, "button[data-id='Sel_date']")
    driver.execute_script("arguments[0].click();", date_button)
    time.sleep(1)
    # Using the XPath we derived earlier.
    date_options = driver.find_elements(
        By.XPATH,
        "//*[@id='dropdownsection']/aside[1]/div/div/div/ul/li/a"
    )
    total_dates = len(date_options)
    print(f"Found {total_dates} date options.")

    # Loop over all date buttons (including Today)
    for day_index in range(total_dates):
        # Reopen the dropdown for each iteration.
        date_button = driver.find_element(By.CSS_SELECTOR, "button[data-id='Sel_date']")
        driver.execute_script("arguments[0].click();", date_button)
        time.sleep(1)

        # Re-fetch the date options (they may be refreshed in the DOM).
        date_options = driver.find_elements(
            By.CSS_SELECTOR,
            "div.dropdown-menu.open li a"
        )
        # Get the date text from the current option.
        date_spans = date_options[day_index].find_elements(By.CSS_SELECTOR, "span.text")
        if date_spans:
            date_text = date_spans[0].text.strip()
        else:
            date_text = date_options[day_index].text.strip()
        print(f"Processing: {date_text}")

        # Click the date button.
        driver.execute_script("arguments[0].click();", date_options[day_index])
        time.sleep(3)  # Wait for page to update

        date_key = get_date_key(date_text)
        day_part = date_text.split(',')[0] if ',' in date_text else date_text
        day_name = day_name_map.get(day_part, day_part)

        # Fetch new page source
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        movie_sections = soup.find_all("section", class_="movies-list")

        # For each movie section extract title, slug, then call appropriate functions
        for movie_section in movie_sections:
            title_section = movie_section.find("h1")
            title = title_section.text.strip() if title_section else ""
            slug = title.lower().replace(" ", "-").replace(":", "")
            classification, lang, genres = extract_movie_info(movie_section)
            description = extract_synopsis(movie_section)
            image_tag = movie_section.find("img", class_="img-responsive")
            image_url = image_tag["src"] if image_tag else ""

            # Extract showtimes, experiences, and place
            showtimes_list = []
            showtime_blocks = movie_section.find_all("section", class_="amc-showtime-list-block")
            for block in showtime_blocks:
                cinema_panels = block.find_all("section", class_="panel panel-default")
                for panel in cinema_panels:
                    raw_cinema_text = panel.find("h2").text.strip()
                    cinema_name, city = format_place_and_city(raw_cinema_text)
                    showtime_lists = panel.find_all("ul", class_="amc-time-list")
                    for showtime_list in showtime_lists:
                        experiences = []
                        experience_section = showtime_list.find_previous_sibling("aside", class_="amc-experience")
                        if experience_section:
                            exp_title_tag = experience_section.find("span", class_="amc-exp-title")
                            if exp_title_tag:
                                exp_title = exp_title_tag.text.strip()
                                times = [t.text.strip() for t in showtime_list.find_all("span", class_="amc-time")]
                                experiences.append({"Experience": exp_title, "Times": times})
                        cinema_exists = False
                        for showtime in showtimes_list:
                            if showtime["Place"] == cinema_name:
                                showtime["Experiences"].extend(experiences)
                                cinema_exists = True
                                break
                        if not cinema_exists and experiences:
                            showtimes_list.append({"Place": cinema_name, "City": city, "Experiences": experiences})

            # Logic to help give a date to all date buttons
            if day_name == "":
                day_name = "Today"

            if date_key[-1] == "-":
                date_key = date_key.rsplit("-", 1)
                date_key = date_key[0]

            timing = {"Date": date_key, "day_of_week": day_name, "Showtimes": showtimes_list}

            # Check if the movie already exists in our data; if so, append this timing.
            found = False
            for movie in all_movies:
                if movie["Slug"] == slug:
                    movie["Timings"].append(timing)
                    found = True
                    break
            if not found:
                new_movie = {
                    "Title": title,
                    "Slug": slug,
                    "Identifier": slug,
                    "Parent": "AMC",
                    "Image URL": image_url,
                    "Rating": classification,
                    "Language": lang,
                    "Description": description,
                    "Genre": genres,
                    "Showtimes URL": f"/movies/{slug}#showtimes",
                    "Timings": [timing]
                }
                all_movies.append(new_movie)
        print(f"Completed processing: {date_text}")

except Exception as e:
    print(f"Error occurred: {e}")
    import traceback

    traceback.print_exc()
finally:

    # Print the final JSOn to a file
    with open("amc_movies.json", "w", encoding="utf-8") as f:
        json.dump(all_movies, f, ensure_ascii=False, indent=4)
    print("Saved all movie data to amc_movies.json")
    driver.quit()