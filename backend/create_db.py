import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

# Get DB URL from env or use default to parse connection details
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/recall_db")

# Simple parsing (assuming standard format)
# This is a bit hacky but works for the default local setup
if "@" in DATABASE_URL:
    user_pass, host_db = DATABASE_URL.split("@")
    user_part = user_pass.split("//")[1]
    if ":" in user_part:
        user, password = user_part.split(":")
    else:
        user = user_part
        password = None
    
    host_part = host_db.split("/")[0]
    if ":" in host_part:
        host = host_part.split(":")[0]
    else:
        host = host_part
    
    dbname = host_db.split("/")[1]
else:
    # Fallback/Mock for parsing failure
    user = "postgres"
    password = "password"
    host = "localhost"
    dbname = "recall_db"

def create_database():
    try:
        # Connect to default 'postgres' database to create new db
        con = psycopg2.connect(dbname='postgres', user=user, host=host, password=password)
        con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = con.cursor()
        
        # Check if exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}'")
        exists = cur.fetchone()
        
        if not exists:
            print(f"Creating database {dbname}...")
            cur.execute(f"CREATE DATABASE {dbname}")
            print(f"Database {dbname} created successfully.")
        else:
            print(f"Database {dbname} already exists.")
            
        cur.close()
        con.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    create_database()
