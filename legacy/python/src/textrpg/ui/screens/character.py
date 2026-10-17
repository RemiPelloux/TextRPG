"""Read-only views of the character: stats sheet, inventory, equipment."""

from __future__ import annotations

from textrpg.context import GameContext
from textrpg.ui.render import banner, format_character_sheet, format_item


def stats_screen(ctx: GameContext) -> None:
    ctx.console.write(banner("Character"))
    ctx.console.write(format_character_sheet(ctx.player, ctx.catalog))
    ctx.console.pause()


def inventory_screen(ctx: GameContext) -> None:
    console, player = ctx.console, ctx.player
    console.write(banner("Inventory"))
    console.write(f"Money: {player.inventory.money} gold\n")
    if not player.inventory.items:
        console.write("Your bag is empty.")
    for item in player.inventory.items:
        console.write(f"  - {format_item(item, ctx.catalog)}")
    console.pause()


def equipment_screen(ctx: GameContext) -> None:
    console, player = ctx.console, ctx.player
    console.write(banner("Equipment"))
    if not player.equipment:
        console.write("You have nothing equipped.")
    for slot, item in player.equipment.items():
        console.write(f"  {slot.value:<10} {format_item(item, ctx.catalog)}")
    console.write("\n(Equipping and unequipping items is coming soon - see docs/ROADMAP.md.)")
    console.pause()
