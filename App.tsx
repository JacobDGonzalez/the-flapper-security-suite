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
}



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

  // helper
  async function runHardening(mode: "audit" | "enforce") {
    try {
      setIsRunning(true);
      const baseUrl = window.location.origin; // e.g. http://192.168.8.12:3000

      const res = await fetch(`${baseUrl.replace(':3000', ':3001')}/hardening/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "ok") {
        throw new Error(data.message || "Hardening run failed");
      }
      setLastRunMode(mode);
      // also push to your audit‑trail log state
    } catch (e: any) {
      // set an error alert (see section 2)
      setAlert({ type: "error", message: e.message || "Hardening run failed" });
    } finally {
      setIsRunning(false);
    }
  }


  useEffect(() => {
    async function loadInventory() {
      try {
        const baseUrl = window.location.origin;          // e.g. http://192.168.8.12:3000
        const apiUrl = baseUrl.replace(":3000", ":3001"); // backend on 3001

        const res = await fetch(`${apiUrl}/inventory`);

        const data = await res.json();
        if (data.status === "ok" && data.inventory?.ports) {
          // if you have services state based on ports, set it here
          // setServices(data.inventory.ports);
        }
        // you can also store software if you add a state for it
        // setSoftware(data.inventory.software);
      } catch (e) {
        // optional: set an alert
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

    // Simulate complex system interaction
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

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {alert && (
        <div className={alert.type === "success" ? "alert-success" : "alert-error"} onClick={() => setAlert(null)}>
          {alert.message}
        </div>
      )}
      {/* Sidebar */}
      <nav className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 text-indigo-400 mb-10">
            <div className="bg-indigo-600/20 p-2.5 rounded-2xl ring-1 ring-indigo-500/30">
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
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
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
        <header className="h-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10 px-10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200 capitalize tracking-tight">{activeTab}</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full">
              <div className={`w-2 h-2 rounded-full ${hardeningProgress > 70 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500'}`}></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">System Stability: Nominal</span>
            </div>
            <div className="bg-indigo-600/10 text-indigo-400 px-3 py-1 rounded-lg border border-indigo-500/20 text-xs font-bold uppercase tracking-widest">v1.2.0 Stable</div>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Hardening Level"
                  value={`${Math.round(hardeningProgress)}%`}
                  subtitle={`${mitigations.filter(m => m.isApplied).length} of ${mitigations.length} Mitigations`}
                  progress={hardeningProgress}
                />
                <StatCard
                  title="Exposed Ports"
                  value={services.filter(s => s.status === 'OPEN').length}
                  subtitle="Risk profile: Elevated"
                  accent="text-amber-500"
                />
                <StatCard
                  title="Session Events"
                  value={logs.length}
                  subtitle="System activity monitored"
                  accent="text-blue-400"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-indigo-400" />
                    Network Attack Surface
                  </h3>
                  <div className="space-y-4">
                    {services.map((service, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${service.status === 'OPEN' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {service.status === 'OPEN' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{service.name}</div>
                            <div className="text-xs text-slate-500 font-mono">Port {service.port} ({service.protocol})</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${service.risk === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            service.risk === 'HIGH' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'text-slate-500 border-slate-800'
                            }`}>
                            {service.risk}
                          </span>
                          <button
                            onClick={() => loadAcademyContent(`${service.name} exploitation`)}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1"
                          >
                            <Info className="w-3 h-3" /> Explore Risk
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-400" />
                    Hardening Activity
                  </h3>
                  <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-6 font-mono text-[11px] overflow-y-auto max-h-[400px]">
                    {logs.length === 0 ? (
                      <div className="text-slate-700 h-full flex items-center justify-center italic">Awaiting hardening sequence initialization...</div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map(log => (
                          <div key={log.id} className="flex gap-3">
                            <span className="text-slate-600">[{log.timestamp}]</span>
                            <span className={`flex-1 ${log.type === 'success' ? 'text-emerald-500' :
                              log.type === 'warning' ? 'text-amber-500' :
                                log.type === 'error' ? 'text-red-500' : 'text-slate-400'
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
                  <h3>System Defense Console</h3>
                  <p>Select mitigations to harden your system configuration.</p>

                  <section>
                    <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                      <button disabled={isRunning} onClick={() => runHardening("audit")}>
                        {isRunning ? "Running audit..." : "Run Audit"}
                      </button>
                      <button disabled={isRunning} onClick={() => runHardening("enforce")}>
                        {isRunning ? "Applying..." : "Apply Mitigations"}
                      </button>
                    </div>

                    {/* existing mitigations UI stays here, below the buttons */}
                    {/* e.g., your list of MITIGATIONS mapped to cards */}
                  </section>

                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Session: Elevated</div>
                  <div className="text-xs text-indigo-400 font-mono">0x7FFD_821_4B</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mitigations.map((m) => (
                  <div key={m.id} className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col ${m.isApplied ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/10' : 'bg-slate-900/40 border-slate-800'
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${m.isApplied ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                        {m.isApplied ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.riskLevel === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        m.riskLevel === 'HIGH' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'text-slate-500 border-slate-800'
                        }`}>
                        {m.riskLevel}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold mb-1">{m.name}</h4>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-1">{m.description}</p>

                    <div className="flex items-center gap-3 mt-auto">
                      <button
                        onClick={() => applyHardening(m.id)}
                        disabled={m.isApplied || isHardening}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${m.isApplied
                          ? 'bg-emerald-500/20 text-emerald-500 cursor-default'
                          : isHardening ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                          }`}
                      >
                        {m.isApplied ? <CheckCircle2 className="w-4 h-4" /> : isHardening ? <Cpu className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {m.isApplied ? 'Secured' : isHardening ? 'Processing...' : 'Deploy Mitigation'}
                      </button>
                      <button
                        onClick={() => loadAcademyContent(m.name)}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                      >
                        <BookOpen className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "academy" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto space-y-8">
              <header className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-2"
                >
                  <span className="border border-slate-700 rounded px-2 py-0.5">←</span>
                  Back to Security Hub
                </button>
                {/* you can keep a small label or version badge here if you want */}
              </header>

              {!selectedTopic && !loadingAI ? (
                <div className="py-20 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="bg-indigo-600/10 p-6 rounded-3xl">
                      <BookOpen className="w-16 h-16 text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black mb-4">The Flapper Academy</h3>
                  {/* ...rest of Academy content... */}

                  <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                    Knowledge is the strongest firewall. Select any system mitigation or exposed port to understand how hardware exploits like Flipper Zero work.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {['BadUSB Attacks', 'Responder Exploits', 'RDP Brute Force', 'SMB Relay'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => loadAcademyContent(tag)}
                        className="px-6 py-2 bg-slate-900 hover:bg-indigo-600 transition-all border border-slate-800 rounded-full text-sm font-bold"
                      >
                        Explain {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : loadingAI ? (
                <div className="py-20 text-center space-y-4">
                  <Cpu className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-indigo-400 font-mono text-sm animate-pulse tracking-widest uppercase">Consulting Flapper Security Intelligence...</p>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-12">
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
                      <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Overview
                      </h4>
                      <p className="text-slate-200 text-lg leading-relaxed">{selectedTopic?.summary}</p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <section>
                        <h4 className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                          <Terminal className="w-4 h-4" /> Technical Mechanism
                        </h4>
                        <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{selectedTopic?.technicalDetails}</p>
                      </section>
                      <section>
                        <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Recommended Defense
                        </h4>
                        <div className="bg-slate-950 p-6 rounded-2xl border border-emerald-500/20 text-emerald-100 text-sm leading-relaxed italic">
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
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden divide-y divide-slate-800">
                {logs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 italic">No logs currently in buffer</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-6 flex items-start gap-4 hover:bg-slate-800/20 transition-colors group">
                      <div className={`mt-1 p-2 rounded-lg ${log.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                        log.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                          log.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                        }`}>
                        {log.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                          log.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                            log.type === 'info' ? <Info className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-mono text-slate-600">{log.timestamp}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${log.type === 'success' ? 'text-emerald-500' :
                            log.type === 'warning' ? 'text-amber-500' : 'text-slate-500'
                            }`}>{log.type}</span>
                        </div>
                        <p className="text-slate-200 font-medium leading-relaxed">{log.message}</p>
                      </div>
                    </div>
                  )).reverse()
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Nav Item Helper
const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40 ring-1 ring-indigo-500' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
      }`}
  >
    {icon}
    <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

// Stat Card Helper
const StatCard: React.FC<{ title: string; value: string | number; subtitle: string; icon?: React.ReactNode; accent?: string; progress?: number }> = ({ title, value, subtitle, icon, accent = "text-white", progress }) => (
  <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl hover:border-slate-700 transition-all group overflow-hidden relative">
    {progress !== undefined && (
      <div className="absolute bottom-0 left-0 h-1 bg-indigo-600 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
    )}
    <div className="flex justify-between items-start mb-6">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</span>
      {icon && <div className="p-2 bg-slate-800/80 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>}
    </div>
    <div className={`text-4xl font-black mb-1 ${accent} tracking-tighter`}>{value}</div>
    <div className="text-xs text-slate-500 font-medium">{subtitle}</div>
  </div>
);

export default App;