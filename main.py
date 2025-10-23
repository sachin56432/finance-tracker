from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import models, schemas, crud, database
import io, csv
import numpy as np
import pandas as pd
from collections import Counter
import pickle

# ----- AI Model Load -----
try:
    with open("smartcat_model.pkl", "rb") as f:
        cat_model, vectorizer = pickle.load(f)
    AI_ENABLED = True
except Exception as e:
    print(f"AI model not loaded: {e}")
    AI_ENABLED = False

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"msg": "Backend setup successful!"}

# Standard CRUD
@app.get("/expenses", response_model=list[schemas.Expense])
def read_expenses(db: Session = Depends(get_db)):
    return crud.get_expenses(db)

@app.post("/expenses", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    return crud.create_expense(db, expense)

@app.put("/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense(expense_id: int, expense_data: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense.title = expense_data.title
    expense.amount = expense_data.amount
    expense.category = expense_data.category
    db.commit()
    db.refresh(expense)
    return expense

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return {"msg": "Deleted successfully"}

# CSV Export
@app.get("/export-csv")
def export_csv(db: Session = Depends(get_db)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Amount", "Category", "Created_At"])
    expenses = db.query(models.Expense).all()
    for e in expenses:
        writer.writerow([e.id, e.title, e.amount, e.category, e.created_at])
    output.seek(0)
    headers = {"Content-Disposition": "attachment; filename=expenses.csv"}
    return StreamingResponse(output, media_type="text/csv", headers=headers)

# CSV Upload
@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    decoded = contents.decode("utf-8").splitlines()
    reader = csv.DictReader(decoded)
    imported = 0
    for row in reader:
        title = row.get("Title") or row.get("title")
        amount = float(row.get("Amount") or row.get("amount"))
        category = row.get("Category") or row.get("category")
        if title and amount and category:
            expense = models.Expense(
                title=title,
                amount=amount,
                category=category
            )
            db.add(expense)
            imported += 1
    db.commit()
    return {"imported": imported, "msg": "CSV upload complete"}

# --- AI Endpoints ---
# Smart Auto-Categorization
@app.post("/smart-categorize")
def smart_categorize(data: dict):
    if not AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI model not loaded")
    title = data.get("title", "")
    X = vectorizer.transform([title])
    category = cat_model.predict(X)[0]
    return {"category": category}

# Anomaly Detection
@app.get("/detect-anomalies")
def detect_anomalies(db: Session = Depends(get_db)):
    expenses = db.query(models.Expense).all()
    amounts = np.array([e.amount for e in expenses if e.amount is not None])
    mean = np.mean(amounts)
    std = np.std(amounts)
    anomalies = [e for e in expenses if abs(e.amount - mean) > 2 * std]
    return [{"id": e.id, "title": e.title, "amount": e.amount} for e in anomalies]

# Expense Forecasting
@app.get("/forecast-expense/{category}")
def forecast_expense(category: str, db: Session = Depends(get_db)):
    expenses = db.query(models.Expense).filter(models.Expense.category == category).all()
    df = pd.DataFrame([{"created_at": e.created_at, "amount": e.amount} for e in expenses])
    if df.empty:
        return {"forecast": 0}
    df["month"] = pd.to_datetime(df["created_at"]).dt.to_period("M").astype(str)
    monthly_totals = df.groupby("month")["amount"].sum().reset_index()
    if len(monthly_totals) < 2:
        return {"forecast": monthly_totals["amount"].sum() if not monthly_totals.empty else 0}
    X = np.arange(len(monthly_totals)).reshape(-1, 1)
    y = monthly_totals["amount"].values
    from sklearn.linear_model import LinearRegression
    model = LinearRegression()
    model.fit(X, y)
    next_val = model.predict([[len(monthly_totals)]])[0]
    return {"forecast": round(next_val, 2)}

# Personalized Insights
@app.get("/personalized-summary")
def personalized_summary(db: Session = Depends(get_db)):
    expenses = db.query(models.Expense).all()
    df = pd.DataFrame([{"category": e.category, "amount": e.amount, "created_at": e.created_at} for e in expenses])
    total = df["amount"].sum() if not df.empty else 0
    top_cat = df.groupby("category")["amount"].sum().idxmax() if not df.empty else ""
    top_cat_val = df.groupby("category")["amount"].sum().max() if not df.empty else 0
    return {
        "total_spent": round(total, 2),
        "top_category": top_cat,
        "top_category_amount": round(top_cat_val, 2)
    }
