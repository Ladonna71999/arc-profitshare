"use client";
/* Arc Profitshare — split profit. Layout: TOP-NAV + CENTERED 1 cột (donut lớn + legend + danh sách splits),
   KHÔNG sidebar/bento — khác các trang khác. GIỮ tab Earnings/Splits/New split/Payout + nút mạng.
   ABI preserved: createRun(name)/addRecipient(id,to,amount)/fundAndPay(id)payable/get/count/total. */
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import { parseEther, formatEther, isAddress } from "viem";
const C = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52";
const ABI = [
  { name: "createRun", type: "function", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }], outputs: [{ type: "uint256" }] },
  { name: "addRecipient", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "fundAndPay", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "name", type: "string" }, { name: "totalAmt", type: "uint256" }, { name: "paid", type: "bool" }, { name: "at", type: "uint256" }] }] },
  { name: "count", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const usd = (w?: bigint) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }
const CSS = `
.ps{--bg:#08120f;--card:#0f231c;--card2:#143028;--bd:#163a2e;--bd2:#21564a;--mut:#76a892;--txt:#e7f6ef;--acc:#10b981;--acc2:#34d399;min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Sora','Segoe UI',system-ui,sans-serif}
.ps *{box-sizing:border-box}.ps a{color:var(--acc2);text-decoration:none}.ps .mono{font-family:ui-monospace,monospace}
.ps header{display:flex;align-items:center;gap:14px;padding:13px 22px;border-bottom:1px solid var(--bd)}
.ps .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.ps .mark{width:31px;height:31px;border-radius:9px;background:linear-gradient(135deg,#10b981,#34d399);color:#04231a;display:grid;place-items:center;font-size:15px}
.ps .tabs{display:flex;gap:4px;background:var(--card);border:1px solid var(--bd);border-radius:11px;padding:4px;margin-left:6px}
.ps .tab{border:0;background:none;color:var(--mut);font:inherit;font-weight:600;font-size:13px;padding:7px 15px;border-radius:8px;cursor:pointer}.ps .tab.on{background:var(--acc);color:#04231a;font-weight:700}
.ps .btn{border:0;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;padding:9px 15px;transition:.15s}.ps .btn:disabled{opacity:.5;cursor:not-allowed}
.ps .pri{background:var(--acc);color:#04231a}.ps .pri:hover:not(:disabled){background:var(--acc2)}.ps .gho{background:var(--card2);color:var(--txt);border:1px solid var(--bd2)}.ps .red{background:#dc2626;color:#fff}
.ps .wrap{max-width:600px;margin:0 auto;padding:26px 22px 50px}
.ps .hero{background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:24px;text-align:center;margin-bottom:16px}
.ps .ring{width:190px;height:190px;border-radius:50%;margin:6px auto 14px;display:grid;place-items:center}
.ps .ringIn{width:130px;height:130px;border-radius:50%;background:var(--card);display:grid;place-items:center}
.ps .leg{display:flex;flex-direction:column;gap:8px;text-align:left;max-width:280px;margin:0 auto}
.ps .legrow{display:flex;align-items:center;gap:10px;font-size:13px}
.ps .run{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:15px;margin-bottom:10px}
.ps label{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 5px}
.ps input{width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:9px;padding:10px 12px;font:inherit;font-size:14px;color:var(--txt);outline:none}.ps input:focus{border-color:var(--acc)}
.ps .card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:18px}
.ps .menu{position:absolute;right:0;top:116%;background:var(--card2);border:1px solid var(--bd2);border-radius:10px;padding:6px;min-width:180px;z-index:30;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.ps .menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--txt);font:inherit;font-weight:600;font-size:13px;padding:8px 11px;border-radius:7px;cursor:pointer}.ps .menu button:hover{background:rgba(255,255,255,.05)}
@media(max-width:620px){.ps .tabs{flex-wrap:wrap}}
`;
function Run({ id, me, busy, write }: { id: bigint; me?: string; busy: boolean; write: (fn: string, args: any[], v?: bigint) => void }) {
  const { data: r } = useReadContract({ address: C, abi: ABI, functionName: "get", args: [id] });
  const { data: cnt } = useReadContract({ address: C, abi: ABI, functionName: "count", args: [id] });
  const [rec, setRec] = useState({ to: "", amount: "" });
  if (!r) return null; const x = r as any; const mine = me?.toLowerCase() === x.owner.toLowerCase();
  return (
    <div className="run">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16,185,129,.16)", display: "grid", placeItems: "center", fontSize: 17 }}>🤝</div>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700 }}>{x.name || `Split #${id}`}</div><div className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>${usd(x.totalAmt)} · {cnt?.toString() ?? "0"} partners · {cut(x.owner)}</div></div>
        {x.paid && <span style={{ fontSize: 11, color: "#4ade80" }}>Distributed ✓</span>}
      </div>
      {mine && !x.paid && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}><input value={rec.to} onChange={e => setRec(s => ({ ...s, to: e.target.value }))} placeholder="partner 0x…" style={{ flex: 1, fontFamily: "ui-monospace", fontSize: 12.5 }} /><input value={rec.amount} onChange={e => setRec(s => ({ ...s, amount: e.target.value }))} type="number" placeholder="share" style={{ width: 90 }} /><button className="btn gho" disabled={busy || !isAddress(rec.to) || !(Number(rec.amount) > 0)} onClick={() => write("addRecipient", [id, rec.to as `0x${string}`, parseEther(rec.amount || "0")])}>Add</button></div>
        <button className="btn pri" disabled={busy || x.totalAmt === 0n} onClick={() => write("fundAndPay", [id], x.totalAmt)}>{busy ? "…" : `Distribute $${usd(x.totalAmt)}`}</button>
      </div>}
    </div>
  );
}
export default function App() {
  const { address, isConnected } = useAccount(); const net = useChainId();
  const { connectors, connect } = useConnect(); const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false); const [tab, setTab] = useState<"overview" | "pools" | "new" | "send">("overview");
  const [nm, setNm] = useState(""); const [snd, setSnd] = useState({ to: "", amount: "" });
  const tx = useWriteContract(); const rcpt = useWaitForTransactionReceipt({ hash: tx.data, query: { enabled: !!tx.data } });
  const send = useSendTransaction(); const srcpt = useWaitForTransactionReceipt({ hash: send.data, query: { enabled: !!send.data } });
  const busy = tx.isPending || rcpt.isLoading; const sbusy = send.isPending || srcpt.isLoading;
  const total = useReadContract({ address: C, abi: ABI, functionName: "total" });
  useEffect(() => { if (rcpt.isSuccess) { tx.reset(); setNm(""); total.refetch(); } }, [rcpt.isSuccess]); // eslint-disable-line
  useEffect(() => { if (srcpt.isSuccess) { send.reset(); setSnd({ to: "", amount: "" }); } }, [srcpt.isSuccess]); // eslint-disable-line
  const wrong = isConnected && net !== CHAIN; const n = total.data !== undefined ? Number(total.data) : 0;
  const write = (fn: string, args: any[], v?: bigint) => tx.writeContract({ address: C, abi: ABI, functionName: fn as any, args, value: v });
  return (
    <div className="ps">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="logo"><span className="mark">🤝</span>Arc Profitshare</div>
        <div className="tabs">{([["overview", "Earnings"], ["pools", "Splits"], ["new", "New split"], ["send", "Payout"]] as const).map(([t, l]) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{l}</button>)}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button className={"btn " + (wrong ? "red" : "gho")} onClick={toArc}>{wrong ? "Switch to Arc" : "⚡ Arc network"}</button>
          <div style={{ position: "relative" }}><button className="btn pri" onClick={() => setPop(p => !p)}>{isConnected ? cut(address) : "Connect"}</button>
            {pop && <div className="menu">{isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={{ color: "#f87171" }}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }}>{c.name}</button>)}</div>}</div>
        </div>
      </header>
      <div className="wrap">
        {tab === "overview" && <div className="hero">
          <div style={{ fontSize: 13, color: "var(--mut)" }}>Profit split model</div>
          <div className="ring" style={{ background: "conic-gradient(#10b981 0% 45%,#34d399 45% 70%,#0ea5e9 70% 88%,#6b7280 88% 100%)" }}><div className="ringIn"><div><div style={{ fontSize: 12, color: "var(--mut)" }}>Pools</div><div style={{ fontSize: 26, fontWeight: 800 }}>{n}</div></div></div></div>
          <div className="leg">
            <div className="legrow"><span style={{ width: 11, height: 11, borderRadius: 3, background: "#10b981" }} /><span style={{ flex: 1 }}>Founder</span><b>45%</b></div>
            <div className="legrow"><span style={{ width: 11, height: 11, borderRadius: 3, background: "#34d399" }} /><span style={{ flex: 1 }}>Partner</span><b>25%</b></div>
            <div className="legrow"><span style={{ width: 11, height: 11, borderRadius: 3, background: "#0ea5e9" }} /><span style={{ flex: 1 }}>Partner</span><b>18%</b></div>
            <div className="legrow"><span style={{ width: 11, height: 11, borderRadius: 3, background: "#6b7280" }} /><span style={{ flex: 1 }}>Team pool</span><b>12%</b></div>
          </div>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 16 }}>Add partners with their share, fund &amp; distribute pro-rata in one tx.</div>
        </div>}
        {tab === "pools" && <div>{n > 0 ? Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <Run key={id.toString()} id={id} me={address} busy={busy} write={write} />) : <div style={{ color: "var(--mut)", textAlign: "center", padding: "40px 0" }}>No splits yet — create one 🤝</div>}</div>}
        {tab === "new" && <div className="card">
          <label>Split name</label><input value={nm} onChange={e => setNm(e.target.value)} placeholder="e.g. Q2 profit" />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || !nm} onClick={() => write("createRun", [nm])}>{busy ? "…" : "Create split 🤝"}</button>
          <div style={{ fontSize: 11, color: "var(--mut)", textAlign: "center", marginTop: 8 }}>Open it under Splits to add partners and distribute.</div>
        </div>}
        {tab === "send" && <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Payout USDC</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}>Pay a partner directly on Arc.</div>
          <label>To address</label><input value={snd.to} onChange={e => setSnd(s => ({ ...s, to: e.target.value }))} placeholder="0x…" style={{ fontFamily: "ui-monospace" }} />
          <label>Amount (USDC)</label><input value={snd.amount} onChange={e => setSnd(s => ({ ...s, amount: e.target.value }))} type="number" placeholder="0.00" style={{ fontSize: 18, fontWeight: 800 }} />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || sbusy || !isAddress(snd.to) || !(Number(snd.amount) > 0)} onClick={() => send.sendTransaction({ to: snd.to as `0x${string}`, value: parseEther(snd.amount || "0") })}>{sbusy ? "Paying…" : "Payout ↗"}</button>
          {srcpt.isSuccess && <div style={{ fontSize: 12, color: "#4ade80", textAlign: "center", marginTop: 8 }}>✓ Sent</div>}
        </div>}
        <div style={{ textAlign: "center", color: "#4d5468", fontSize: 12, marginTop: 22 }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer">Arc Network</a></div>
      </div>
    </div>
  );
}
