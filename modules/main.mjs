import { SummonsItem } from "./item-patch.mjs";


Hooks.once("init", function() {
  // Patch DND5E.itemActionTypes to include new summon action
  CONFIG.DND5E.itemActionTypes.summon = "ArbronSummoner.Summoning";
});

Hooks.on("renderItemSheet5e", SummonsItem.renderItemSheet);
Hooks.on("preUpdateItem", SummonsItem.preUpdateItem);
Hooks.on("dnd5e.preRoll", SummonsItem.preRoll);
Hooks.on("dnd5e.roll", SummonsItem.roll);
Hooks.on("dnd5e.preDisplayCard", SummonsItem.preDisplayCard);
Hooks.on("renderAbilityUseDialog", SummonsItem.renderAbilityUseDialog);
Hooks.on("renderChatMessage", SummonsItem.renderChatMessage);
