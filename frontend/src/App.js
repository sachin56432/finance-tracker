import React, { useEffect, useState, useRef } from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  "#17a2b8", // Teal
  "#f67280", // Coral
  "#6a89cc", // Indigo
  "#48dbfb", // Aqua
  "#ffe47a", // Yellow
  "#a5deba", // Mint
  "#4b6584", // Slate
  "#fd9644", // Orange
  "#d6a4a4", // Rose
  "#30475e", // Dark blue
];
const DARK_COLORS = [
  "#26c6da","#f67280","#6a89cc","#25a18e","#f3a683","#574b90","#f8c291","#778beb","#786fa6","#eb4d4b"
];

function App() {
  const [expenses, setExpenses] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [editId, setEditId] = useState(null);

  const [anomalies, setAnomalies] = useState([]);
  const [forecast, setForecast] = useState("");
  const [forecastRequested, setForecastRequested] = useState(false);
  const [summary, setSummary] = useState({});
  const [dark, setDark] = useState(false);
  const fileInputRef = useRef();

  // GET all expenses
  useEffect(() => {
    fetch("http://127.0.0.1:8000/expenses")
      .then(res => res.json())
      .then(data => setExpenses(data));
  }, []);

  // Form helpers
  const resetForm = () => { setTitle(""); setAmount(""); setCategory(""); setEditId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const expenseData = { title, amount: parseFloat(amount), category };
    if (!editId) {
      fetch("http://127.0.0.1:8000/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      })
        .then(res => res.json())
        .then(data => { setExpenses([...expenses, data]); resetForm(); });
    } else {
      fetch(`http://127.0.0.1:8000/expenses/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      })
        .then(res => res.json())
        .then(updated => {
          setExpenses(expenses.map(exp => exp.id === updated.id ? updated : exp));
          resetForm();
        });
    }
  };

  const handleEdit = (expense) => {
    setEditId(expense.id); setTitle(expense.title); setAmount(expense.amount); setCategory(expense.category);
  };

  const handleDelete = (id) => {
    fetch(`http://127.0.0.1:8000/expenses/${id}`, { method: "DELETE" })
      .then(() => setExpenses(expenses.filter(e => e.id !== id)));
  };

  // CSV
  const handleExportCSV = () => {
    window.open("http://127.0.0.1:8000/export-csv");
  };

  const handleCSVUpload = () => {
    const file = fileInputRef.current.files[0];
    if (!file) return alert("Please choose a CSV file first!");
    const formData = new FormData();
    formData.append("file", file);
    fetch("http://127.0.0.1:8000/upload-csv", {
      method: "POST", body: formData,
    })
      .then(res => res.json())
      .then(data => { alert(`Imported ${data.imported} expenses`); window.location.reload(); })
      .catch(err => alert("Upload error"));
  };

  // AI: Smart Auto-Categorize
  const smartCategorize = () => {
    fetch('http://127.0.0.1:8000/smart-categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
      .then(res => res.json())
      .then(data => setCategory(data.category));
  };

  // AI: Anomalies, Summary, Forecast
  const detectAnomalies = () => {
    fetch("http://127.0.0.1:8000/detect-anomalies")
      .then(res => res.json())
      .then(data => setAnomalies(data));
  };

  const getForecast = (categoryStr) => {
    setForecastRequested(true);
    fetch(`http://127.0.0.1:8000/forecast-expense/${categoryStr}`)
      .then(res => res.json())
      .then(data => setForecast(data.forecast));
  };

  const getSummary = () => {
    fetch("http://127.0.0.1:8000/personalized-summary")
      .then(res => res.json())
      .then(data => setSummary(data));
  };

  // Pie Chart per category
  const totals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
    return acc;
  }, {});
  const categoryList = Object.keys(totals);
  const chartColors = (dark ? DARK_COLORS : CHART_COLORS).slice(0, categoryList.length);
  const chartData = {
    labels: categoryList,
    datasets: [
      { data: Object.values(totals), backgroundColor: chartColors }
    ]
  };

  return (
    <div className={dark ? "mui-dark" : "mui-light"} style={{
      fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
      minHeight: "100vh", margin: 0, background: dark ? "#23262f" : "#fdf4f8"
    }}>
      <div style={{
        maxWidth: 750, margin: "40px auto", padding: 0,
      }}>
        {/* Header & Mode Toggle */}
        <div style={{
          padding: "24px 0 10px 0", textAlign: "center", borderBottom: dark ? "1px solid #36384a" : "1px solid #eee"
        }}>
          <h1 style={{
            margin: 0, fontFamily:"inherit", fontWeight: 700, fontSize:'1.7rem',
            color: dark ? "#fff" : "#333",
            letterSpacing: "-1px"
          }}>Expense Tracker <span style={{fontWeight:500,opacity:0.6}}>& AI</span></h1>
          <button style={{
            background: dark ? "#fff" : "#23262f", color: dark ? "#23262f" : "#fff",
            border: "none", borderRadius: 20, fontWeight: 600, 
            marginTop: 10, cursor: "pointer", fontSize: 14, padding: "5px 16px"
          }} onClick={()=>setDark(v=>!v)}>
            {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        {/* --- AI Insights Card --- */}
        <div style={{
          boxShadow: dark ? "0 2px 12px #1112" : "0 2px 12px #eee2",
          background: dark ? "#2d3042" : "#fff",
          borderRadius: 14, margin: "24px 0", padding:"24px 24px 10px 24px"
        }}>
          <div style={{display: "flex", flexWrap:"wrap",justifyContent:"space-between",alignItems:'baseline',gap:24}}>
            <div style={{minWidth:160,marginBottom:10}}>
              <div style={{fontSize:"1.1rem", fontWeight:600, color: dark? "#70dbff":"#17a2b8", marginBottom:6}}>AI Insights</div>
              <button onClick={detectAnomalies} style={{
                background:dark?"#3dc1d3":"#17a2b8",color:"#fff",border:"none",borderRadius:8,padding:"5px 15px",fontWeight:600
              }}>Detect Anomalies</button>
              {anomalies.length > 0 &&
                <ul style={{marginBottom:4,marginTop:12,paddingLeft:20}}>
                  <b style={{fontSize:"0.91rem"}}>Anomalies:</b>
                  {anomalies.map(a => (<li key={a.id}>{a.title}: ₹{a.amount}</li>))}
                </ul>
              }
            </div>
            <div style={{minWidth:180,marginBottom:10}}>
              <div style={{fontSize:"1.1rem", fontWeight:600, color: dark? "#ffadb3":"#d64052", marginBottom:6}}>Summary</div>
              <button onClick={getSummary} style={{
                background:dark?"#f67280":"#d64052",color:"#fff",border:"none",borderRadius:8,padding:"5px 15px",fontWeight:600
              }}>Personalized Summary</button>
              {summary.total_spent !== undefined &&
                <div style={{marginTop:12}}>
                  <p style={{margin:"3px 0 0 0"}}>Total spent: <b>₹{summary.total_spent}</b></p>
                  <p style={{margin:"3px 0"}}>Top category: <b>{summary.top_category}</b> (₹{summary.top_category_amount})</p>
                </div>
              }
            </div>
            <div style={{minWidth:180,marginBottom:10}}>
              <div style={{fontSize:"1.1rem", fontWeight:600, color: dark? "#a8b9fa":"#4d50bf", marginBottom:6}}>Forecast</div>
              <input
                placeholder="Category to forecast"
                onBlur={e => getForecast(e.target.value)}
                style={{
                  fontSize: "1rem", padding: "3px 10px", borderRadius: 7,
                  background:dark?"#22243a":"#f0f4fa",color:dark?"#fff":"#23262f",
                  border:'1px solid #dedede',marginBottom:6
                }}
              />
              {forecastRequested && (
                forecast === 0
                  ? <div style={{fontSize:"0.96rem",color:"#aaa"}}>No forecast (not enough data).</div>
                  : <div style={{marginTop:2}}>Forecast next month:&nbsp; <b>₹{forecast}</b></div>
              )}
            </div>
          </div>
        </div>

        {/* --- CSV Card --- */}
        <div style={{
          background:dark?"#2d3042":"#fff",boxShadow: dark?"0 1px 6px #1112":"0 1px 6px #eee2",
          borderRadius:14, margin:"18px 0",padding:"20px 24px"
        }}>
          <div style={{fontSize:"1.2rem",fontWeight:600,letterSpacing:"-1px",color:dark?"#80e0ff":"#17a2b8",marginBottom:8}}>Data Import/Export</div>
          <input type="file" ref={fileInputRef} accept=".csv" />
          <button type="button" onClick={handleCSVUpload} style={{ margin:'0 10px', fontWeight:600, borderRadius:6, padding:'5px 20px' }}>
            Upload CSV
          </button>
          <button type="button" onClick={handleExportCSV} style={{fontWeight:600, borderRadius:6, padding:'5px 20px'}}>Download CSV</button>
        </div>

        {/* --- ADD/EDIT FORM Card --- */}
        <div style={{
          background:dark?"#2d3042":"#fff", boxShadow:dark?"0 1px 6px #1111":"0 1px 6px #eee1",
          borderRadius:14, margin:"18px 0",padding:"20px 24px"
        }}>
          <div style={{fontSize:"1.2rem",fontWeight:600,color:dark?"#fed6e3":"#c67171",marginBottom:14,letterSpacing:"-1px"}}>Add / Edit Expense</div>
          <form onSubmit={handleSubmit} style={{display:'flex', gap:12, flexWrap:'wrap',alignItems:'center'}}>
            <input value={title} type="text" onChange={e => setTitle(e.target.value)} placeholder="Title" required style={{
              borderRadius:7, fontSize:'1rem',padding:"5px 12px",background:dark?"#23262f":"#f4efeb",color:dark?"#fff":"#111"
            }} />
            <input value={amount} type="number" onChange={e => setAmount(e.target.value)} placeholder="Amount" required style={{
              borderRadius:7, fontSize:'1rem',padding:"5px 12px",background:dark?"#23262f":"#f4efeb",color:dark?"#fff":"#111"
            }} />
            <input value={category} type="text" onChange={e => setCategory(e.target.value)} placeholder="Category" required style={{
              borderRadius:7, fontSize:'1rem',padding:"5px 12px",background:dark?"#23262f":"#f4efeb",color:dark?"#fff":"#111"
            }} />
            <button type="button" onClick={smartCategorize} style={{
              background:dark?"#70dbff":"#17a2b8",color:"#fff",border:"none",borderRadius:9,fontWeight:600,fontSize:"1rem",padding:"4px 13px"
            }}>Auto-fill Category</button>
            <button type="submit" style={{
              background:dark?"#fed6e3":"#c67171", color:dark?"#23262f":"#fff",border:"none",borderRadius:9,fontWeight:600,fontSize:"1rem",padding:"4px 13px"
            }}>{editId ? "Update" : "Add"}</button>
            {editId && <button type="button" onClick={resetForm} style={{
              background:"transparent", color:dark?"#fed6e3":"#c67171",border:"none",fontWeight:600,fontSize:'1rem'
            }}>Cancel</button>}
          </form>
        </div>

        {/* --- Chart Card --- */}
        <div style={{
          background:dark?"#2d3042":"#fff", boxShadow:dark?"0 1px 7px #1112":"0 2px 10px #eee2",
          borderRadius:14, margin:"20px 0 14px 0",padding:"20px 24px"
        }}>
          <div style={{fontSize:"1.2rem",fontWeight:600,color:dark?"#b8fff9":"#17a2b8",marginBottom:10}}>Expenses by Category</div>
          <div style={{maxWidth:340,margin:"0 auto 12px auto"}}><Pie data={chartData} /></div>
          <ul style={{margin:"0 auto",maxWidth:370}}>
            {expenses.map(e => (
              <li key={e.id} style={{
                background:"#eeee",margin:"2px 0",borderRadius:5,padding: "3px 12px",fontWeight:500,
                color:dark?"#fff":"#221"
              }}>
                {e.title} — ₹{e.amount} [{e.category}]
                <button onClick={() => handleEdit(e)} style={{
                  marginLeft: 8, background:"#d6fae3",borderRadius:6,padding:"1px 8px",fontWeight:600,cursor:"pointer",border:"none"
                }}>Edit</button>
                <button onClick={() => handleDelete(e.id)} style={{
                  marginLeft: 8, background:"#ffe0e0",borderRadius:6,padding:"1px 8px",fontWeight:600,cursor:"pointer",border:"none"
                }}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
