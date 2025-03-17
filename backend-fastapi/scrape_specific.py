import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import (
    NoAlertPresentException, 
    TimeoutException, 
    NoSuchElementException,
    StaleElementReferenceException,
    ElementClickInterceptedException
)
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys
import traceback
from urllib.parse import urljoin, urlparse

def setup_driver():
    """Set up and configure the WebDriver"""
    print("Setting up the WebDriver...")
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--start-maximized')
    options.add_argument('--disable-gpu')
    # Add headless option if you don't want to see the browser window
    # options.add_argument('--headless')
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    print("WebDriver setup complete")
    return driver

def handle_popups(driver):
    """Handle different types of popups"""
    print("Checking for popups...")
    try:
        # Handle alert popups
        alert = driver.switch_to.alert
        print("Alert detected, accepting it...")
        alert.accept()
        print("Alert accepted")
        return True
    except NoAlertPresentException:
        print("No alerts found")
        pass
    
    # Try to find and click common close buttons for modal popups
    try:
        print("Looking for close buttons...")
        close_buttons = driver.find_elements(By.CSS_SELECTOR, 
            "button[class*='close'], div[class*='close'], span[class*='close'], "
            "button[aria-label*='close'], button[title*='Close'], "
            "button.dismiss-button, #dismiss-button, .dismiss-button, "
            "[class*='cookie'] button, .consent button, #consent button"
        )
        
        for button in close_buttons:
            if button.is_displayed():
                print(f"Found close button: {button.get_attribute('outerHTML')[:100]}...")
                button.click()
                print("Close button clicked")
                time.sleep(1)
                return True
        
        print("No visible close buttons found")
    except Exception as e:
        print(f"Error handling popups: {str(e)}")
    
    return False

def extract_content(driver):
    """Extract the content from the current page"""
    print("Extracting content from current page...")
    
    # Try multiple methods to get the page content
    try:
        # Method 1: Get visible text
        body_text = driver.find_element(By.TAG_NAME, "body").text
        print(f"Extracted {len(body_text)} characters using body.text")
        
        # Method 2: Try to get the main content if available
        main_content = ""
        selectors = ["main", "article", ".content", "#content", ".main-content", "#main"]
        for selector in selectors:
            try:
                element = driver.find_element(By.CSS_SELECTOR, selector)
                main_content = element.text
                if main_content.strip():
                    print(f"Found main content using selector: {selector}")
                    break
            except:
                continue
        
        # If main content exists and is substantial, use it
        if main_content and len(main_content) > len(body_text) / 3:
            print(f"Using main content selector with {len(main_content)} characters")
            return main_content
        
        # Method 3: Use Ctrl+A to select all
        print("Trying Ctrl+A method...")
        webdriver.ActionChains(driver).key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL).perform()
        time.sleep(1)
        selection_text = driver.execute_script("return window.getSelection().toString();")
        print(f"Extracted {len(selection_text)} characters using selection")
        
        # Choose the best result (the one with more content)
        if len(selection_text) > len(body_text) and selection_text.strip():
            print("Using selection text as it contains more content")
            return selection_text
        
        print("Using body text as final content")
        return body_text
        
    except Exception as e:
        print(f"Error extracting content: {str(e)}")
        traceback.print_exc()
        return "Error extracting content"

def save_to_file(output_file, url, title, content):
    """Save the extracted content to a file"""
    print(f"Saving content for URL: {url}")
    try:
        with open(output_file, 'a', encoding='utf-8') as f:
            f.write(f"\n\nURL: {url}\n")
            f.write(f"TITLE: {title}\n")
            f.write(f"CONTENT:\n{content}\n")
            f.write("~~~~~~~~~~\n")
        print(f"Content saved successfully: {len(content)} characters")
        return True
    except Exception as e:
        print(f"Error saving to file: {str(e)}")
        traceback.print_exc()
        return False

def is_same_domain(base_url, link_url):
    """Check if a link belongs to the same domain as the base URL"""
    try:
        base_domain = urlparse(base_url).netloc
        link_domain = urlparse(link_url).netloc
        
        # Handle relative URLs
        if not link_domain:
            return True
            
        return base_domain == link_domain
    except:
        return False

def scrape_website(start_url, output_file="output.txt", max_links=50):
    """Scrape content from all links on a website"""
    # Create or clear the output file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Website Scraping Results for {start_url}\n")
        f.write(f"Started at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    driver = setup_driver()
    visited_links = set()
    links_to_visit = [start_url]
    current_link_count = 0
    
    try:
        print(f"Starting to scrape: {start_url}")
        
        # First visit the start URL to get its content
        driver.get(start_url)
        print(f"Loaded start URL: {start_url}")
        time.sleep(5)  # Wait for page to load
        
        # Handle any popups on the initial page
        handle_popups(driver)
        
        # Extract and save content from the start URL
        title = driver.title
        content = extract_content(driver)
        save_to_file(output_file, start_url, title, content)
        visited_links.add(start_url)
        current_link_count += 1
        
        # Get all links from the start page
        print("Collecting links from the start page...")
        all_links = []
        try:
            all_links = driver.find_elements(By.TAG_NAME, "a")
            print(f"Found {len(all_links)} links on start page")
        except Exception as e:
            print(f"Error collecting links: {str(e)}")
        
        # Process each link
        for link in all_links:
            try:
                href = link.get_attribute('href')
                if (href and href != "#" and not href.startswith("javascript") 
                    and not href.startswith("mailto") and not href.startswith("tel")
                    and is_same_domain(start_url, href) and href not in visited_links):
                    
                    links_to_visit.append(href)
                    print(f"Added to queue: {href}")
            except StaleElementReferenceException:
                print("Stale element reference when getting link")
                continue
            except Exception as e:
                print(f"Error processing link: {str(e)}")
                continue
        
        # Process the links queue
        while links_to_visit and current_link_count < max_links:
            current_url = links_to_visit.pop(0)
            
            if current_url in visited_links:
                print(f"Already visited: {current_url}")
                continue
                
            print(f"\n--- Processing link {current_link_count + 1}/{max_links}: {current_url} ---")
            
            try:
                # Navigate to the URL
                driver.get(current_url)
                print(f"Loaded URL: {current_url}")
                time.sleep(5)  # Wait for page to load
                
                # Handle any popups
                handle_popups(driver)
                
                # Extract the title and content
                title = driver.title
                print(f"Page title: {title}")
                content = extract_content(driver)
                
                # Save the content
                save_to_file(output_file, current_url, title, content)
                visited_links.add(current_url)
                current_link_count += 1
                
                # Find more links on this page
                if current_link_count < max_links:
                    print("Collecting more links...")
                    try:
                        page_links = driver.find_elements(By.TAG_NAME, "a")
                        print(f"Found {len(page_links)} links on page")
                        
                        for link in page_links:
                            try:
                                href = link.get_attribute('href')
                                if (href and href != "#" and not href.startswith("javascript") 
                                    and not href.startswith("mailto") and not href.startswith("tel")
                                    and is_same_domain(start_url, href) and href not in visited_links
                                    and href not in links_to_visit):
                                    
                                    links_to_visit.append(href)
                                    print(f"Added to queue: {href}")
                            except:
                                continue
                    except Exception as e:
                        print(f"Error collecting links: {str(e)}")
            
            except Exception as e:
                print(f"Error processing URL {current_url}: {str(e)}")
                traceback.print_exc()
            
            print(f"Links visited: {current_link_count}, Links in queue: {len(links_to_visit)}")
            time.sleep(2)  # Small delay between requests
        
        print(f"\nScraping complete. Visited {current_link_count} links.")
        print(f"Results saved to {output_file}")
        
    except Exception as e:
        print(f"An error occurred during scraping: {str(e)}")
        traceback.print_exc()
    finally:
        print("Closing WebDriver...")
        driver.quit()

if __name__ == "__main__":
    # Replace with the URL you want to scrape
    target_url = "https://ml4sci.org/gsoc/2025/summary.html"
    scrape_website(target_url, output_file="output.txt", max_links=50)
    print("Script execution complete")