import { SummonsItem } from "./item-patch.mjs";


Hooks.once("init", function() {
  
  // Patch DND5E.itemActionTypes to include new summon action
  CONFIG.DND5E.itemActionTypes.summon = "ArbronSummoner.Summoning";
  
});

Hooks.on("renderItemSheet5e", SummonsItem.modifyItemSheet);
Hooks.on("preUpdateItem", SummonsItem.preUpdateItem);
