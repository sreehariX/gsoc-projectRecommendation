import yaml

# Read the YAML file
def read_yaml_file(filename):
    with open(filename, 'r',encoding='utf-8') as file:
        data = yaml.safe_load(file)
        print(data)

# Example usage
read_yaml_file('gsoc_ideasdata.yaml')
