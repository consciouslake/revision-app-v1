import os
from datetime import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter
import google.generativeai as genai

# Try to import chromadb, handle failure gracefully
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError as e:
    print(f"CRITICAL: ChromaDB not found or failed to load: {e}")
    CHROMADB_AVAILABLE = False
    chromadb = None

# Initialize Client safely
chroma_client = None
if CHROMADB_AVAILABLE:
    try:
        # Initialize with settings to avoid some versioning/telemetry issues
        settings = chromadb.config.Settings(
            anonymized_telemetry=False,
            allow_reset=True,
            is_persistent=True
        )
        chroma_client = chromadb.PersistentClient(path="./chroma_db", settings=settings)
        print("INFO: ChromaDB initialized successfully.")
    except Exception as e:
        print(f"CRITICAL: Error initializing ChromaDB client: {e}")

# Using Gemini Embeddings
class GeminiEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        model = "models/text-embedding-004"
        try:
             # Batch embedding generation to avoid limits if necessary, though list[str] is supported
            embeddings = []
            for text in input:
                 result = genai.embed_content(
                    model=model,
                    content=text,
                    task_type="retrieval_document"
                )
                 embeddings.append(result['embedding'])
            return embeddings
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return [[] for _ in input] # Return empty embeddings on failure to avoid crash

    def embed_query(self, input: list[str]) -> list[list[float]]:
        return self(input)

    def embed_documents(self, input: list[str]) -> list[list[float]]:
        return self(input)
        
    def name(self) -> str:
        return "gemini_embedding_function"

def get_collection(name="revision_app"):
    if not CHROMADB_AVAILABLE or not chroma_client:
        print("WARNING: ChromaDB is not available. Skipping collection retrieval.")
        return None
        
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY not found for embeddings.")
        return None
        
    embedding_fn = GeminiEmbeddingFunction()
    return chroma_client.get_or_create_collection(name=name, embedding_function=embedding_fn)

def process_chapter_content(chapter_id: int, text_content: str):
    """
    Chunks the text content and adds it to the ChromaDB collection.
    """
    if not text_content:
        return

    collection = get_collection()
    if not collection:
        return

    # Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = text_splitter.split_text(text_content)

    # Prepare data for ChromaDB
    ids = [f"chapter_{chapter_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"chapter_id": chapter_id, "chunk_index": i, "timestamp": str(datetime.now())} for i in range(len(chunks))]

    # Add to collection
    try:
        # Delete existing chunks for this chapter first to avoid duplicates/stale data
        # Note: Delete by where filter might be slow on large datasets, but fine for this scale
        try:
            collection.delete(where={"chapter_id": chapter_id})
        except:
            pass # Collection might be empty or filter not found, safe to ignore

        collection.add(
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )
        print(f"Successfully indexed {len(chunks)} chunks for chapter {chapter_id}")
    except Exception as e:
        print(f"Error adding chunks to ChromaDB: {e}")

def query_relevant_context(chapter_id: int, query: str, n_results: int = 3) -> str:
    """
    Queries the vector store for relevant chunks based on the query.
    Returns a concatenated string of the most relevant chunks.
    """
    collection = get_collection()
    if not collection:
        return ""

    try:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"chapter_id": chapter_id} # Filter by chapter
        )
        
        if not results['documents']:
            return ""

        # Flatten list of lists (results['documents'] is [[doc1, doc2, ...]])
        relevant_docs = results['documents'][0]
        return "\n\n---\n\n".join(relevant_docs)
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        return ""
