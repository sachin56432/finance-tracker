import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
import pickle

df = pd.read_csv("expenses.csv").dropna(subset=['Title', 'Category'])
titles = df["Title"].astype(str)
categories = df["Category"].astype(str)

vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(titles)

cat_model = RandomForestClassifier(n_estimators=100, random_state=42)
cat_model.fit(X, categories)

with open("smartcat_model.pkl", "wb") as f:
    pickle.dump((cat_model, vectorizer), f)
