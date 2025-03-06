from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import google.generativeai as genai
import os
import pandas as pd
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

# Define a new Pydantic model for the input text
class EmbeddingRequest(BaseModel):
    text: str

def get_embedding(text: str):
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text
    )
    return result['embedding']

def load_ideas_to_chroma(csv_path: str):
    df = pd.read_csv(csv_path)
    collection = chroma_client.get_or_create_collection(name="gsoc_ideas", metadata={"hnsw:space": "cosine"})
    
    documents = []
    embeddings = []
    metadatas = []
    
    for index, row in df.iterrows():
        ideas = row['ideas_content'].split("~~~~~~~~~~")
        for idea in ideas:
            idea = idea.strip()
            if idea:  # Ensure the idea is not empty
                embedding = get_embedding(idea)
                documents.append(idea)
                embeddings.append(embedding)
                metadatas.append({
                    'organization_id': row['organization_id'],
                    'organization_name': row['organization_name'],
                    'no_of_ideas': row['no_of_ideas'],
                    'characters': row['characters'],
                    'words': row['words'],
                    'token_count': row['token_count'],
                    'gsocorganization_dev_url': row['gsocorganization_dev_url'],
                    'idea_list_url': row['idea_list_url']
                })
    
    collection.upsert(
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )



@app.post("/query")
async def query_ideas(request: QueryRequest):
    try:
        query_embedding = get_embedding(request.query)
        collection = chroma_client.get_collection("gsoc_ideas")
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,
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
        csv_path = "gsoc_ideasdata.csv"
        df = pd.read_csv(csv_path)
        print(df.head())
        ideas_list = df.to_dict(orient='records')
        return JSONResponse(content=ideas_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)