class PromptBuilderService:
    """Builds prompts for various AI generation tasks."""

    @staticmethod
    def build_generate_prompt(topic: str, tone: str, length: str, target_audience: str) -> str:
        return f"""Create high-converting marketing content for:
Topic: {topic}

Audience:
{target_audience}

Tone:
{tone}

Length:
{length}

Include:
* Attention-grabbing hook
* Main value proposition
* CTA
* Natural flow
"""

    @staticmethod
    def build_rewrite_prompt(script: str, tone: str) -> str:
        return f"""Rewrite the following script while preserving meaning:

Script:
{script}

Tone:
{tone}
"""

    @staticmethod
    def build_translate_prompt(script: str, language: str) -> str:
        return f"""Translate this script:

Script:
{script}

Target Language:
{language}

Keep formatting and meaning unchanged.
"""
