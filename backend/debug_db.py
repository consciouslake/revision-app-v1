from database import SessionLocal, engine
import models

# Force creation of tables if they don't exist
print("Creating tables...")
models.Base.metadata.create_all(bind=engine)
print("Tables created.")


# Check metadata
print(f"Metadata tables: {models.Base.metadata.tables.keys()}")

# Check actual tables in DB
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
    tables = [row[0] for row in result]
    print(f"Actual tables in DB: {tables}")

# Debug Chapter Content
print("Checking chapter content...")
with engine.connect() as conn:
    # Use LIKE to find the chapter from the screenshot title
    result = conn.execute(text("SELECT id, title, length(raw_text_content), substr(raw_text_content, 1, 100) FROM chapters WHERE title LIKE '%Cyber_Threats%'"))
    rows = result.fetchall()
    
    if not rows:
        print("No matching chapter found.")
    else:
        for row in rows:
            print(f"ID: {row[0]}")
            print(f"Title: {row[1]}")
            print(f"Text Length: {row[2]}")
            print(f"Snippet: {row[3]}...")

db = SessionLocal()
try:
    if "user_progress" in tables:
        progs = db.query(models.UserProgress).all()
        print(f"Found {len(progs)} progress records")
    else:
        print("Table user_progress MISSING in DB")
except Exception as e:
    print(f"Query failed: {e}")
finally:
    db.close()
