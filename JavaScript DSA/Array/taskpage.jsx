// src/pages/TasksPage.jsx - Day 2 Enhancement with animations and modern styling
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner, Skeleton, EmptyState } from "../components/ui/AnimatedComponents";
import { showToast } from "../components/ui/Toast";

export default function TasksPage({ BASE, token, profile, users, loadingUsers }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });
  const [taskFieldErrors, setTaskFieldErrors] = useState({});
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskSaving, setEditingTaskSaving] = useState(false);

  const isAdminOrManager = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "admin" || r === "manager" || r === "hr";
  };

  const isEmployeeOrIntern = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "employee" || r === "intern";
  };

  const canEditTask = (task) => {
    if (isAdminOrManager(profile?.role)) return true;

    if (isEmployeeOrIntern(profile?.role)) {
      if (!task) return false;

      const assignee = task.assigned_to ?? task.assigned_to_id ?? task.assigned_to_user ?? null;

      if (assignee && typeof assignee === "object") {
        const aid = assignee.id ?? assignee.pk ?? assignee.user_id ?? assignee.uid;
        if (aid != null && profile?.id != null) return String(aid) === String(profile.id);
      } else if (assignee != null) {
        if (profile?.id != null && String(assignee) === String(profile.id)) return true;
        if (profile?.user_id != null && String(assignee) === String(profile.user_id)) return true;
      }

      if (task.assigned_to_name && profile) {
        const nameLower = String(task.assigned_to_name).toLowerCase();
        const myName = (profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}` || profile.email || "").toLowerCase();
        if (myName && nameLower && nameLower.includes(myName)) return true;
      }

      return false;
    }

    return false;
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Failed to load tasks", res.status);
        setTasks([]);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setTasks(arr);
    } catch (err) {
      console.error("loadTasks error", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line
  }, []);

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setTaskForm((p) => ({ ...p, [name]: value }));
    setTaskFieldErrors((p) => ({ ...p, [name]: undefined }));
  };

  const createTask = async (e) => {
    e.preventDefault();
    setCreatingTask(true);
    setTaskFieldErrors({});
    if (!taskForm.title || !taskForm.assigned_to || !taskForm.due_date) {
      showToast.warning("Please fill title, assigned_to and due_date.");
      setCreatingTask(false);
      return;
    }

    let assignedToPayload = taskForm.assigned_to;
    if (/^\d+$/.test(String(assignedToPayload).trim())) {
      assignedToPayload = Number(String(assignedToPayload).trim());
    }

    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      status: taskForm.status,
      priority: taskForm.priority,
      assigned_to: assignedToPayload,
      due_date: taskForm.due_date,
    };

    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("create task error:", errData || res.statusText);
        if (errData && typeof errData === "object") {
          const fieldErrs = {};
          const messages = [];
          for (const [key, val] of Object.entries(errData)) {
            const message = Array.isArray(val) ? val.join(", ") : String(val);
            messages.push(`${key}: ${message}`);
            fieldErrs[key] = message;
          }
          setTaskFieldErrors(fieldErrs);
          showToast.error("Failed to create task: " + messages.join(", "));
        } else {
          showToast.error("Failed to create task (server error).");
        }
        setCreatingTask(false);
        return;
      }

      const created = await res.json();
      setTasks((p) => [created, ...p]);
      setShowCreateTask(false);
      setTaskForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" });
      showToast.success("Task created successfully!");
    } catch (err) {
      console.error("createTask exception:", err);
      showToast.error(err.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const startEditTask = (task) => {
    if (!canEditTask(task)) {
      showToast.warning("You are not authorized to edit this task.");
      return;
    }

    setEditingTaskId(task.id);
    setEditingTask({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assigned_to: (typeof task.assigned_to === "object" ? (task.assigned_to.id ?? task.assigned_to.pk ?? task.assigned_to.user_id ?? "") : (task.assigned_to ?? "")),
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditTaskInput = (e) => {
    const { name, value } = e.target;
    setEditingTask((p) => ({ ...p, [name]: value }));
  };

  const saveEditTask = async (e) => {
    e.preventDefault();
    if (!editingTaskId) return;
    setEditingTaskSaving(true);

    const payload = {
      title: editingTask.title,
      description: editingTask.description,
      status: editingTask.status,
      priority: editingTask.priority,
      assigned_to: editingTask.assigned_to,
      due_date: editingTask.due_date,
    };

    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/${editingTaskId}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("edit task error:", err || res.statusText);
        showToast.error("Failed to save task.");
        setEditingTaskSaving(false);
        return;
      }

      const updated = await res.json();
      setTasks((p) => p.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTaskId(null);
      setEditingTask(null);
      showToast.success("Task updated successfully!");
    } catch (err) {
      console.error(err);
      showToast.error("Failed to save task.");
    } finally {
      setEditingTaskSaving(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/${taskId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete task");
      setTasks((p) => p.filter((t) => t.id !== taskId));
      showToast.success("Task deleted successfully!");
    } catch (err) {
      console.error(err);
      showToast.error("Failed to delete task.");
    }
  };

  const normalizeStatus = (status) => {
    if (status == null) return "";
    return String(status).trim().toLowerCase().replace(/\s+/g, " ").replace(/_/g, " ").trim();
  };

  const matchesCategory = (task, key) => {
    const now = new Date();
    const s = normalizeStatus(task?.status || "");
    const isCompleted = s === "completed" || s === "done";
    const isPending = ["todo", "pending", "to do", "to_do"].includes(s);
    const isActive = ["in progress", "in_progress", "inprogress", "active"].includes(s);
    let isOverdue = false;
    if (task?.is_overdue || task?.overdue) isOverdue = true;
    else if (task?.due_date) {
      const parsed = Date.parse(task.due_date);
      if (!isNaN(parsed) && parsed < now.getTime() && !isCompleted) isOverdue = true;
    }

    if (key === "active") {
      return isActive || (!isCompleted && !isPending && !isOverdue && s !== "");
    }
    if (key === "completed") return isCompleted;
    if (key === "pending") return isPending;
    if (key === "overdue") return isOverdue;
    return false;
  };

  const getTaskCounts = (tasksArr) => {
    const keys = ["active", "completed", "pending", "overdue"];
    const counts = { active: 0, completed: 0, pending: 0, overdue: 0 };
    if (!Array.isArray(tasksArr)) return counts;
    for (const k of keys) {
      counts[k] = tasksArr.filter((t) => matchesCategory(t, k)).length;
    }
    return counts;
  };

  const taskCounts = getTaskCounts(tasks);
  const taskCategories = [
    { label: "Active Tasks", key: "active", count: taskCounts.active, color: "primary", icon: "bi-lightning-charge" },
    { label: "Completed", key: "completed", count: taskCounts.completed, color: "success", icon: "bi-check-circle" },
    { label: "Pending", key: "pending", count: taskCounts.pending, color: "warning", icon: "bi-clock" },
    { label: "Overdue", key: "overdue", count: taskCounts.overdue, color: "danger", icon: "bi-exclamation-triangle" },
  ];

  const filteredTasks = tasks.filter((t) => {
    if (!taskFilter) return true;
    const s = (t.status || "").toLowerCase();
    if (taskFilter === "active") return ["in_progress", "in progress", "active"].includes(s);
    if (taskFilter === "completed") return s === "completed" || s === "done";
    if (taskFilter === "pending") return ["todo", "pending", "to_do"].includes(s);
    if (taskFilter === "overdue") {
      if (t.is_overdue || t.overdue) return true;
      if (t.due_date) return new Date(t.due_date) < new Date() && s !== "completed";
      return false;
    }
    return true;
  });

  const getPriorityStyle = (priority) => {
    const p = String(priority).toLowerCase();
    if (p === "urgent") return { background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white" };
    if (p === "high") return { background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", color: "white" };
    if (p === "medium") return { background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "white" };
    return { background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)", color: "white" };
  };

  const getStatusStyle = (status) => {
    const s = normalizeStatus(status);
    if (s === "completed" || s === "done") return { background: "#10b981", color: "white" };
    if (s === "in progress") return { background: "#3b82f6", color: "white" };
    if (s === "review") return { background: "#8b5cf6", color: "white" };
    if (s === "todo" || s === "pending") return { background: "#f59e0b", color: "white" };
    if (s === "cancelled") return { background: "#6b7280", color: "white" };
    return { background: "#94a3b8", color: "white" };
  };

  // Skeleton loading for task cards
  const TaskSkeleton = () => (
    <div style={styles.taskCard}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <Skeleton width={200} height={20} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </div>
      <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Skeleton width={70} height={28} borderRadius={14} />
        <Skeleton width={70} height={28} borderRadius={14} />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={styles.title}
          >
            <i className="bi bi-kanban me-3" style={{ color: "var(--primary)" }}></i>
            {taskFilter ? `${taskFilter.charAt(0).toUpperCase() + taskFilter.slice(1)} Tasks` : "Task Management"}
          </motion.h2>
          <p style={styles.subtitle}>
            {tasks.length} total tasks • {taskCounts.active} active
          </p>
        </div>
        {isAdminOrManager(profile?.role) && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={styles.createButton}
            onClick={() => { setShowCreateTask((s) => !s); setEditingTaskId(null); setEditingTask(null); }}
          >
            <i className={`bi ${showCreateTask ? "bi-x-lg" : "bi-plus-lg"} me-2`}></i>
            {showCreateTask ? "Close" : "Create Task"}
          </motion.button>
        )}
      </div>

      {/* Category Cards */}
      <div style={styles.categoryGrid}>
        {taskCategories.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTaskFilter(taskFilter === item.key ? null : item.key)}
            style={{
              ...styles.categoryCard,
              ...(taskFilter === item.key ? styles.categoryCardActive : {}),
              borderColor: taskFilter === item.key ? `var(--${item.color})` : "transparent",
            }}
          >
            <div style={{ ...styles.categoryIcon, background: `var(--${item.color})` }}>
              <i className={`bi ${item.icon}`}></i>
            </div>
            <div style={styles.categoryContent}>
              <span style={styles.categoryLabel}>{item.label}</span>
              <span style={{ ...styles.categoryCount, color: `var(--${item.color})` }}>{item.count}</span>
            </div>
            {taskFilter === item.key && (
              <motion.div
                layoutId="activeIndicator"
                style={styles.activeIndicator}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Create Task Form */}
      <AnimatePresence>
        {showCreateTask && isAdminOrManager(profile?.role) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.formCard}
          >
            <h5 style={styles.formTitle}>
              <i className="bi bi-plus-circle me-2"></i>
              Create New Task
            </h5>
            <form onSubmit={createTask}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label style={styles.label}>Title *</label>
                  <input
                    name="title"
                    value={taskForm.title}
                    onChange={handleTaskInput}
                    style={{
                      ...styles.input,
                      ...(taskFieldErrors.title ? styles.inputError : {}),
                    }}
                    placeholder="Enter task title"
                    required
                  />
                  {taskFieldErrors.title && <span style={styles.errorText}>{taskFieldErrors.title}</span>}
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Status</label>
                  <select name="status" value={taskForm.status} onChange={handleTaskInput} style={styles.select}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Priority</label>
                  <select name="priority" value={taskForm.priority} onChange={handleTaskInput} style={styles.select}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Assign To *</label>
                  {loadingUsers ? (
                    <div style={styles.input}>
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : users ? (
                    <select
                      name="assigned_to"
                      value={taskForm.assigned_to}
                      onChange={handleTaskInput}
                      style={{
                        ...styles.select,
                        ...(taskFieldErrors.assigned_to ? styles.inputError : {}),
                      }}
                      required
                    >
                      <option value="">Select assignee</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.display}</option>)}
                    </select>
                  ) : (
                    <input
                      name="assigned_to"
                      value={taskForm.assigned_to}
                      onChange={handleTaskInput}
                      style={styles.input}
                      placeholder="Assigned to (id or email)"
                      required
                    />
                  )}
                </div>

                <div className="col-12">
                  <label style={styles.label}>Description</label>
                  <textarea
                    name="description"
                    value={taskForm.description}
                    onChange={handleTaskInput}
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="Task description (optional)"
                    rows={2}
                  />
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Due Date *</label>
                  <input
                    name="due_date"
                    value={taskForm.due_date}
                    onChange={handleTaskInput}
                    style={{
                      ...styles.input,
                      ...(taskFieldErrors.due_date ? styles.inputError : {}),
                    }}
                    type="datetime-local"
                    required
                  />
                </div>

                <div className="col-md-6 d-flex align-items-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={styles.submitButton}
                    disabled={creatingTask}
                  >
                    {creatingTask ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Create Task
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => { setShowCreateTask(false); setTaskForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" }); setTaskFieldErrors({}); }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Task Form */}
      <AnimatePresence>
        {editingTaskId && editingTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={styles.formCard}
          >
            <h5 style={styles.formTitle}>
              <i className="bi bi-pencil-square me-2"></i>
              Edit Task
            </h5>
            <form onSubmit={saveEditTask}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label style={styles.label}>Title</label>
                  <input name="title" value={editingTask.title} onChange={handleEditTaskInput} style={styles.input} />
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Status</label>
                  <select name="status" value={editingTask.status} onChange={handleEditTaskInput} style={styles.select}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Priority</label>
                  <select name="priority" value={editingTask.priority} onChange={handleEditTaskInput} style={styles.select}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Assigned To</label>
                  {users ? (
                    <select name="assigned_to" value={editingTask.assigned_to} onChange={handleEditTaskInput} style={styles.select}>
                      <option value="">Select assignee</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.display}</option>)}
                    </select>
                  ) : (
                    <input name="assigned_to" value={editingTask.assigned_to} onChange={handleEditTaskInput} style={styles.input} />
                  )}
                </div>

                <div className="col-12">
                  <label style={styles.label}>Description</label>
                  <textarea name="description" value={editingTask.description} onChange={handleEditTaskInput} style={{ ...styles.input, minHeight: 80 }} rows={2} />
                </div>

                <div className="col-md-6">
                  <label style={styles.label}>Due Date</label>
                  <input name="due_date" value={editingTask.due_date} onChange={handleEditTaskInput} style={styles.input} type="datetime-local" />
                </div>

                <div className="col-md-6 d-flex align-items-end gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    style={styles.submitButton}
                    disabled={editingTaskSaving}
                  >
                    {editingTaskSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Save Changes
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => { setEditingTaskId(null); setEditingTask(null); }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div style={styles.taskListContainer}>
        {loading ? (
          <div style={styles.taskList}>
            {[1, 2, 3, 4].map((i) => (
              <TaskSkeleton key={i} />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon={<i className="bi bi-clipboard-x" style={{ fontSize: 48 }}></i>}
            title="No tasks found"
            description={taskFilter ? `No ${taskFilter} tasks available.` : "Create your first task to get started."}
            action={isAdminOrManager(profile?.role) && !taskFilter && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={styles.createButton}
                onClick={() => setShowCreateTask(true)}
              >
                <i className="bi bi-plus-lg me-2"></i>
                Create Task
              </motion.button>
            )}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={styles.taskList}>
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  style={styles.taskCard}
                >
                  <div style={styles.taskHeader}>
                    <h5 style={styles.taskTitle}>{task.title}</h5>
                    <div style={styles.badgeContainer}>
                      <span style={{ ...styles.badge, ...getStatusStyle(task.status) }}>
                        {task.status?.replace(/_/g, " ")}
                      </span>
                      <span style={{ ...styles.badge, ...getPriorityStyle(task.priority) }}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p style={styles.taskDescription}>{task.description}</p>
                  )}
                  
                  <div style={styles.taskMeta}>
                    <div style={styles.metaItem}>
                      <i className="bi bi-calendar3 me-2"></i>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                    </div>
                    {task.assigned_to_name && (
                      <div style={styles.metaItem}>
                        <i className="bi bi-person me-2"></i>
                        {task.assigned_to_name}
                      </div>
                    )}
                  </div>
                  
                  {canEditTask(task) && (
                    <div style={styles.taskActions}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={styles.actionButton}
                        onClick={() => startEditTask(task)}
                      >
                        <i className="bi bi-pencil me-1"></i>
                        Edit
                      </motion.button>
                      {isAdminOrManager(profile?.role) && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={styles.deleteButton}
                          onClick={() => deleteTask(task.id)}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Delete
                        </motion.button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: 0,
    display: "flex",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginLeft: 48,
  },
  createButton: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  categoryCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    border: "2px solid transparent",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.3s ease",
  },
  categoryCardActive: {
    boxShadow: "0 8px 30px rgba(102, 126, 234, 0.2)",
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: 20,
  },
  categoryContent: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  categoryLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: 500,
  },
  categoryCount: {
    fontSize: 28,
    fontWeight: 700,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "var(--primary)",
  },
  formCard: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#1a1a2e",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    transition: "all 0.2s ease",
    background: "#f9fafb",
  },
  inputError: {
    borderColor: "#ef4444",
    background: "#fef2f2",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    display: "block",
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    background: "#f9fafb",
    cursor: "pointer",
  },
  submitButton: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
  },
  cancelButton: {
    padding: "12px 24px",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  taskListContainer: {
    minHeight: 300,
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  taskCard: {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    border: "1px solid #f0f0f0",
    transition: "all 0.3s ease",
  },
  taskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#1a1a2e",
    margin: 0,
  },
  badgeContainer: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    margin: "0 0 12px 0",
    lineHeight: 1.5,
  },
  taskMeta: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  metaItem: {
    fontSize: 13,
    color: "#888",
    display: "flex",
    alignItems: "center",
  },
  taskActions: {
    display: "flex",
    gap: 8,
    paddingTop: 12,
    borderTop: "1px solid #f0f0f0",
  },
  actionButton: {
    padding: "8px 16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  deleteButton: {
    padding: "8px 16px",
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
};
