import models
from database import engine

def reset_table():
    print("Dropping master_questions table...")
    # Drop the table if it exists
    models.MasterQuestion.__table__.drop(engine, checkfirst=True)
    print("Table dropped.")
    
    print("Recreating database tables (including new schema)...")
    models.Base.metadata.create_all(bind=engine)
    print("Tables recreated successfully.")

if __name__ == "__main__":
    reset_table()
