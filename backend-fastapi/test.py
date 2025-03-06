import csv  # Import the csv module

def print_csv_data(csv_path: str):
    try:
        # Open the CSV file
        with open(csv_path, mode='r', newline='', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            header = next(csv_reader)  # Read the header row
            
            # Find the index of the ideas_content column
            ideas_content_index = header.index("ideas_content")
            
            # Iterate through rows and print the ideas_content
            for row in csv_reader:
                # Join multiline content if necessary
                ideas_content = row[ideas_content_index]
                print(ideas_content)  # Print the content of ideas_content
            
    except Exception as e:
        print(f"Error reading the CSV file: {e}")

if __name__ == "__main__":
    csv_path = "gsoc_ideasdata.csv"  # Path to your CSV file
    print_csv_data(csv_path)
