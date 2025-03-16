from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import google.generativeai as genai
import os
import yaml
import uuid
from dotenv import load_dotenv
from fastapi.responses import JSONResponse

app = FastAPI(
    title="GSoC Ideas RAG API",
    description="API for querying GSoC ideas using ChromaDB and Gemini"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
print(os.environ.get("GEMINI_API_KEY"))  # This should print your API key if loaded correctly

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
chroma_client = chromadb.PersistentClient(path="chroma_db")


class QueryRequest(BaseModel):
    query: str
    n_results: int = 10  # Default value of 10 if not specified

# Define a new Pydantic model for the input text
class EmbeddingRequest(BaseModel):
    text: str

def get_embedding(text: str):
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text
    )
    return result['embedding']

def load_ideas_to_chroma(yaml_path: str):
    # Load YAML file
    with open(yaml_path, 'r', encoding='utf-8') as file:
        data = yaml.safe_load(file)
    
    collection = chroma_client.get_or_create_collection(name="gsoc_ideas", metadata={"hnsw:space": "cosine"})
    
    # Check if collection is empty
    if collection.count() == 0:
        print("ChromaDB collection is empty. Loading data...")
        documents = []
        embeddings = []
        metadatas = []
        ids_list = []  # Create a list to store unique IDs
        
        for org in data['organizations']:
            ideas = org['ideas_content'].split("~~~~~~~~~~")
            for idea in ideas:
                idea = idea.strip()
                if idea:  # Ensure the idea is not empty
                    embedding = get_embedding(idea)
                    documents.append(idea)
                    embeddings.append(embedding)
                    metadatas.append({
                        'organization_id': org['organization_id'],
                        'organization_name': org['organization_name'],
                        'no_of_ideas': org['no_of_ideas'],
                        'totalCharacters_of_ideas_content_parent': org.get('totalCharacters_of_ideas_content_parent'),
                        'totalwords_of_ideas_content_parent': org.get('totalwords_of_ideas_content_parent'),
                        'totalTokenCount_of_ideas_content_parent': org.get('totalTokenCount_of_ideas_content_parent'),
                        'gsocorganization_dev_url': org['gsocorganization_dev_url'],
                        'idea_list_url': org['idea_list_url']
                    })
                    # Generate a unique ID for each document
                    ids_list.append(str(uuid.uuid4()))
        
        collection.upsert(
            ids=ids_list,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        print(f"Loaded {len(documents)} ideas into ChromaDB")
    else:
        print(f"ChromaDB collection already contains {collection.count()} documents")

@app.on_event("startup")
async def startup_db_client():
    try:
        # Check if ChromaDB is ready and initialize if needed
        yaml_path = "gsoc_ideasdata.yaml"
        if os.path.exists(yaml_path):
            load_ideas_to_chroma(yaml_path)
        else:
            print(f"Warning: YAML file {yaml_path} not found")
    except Exception as e:
        print(f"Error initializing ChromaDB: {str(e)}")

@app.post("/query")
async def query_ideas(request: QueryRequest):
    try:
        query_embedding = get_embedding(request.query)
        collection = chroma_client.get_collection("gsoc_ideas")
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.n_results,  # Use the requested number of results
            include=['documents', 'metadatas', 'distances']
        )
        
        formatted_results = []
        for i in range(len(results['documents'][0])):
            result = {
                'document': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'similarity_score': 1 - results['distances'][0][i]
            }
            formatted_results.append(result)
        
        return {"results": formatted_results}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test")
async def test_embedding(request: EmbeddingRequest):
    try:
        # Get the embedding for the provided text
        embedding = get_embedding(request.text)
        return {"embedding": embedding}  # Return the embedding as a JSON response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "GSoC Ideas RAG API is running"}

@app.get("/ideas")
async def get_ideas():
    try:
        yaml_path = "gsoc_ideasdata.yaml"
        with open(yaml_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        
        # Convert to list of dictionaries for JSON response
        ideas_list = data['organizations']
        return JSONResponse(content=ideas_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/chromadb-stats")
async def get_chromadb_stats():
    try:
        collection = chroma_client.get_collection("gsoc_ideas")
        
        # Get total count
        total_count = collection.count()
        
        # Get all items (limited to first 1000 to avoid overwhelming responses)
        results = collection.get(limit=1000)
        
        # Get unique organizations
        org_names = set()
        if results and 'metadatas' in results and results['metadatas']:
            for metadata in results['metadatas']:
                if metadata and 'organization_name' in metadata:
                    org_names.add(metadata['organization_name'])
        
        return {
            "total_records": total_count,
            "unique_organizations": len(org_names),
            "organization_names": list(org_names),
            "sample_records": min(len(results.get('ids', [])), 1000)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chromadb-data")
async def get_chromadb_data(limit: int = 100, offset: int = 0):
    try:
        collection = chroma_client.get_collection("gsoc_ideas")
        
        # Get all IDs to handle pagination
        all_ids = collection.get(include=[])['ids']
        
        # Apply pagination
        paginated_ids = all_ids[offset:offset+limit] if offset < len(all_ids) else []
        
        if not paginated_ids:
            return {
                "total": len(all_ids),
                "limit": limit,
                "offset": offset,
                "data": []
            }
        
        # Get data for paginated IDs
        results = collection.get(ids=paginated_ids, include=['documents', 'metadatas', 'embeddings'])
        
        formatted_results = []
        for i in range(len(results['ids'])):
            result = {
                'id': results['ids'][i],
                'document': results['documents'][i],
                'metadata': results['metadatas'][i],
                'embedding_size': len(results['embeddings'][i]) if 'embeddings' in results else None
            }
            formatted_results.append(result)
        
        return {
            "total": len(all_ids),
            "limit": limit,
            "offset": offset,
            "data": formatted_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
