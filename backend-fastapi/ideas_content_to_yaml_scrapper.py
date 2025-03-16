import yaml
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import NoAlertPresentException, TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys
import tempfile
import shutil
import glob

def setup_driver():
    """Set up and configure the WebDriver"""
    print("Setting up the WebDriver...")
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--start-maximized')
    options.add_argument('--disable-gpu')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def handle_popups(driver):
    """Handle different types of popups"""
    try:
        alert = driver.switch_to.alert
        print("Alert detected, accepting it...")
        alert.accept()
        return True
    except NoAlertPresentException:
        pass
    
    # Try to find and click common close buttons for modal popups
    try:
        close_buttons = driver.find_elements(By.CSS_SELECTOR, 
            "button[class*='close'], div[class*='close'], span[class*='close'], "
            "button[aria-label*='close'], button[title*='Close'], "
            "button.dismiss-button, #dismiss-button, .dismiss-button"
        )
        
        for button in close_buttons:
            if button.is_displayed():
                print("Found close button, clicking it...")
                button.click()
                time.sleep(1)
                return True
    except:
        pass
    
    return False

def extract_content_from_url(driver, url):
    """Extract content from the given URL"""
    if not url:
        print("No URL provided")
        return ""
    
    print(f"Navigating to {url}...")
    try:
        driver.get(url)
        time.sleep(5)  # Wait for page to load
        
        # Handle any popups
        handle_popups(driver)
        
        content = ""
        
        # This appproach did not work i have to copy past manually for google docs
        if "google.com/document" in url:
            print("Google Docs detected, using simple Ctrl+A method...")
            
    
            time.sleep(15)
            print("Waited 15 seconds for Google Docs to fully load")
            
           
            print("Pressing Ctrl+A to select all text")
            webdriver.ActionChains(driver).key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL).perform()
            time.sleep(3) 
            
        
            content = driver.execute_script("return window.getSelection().toString();")
            print(f"Selected text length: {len(content)} characters")
            
        
            if content.strip():
                return content.strip()
            else:
                
                print("Selection returned empty, trying body text as fallback")
                content = driver.find_element(By.TAG_NAME, "body").text
                print(f"Body text length: {len(content)} characters")
                return content.strip()
                
        elif "github.com" in url:
            # GitHub
            try:
                content_element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "markdown-body"))
                )
                content = content_element.text
            except:
                print("Fallback to body content for GitHub")
                content = driver.find_element(By.TAG_NAME, "body").text
                
        else:
            # Generic website - try to get main content
            try:
                # Try common content containers
                selectors = ["main", "article", ".content", "#content", ".main-content"]
                for selector in selectors:
                    try:
                        element = driver.find_element(By.CSS_SELECTOR, selector)
                        content = element.text
                        if content.strip():
                            break
                    except:
                        continue
                
                # If no content found, get the body text
                if not content.strip():
                    content = driver.find_element(By.TAG_NAME, "body").text
            except:
                content = driver.find_element(By.TAG_NAME, "body").text
        
        # If no content extracted, try Ctrl+A and Ctrl+C fallback (for non-Google Docs)
        if not content.strip() and "google.com/document" not in url:
            print("Attempting Ctrl+A and Ctrl+C fallback...")
            try:
              
                time.sleep(5)
                
          
                webdriver.ActionChains(driver).key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL).perform()
                time.sleep(1)
                
               
                content = driver.execute_script("""
                    return window.getSelection().toString();
                """)
                
                if not content.strip():
                    # Try alternative method using active element
                    content = driver.execute_script("""
                        var activeEl = document.activeElement;
                        if (activeEl) {
                            if (activeEl.value) return activeEl.value;
                            if (activeEl.textContent) return activeEl.textContent;
                        }
                        return document.body.textContent;
                    """)
                
                print("Content extracted using Ctrl+A fallback")
            except Exception as e:
                print(f"Ctrl+A fallback failed: {str(e)}")
        
        # Clean up the content
        content = content.strip()
        
        print(f"Extracted {len(content)} characters")
        return content
        
    except Exception as e:
        print(f"Error extracting content: {str(e)}")
        return ""

def update_yaml_with_ideas_content(org_id, ideas_content):
    """Update the YAML file with ideas content for a specific organization ID only"""
    yaml_file = "gsoc_ideasdata.yaml"
    
    if not os.path.exists(yaml_file):
        print(f"YAML file not found: {yaml_file}")
        return False
    
    try:
        # Read the entire file as text
        with open(yaml_file, 'r', encoding='utf-8') as file:
            file_content = file.read()
        
        # Create a pattern to find the organization section
        org_pattern = f"- organization_id: {org_id}"
        
        if org_pattern not in file_content:
            print(f"Organization ID {org_id} not found in YAML file")
            return False
        
     
        print(f"Found organization ID {org_id} in YAML file")
        print(f"Content to save: {len(ideas_content)} characters")
        print(f"First 100 characters of content: {ideas_content[:100]}...")
        
   
        sections = file_content.split("- organization_id:")
        
        # Find the section for our target organization
        target_section = None
        for i, section in enumerate(sections):
            if section.strip().startswith(str(org_id)):
                target_section = section
                section_index = i
                break
        
        if target_section is None:
            print(f"Could not find section for organization ID {org_id}")
            return False
       
        print("Replacing existing ideas_content field")
        
        # Split the section into lines
        lines = target_section.split('\n')
        new_lines = []
        in_ideas_content = False
        skip_next_line = False
        
        for line in lines:
            if skip_next_line:
                skip_next_line = False
                continue
                
            if "ideas_content:" in line:
                # Add the ideas_content line with pipe character
                new_lines.append("    ideas_content: |")
                in_ideas_content = True
                skip_next_line = True  
                
      
                for content_line in ideas_content.split('\n'):
                    new_lines.append(f"      {content_line}")
                
            elif in_ideas_content and (line.startswith("      ") or line.strip() == ""):
             
                continue
            elif in_ideas_content and (not line.startswith("      ")):
                # We've reached the next field, stop skipping lines
                in_ideas_content = False
                new_lines.append(line)
            else:
                new_lines.append(line)
        
       
        new_section = '\n'.join(new_lines)
        
        # Reconstruct the file
        sections[section_index] = new_section
        new_file_content = "- organization_id:".join(sections)
        

        with open(yaml_file, 'w', encoding='utf-8') as file:
            file.write(new_file_content)
        
        print(f"Successfully updated organization ID {org_id} in YAML file with ideas content")
        print(f"Content length saved: {len(ideas_content)} characters")
        return True
        
    except Exception as e:
        print(f"Error updating YAML file: {str(e)}")
        print(f"Error details: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

def get_idea_urls_from_yaml(start_id=101, end_id=185):
    """Get idea list URLs from the YAML file for the specified range of organization IDs"""
    yaml_file = "gsoc_ideasdata.yaml"
    
    if not os.path.exists(yaml_file):
        print(f"YAML file not found: {yaml_file}")
        return {}
    
    try:
      
        with open(yaml_file, 'r', encoding='utf-8') as file:
            lines = file.readlines()
        
        idea_urls = {}
        current_org_id = None
        current_org_name = None
        current_idea_url = None
        
        for line in lines:
            line = line.strip()
            
      
            if line.startswith("- organization_id:"):
                try:
                    current_org_id = int(line.split(":", 1)[1].strip())
                except:
                    current_org_id = None
            
           
            elif line.startswith("organization_name:") and current_org_id is not None:
                current_org_name = line.split(":", 1)[1].strip()
            
            # Check for idea list URL
            elif line.startswith("idea_list_url:") and current_org_id is not None:
                current_idea_url = line.split(":", 1)[1].strip()
                

                if (current_org_id is not None and 
                    current_org_name is not None and 
                    current_idea_url and 
                    start_id <= current_org_id <= end_id):
                    
                    idea_urls[current_org_id] = {
                        "url": current_idea_url,
                        "name": current_org_name
                    }
                    
                    # Reset for next organization
                    current_org_id = None
                    current_org_name = None
                    current_idea_url = None
        
        return idea_urls
    
    except Exception as e:
        print(f"Error reading YAML file: {str(e)}")
        return {}

def scrape_ideas_content(start_id=101, end_id=185):
    """Scrape ideas content from idea list URLs for organizations in the specified ID range"""
    driver = setup_driver()
    
    try:
        # Get idea list URLs from the YAML file
        idea_urls = get_idea_urls_from_yaml(start_id, end_id)
        
        if not idea_urls:
            print(f"No idea list URLs found for organizations with IDs {start_id}-{end_id}")
            return
        
        print(f"Found {len(idea_urls)} organizations with idea list URLs")
        
        # Process each organization one by one
        for org_id, org_data in idea_urls.items():
            idea_url = org_data["url"]
            org_name = org_data["name"]
            
            print(f"\nProcessing organization ID {org_id}: {org_name}")
            print(f"Idea list URL: {idea_url}")
            
            # Extract content from the idea list URL
            ideas_content = extract_content_from_url(driver, idea_url)
            
            if ideas_content:
           
                success = update_yaml_with_ideas_content(org_id, ideas_content)
                
                if success:
                    print(f"Successfully processed organization ID {org_id}")
                    print(f"Content length: {len(ideas_content)} characters")
                else:
                    print(f"Failed to update YAML file for organization ID {org_id}")
            else:
                print(f"Failed to extract content for organization ID {org_id}")
            
    
            time.sleep(2)
            
            
            print(f"Completed processing for organization ID {org_id}")
            print("-" * 50)
        
        print(f"\nFinished processing organizations from ID {start_id} to {end_id}")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
    finally:
        print("\nClosing the browser...")
        driver.quit()

if __name__ == "__main__":
    scrape_ideas_content(start_id=101, end_id=185)