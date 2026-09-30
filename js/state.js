// ============================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ (источник истины — сервер; здесь только копия снимка)
// ============================================================

let tasks = {};          // { [task_id]: Task } — шаблоны
let instances = [];      // Instance[] — конкретные экземпляры
let deadlines = [];
let currentEmployee = ALL_EMPLOYEES;   // 0 = «Все»
let currentWeekStart = getStartOfWeek(new Date());
let viewMode = { events: true, deadlines: false };
let currentUser = null;

// Сотрудники организации (приходят с сервера)
let employeesData = [];   // [{id, name, role}]
let employees = [];       // [id]
let employeeNames = {};
let employeeRoles = {};
let serverVisibleIds = [];
let serverAssignableIds = [];

const ROLE_KEYS = ['owner', 'admin', 'employee'];

// Применить снимок, присланный сервером
function applySnapshot(data) {
  employeesData = (data.users || []).map(u => ({
    id: u.id,
    name: u.name,
    role: ROLE_KEYS.includes(u.role) ? u.role : 'employee',
  }));
  employeesData.sort((a, b) => roleRank[a.role] - roleRank[b.role]);
  employees = employeesData.map(e => e.id);
  employeeNames = {};
  employeeRoles = {};
  employeesData.forEach(e => {
    employeeNames[e.id] = e.name;
    employeeRoles[e.id] = e.role;
  });

  const me = data.me;
  currentUser = {
    id: me.id,
    role: ROLE_KEYS.includes(me.role) ? me.role : 'employee',
    name: me.name,
    organizationId: me.organizationId,
    memberId: me.memberId,
  };
  serverVisibleIds = data.visibleUserIds || [];
  serverAssignableIds = data.assignableUserIds || [];

  tasks = data.tasks || {};
  instances = data.instances || [];
  deadlines = data.deadlines || [];
}
