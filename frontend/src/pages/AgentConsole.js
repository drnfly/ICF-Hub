import { useState } from "react";

export default function AgentConsole() {
const [message, setMessage] = useState("");
const [reply, setReply] = useState("");
const [approval, setApproval] = useState(null);

const send = async () => {
const r = await fetch("/api/agent/chat", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ message }),
});
const data = await r.json();
setReply(data.reply || "");
if (data.suggestedAction) runTool(data.suggestedAction.tool, data.suggestedAction.payload || {});
};

const runTool = async (tool, payload) => {
const r = await fetch("/api/agent/tool", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ tool, payload }),
});
const data = await r.json();
if (data.requiresApproval) setApproval(data);
else setReply(JSON.stringify(data.result));
};

const approve = async (approveBool) => {
const r = await fetch("/api/agent/approve", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ approvalId: approval.approvalId, approve: approveBool }),
});
const data = await r.json();
setReply(JSON.stringify(data));
setApproval(null);
};

return (
<div style={{ padding: 24 }}>
<h2>Agent Console</h2>
<input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask agent..." />
<button onClick={send}>Send</button>

{approval && (
<div style={{ marginTop: 16, border: "1px solid #666", padding: 12 }}>
<h4>Approval Required</h4>
<pre>{JSON.stringify(approval, null, 2)}</pre>
<button onClick={() => approve(true)}>Approve</button>
<button onClick={() => approve(false)}>Reject</button>
</div>
)}

<pre style={{ marginTop: 16 }}>{reply}</pre>
</div>
);
}
