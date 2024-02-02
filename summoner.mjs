import { libWrapper } from "./module/libWrapperShim.mjs";
import { SummonsActor } from "./module/summons-actor.mjs";
import { SummonsItem } from "./module/summons-item.mjs";


Hooks.once("init", function() {
  // Patch DND5E.itemActionTypes to include new summon action
  insertIntoObject("summon", "ArbronSummoner.Summoning", {
    target: CONFIG.DND5E, keyPath: "itemActionTypes",
    after: "save", before: "heal"
  });
});

Hooks.once("setup", function() {
  libWrapper.register(
    "arbron-summoner", "Actor.implementation.prototype.getRollData", SummonsActor.getRollData, libWrapper.WRAPPER
  );
});

// Actor Hooks
Hooks.on("renderActorSheet5eNPC", SummonsActor.renderActorSheet);
Hooks.on("renderActorSheet5eVehicle", SummonsActor.renderActorSheet);
Hooks.on("renderActorSheetFlags", SummonsActor.renderActorSheetFlags);
Hooks.on("tidy5e-sheet.ready", (api) => {
  api.config.actorTraits.registerActorTrait({
    title: game.i18n.localize("ArbronSummoner.Config.Title"),
    iconClass: "fa-solid fa-spaghetti-monster-flying",
    enabled: (params) => ["npc", "vehicle"].includes(params.context.actor.type),
    openConfiguration(params) {
      SummonsActor.onSummonsConfigClicked.bind(params.app)(params.event);
    },
    openConfigurationTooltip: game.i18n.localize(
      "ArbronSummoner.Config.ButtonAction"
    )
  })
});

// Item Configuration Hooks
Hooks.on("renderItemSheet5e", SummonsItem.renderItemSheet);
Hooks.on("preUpdateItem", SummonsItem.preUpdateItem);
Hooks.on("tidy5e-sheet.ready", (api) => {
  api.registerItemContent(
    new api.models.HandlebarsContent({
      path: "modules/arbron-summoner/templates/summons-section.hbs",
      injectParams: {
        selector: `[data-form-group-for="system.chatFlavor"]`,
        position: "beforebegin",
      },
      enabled(data) {
        return data.item.system.actionType === "summon";
      },
      async getData(data) {
        return await SummonsItem.getData.bind(data.item.sheet)();
      },
      onRender({ app, element }) {
        const summoningArea = element.querySelector(".arbron-summons-area");
        if (summoningArea) {
          SummonsItem.activateListeners(summoningArea, app);
        }
      },
    })
  );
});

// Item Rolling & Chat Message Hooks
Hooks.on("dnd5e.preUseItem", SummonsItem.preUseItem);
Hooks.on("dnd5e.itemUsageConsumption", SummonsItem.itemUsageConsumption);
Hooks.on("dnd5e.preDisplayCard", SummonsItem.preDisplayCard);
Hooks.on("dnd5e.useItem", SummonsItem.useItem);
Hooks.on("renderAbilityUseDialog", SummonsItem.renderAbilityUseDialog);
Hooks.on("renderChatMessage", SummonsItem.renderChatMessage);


function insertIntoObject(key, value, { target, keyPath, after, before }) {
  const array = Object.entries(foundry.utils.getProperty(target, keyPath));
  const afterIdx = after ? array.findIndex(([k, v]) => k === after) : -1;
  const beforeIdx = before ? array.findIndex(([k, v]) => k === before) : -1;

  if ( afterIdx !== -1 ) array.splice(afterIdx + 1, 0, [key, value]);
  else if ( beforeIdx !== -1 ) array.splice(beforeIdx, 0, [key, value]);
  else array.push([key, value]);

  foundry.utils.setProperty(target, keyPath, Object.fromEntries(array));
}
