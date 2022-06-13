import { libWrapper } from "./libWrapperShim.mjs";
import { SummonsActor } from "./summons-actor.mjs";
import { SummonsItem } from "./summons-item.mjs";


Hooks.once("init", function() {
  // Patch DND5E.itemActionTypes to include new summon action
  CONFIG.DND5E.itemActionTypes.summon = "ArbronSummoner.Summoning";
});

Hooks.once("setup", function() {
  libWrapper.register(
    "arbron-summoner", "Item.implementation.prototype.getRollData", SummonsItem.getRollData, "WRAPPER"
  );
});

// Actor Hooks
Hooks.on("renderActorSheet5eNPC", SummonsActor.renderActorSheet);
Hooks.on("renderActorSheet5eVehicle", SummonsActor.renderActorSheet);
Hooks.on("renderActorSheetFlags", SummonsActor.renderActorSheetFlags);

// Item Configuration Hooks
Hooks.on("renderItemSheet5e", SummonsItem.renderItemSheet);
Hooks.on("preUpdateItem", SummonsItem.preUpdateItem);

// Item Rolling & Chat Message Hooks
Hooks.on("dnd5e.preRoll", SummonsItem.preRoll);
Hooks.on("dnd5e.roll", SummonsItem.roll);
Hooks.on("dnd5e.preDisplayCard", SummonsItem.preDisplayCard);
Hooks.on("renderAbilityUseDialog", SummonsItem.renderAbilityUseDialog);
Hooks.on("renderChatMessage", SummonsItem.renderChatMessage);
