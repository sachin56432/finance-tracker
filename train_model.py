import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, LinearRegression
import pickle

# Load full CSV (with ID, Title, Amount, Category, Created_At columns)
df = pd.read_csv("expenses.csv")

# Extract relevant columns, ignore bad/corrupt rows
df = df.dropna(subset=['Title', 'Amount', 'Category'])

titles = df["Title"].astype(str)
amounts = df["Amount"].astype(float)
categories = df["Category"].astype(str)

# Text vectorization
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(titles)

# Train category classifier
cat_model = LogisticRegression()
cat_model.fit(X, categories)

# Train amount regressor
amt_model = LinearRegression()
amt_model.fit(X, amounts)

# Save both models
with open("enhanced_expense_model.pkl", "wb") as f:
    pickle.dump((cat_model, amt_model, vectorizer), f)

print("Model trained: works with full exported expense.csv!")
