import { useState, useRef, useCallback } from "react";

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const QUESTION_TYPES = ["MCQ", "Short Answer", "Long Answer", "True/False"];

function Spinner() {
  return (
    <div style={{
      width: 44, height: 44,
      border: "3px solid rgba(255,200,80,0.15)",
      borderTop: "3px solid #FFC850",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto"
    }} />
  );
}

function QuestionCard({ q, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: open ? "rgba(255,200,80,0.05)" : "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,200,80,0.15)",
      borderLeft: "3px solid #FFC850",
      borderRadius: 12, padding: "16px 20px",
      marginBottom: 10, cursor: "pointer", transition: "all 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{
            background: "#FFC850", color: "#1a1200", borderRadius: 6,
            padding: "2px 9px", fontSize: 11, fontWeight: 800,
            flexShrink: 0, marginTop: 2, fontFamily: "monospace"
          }}>Q{index + 1}</span>
          <span style={{ color: "#f0e8d0", fontSize: 14, lineHeight: 1.65 }}>{q.question}</span>
        </div>
        <span style={{ color: "#FFC850", fontSize: 16, flexShrink: 0, marginTop: 2 }}>{open ? "▲" : "▼"}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, marginLeft: 42 }}>
        {q.type && <span style={{ fontSize: 10, color: "#888", background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 4 }}>{q.type}</span>}
        {q.difficulty && <span style={{ fontSize: 10, color: "#FFC850", background: "rgba(255,200,80,0.1)", padding: "2px 7px", borderRadius: 4 }}>{q.difficulty}</span>}
      </div>
      {open && q.options && (
        <div style={{ marginTop: 12, marginLeft: 42, display: "flex", flexDirection: "column", gap: 6 }}>
          {q.options.map((opt, i) => (
            <div key={i} style={{
              padding: "8px 14px", borderRadius: 8,
              background: opt.correct ? "rgba(255,200,80,0.12)" : "rgba(255,255,255,0.04)",
              border: opt.correct ? "1px solid rgba(255,200,80,0.35)" : "1px solid rgba(255,255,255,0.07)",
              color: opt.correct ? "#FFC850" : "#aaa", fontSize: 13
            }}>{opt.correct && "✓ "}{opt.text}</div>
          ))}
        </div>
      )}
      {open && q.answer && (
        <div style={{
          marginTop: 12, marginLeft: 42, padding: "12px 14px",
          background: "rgba(255,200,80,0.06)", borderRadius: 8,
          borderLeft: "2px solid rgba(255,200,80,0.35)",
          color: "#d4c89a", fontSize: 13, lineHeight: 1.7
        }}>
          <span style={{ fontSize: 10, color: "#FFC850", fontWeight: 700, display: "block", marginBottom: 4, letterSpacing: 1 }}>✦ ANSWER</span>
          {q.answer}
        </div>
      )}
      {open && q.explanation && (
        <div style={{
          marginTop: 8, marginLeft: 42, padding: "10px 14px",
          background: "rgba(255,255,255,0.02)", borderRadius: 8,
          color: "#666", fontSize: 12, lineHeight: 1.6, fontStyle: "italic"
        }}>💡 {q.explanation}</div>
      )}
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("Medium");
  const [qType, setQType] = useState("MCQ");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f) => {
    if (!f) return;
    const isPDF = f.type === "application/pdf";
    const isImage = f.type.startsWith("image/");
    if (!isPDF && !isImage) { setError("Please upload a PDF or image file."); return; }
    setError(""); setFile(f); setFileType(isPDF ? "pdf" : "image");
    setQuestions([]); setStatus("");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else { setPreview(null); }
  }, []);

  const toBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const generate = async () => {
    if (!file) { setError("Please upload a file first."); return; }
    setLoading(true); setError(""); setQuestions([]); setStatus("Reading content...");
    try {
      const base64 = await toBase64(file);
      const mimeType = file.type;
      const BATCH = 20;
      const batches = [];
      let rem = numQuestions;
      while (rem > 0) { batches.push(Math.min(BATCH, rem)); rem -= BATCH; }
      let all = [];
      for (let bi = 0; bi < batches.length; bi++) {
        const bc = batches[bi];
        setStatus(`Generating... (${all.length + bc}/${numQuestions})`);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            mimeType,
            numQuestions: bc,
            difficulty,
            qType,
            topic,
            batchIndex: bi,
            totalBatches: batches.length,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e?.error || `Server error ${res.status}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const parsed = JSON.parse(data.result);
        all = [...all, ...parsed];
        setQuestions([...all]);
      }
      setStatus("");
    } catch (e) {
      setError("Error: " + (e.message || "Something went wrong. Please try again."));
    } finally {
      setLoading(false); setStatus("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0c00", color: "#f0e8d0", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:0.4}50%{opacity:1} }
        * { box-sizing: border-box; }
        input[type=range] { accent-color: #FFC850; cursor: pointer; }
        select option { background: #1a1400; }
        button { border: none; outline: none; }
        .upload-label {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px;
          border: 2px dashed rgba(255,200,80,0.25); border-radius: 16px;
          padding: 40px 20px; cursor: pointer; transition: all 0.25s;
          background: transparent; text-align: center;
        }
        .upload-label:hover, .upload-label.dragover {
          border-color: #FFC850; background: rgba(255,200,80,0.05);
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg,#1c1400,#0f0c00)",
        borderBottom: "1px solid rgba(255,200,80,0.1)",
        padding: "36px 24px 28px", textAlign: "center", position: "relative"
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 70% 50% at 50% 0%,rgba(255,200,80,0.07),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ fontSize: 10, letterSpacing: 5, color: "#FFC850", marginBottom: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>✦ NCERT AI STUDY TOOL ✦</div>
        <h1 style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: "clamp(24px,5vw,46px)", fontWeight: 900, lineHeight: 1.1, margin: 0,
          background: "linear-gradient(135deg,#FFC850,#FFE4A0 50%,#FFC850)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>Question Generator</h1>
        <p style={{ color: "#7a6a40", fontSize: 13, marginTop: 10, fontFamily: "'DM Sans',sans-serif" }}>
          Upload a PDF or photo of any NCERT page — powered by Gemini AI
        </p>
      </div>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "28px 16px 0" }}>

        {/* Upload */}
        {!file ? (
          <div style={{ animation: "fadeUp 0.4s ease", marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#FFC850", letterSpacing: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, marginBottom: 10 }}>UPLOAD FILE</div>
            <label
              className={`upload-label${dragOver ? " dragover" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              <div style={{ fontSize: 40 }}>📂</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
                <div style={{ fontSize: 15, color: "#c8b070", fontWeight: 600 }}>Click to choose a file</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>PDF · JPG · PNG · WEBP · or drag & drop</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {["📄 PDF Chapter", "📸 Photo of page", "🖼️ Screenshot"].map(t => (
                  <span key={t} style={{ fontSize: 10, color: "#555", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 5, fontFamily: "'DM Sans',sans-serif" }}>{t}</span>
                ))}
              </div>
            </label>
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,200,80,0.2)", fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#888" }}>
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                📷 Open Camera (mobile)
              </label>
            </div>
          </div>
        ) : (
          <div style={{
            animation: "fadeUp 0.3s ease", border: "1.5px solid rgba(255,200,80,0.3)",
            borderRadius: 12, padding: "14px 16px", background: "rgba(255,200,80,0.04)",
            display: "flex", alignItems: "center", gap: 12, marginBottom: 20
          }}>
            {preview
              ? <img src={preview} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,200,80,0.2)", flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, background: "rgba(255,200,80,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📄</div>
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#FFC850", fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>{fileType === "pdf" ? "PDF" : "Image"} ready ✓</div>
              <div style={{ fontSize: 11, color: "#555", fontFamily: "'DM Sans',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{file.name} · {(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <button onClick={() => { setFile(null); setPreview(null); setFileType(null); setQuestions([]); setError(""); }} style={{ background: "rgba(255,70,70,0.1)", border: "1px solid rgba(255,70,70,0.2)", color: "#ff7070", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✕ Remove</button>
          </div>
        )}

        {/* Topic */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 10, color: "#FFC850", letterSpacing: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
            TOPIC HINT <span style={{ color: "#444", fontWeight: 400, letterSpacing: 0, fontSize: 11 }}>(optional)</span>
          </label>
          <input value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis, French Revolution, Quadratic Equations..."
            style={{ width: "100%", marginTop: 8, background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,200,80,0.15)", borderRadius: 10, padding: "11px 14px", color: "#f0e8d0", fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none" }}
            onFocus={e => e.target.style.borderColor = "#FFC850"}
            onBlur={e => e.target.style.borderColor = "rgba(255,200,80,0.15)"}
          />
        </div>

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <label style={{ fontSize: 10, color: "#FFC850", letterSpacing: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>DIFFICULTY</label>
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {DIFFICULTY_LEVELS.map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{
                  flex: 1, padding: "8px 2px", borderRadius: 8, cursor: "pointer",
                  border: difficulty === d ? "1.5px solid #FFC850" : "1.5px solid rgba(255,200,80,0.15)",
                  background: difficulty === d ? "rgba(255,200,80,0.14)" : "transparent",
                  color: difficulty === d ? "#FFC850" : "#555",
                  fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s"
                }}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#FFC850", letterSpacing: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>QUESTION TYPE</label>
            <select value={qType} onChange={e => setQType(e.target.value)} style={{ width: "100%", marginTop: 8, background: "#130f00", border: "1.5px solid rgba(255,200,80,0.15)", borderRadius: 8, padding: "9px 12px", color: "#f0e8d0", fontSize: 12, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", outline: "none" }}>
              {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 10, color: "#FFC850", letterSpacing: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>NUMBER OF QUESTIONS</label>
            <span style={{ background: "rgba(255,200,80,0.15)", color: "#FFC850", borderRadius: 20, padding: "2px 12px", fontSize: 15, fontWeight: 800, fontFamily: "'DM Sans',sans-serif" }}>{numQuestions}</span>
          </div>
          <input type="range" min={3} max={50} value={numQuestions} onChange={e => setNumQuestions(+e.target.value)} style={{ width: "100%", height: 4 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#444", marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>
            <span>3</span>
            {numQuestions > 20 && <span style={{ color: "rgba(255,200,80,0.45)" }}>⚡ {Math.ceil(numQuestions / 20)} batches</span>}
            <span>50</span>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: "11px 14px", background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: 9, color: "#ff7070", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>⚠ {error}</div>
        )}

        <button onClick={generate} disabled={loading || !file} style={{
          width: "100%", padding: "15px", cursor: loading || !file ? "not-allowed" : "pointer",
          background: loading || !file ? "rgba(255,200,80,0.1)" : "linear-gradient(135deg,#FFC850,#FFDB80)",
          borderRadius: 12, color: loading || !file ? "#5a4a20" : "#1a1000",
          fontSize: 13, fontWeight: 800, fontFamily: "'DM Sans',sans-serif",
          letterSpacing: 2, transition: "all 0.3s",
          boxShadow: loading || !file ? "none" : "0 5px 24px rgba(255,200,80,0.2)"
        }}>
          {loading ? `⏳  ${status || "GENERATING..."}` : `✦  GENERATE ${numQuestions} QUESTIONS`}
        </button>

        {loading && (
          <div style={{ textAlign: "center", padding: "24px 0 0" }}>
            <Spinner />
            <p style={{ color: "#6a5a30", fontSize: 12, marginTop: 12, fontFamily: "'DM Sans',sans-serif", animation: "pulse 1.5s ease infinite" }}>{status}</p>
          </div>
        )}

        {questions.length > 0 && (
          <div style={{ marginTop: 32, animation: "fadeUp 0.5s ease" }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#FFC850", letterSpacing: 3, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>✦ {questions.length} QUESTIONS GENERATED</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 3, fontFamily: "'DM Sans',sans-serif" }}>{qType} · {difficulty} · Tap to reveal answers</div>
            </div>
            {questions.map((q, i) => <QuestionCard key={i} q={q} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}
