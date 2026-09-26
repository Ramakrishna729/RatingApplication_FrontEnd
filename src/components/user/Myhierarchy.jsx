// File: MasterDetail.jsx
// Place this in src/components/MasterDetail.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import "./css/Myhierarchy.css"; // make sure this path matches your project structure
import ReviewTable from "../mocks and KPI/ReviewTable";
import HeaderBar from "../reusable/HeaderBar";

// MasterDetail component (uses the same markup as before). It imports styles from MasterDetail.css.
const colorPalette = [
  "#ef4444",
  "#fb923c",
  "#f59e0b",
  "#facc15",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#0891b2",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
];
function pickColor(key) {
  if (!key) return colorPalette[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h << 5) - h + key.charCodeAt(i);
  return colorPalette[Math.abs(h) % colorPalette.length];
}

export default function Myhierarchy() {
  const userId = useSelector((state) => state.auth.employeeId);
  const [items, setItems] = useState([]); 
  const [query, setQuery] = useState("");
  const { id } = useParams();

  const EmployeeId = id || userId; 


  useEffect(() => {
    debugger
    try {
      const response = fetch(`http://localhost:3000/api/employee/${EmployeeId}/hierarchy`
      )
        .then((res) => res.json())
        .then((data) => {
          setItems(data);
          }); // Replace with your API endpoint
    } catch (error) {
      console.error("Error fetching employee data:", error);
    }
  }, []);

  const normalized = useMemo(() => {
    return (items || []).map((it) => ({
      id: it.Employee_Id ?? it.id ?? "",
      name: (it.Employee_Name ?? it.name ?? "").trim(),
      mentorId: it.mentorId ?? it.mentor ?? null,
      level_path: typeof it.level_path !== "undefined" ? it.level_path : null,
      title: it.title ?? (it.mentorId ? `Mentor: ${it.mentorId}` : "Employee"),
      email: it.email ?? "-",
      phone: it.phone ?? "-",
      bio: it.bio ?? "",
      avatarColor: pickColor(
        it.Employee_Id ?? it.id ?? it.Employee_Name ?? Math.random().toString()
      ),
    }));
  }, [items]);

  const [selectedId, setSelectedId] = useState(normalized[0]?.id ?? null);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = normalized.filter((it) => {
      if (!q) return true;
      return (
        (it.name || "").toLowerCase().includes(q) ||
        (it.id || "").toLowerCase().includes(q) ||
        String(it.mentorId || "")
          .toLowerCase()
          .includes(q)
      );
    });

    return base.sort((a, b) => {
      if (a.name < b.name) return sortAsc ? -1 : 1;
      if (a.name > b.name) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [normalized, query, sortAsc]);

  const selected =
    filtered.find((it) => it.id === selectedId) || filtered[0] || null;


  return (
    
    <>
      <HeaderBar />
      <div className="md-container">
        <div className="md-inner">
          <div className="md-grid">
            <aside className="md-master">
              <div className="card">
                <div className="controls">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, id or mentor..."
                    className="input"
                  />
                  <button
                    onClick={() => setSortAsc((s) => !s)}
                    title="Toggle sort"
                    className="btn"
                  >
                    {sortAsc ? "A → Z" : "Z → A"}
                  </button>
                </div>

                <div className="list">
                  {filtered.length === 0 ? (
                    <div className="empty">No results</div>
                  ) : (
                    filtered.map((it) => (
                      <motion.button
                        key={it.id}
                        onClick={() => setSelectedId(it.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.99 }}
                        className={`list-item ${
                          it.id === selectedId ? "selected" : ""
                        }`}
                      >
                        <div
                          className="avatar"
                          style={{ backgroundColor: it.avatarColor }}
                        >
                          {it.name ? it.name.split(" ")[0][0] : "E"}
                        </div>
                        <div className="item-body">
                          <div className="item-top">
                            <div className="item-name">{it.name || "—"}</div>
                            <div className="item-id">{it.id}</div>
                          </div>
                          <div className="item-title">{it.title}</div>
                          {/* <div className="item-mentor">
                            Mentor: {it.mentorId ?? "—"}
                          </div> */}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>

                <div className="meta">Showing {filtered.length} result(s)</div>
              </div>
            </aside>

            <main className="md-detail">
              <div className="card detail-card">
                {!selected ? (
                  <div className="empty">Select an employee from the list</div>
                ) : (
                  <>
                    <div className="detail-grid">
                      <section className="detail-left">
                        {/* <div
                          className="detail-avatar"
                          style={{ backgroundColor: selected.avatarColor }}
                        >
                          {selected.name ? selected.name.split(" ")[0][0] : "E"}
                        </div> */}
                        <div className="detail-name">{selected.name}</div>
                        {/* <div className="detail-level">
                          Level: {selected.level_path ?? "—"}
                        </div> */}

                        {/* <button
                          onClick={() => alert(`Start chat with ${selected.name}`)}
                          className="btn full"
                        >
                          Message
                        </button> */}
                      </section>

                      {/* <section className="detail-right">
                        <div className="details-title">Details</div>

                        <div className="two-col">
                          <div className="info-card">
                            <div className="info-label">Employee ID</div>
                            <div className="info-value">{selected.id}</div>
                          </div>
                          <div className="info-card">
                            <div className="info-label">Mentor ID</div>
                            <div className="info-value">
                              {selected.mentorId ?? "—"}
                            </div>
                          </div>
                        </div>

                        <div className="bio">
                          <div className="bio-title">Biography</div>
                          <div className="bio-body">
                            {selected.bio || "No biography available."}
                          </div>
                        </div>

                        <div className="stats">
                          <div className="stat">
                            <div className="stat-label">Level</div>
                            <div className="stat-value">
                              {selected.level_path ?? "-"}
                            </div>
                          </div>
                          <div className="stat">
                            <div className="stat-label">Direct Reports</div>
                            <div className="stat-value">
                              {
                                (items || []).filter(
                                  (x) => x.mentorId === selected.id
                                ).length
                              }
                            </div>
                          </div>
                          <div className="stat">
                            <div className="stat-label">Open Issues</div>
                            <div className="stat-value">
                              {Math.floor(Math.random() * 10)}
                            </div>
                          </div>
                        </div>

                        <div className="detail-actions">
                          <button
                            onClick={() => alert(`Edit ${selected.name}`)}
                            className="btn"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => alert(`Archive ${selected.name}`)}
                            className="btn danger"
                          >
                            Archive
                          </button>
                        </div>
                      </section> */}
                    </div>
                    
                  </>
                )}
              </div>
              <div className="selected-compact">
                <strong>Selected:</strong> {selected ? selected.name : "—"}
              </div>
              <div className="detail-card">
                <ReviewTable employeeId={selectedId} />
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

