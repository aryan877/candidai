"""Entry point wrapper -- delegates to the CandidAI agent CLI."""
from candidai_agent import create_agent, join_call

from vision_agents.core import AgentLauncher, Runner

if __name__ == "__main__":
    Runner(
        AgentLauncher(
            create_agent=create_agent,
            join_call=join_call,
        )
    ).cli()
