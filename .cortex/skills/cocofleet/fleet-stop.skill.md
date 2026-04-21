---
name: "fleet-stop"
description: "Terminate all running processes in a CocoFleet run. Sends SIGTERM, waits 10 seconds, then SIGKILL. Updates state file. Usage: /fleet stop [fleet-id]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocofleet
---

Your objective is to stop a running CocoFleet.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Parse argument: `/fleet stop [fleet-id]`
If no fleet-id: output "Usage: /fleet stop [fleet-id]" Then stop.

Read `.cocoplus/fleet/[fleet-id]-state.json`. If not found: output "Fleet state not found for [fleet-id]." Then stop.

## Terminate Running Instances

For each instance with status == "running":
1. Read PID from state.json
2. Terminate the process using cross-platform Node.js via the Bash tool:
   ```
   node -e "try{process.kill([pid],'SIGTERM')}catch(e){}" 
   ```
3. Wait up to 10 seconds for graceful shutdown, checking liveness each second:
   ```
   node -e "
     const pid=[pid];
     let waited=0;
     const iv=setInterval(()=>{
       try{process.kill(pid,0);waited++;}
       catch(e){clearInterval(iv);}
       if(waited>=10){try{process.kill(pid,'SIGKILL')}catch(_){}clearInterval(iv);}
     },1000);"
   ```
4. Update state.json: status = "stopped", completed_at = [timestamp]

## Write Stop Record

Write `.cocoplus/fleet/[fleet-id]-stop-record.md`:
```markdown
# Fleet Stop Record

**Fleet ID:** [fleet-id]
**Stopped At:** [ISO 8601 timestamp]

## Instances Stopped
| Instance | Last Status | Last Checkpoint | PID |
|----------|-------------|-----------------|-----|
[one row per stopped instance]
```

Output: "Fleet [fleet-id] stopped. [N] processes terminated. Stop record: `.cocoplus/fleet/[fleet-id]-stop-record.md`."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip SIGKILL after SIGTERM timeout | A process that ignores SIGTERM will keep running and orphan log files; SIGKILL ensures termination |
| Update state.json before sending signals | State must reflect reality — only mark "stopped" after confirming the process is dead |
| Skip writing the stop record | The stop record is audit evidence; missing it means no trace of when/why the fleet was halted |

## Exit Criteria

- [ ] All instances previously in "running" state now have `status: "stopped"` in `.cocoplus/fleet/[fleet-id]-state.json`
- [ ] `.cocoplus/fleet/[fleet-id]-stop-record.md` exists with a list of stopped instances
- [ ] No PIDs from the fleet remain alive (verified with `node -e "process.kill([pid],0)"` returning an error)
