"""Read and write the save file on disk."""

from __future__ import annotations

import json
import os
from pathlib import Path

from textrpg.domain.character import Character
from textrpg.persistence.serialization import character_from_dict, character_to_dict

SAVE_DIR_ENV = "TEXTRPG_SAVE_DIR"
SAVE_FILENAME = "save.json"


def default_save_dir() -> Path:
    override = os.environ.get(SAVE_DIR_ENV)
    return Path(override) if override else Path.home() / ".textrpg"


class SaveManager:
    def __init__(self, directory: Path | None = None) -> None:
        self.path = (directory or default_save_dir()) / SAVE_FILENAME

    def exists(self) -> bool:
        return self.path.is_file()

    def load(self) -> Character:
        with self.path.open(encoding="utf-8") as f:
            return character_from_dict(json.load(f))

    def save(self, character: Character) -> None:
        """Write atomically: a crash mid-write never leaves a half-written save."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(character_to_dict(character), indent=2), encoding="utf-8")
        tmp.replace(self.path)

    def delete(self) -> None:
        self.path.unlink(missing_ok=True)
