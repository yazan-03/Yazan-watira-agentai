from agent_service import run_agent


question = """
Search the knowledge base for the main benefits of yoga.

Then schedule a 30-minute yoga session on September 16, 2026 at 7:00 PM.

Finally, send an email to trainer@example.com
with the subject "Yoga Session"
summarizing the yoga benefits and mentioning the scheduled session.
"""

answer = run_agent(question)

print("\nFinal Answer:")
print(answer)