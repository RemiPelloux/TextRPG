"""Player inventory: owned (unequipped) items and money."""

from __future__ import annotations

from dataclasses import dataclass, field

from textrpg.domain.item import ItemInstance


@dataclass
class Inventory:
    items: list[ItemInstance] = field(default_factory=list)
    money: int = 0

    def add(self, item: ItemInstance, *, stackable: bool) -> ItemInstance:
        """Add an item. Stackable items merge into an existing stack of the same template."""
        if stackable:
            for owned in self.items:
                if owned.template_id == item.template_id:
                    owned.quantity += item.quantity
                    return owned
        self.items.append(item)
        return item

    def remove(self, uid: str, quantity: int = 1) -> ItemInstance:
        """Remove `quantity` units of the item with `uid`. Raises KeyError if absent."""
        for owned in self.items:
            if owned.uid == uid:
                if quantity > owned.quantity:
                    raise ValueError(f"only {owned.quantity} unit(s) of {owned.template_id}")
                owned.quantity -= quantity
                if owned.quantity == 0:
                    self.items.remove(owned)
                return owned
        raise KeyError(uid)

    def count(self, template_id: str) -> int:
        return sum(i.quantity for i in self.items if i.template_id == template_id)
