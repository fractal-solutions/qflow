#!/bin/bash

# Work duration in seconds (25 minutes)
WORK_DURATION=1500
# Break duration in seconds (5 minutes)
BREAK_DURATION=300

# Array of billion-dollar SaaS ideas
IDEAS=(
  "AI-Powered Legal Document Review for SMBs - Automate contract analysis"
  "Drone Fleet Management SaaS - End-to-end solution for commercial drone ops"
  "No-Code AR Experience Builder - Create AR without programming"
  "Healthcare Compliance Automation - HIPAA/GDPR compliance made simple"
  "Personalized Learning Platform - AI that adapts to each student's needs"
  "Carbon Accounting for Enterprises - Track and reduce emissions"
  "Voice-First CRM - Manage sales pipelines with voice commands"
  "Digital Twin Platform - Virtual replicas for manufacturing"
  "Blockchain Audit Automation - Smart contract verification SaaS"
  "Skills Gap Analyzer - AI-driven workforce development tool"
)

cycle=0
while true; do
  # Work period notification
  notify-send "Focus Time" "Work session $((cycle+1)) started - ${IDEAS[$((cycle % ${#IDEAS[@]}))}"
  
  # Wait work duration
  sleep $WORK_DURATION
  
  # Break period notification with next idea
  next_idea=$(((cycle+1) % ${#IDEAS[@]}))
  notify-send "Break Time" "${IDEAS[$next_idea]}\n\nTake a 5 minute break"
  
  # Wait break duration
  sleep $BREAK_DURATION
  
  cycle=$((cycle+1))
done