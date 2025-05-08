from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from bs4 import BeautifulSoup
import urllib.parse
import json
import lxml
import time
import re
import time
from datetime import datetime, timedelta
from selenium.webdriver.support.wait import WebDriverWait

MUVI_URL = "https://www.muvicinemas.com/"

options = webdriver.ChromeOptions()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
driver.get(f"{MUVI_URL}en")

time.sleep(3)  # Adjust as needed

# Locate and click the radio button with id="city-Jeddah"
radio_button = driver.find_element(By.ID, "city-Jeddah")
driver.execute_script("arguments[0].click();", radio_button)

print("selecting city...")

# Wait for a short duration
time.sleep(2)

# Locate and click the submit button with id="city-submit"
submit_button = driver.find_element(By.ID, "city-submit")
driver.execute_script("arguments[0].click();", submit_button)

# wait to see result (adjust as needed)
time.sleep(5)

# Adjust based on loading speed
scroll_pause_time = 3
last_height = driver.execute_script("return document.body.scrollHeight")

print("loading movie data...")

# Scroll down to the end of the page
while True:
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(scroll_pause_time)
    new_height = driver.execute_script("return document.body.scrollHeight")
    if new_height == last_height:
        break
    last_height = new_height

page_source = driver.page_source

driver.quit()


# Parse the HTML
soup = BeautifulSoup(page_source, "html.parser")


# Find all movie divs
movie_divs = soup.find_all('div', class_='css-3hfg99')

# Array to store extracted movie objects
movies = []

# Extracted from the home page
for div in movie_divs:
    try:

        # Extract movie title
        title_tag = div.find('h2')
        title = title_tag.text.strip() if title_tag else "Unknown Title"

        # Generate slug from title
        slug = title.lower().replace(" ", "-").replace(":", "").replace("(", "").replace(")", "")

        # Extract showtimes URL
        showtimes_tag = div.find('a', id="movie-card")
        showtimes_url = showtimes_tag['href'] if showtimes_tag else "Unknown URL"

        # Extract image URL
        image_tag = div.find('img', {'id': 'image'})
        if image_tag and 'src' in image_tag.attrs:
            raw_image_url = image_tag['src']
            image_url = urllib.parse.unquote(raw_image_url.split('?url=')[1].split('&w=')[0])
        else:
            image_url = "Unknown Image URL"

        # Extract language
        language_tags = div.find_all('span', class_='css-yqnbuz')

        language = language_tags[0].text.strip() if len(language_tags) >= 1 else "Unknown Language"

        # Extract classification
        span_tags = div.find_all('span')
        classification = span_tags[-1].text.strip() if span_tags else "Unknown Classification"


        # Extract identifier (same as slug)
        identifier = slug

        # Store movie info in a dictionary
        movie_info = {
            "Title": title,
            "Slug": slug,
            "Identifier": identifier,
            "Parent": "Muvi",
            "Image URL": image_url,
            "Rating": classification,
            "Language": language,
            "Description": "",
            "Genre":[],
            "Showtimes URL": showtimes_url,
            "Timings": {}
        }

        # print("Extracted movie info:", movie_info)  # Debugging: Print extracted movie object

        # Append to movies list
        movies.append(movie_info)

    except Exception as e:
        print(f"Error extracting movie data: {e}")


all_movies_timings = []
options = webdriver.ChromeOptions()
options.add_argument('--headless')
driver = webdriver.Chrome(options=options)
pattern = re.compile(r"^movie-day-\d+$")  # Matches "movie-day-" followed by one or more digits

# Mapping of city ids to real city names.
city_mapping = {
    2: "Riyadh",
    3: "Dammam",
    # 4: "Jubail",
    6: "Jeddah",
    7: "Dhahran",
    # 19: "Al Hofuf",
    # 20: "Buraydah",
    # 21: "Unayzah",
    23: "Taif",
    # 24: "Khamis Mushait",

}

# For every movie in the movie object, extract showtimes and remaining information
for movie in movies:

    # Remove any preexisting cityId parameter from the URL, then add it manually.
    base_url = f"{MUVI_URL}{movie['Showtimes URL']}"
    base_url = re.sub(r"(\?cityId=)\d+", "", base_url)

    # This dictionary will aggregate date entries across cities by their index.
    aggregated_date_entries = {}

    print(f"collecting data for {movie['Title']}")

    driver.get(base_url)
    try:
        # Wait up to 10 seconds for an element with class "css-8pnyry" to be present.
        element = WebDriverWait(driver, 10).until(
            lambda d: d.find_element(By.CLASS_NAME, "css-8pnyry")
        )
    except Exception as e:
        print(f"Timeout waiting for description element on {base_url}: {e}")

    page_source = driver.page_source
    soup = BeautifulSoup(page_source, "html.parser")

    # Add description and genres
    description = soup.find("p", class_="css-8pnyry")
    movie["Description"] = description.text.strip() if description else ""

    genres_div = soup.find("div", class_="css-1vp3u1z")
    movie["Genre"] = [span.get_text(strip=True) for span in genres_div.find_all('span')] if genres_div else []

    # Loop through only the mapped cityIds.
    for city_id in city_mapping:
        url = f"{base_url}?cityId={city_id}"
        driver.get(url)
        time.sleep(5)
        page_source = driver.page_source

        # Check for a 404-like error by examining the title and page content. (WORK ON THIS)
        # if (driver.title.strip() in ["404", "Not Found"] or
        #         "page not found" in page_source.lower()):
        #     print(f"CityId {city_id} appears to be a 404. Skipping...")
        #     continue

        soup = BeautifulSoup(page_source, "html.parser")
        # Find all buttons representing date groups.
        matching_buttons = soup.find_all("button", id=pattern)

        if not matching_buttons:
            print(f"No date buttons found for CityId {city_id}.")
            continue

        # Iterate over each date button by index.
        for i, button in enumerate(matching_buttons):
            # Increment the date by one for each button (i = 0 is today, i = 1 is tomorrow, etc.)
            show_date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            button_id = button.get("id")

            try:
                date_button = driver.find_element(By.ID, button_id)
                driver.execute_script("arguments[0].click();", date_button)
                time.sleep(5)
            except Exception as e:
                print(f"Error clicking date button {button_id} for CityId {city_id}: {e}")
                continue

            page_source = driver.page_source
            soup = BeautifulSoup(page_source, "html.parser")

            cinema_divs = soup.find_all('div', class_='css-1jdfe3m')
            cinemas_for_date = []

            for cinema in cinema_divs:
                try:
                    # Extract cinema name (Place)
                    place_tag = cinema.find('p', class_='MuiTypography-root MuiTypography-body1 css-1vg8x22')
                    place = place_tag.text.strip() if place_tag else "Unknown Place"
                    if not place_tag:
                        continue

                    # Find experience sections within this cinema.
                    experience_sections = cinema.find_all('div', class_='MuiBox-root css-acwcvw')
                    experience_sections_ex = cinema.find_all('div', class_='css-82gedl')
                    experiences = []

                    for index, experience_section in enumerate(experience_sections):
                        # Use the second image's alt attribute for the experience name.
                        img_tags = experience_sections_ex[index].find_all('img')
                        if len(img_tags) >= 2:
                            experience = img_tags[1]['alt'].strip().replace("\u00ae", "")
                        else:
                            experience = "Unknown Experience"

                        # Extract showtimes.
                        times = []
                        time_tags = experience_section.find_all('p', class_='MuiTypography-root MuiTypography-body1 css-1002wjd')
                        for time_tag in time_tags:
                            timing = time_tag.text.strip().replace("\u00a0", " ")
                            if timing:
                                times.append(timing)

                        experiences.append({
                            "Experience": experience,
                            "Times": times
                        })

                    # Replace the placeholder with the real city name.
                    city_name = city_mapping.get(city_id, f"CityId {city_id}")

                    cinemas_for_date.append({
                        "Place": place,
                        "City": city_name,
                        "Experiences": experiences
                    })
                except Exception as e:
                    print(f"Error extracting cinema data for CityId {city_id}: {e}")

            # Aggregate the showtimes for this date index.
            if i not in aggregated_date_entries:
                aggregated_date_entries[i] = {
                    "Date": show_date,
                    "day_of_week": "",
                    "Showtimes": []
                }
            aggregated_date_entries[i]["Showtimes"].extend(cinemas_for_date)

    # After processing all cities, sort the date entries by index and assign them.
    movie["Timings"] = [aggregated_date_entries[i] for i in sorted(aggregated_date_entries.keys())]

    # For testing, break after processing one movie.
    # break

driver.quit()

# Save JSON to a file
print(json.dumps(movies, indent=4))
with open("muvi_movies.json", "w", encoding="utf-8") as f:
    json.dump(movies, f, ensure_ascii=False, indent=4)