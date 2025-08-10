import time
from plyer import notification

def show_notification(title, message):
    try:
        notification.notify(
            title=title,
            message=message,
            timeout=10
        )
    except:
        print(f"Notification failed: {title} - {message}")

# Work-break cycle
work_duration = 25 * 60  # 25 minutes
break_duration = 5 * 60   # 5 minutes
saas_ideas = [
    "AI Legal Assistant for SMBs - $49/month automated contract review",
    "Drone Fleet Manager - Enterprise SaaS for commercial drone operations",
    "No-Code AR Platform - Drag-and-drop AR experience builder",
    "Healthcare Compliance Automator - HIPAA/GDPR compliance as a service",
    "Adaptive Learning Cloud - AI that personalizes education in real-time"
]

cycle_count = 0
while True:
    # Work period
    show_notification("Focus Time", f"Work session {cycle_count+1} started")
    time.sleep(work_duration)
    
    # Break period with SaaS idea
    idea = saas_ideas[cycle_count % len(saas_ideas)]
    show_notification("Break Time", f"{idea}\n\nRelax for 5 minutes")
    time.sleep(break_duration)
    
    cycle_count += 1