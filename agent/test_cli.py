"""Standalone terminal harness for manually testing multi-turn agent behavior."""

from agent.graph import run_agent

if __name__ == "__main__":
    user_id = input("Enter a test user id: ")
    while True:
        msg = input("You: ")
        if msg.lower() in ("exit", "quit"):
            break
        print("Agent:", run_agent(user_id, msg))
