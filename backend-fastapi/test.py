import yaml

# Read the YAML file and calculate total number of ideas
def read_yaml_file(filename):
    with open(filename, 'r', encoding='utf-8') as file:
        data = yaml.safe_load(file)
        total_ideas = sum(org['no_of_ideas'] for org in data['organizations'])
        print(f"Total number of ideas: {total_ideas}")

# Example usage
read_yaml_file('gsoc_ideasdata.yaml')



#a way to motivate my self fills organization ids upto 185

def update_organization_ids(filename):
    with open(filename, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    current_id = 18  
    print(f"Starting to fill IDs from {current_id + 1}")
    print(f"Total lines in file: {len(lines)}")
    
    filled_count = 0
    for i in range(len(lines)):
        line = lines[i].rstrip()
        
        
        if ('organization_id:' in line and 
            (line.strip() == 'organization_id:' or line.strip() == '- organization_id:' or
             line.strip() == 'organization_id: ' or line.strip() == '- organization_id: ')):
            
            print(f"Found empty organization_id at line {i+1}: '{line}' (repr: {repr(lines[i])})")
            current_id += 1
            if current_id <= 185:
             
                if line.strip().startswith('- '):
                    indent = line.index('-')
                    lines[i] = ' ' * indent + f'- organization_id: {current_id}\n'
                else:
                    indent = line.index('organization_id:')
                    lines[i] = ' ' * indent + f'organization_id: {current_id}\n'
                
                filled_count += 1
                print(f"Filled ID {current_id} at line {i+1}")
    
    print(f"\nSummary:")
    print(f"Total empty fields filled: {filled_count}")
    print(f"Last ID assigned: {current_id}")
    
    with open(filename, 'w', encoding='utf-8') as file:
        file.writelines(lines)
        print(f"\nFile saved successfully!")

print("Starting organization ID update process...")
update_organization_ids('gsoc_ideasdata.yaml')
