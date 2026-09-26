import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { BASE_URL } from "../../utils/config";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // <-- added

import HeaderBar from "../reusable/HeaderBar";

import "./css/Hirarchy.css";

// ---- Config ----
const LEVEL_COLORS = [
  "#FFD700", "#87CEEB", "#FFB6C1", "#90EE90", "#FFA07A", "#DDA0DD", "#F08080",
  "#E6E6FA", "#FF6347", "#98FB98", "#FFDEAD", "#B0E0E6", "#FFFACD", "#F5F5DC",
  "#40E0D0", "#C0C0C0", "#BA55D3", "#CD5C5C", "#00FA9A", "#FFA500", "#4682B4",
  "#ADFF2F", "#FF69B4", "#7FFFD4", "#9370DB"
];

const POOL_DEPT = "BENCH";
const LEAD_TITLE = "Lead";

// ---- Helpers ----
const byId = (list) => {
  const map = new Map();
  for (const e of list) map.set(e.Employee_Id, e);
  return map;
};

function buildForest(list, dept) {
  const rows = dept ? list.filter((e) => e.Employee_Department === dept) : list;
  const index = new Map();
  for (const e of rows) index.set(e.Employee_Id, { ...e, children: [] });

  const roots = [];
  for (const e of rows) {
    const node = index.get(e.Employee_Id);
    const isSelfMentored = e.mentorId && e.mentorId === e.Employee_Id;
    if (e.mentorId && !isSelfMentored && index.has(e.mentorId)) {
      index.get(e.mentorId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return { roots, index };
}

function computeLevels(roots) {
  const levels = new Map();
  const dfs = (node, lvl) => {
    levels.set(node.Employee_Id, lvl);
    for (const c of node.children) dfs(c, lvl + 1);
  };
  for (const r of roots) dfs(r, 0);
  return levels;
}

function isDescendant(targetId, ancestorId, forestRoots) {
  if (!ancestorId || !targetId) return false;
  const stack = [...forestRoots];
  while (stack.length) {
    const cur = stack.pop();
    if (cur.Employee_Id === ancestorId) {
      const s2 = [...cur.children];
      while (s2.length) {
        const n = s2.pop();
        if (n.Employee_Id === targetId) return true;
        s2.push(...n.children);
      }
      return false;
    }
    stack.push(...cur.children);
  }
  return false;
}

// ===== Save-time rule helpers =====
function deriveEmployeeForSave(e, level) {
  const out = { ...e, level: level ?? null };

  if (e.Employee_Department === POOL_DEPT) {
    out.position = null;
    out.mentor = null;
    out.mentorId = null;
    out.level = null; // ignore level in pool
  } else if (level === 0) {
    out.position = LEAD_TITLE;
    out.mentor = LEAD_TITLE;
    out.mentorId = null;
  }
  return out;
}

function shallowEqualSelected(a, b, keys) {
  return keys.every((k) => {
    const va = a?.[k];
    const vb = b?.[k];
    if (va === vb) return true;
    if (va == null && vb == null) return true;
    return false;
  });
}

const RenderTreeNode = memo(function RenderTreeNode({
  node,
  level,
  hoveredSet,
  onDragStart,
  onDropOnNode,
  onHover,
  onClickNode, // <- receive click handler
}) {
  const isHighlighted = hoveredSet.has(node.Employee_Id);
  const normalColor = useMemo(
    () => LEVEL_COLORS[level % LEVEL_COLORS.length],
    [level]
  );

  return (
    <TreeNode
      label={
        <div
          className={`tree-node ${isHighlighted ? "highlighted" : ""}`}
          onMouseEnter={() => onHover(node)}
          style={{ backgroundColor: isHighlighted ? "#FFEDB2" : normalColor }}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart(node);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.stopPropagation();
            onDropOnNode(node);
          }}
          onClick={(e) => {
            e.stopPropagation();
            // call consumer click handler
            onClickNode && onClickNode(node);
          }}
        >
          <div className="tree-node__name">{node.Employee_Name}</div>
          <div className="tree-node__level">L{level}</div>
        </div>
      }
    >
      {node.children.map((child) => (
        <RenderTreeNode
          key={child.Employee_Id}
          node={child}
          level={level + 1}
          hoveredSet={hoveredSet}
          onDragStart={onDragStart}
          onDropOnNode={onDropOnNode}
          onHover={onHover}
          onClickNode={onClickNode} // <-- pass down
        />
      ))}
    </TreeNode>
  );
});

export default function Hirarchy() {
  // ---- State ----
  const [employees, setEmployees] = useState([]);
  const [originalEmployees, setOriginalEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDept, setSelectedDept] = useState("");
  const [draggedNode, setDraggedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);

  const hasBootstrappedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const token = useSelector((s) => s.auth?.token);
  const navigate = useNavigate(); // <-- navigation hook

  // ---- Fetch employees ----
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${BASE_URL}/admin/employees`, {
          signal: ac.signal,
          headers,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setEmployees(data);
        setOriginalEmployees(data);
        const firstDept = data.find(
          (e) => e.Employee_Department && e.Employee_Department !== POOL_DEPT
        )?.Employee_Department;
        setSelectedDept(firstDept || "UI5");
        hasBootstrappedRef.current = true;
      } catch (err) {
        if (err.name !== "AbortError")
          setError(err.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [token]);

  // ---- Derived data ----
  const departments = useMemo(() => {
    const set = new Set(
      employees
        .map((e) => e.Employee_Department)
        .filter((d) => d && d !== POOL_DEPT)
    );
    return Array.from(set).sort();
  }, [employees]);

  const benchEmployees = useMemo(
    () => employees.filter((e) => e.Employee_Department === POOL_DEPT),
    [employees]
  );

  const { roots, index } = useMemo(
    () => buildForest(employees, selectedDept),
    [employees, selectedDept]
  );

  const levels = useMemo(() => computeLevels(roots), [roots]);

  const hoveredSet = useMemo(() => {
    if (!hoveredNode) return new Set();
    const set = new Set([hoveredNode.Employee_Id]);
    const stack = [...(index.get(hoveredNode.Employee_Id)?.children || [])];
    while (stack.length) {
      const n = stack.pop();
      set.add(n.Employee_Id);
      stack.push(...n.children);
    }
    return set;
  }, [hoveredNode, index]);

  // ======= Save helpers (only called from DnD) =======
  const computeLevelsFor = useCallback((list, dept) => {
    const { roots: r } = buildForest(list, dept);
    return computeLevels(r);
  }, []);

  const handleSaveWith = useCallback(
    async (listSnapshot) => {
      if (!hasBootstrappedRef.current) return;

      const lvls = computeLevelsFor(listSnapshot, selectedDept);
      const snapById = byId(listSnapshot);

      const derivedNow = listSnapshot.map((e) => {
        const lvl = lvls.get(e.Employee_Id) ?? null;
        const d = deriveEmployeeForSave(e, lvl);

        let mentor_name = null;
        if (d.Employee_Department === POOL_DEPT) {
          mentor_name = null;
        } else if (d.level === 0) {
          mentor_name = LEAD_TITLE;
        } else if (d.mentorId) {
          mentor_name = snapById.get(d.mentorId)?.Employee_Name ?? null;
        }

        const mentor = mentor_name;

        return { ...d, mentor_name, mentor, position_level: d.level };
      });

      const derivedOrig = originalEmployees.map((e) => {
        const d = deriveEmployeeForSave({ ...e }, null);
        const oById = byId(originalEmployees);
        let mentor_name = null;
        if (d.Employee_Department === POOL_DEPT) {
          mentor_name = null;
        } else if (d.level === 0) {
          mentor_name = LEAD_TITLE;
        } else if (d.mentorId) {
          mentor_name = oById.get(d.mentorId)?.Employee_Name ?? null;
        }
        const mentor = mentor_name;
        return { ...d, mentor_name, mentor, position_level: d.level };
      });
      const derivedOrigById = byId(derivedOrig);

      const KEYS_TO_COMPARE = [
        "Employee_Department",
        "mentorId",
        "mentor",
        "position",
        "level",
        "mentor_name",
        "position_level",
      ];

      const changed = derivedNow.filter((curr) => {
        const prev = derivedOrigById.get(curr.Employee_Id) || {};
        return !shallowEqualSelected(curr, prev, KEYS_TO_COMPARE);
      });

      if (changed.length === 0) return;

      const payload = changed.map((e) => ({
        Employee_Id: e.Employee_Id,
        Employee_Name: e.Employee_Name,
        Employee_Department: e.Employee_Department,
        mentorId: e.mentorId ?? null,
        mentor: e.mentor ?? null,
        mentor_name: e.mentor_name ?? null,
        position: e.position ?? null,
        position_level: e.position_level === 0 ? "Lead" : e.position_level ? "L" + e.position_level : null,
        level: e.level ?? null,
      }));

      try {
        setSaving(true);
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${BASE_URL}/admin/saveHierarchy`, {
          method: "POST",
          headers,
          body: JSON.stringify({ employees: payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        setOriginalEmployees(derivedNow);
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    },
    [originalEmployees, selectedDept, computeLevelsFor, token]
  );

  const triggerAutoSave = useCallback(
    (nextEmployees) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        handleSaveWith(nextEmployees);
      }, 500);
    },
    [handleSaveWith]
  );

  // ---- Handlers (DnD) ----
  const onDragStart = useCallback((node) => setDraggedNode(node), []);

  const onDropOnNode = useCallback(
    (targetNode) => {
      if (!draggedNode) return;
      if (draggedNode.Employee_Id === targetNode.Employee_Id) return;

      if (isDescendant(targetNode.Employee_Id, draggedNode.Employee_Id, roots)) {
        alert("Cannot move a parent under its own child.");
        setDraggedNode(null);
        return;
      }

      setEmployees((prev) => {
        const next = prev.map((e) =>
          e.Employee_Id === draggedNode.Employee_Id
            ? {
                ...e,
                mentorId: targetNode.Employee_Id,
                mentor: targetNode.Employee_Name ?? null,
                Employee_Department: selectedDept,
              }
            : e
        );
        triggerAutoSave(next);
        return next;
      });
      setDraggedNode(null);
    },
    [draggedNode, roots, selectedDept, triggerAutoSave]
  );

  const onDropOnDepartment = useCallback(
    (dept) => {
      if (!draggedNode) return;
      setEmployees((prev) => {
        const next = prev.map((e) =>
          e.Employee_Id === draggedNode.Employee_Id
            ? { ...e, Employee_Department: dept, mentorId: null, mentor: null }
            : e
        );
        triggerAutoSave(next);
        return next;
      });
      setDraggedNode(null);
    },
    [draggedNode, triggerAutoSave]
  );

  const onClickNode = useCallback((node) => {
    // navigate to employee detail page with id in path
    if (!node || !node.Employee_Id) return;
    navigate(`/${encodeURIComponent(node.Employee_Id)}/Employee-hierarchy`);
  }, [navigate]);

  // Immediately null mentor/position when moved to Pool/Bench, then auto-save
  const onDropOnBench = useCallback(() => {
    if (!draggedNode) return;
    setEmployees((prev) => {
      const next = prev.map((e) =>
        e.Employee_Id === draggedNode.Employee_Id
          ? {
              ...e,
              Employee_Department: POOL_DEPT,
              mentorId: null,
              mentor: null,
              position: null,
            }
          : e
      );
      triggerAutoSave(next);
      return next;
    });
    setDraggedNode(null);
  }, [draggedNode, triggerAutoSave]);

  const onHoverNode = useCallback((node) => setHoveredNode(node), []);

  // ---- UI ----
  if (loading) {
    return (
      <>
        <HeaderBar />
        <div className="hierarchy-container"><div className="status">Loading employees…</div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <HeaderBar />
        <div className="hierarchy-container"><div className="status error">{error}</div></div>
      </>
    );
  }

  return (
    <>
      <HeaderBar />
      <div className="hierarchy-container">
        <div className="left-panel">
          <div className="hierarchy-controls">
            <div className="control">
              <label htmlFor="deptSelect">Department:</label>
              <select
                id="deptSelect"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropOnDepartment(selectedDept)}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="autosave-indicator">
              {saving ? "Saving…" : "All changes saved"}
            </div>

            <div className="zoom-group">
              <button className="btn" onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}>➖</button>
              <button className="btn" onClick={() => setZoom((z) => z + 0.1)}>➕</button>
              <button className="btn" onClick={() => setZoom(1)}>🔄</button>
            </div>
          </div>

          <div className="tree-wrapper-container">
            <div
              className="tree-wrapper"
              style={{ transform: `scale(${zoom})` }}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <Tree label={<strong>{selectedDept} Department</strong>} lineWidth="2px" lineColor="#bbb" lineBorderRadius="5px">
                {roots.map((root) => (
                  <RenderTreeNode
                    key={root.Employee_Id}
                    node={root}
                    level={levels.get(root.Employee_Id) || 0}
                    hoveredSet={hoveredSet}
                    onDragStart={onDragStart}
                    onDropOnNode={onDropOnNode}
                    onHover={onHoverNode}
                    onClickNode={onClickNode} // <-- pass click handler
                  />
                ))}
              </Tree>
            </div>
          </div>
        </div>

        <div
          className="bench-panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropOnBench}
          onMouseEnter={() => setHoveredNode(null)}
        >
          <h4>Employee Pool</h4>
          {benchEmployees.length === 0 && <div className="empty">No employees in pool</div>}
          {benchEmployees.map((e) => (
            <div
              key={e.Employee_Id}
              className="bench-employee"
              draggable
              onDragStart={() => setDraggedNode(e)}
            >
              {e.Employee_Name}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
