import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Terminal,
  BookOpen,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  Lock,
  Unlock,
  Cpu,
  Zap,
  Info,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText
} from 'lucide-react';
import {
  HardeningMitigation,
  ServiceStatus,
  SecurityLog,
  EducationalContent
} from './types';
import { getSecurityExplanation } from './services/geminiService';

type Alert = {
  type: "success" | "error";
  message: string;
};

const MITIGATIONS: HardeningMitigation[] = [
  { id: 'smb1', name: 'Disable SMBv1', description: 'Legacy protocol vulnerable to EternalBlue and Wannacry.', category: 'Services', target: 'Registry/FS', riskLevel: 'CRITICAL', isApplied: false },
  { id: 'rdp', name: 'Disable Remote Desktop', description: 'Unprotected RDP is a prime target for brute force attacks.', category: 'Network', target: 'Port 3389', riskLevel: 'HIGH', isApplied: false },
  { id: 'badusb', name: 'USB Guard (BadUSB)', description: 'Block unauthorized HID devices from registering as keyboards.', category: 'Hardware', target: 'HID Driver', riskLevel: 'HIGH', isApplied: false },
  { id: 'llmnr', name: 'Disable LLMNR/NBT-NS', description: 'Used by attackers to capture hashes (Responder).', category: 'Network', target: 'Network Stack', riskLevel: 'MEDIUM', isApplied: false },
  { id: 'autorun', name: 'Block Autorun/Autoplay', description: 'Prevents automatic execution of malicious scripts from drives.', category: 'System', target: 'Shell', riskLevel: 'MEDIUM', isApplied: false },
];

const INITIAL_SERVICES: ServiceStatus[] = [
  { port: 445, name: 'Microsoft-DS (SMB)', protocol: 'TCP', status: 'OPEN', risk: 'CRITICAL' },
  { port: 3389, name: 'RDP', protocol: 'TCP', status: 'OPEN', risk: 'HIGH' },
  { port: 135, name: 'RPC Endpoint Mapper', protocol: 'TCP', status: 'OPEN', risk: 'MEDIUM' },
  { port: 23, name: 'Telnet', protocol: 'TCP', status: 'CLOSED', risk: 'CRITICAL' },
];

const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunMode, setLastRunMode] = useState<"audit" | "enforce" | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hardening' | 'academy' | 'logs'>('dashboard');
  const [mitigations, setMitigations] = useState<HardeningMitigation[]>(MITIGATIONS);
  const [services] = useState<ServiceStatus[]>(INITIAL_SERVICES);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isHardening, setIsHardening] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<EducationalContent | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: SecurityLog['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }].slice(-50));
  };

  async function runHardening(mode: "audit" | "enforce") {
    console.log("runHardening called with mode:", mode);
    try {
      setIsRunning(true);
      setLastRunMode(mode);

      const baseUrl = window.location.origin;
      const apiUrl = baseUrl.replace(":3000", ":3001");

      const res = await fetch(`${apiUrl}/run-hardening`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Hardening failed:", err);
        window.alert("Hardening script failed; check server logs.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      console.log("Hardening response:", data);
      window.alert(
        mode === "audit"
          ? "Audit run triggered; check logs on the file server."
          : "Mitigations applied; check logs on the file server."
      );
    } catch (e) {
      console.error("Network error calling /run-hardening", e);
      window.alert("Could not reach backend; is server.js running?");
    } finally {
      setIsRunning(false);
    }
  }

  useEffect(() => {
    async function loadInventory() {
      try {
        const baseUrl = window.location.origin;
        const apiUrl = baseUrl.replace(":3000", ":3001");
        const res = await fetch(`${apiUrl}/inventory`);
        const data = await res.json();
        if (data.status === "ok" && data.inventory?.ports) {
          // setServices(data.inventory.ports);
        }
      } catch (e) {
        setAlert({
          type: "error",
          message: "Failed to load inventory from API",
        });
      }
    }

    loadInventory();
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const applyHardening = async (mitigationId: string) => {
    const mitigation = mitigations.find(m => m.id === mitigationId);
    if (!mitigation || mitigation.isApplied) return;

    setIsHardening(true);
    addLog(`Initiating ${isDryRun ? '[DRY RUN] ' : ''}hardening for ${mitigation.name}...`, 'info');

    await new Promise(r => setTimeout(r, 800));
    addLog(`Checking system dependencies for ${mitigation.target}...`, 'info');
    await new Promise(r => setTimeout(r, 1200));

    if (!isDryRun) {
      setMitigations(prev => prev.map(m => m.id === mitigationId ? { ...m, isApplied: true } : m));
      addLog(`Successfully applied mitigation: ${mitigation.name}`, 'success');
    } else {
      addLog(`DRY RUN COMPLETE: No changes were made to the system.`, 'warning');
    }
    setIsHardening(false);
  };

  const loadAcademyContent = async (topic: string) => {
    setLoadingAI(true);
    setActiveTab('academy');
    const content = await getSecurityExplanation(topic);
    setSelectedTopic(content);
    setLoadingAI(false);
  };

  const hardeningProgress = (mitigations.filter(m => m.isApplied).length / mitigations.length) * 100;

  const rootClass =
    theme === "dark"
      ? "min-h-screen flex bg-[#13030f] text-slate-100 font-sans selection:bg-purple-500/30"
      : "min-h-screen flex bg-[#22101a] text-slate-100 font-sans selection:bg-purple-300/40";


  const sidebarClass =
    theme === "dark"
      ? "w-64 border-r border-[#3a1026] bg-[#1b0613]/80 flex flex-col"
      : "w-64 border-r border-[#4b2033] bg-[#241019]/90 flex flex-col";

  const headerClass =
    theme === "dark"
      ? "h-20 border-b border-[#4b1740] bg-[#1b0613]/90 backdrop-blur-xl sticky top-0 z-10 px-10 flex items-center justify-between"
      : "h-20 border-b border-[#4b2033] bg-[#2b1521]/90 backdrop-blur-xl sticky top-0 z-10 px-10 flex items-center justify-between";


  const panelBg =
    theme === "dark"
      ? "bg-[#240816]/80 border border-[#3f1024]"
      : "bg-[#3a1a2a]/90 border border-[#6a3652]";


  const innerPanelBg =
    theme === "dark"
      ? "bg-[#180410] border border-[#3f1024]"
      : "bg-[#241019] border border-[#4b2033]";


  const logRowHover =
    theme === "dark" ? "hover:bg-[#3a1026]/60" : "hover:bg-[#fbe0f2]";

  return (
    <div className={rootClass}>
      {alert && (
        <div className={alert.type === "success" ? "alert-success" : "alert-error"} onClick={() => setAlert(null)}>
          {alert.message}
        </div>
      )}

      {/* Sidebar */}
      <nav className={sidebarClass}>
        <div className="p-8">
          <div className="flex items-center gap-3 text-purple-300 mb-10">
            <div className="bg-purple-700/25 p-2.5 rounded-2xl ring-1 ring-purple-500/40">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">FLAPPER</h1>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hardening Engine</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Shield className="w-5 h-5" />} label="Security Hub" />
            <NavItem active={activeTab === 'hardening'} onClick={() => setActiveTab('hardening')} icon={<Settings className="w-5 h-5" />} label="Hardening" />
            <NavItem active={activeTab === 'academy'} onClick={() => setActiveTab('academy')} icon={<BookOpen className="w-5 h-5" />} label="The Academy" />
            <NavItem active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<Terminal className="w-5 h-5" />} label="Activity Logs" />
          </div>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className={`${panelBg} p-4 rounded-xl`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dry Run Mode</span>
              <button
                onClick={() => setIsDryRun(!isDryRun)}
                className={`w-10 h-5 rounded-full transition-all relative ${isDryRun ? 'bg-amber-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isDryRun ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">Test hardening without affecting system state.</p>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className={headerClass}>
          <h2 className="text-lg font-bold capitalize tracking-tight">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <div
              className={
                theme === "dark"
                  ? "flex items-center gap-2 px-4 py-1.5 bg-[#240816]/80 border border-[#3f1024] rounded-full"
                  : "flex items-center gap-2 px-4 py-1.5 bg-[#ffe9f4] border border-[#f1cfe0] rounded-full"
              }
            >
              <div className={`w-2 h-2 rounded-full ${hardeningProgress > 70 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}`}></div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">System Stability: Nominal</span>
            </div>
            <div
              className={
                theme === "dark"
                  ? "bg-purple-700/20 text-purple-200 px-3 py-1 rounded-lg border border-purple-500/40 text-xs font-bold uppercase tracking-widest"
                  : "bg-purple-100 text-purple-800 px-3 py-1 rounded-lg border border-purple-300 text-xs font-bold uppercase tracking-widest"
              }
            >
              v1.2.0 Stable
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-3 py-1 text-xs font-bold rounded-full border border-[#5b1c38] bg-[#240816]/80 hover:bg-[#3a1026] text-slate-100 transition-colors"
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  theme={theme}
                  title="Hardening Level"
                  value={`${Math.round(hardeningProgress)}%`}
                  subtitle={`${mitigations.filter(m => m.isApplied).length} of ${mitigations.length} Mitigations`}
                  progress={hardeningProgress}
                />
                <StatCard
                  theme={theme}
                  title="Exposed Ports"
                  value={services.filter(s => s.status === 'OPEN').length}
                  subtitle="Risk profile: Elevated"
                  accent="text-amber-400"
                />
                <StatCard
                  theme={theme}
                  title="Session Events"
                  value={logs.length}
                  subtitle="System activity monitored"
                  accent="text-purple-200"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className={`${panelBg} rounded-3xl p-8`}>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-purple-300" />
                    Network Attack Surface
                  </h3>
                  <div className="space-y-4">
                    {services.map((service, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-4 rounded-2xl ${innerPanelBg} hover:border-[#5b1c38] transition-colors`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${service.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {service.status === 'OPEN' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{service.name}</div>
                            <div className="text-xs text-slate-500 font-mono">Port {service.port} ({service.protocol})</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${service.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            service.risk === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'text-slate-500 border-slate-800'
                            }`}>
                            {service.risk}
                          </span>
                          <button
                            onClick={() => loadAcademyContent(`${service.name} exploitation`)}
                            className="text-[10px] font-bold text-purple-200 hover:text-purple-100 flex items-center gap-1 mt-1"
                          >
                            <Info className="w-3 h-3" /> Explore Risk
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={`${panelBg} rounded-3xl p-8 flex flex-col`}>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    Hardening Activity
                  </h3>
                  <div className={`${innerPanelBg} rounded-2xl p-6 font-mono text-[11px] overflow-y-auto max-h-[400px]`}>
                    {logs.length === 0 ? (
                      <div className="text-slate-600 h-full flex items-center justify-center italic">Awaiting hardening sequence initialization...</div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map(log => (
                          <div key={log.id} className="flex gap-3">
                            <span className="text-slate-600">[{log.timestamp}]</span>
                            <span className={`flex-1 ${log.type === 'success' ? 'text-emerald-400' :
                              log.type === 'warning' ? 'text-amber-400' :
                                log.type === 'error' ? 'text-red-500' : 'text-slate-700'
                              }`}>
                              {log.type === 'success' && '> '}
                              {log.message}
                            </span>
                          </div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'hardening' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-xl font-bold">System Defense Console</h3>
                  <p className="text-slate-500">Select mitigations to harden your system configuration.</p>

                  <section>
                    <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                      <button
                        disabled={isRunning}
                        onClick={() => {
                          console.log("Run Audit button clicked");
                          runHardening("audit");
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 text-white text-sm font-bold transition-colors"
                      >
                        {isRunning && lastRunMode === "audit" ? "Running audit..." : "Run Audit"}
                      </button>
                      <button
                        disabled={isRunning}
                        onClick={() => {
                          console.log("Apply Mitigations button clicked");
                          runHardening("enforce");
                        }}
                        className="px-4 py-2 rounded-xl bg-[#7a1436] hover:bg-[#971a45] disabled:bg-[#3f0a1e] text-white text-sm font-bold transition-colors"
                      >
                        {isRunning && lastRunMode === "enforce" ? "Applying..." : "Apply Mitigations"}
                      </button>
                    </div>
                  </section>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Session: Elevated</div>
                  <div className="text-xs text-purple-200 font-mono">0x7FFD_821_4B</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mitigations.map((m) => (
                  <div
                    key={m.id}
                    className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col ${m.isApplied
                      ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/10'
                      : panelBg
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${m.isApplied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#3a1026] text-slate-200'}`}>
                        {m.isApplied ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.riskLevel === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        m.riskLevel === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'text-slate-500 border-slate-800'
                        }`}>
                        {m.riskLevel}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold mb-1">{m.name}</h4>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed flex-1">{m.description}</p>

                    <div className="flex items-center gap-3 mt-auto">
                      <button
                        onClick={() => applyHardening(m.id)}
                        disabled={m.isApplied || isHardening}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${m.isApplied
                          ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                          : isHardening ? 'bg-[#3a1026] text-slate-500 cursor-wait' : 'bg-purple-700 hover:bg-purple-600 text-white shadow-lg shadow-black/40'
                          }`}
                      >
                        {m.isApplied ? <CheckCircle2 className="w-4 h-4" /> : isHardening ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {m.isApplied ? 'Secured' : isHardening ? 'Processing...' : 'Deploy Mitigation'}
                      </button>
                      <button
                        onClick={() => loadAcademyContent(m.name)}
                        className="p-3 bg-[#3a1026] hover:bg-[#5b1c38] text-slate-200 rounded-xl transition-colors"
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'academy' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto space-y-8">
              {!selectedTopic && !loadingAI ? (
                <div className="py-20 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="bg-purple-700/20 p-6 rounded-3xl">
                      <BookOpen className="w-16 h-16 text-purple-200" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black mb-4">The Flapper Academy</h3>
                  <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
                    Knowledge is the strongest firewall. Select any system mitigation or exposed port to understand how hardware exploits like Flipper Zero work.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {['BadUSB Attacks', 'Responder Exploits', 'RDP Brute Force', 'SMB Relay'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => loadAcademyContent(tag)}
                        className="px-6 py-2 bg-[#240816] hover:bg-purple-700 transition-all border border-[#3f1024] rounded-full text-sm font-bold"
                      >
                        Explain {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : loadingAI ? (
                <div className="py-20 text-center space-y-4">
                  <Cpu className="w-12 h-12 text-purple-200 animate-spin mx-auto" />
                  <p className="text-purple-200 font-mono text-sm animate-pulse tracking-widest uppercase">Consulting Flapper Security Intelligence...</p>
                </div>
              ) : (
                <div className={`${panelBg} rounded-3xl overflow-hidden`}>
                  <div className="bg-gradient-to-r from-[#7a1436] to-purple-700 p-12">
                    <button
                      onClick={() => setSelectedTopic(null)}
                      className="text-white/70 hover:text-white text-xs font-bold mb-6 flex items-center gap-2"
                    >
                      ← Back to Library
                    </button>
                    <h3 className="text-4xl font-black text-white">{selectedTopic?.title}</h3>
                  </div>
                  <div className="p-12 space-y-10">
                    <section>
                      <h4 className="text-purple-200 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Overview
                      </h4>
                      <p className="text-slate-100 text-lg leading-relaxed">{selectedTopic?.summary}</p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <section>
                        <h4 className="text-purple-200 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                          <Terminal className="w-4 h-4" /> Technical Mechanism
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{selectedTopic?.technicalDetails}</p>
                      </section>
                      <section>
                        <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Recommended Defense
                        </h4>
                        <div className="bg-[#180410] p-6 rounded-2xl border border-emerald-500/20 text-emerald-100 text-sm leading-relaxed italic">
                          {selectedTopic?.remediationSteps}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black tracking-tight">Audit Trail</h3>
                <button onClick={() => setLogs([])} className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest">Clear Database</button>
              </div>
              <div className={`${panelBg} rounded-3xl overflow-hidden divide-y divide-[#3f1024]`}>
                {logs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 italic">No logs currently in buffer</div>
                ) : (
                  logs
                    .slice()
                    .reverse()
                    .map(log => (
                      <div key={log.id} className={`p-6 flex items-start gap-4 ${logRowHover} transition-colors group`}>
                        <div className={`mt-1 p-2 rounded-lg ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          log.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                            log.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-[#3a1026] text-slate-200'
                          }`}>
                          {log.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                            log.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                              log.type === 'info' ? <Info className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs font-mono text-slate-600">{log.timestamp}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${log.type === 'success' ? 'text-emerald-400' :
                              log.type === 'warning' ? 'text-amber-400' : 'text-slate-500'
                              }`}>{log.type}</span>
                          </div>
                          <p className="text-slate-100 font-medium leading-relaxed">{log.message}</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${active ? 'bg-purple-700 text-white shadow-xl shadow-black/40 ring-1 ring-purple-500' : 'text-slate-500 hover:text-slate-200 hover:bg-[#240816]/60'
      }`}
  >
    {icon}
    <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

const StatCard: React.FC<{ theme: "dark" | "light"; title: string; value: string | number; subtitle: string; icon?: React.ReactNode; accent?: string; progress?: number }> = ({ theme, title, value, subtitle, icon, accent = "text-white", progress }) => {
  const cardBg =
    theme === "dark"
      ? "bg-[#240816]/80 border border-[#3f1024]"
      : "bg-[#3a1a2a]/90 border border-[#6a3652]";  // was very light pink


  return (
    <div className={`${cardBg} p-8 rounded-3xl hover:border-[#5b1c38] transition-all group overflow-hidden relative`}>
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 h-1 bg-purple-600 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
      )}
      <div className="flex justify-between items-start mb-6">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</span>
        {icon && <div className="p-2 bg-[#3a1026]/80 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>}
      </div>
      <div className={`text-4xl font-black mb-1 ${theme === "dark" ? accent : "text-purple-100"} tracking-tighter`}>
        {value}
      </div>
      <div className="text-xs text-slate-300 font-medium">{subtitle}</div>

    </div>
  );
};

export default App;
