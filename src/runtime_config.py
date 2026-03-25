from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "sim"}


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


@dataclass(frozen=True)
class RuntimeConfig:
    app_env: str
    app_title: str
    memory_file_path: str
    validation_file_path: str
    monitoring_file_path: str
    enable_demo_data: bool
    enable_local_memory: bool
    enable_monitoring: bool
    start_voice_muted: bool
    start_microphone_muted: bool
    meta_ads_enabled: bool
    google_ads_enabled: bool
    external_llm_enabled: bool
    llm_streaming_enabled: bool
    llm_api_base_url: str
    llm_api_key: str
    llm_model: str
    llm_timeout_seconds: int
    llm_temperature: float
    llm_max_tokens: int


def load_runtime_config() -> RuntimeConfig:
    load_dotenv()
    return RuntimeConfig(
        app_env=os.getenv("APP_ENV", "development"),
        app_title=os.getenv("APP_TITLE", "IA de Marketing"),
        memory_file_path=os.getenv("MEMORY_FILE_PATH", "data/memoria_usuario.json"),
        validation_file_path=os.getenv("VALIDATION_FILE_PATH", "data/avaliacao_intencoes.csv"),
        monitoring_file_path=os.getenv("MONITORING_FILE_PATH", "data/monitoramento_eventos.jsonl"),
        enable_demo_data=_bool_env("ENABLE_DEMO_DATA", True),
        enable_local_memory=_bool_env("ENABLE_LOCAL_MEMORY", True),
        enable_monitoring=_bool_env("ENABLE_MONITORING", True),
        start_voice_muted=_bool_env("START_VOICE_MUTED", False),
        start_microphone_muted=_bool_env("START_MICROPHONE_MUTED", False),
        meta_ads_enabled=_bool_env("META_ADS_ENABLED", False),
        google_ads_enabled=_bool_env("GOOGLE_ADS_ENABLED", False),
        external_llm_enabled=_bool_env("EXTERNAL_LLM_ENABLED", False),
        llm_streaming_enabled=_bool_env("LLM_STREAMING_ENABLED", True),
        llm_api_base_url=os.getenv("LLM_API_BASE_URL", "https://api.openai.com/v1/chat/completions"),
        llm_api_key=os.getenv("LLM_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        llm_timeout_seconds=_int_env("LLM_TIMEOUT_SECONDS", 45),
        llm_temperature=_float_env("LLM_TEMPERATURE", 0.3),
        llm_max_tokens=_int_env("LLM_MAX_TOKENS", 700),
    )