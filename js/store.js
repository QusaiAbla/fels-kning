/* ==========================================================================
   Store — data layer shared by index.html and admin.html
   Data source of truth: /data/flows.json + /data/config.json
   Runtime edits are persisted to localStorage (static hosting has no
   writable backend). Admins can export updated JSON files from the admin
   panel to commit back into the repo for permanent changes.
   ========================================================================== */

const Store = (() => {
  const LS_FLOWS = 'ithjalpen_flows_v1';
  const LS_CONFIG = 'ithjalpen_config_v1';

  let flowsData = null;
  let configData = null;

  async function fetchJSON(path) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error('not ok');
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function init() {
    // 1. Prefer whatever an admin already edited this session/browser
    const lsFlows = localStorage.getItem(LS_FLOWS);
    const lsConfig = localStorage.getItem(LS_CONFIG);

    if (lsFlows) {
      flowsData = JSON.parse(lsFlows);
    } else {
      flowsData = await fetchJSON('data/flows.json');
    }

    if (lsConfig) {
      configData = JSON.parse(lsConfig);
    } else {
      configData = await fetchJSON('data/config.json');
    }

    if (!configData) {
      configData = { adminPin: '210021', orgName: 'IT-Hjälpen', supportEmail: '' };
    }
    if (!flowsData) {
      flowsData = { flows: [] };
    }
    return { flowsData, configData };
  }

  function persistFlows() {
    localStorage.setItem(LS_FLOWS, JSON.stringify(flowsData));
  }

  function persistConfig() {
    localStorage.setItem(LS_CONFIG, JSON.stringify(configData));
  }

  function getAllFlows() {
    return flowsData.flows;
  }

  function getPublishedFlows() {
    return flowsData.flows.filter(f => f.status === 'published');
  }

  function getFlow(id) {
    return flowsData.flows.find(f => f.id === id) || null;
  }

  function saveFlow(flow) {
    const idx = flowsData.flows.findIndex(f => f.id === flow.id);
    if (idx >= 0) {
      flowsData.flows[idx] = flow;
    } else {
      flowsData.flows.push(flow);
    }
    persistFlows();
  }

  function deleteFlow(id) {
    flowsData.flows = flowsData.flows.filter(f => f.id !== id);
    persistFlows();
  }

  function getConfig() {
    return configData;
  }

  function saveConfig(newConfig) {
    configData = { ...configData, ...newConfig };
    persistConfig();
  }

  function downloadFile(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportFlows() {
    downloadFile('flows.json', flowsData);
  }

  function exportConfig() {
    downloadFile('config.json', configData);
  }

  function importFlows(jsonObj) {
    flowsData = jsonObj;
    persistFlows();
  }

  function resetFlowsToServer() {
    localStorage.removeItem(LS_FLOWS);
  }

  function genId(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 9);
  }

  return {
    init,
    getAllFlows,
    getPublishedFlows,
    getFlow,
    saveFlow,
    deleteFlow,
    getConfig,
    saveConfig,
    exportFlows,
    exportConfig,
    importFlows,
    resetFlowsToServer,
    genId
  };
})();
