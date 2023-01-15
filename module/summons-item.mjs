import { debugLog } from "./logging.mjs";
import summon from "./summon.mjs";
import { SummonsActor } from "./summons-actor.mjs";
import { buildSelectSummonsDropdown } from "./summons-type-prompt.mjs";


export class SummonsItem {

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */
  /*  Item Sheet                               */
  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Modify the item sheet for items with the summon action type to display the list of summons.
   */
  static async renderItemSheet(sheet, html, data) {
    const item = sheet.item;
    if ( item.system.actionType !== "summon" ) return;

    // Render summons section
    debugLog("Rendering debug section");
    const summonsData = await SummonsItem.getData.bind(sheet)();
    const rendered = $(await renderTemplate("modules/arbron-summoner/templates/summons-section.hbs", summonsData))[0];

    // Insert summons section before chat flavor
    const insertPoint = html[0].querySelector("input[name='system.chatFlavor']").closest("div.form-group");
    if ( !insertPoint ) return debugLog("Failed to insert summons template into item");
    insertPoint.insertAdjacentElement("beforebegin", rendered);

    // Attach listeners to new element
    rendered.querySelectorAll(".arbron-summons-delete").forEach(a => {
      a.addEventListener("click", SummonsItem.onDeleteSummons.bind(sheet));
    });
    new DragDrop({ callbacks: { drop: SummonsItem.onDrop.bind(sheet) } }).bind(rendered);

    // Resize the dialog to fit the new elements
    sheet.setPosition({ height: "auto" });
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Get the data needed to display the summons list from the stored flags.
   * @returns {object}
   */
  static async getData() {
    const stored = this.item.getFlag("arbron-summoner", "summons") ?? [];
    const summons = await Promise.all(stored.map(async function(s) {
      return {
        name: s.name,
        count: s.count,
        uuid: s.uuid,
        item: await fromUuid(s.uuid),
        link: dnd5e.utils.linkForUuid(s.uuid)
      };
    }));
    return { summons };
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Ensure summons data is in the proper array format before being saved.
   * @param {Item5e} item     The Item instance being updated.
   * @param {object} change   Differential data that will be used to update the item.
   * @param {object} options  Additional options which modify the update request.
   * @param {string} userId   The ID of the requesting user.
   */
  static preUpdateItem(item, change, options, userId) {
    const summons = change.flags?.["arbron-summoner"]?.summons;
    if ( !summons || (summons instanceof Array) ) return;
    change.flags["arbron-summoner"].summons = Object.values(summons).map(d => d);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Add a summons to the list when an actor is dropped.
   * @param {Event} event  Triggering drop event.
   */
  static async onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    let actors = [];

    if ( (data.type === "Folder") && (data.documentName === "Actor") ) {
      const folder = game.folders.get(data.id);
      if ( !folder ) return;
      actors = folder.contents;
    }

    else if ( data.type === "Actor" ) {
      const actor = await Actor.implementation.fromDropData(data);
      actors.push(actor);
    }

    else return;

    const summons = foundry.utils.deepClone(this.item.getFlag("arbron-summoner", "summons") ?? []);
    const existingUuids = new Set(summons.map(s => s.uuid));
    actors = actors.map(a => ({ name: a.name, count: 1, uuid: a.uuid })).filter(a => !existingUuids.has(a.uuid));
    if ( !actors.length ) return;

    summons.push(...actors);
    return this.item.setFlag("arbron-summoner", "summons", summons);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Remove a summons from the data when the delete button is clicked.
   * @param {Event} event  Triggering click event.
   */
  static async onDeleteSummons(event) {
    event.preventDefault();
    await this._onSubmit(event);
    const section = event.target.closest("li");
    const index = Number(section.dataset.index);
    const summons = foundry.utils.deepClone(this.item.getFlag("arbron-summoner", "summons") ?? []);
    summons.splice(index, 1);
    return this.item.setFlag("arbron-summoner", "summons", summons);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */
  /*  Usage Dialog & Chat Message              */
  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Fetch the summons configuration from the provided item if available.
   * @param {Item5e} item      Item from which to fetch the configuration.
   * @returns {object[]|void}  Configuration data if available.
   */
  static getSummonsConfiguration(item) {
    if ( (item.system.actionType !== "summon") ) return;
    return item.getFlag("arbron-summoner", "summons");
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Ensure the config dialog is always presented when a summons item is rolled that has summons configured.
   * @param {Item5e} item                   Item being rolled.
   * @param {ItemRollConfiguration} config  Configuration data for an item roll being prepared.
   * @param {ItemRollOptions} options       Additional roll options.
   */
  static preUseItem(item, config, options) {
    if ( !SummonsItem.getSummonsConfiguration(item)?.length ) return;
    config.needsConfiguration = true;
    config.createSummons = true;
    config.summonsType = null;
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Add the Summons controls to the ability use dialog.
   * @param {AbilityUseDialog} dialog  The Dialog being rendered.
   * @param {jQuery} html              The pending HTML as a jQuery object.
   * @param {object} data              The input data provided for template rendering.
   */
  static renderAbilityUseDialog(dialog, html, data) {
    const item = dialog.item;
    const summons = SummonsItem.getSummonsConfiguration(item);
    if ( !summons?.length ) return;

    // Create the summons dropdown
    const selectSummons = buildSelectSummonsDropdown(summons);

    // Insert summons dropdown beneath "Cast at Level" if available, otherwise beneath "Notes"
    const castAtLevel = html[0].querySelector("select[name='consumeSpellLevel']")?.closest("div.form-group");
    const insertTarget = castAtLevel ?? html[0].querySelector(".notes");
    insertTarget.insertAdjacentElement("afterend", selectSummons);

    // Insert Place Summons at bottom of form
    const placeSummons = $(`
      <div class="form-group">
        <label class="checkbox">
          <input type="checkbox" name="createSummons" checked>
          ${game.i18n.localize("ArbronSummoner.AbilityUse.PlaceSummons")}
        </label>
      </div>
    `)[0];
    html[0].querySelector("form").insertAdjacentElement("beforeend", placeSummons);

    // Resize the dialog to fit the new elements
    dialog.setPosition({ height: "auto" });
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Store selected summons type in flag.
   * @param {Item5e} item                     Item being used.
   * @param {ItemUseConfiguration} config     Configuration data for the item usage being prepared.
   * @param {ItemUseOptions} options          Additional options used for configuring item usage.
   */
  static itemUsageConsumption(item, config, options) {
    if ( !SummonsItem.getSummonsConfiguration(item)?.length ) return;

    // Store the selected summons type for the roll message
    if ( config.summonsType ) options.flags["arbron-summoner.summonsType"] = config.summonsType;
    options.flags["arbron-summoner.showButton"] = true;
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Summon the monster if `createSummons` is true, otherwise retain the summons type.
   * @param {Item5e} item                   Item being rolled.
   * @param {ItemRollConfiguration} config  Configuration data for the roll.
   * @param {ItemRollOptions} options       Additional options used for configuring item rolls.
   */
  static useItem(item, config, options) {
    if ( !SummonsItem.getSummonsConfiguration(item)?.length ) return;

    // Trigger the summons
    const summonsData = summons.find(s => s.uuid === config.summonsType);
    if ( config.createSummons && summonsData ) summon(item, summonsData);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Add the summons button to chat cards that require it.
   * @param {Item5e} item              Item for which the chat card is being displayed.
   * @param {object} chatData          Data used to create the chat message.
   * @param {ItemRollOptions} options  Options which configure the display of the item chat card.
   */
  static preDisplayCard(item, chatData, options) {
    if ( !SummonsItem.getSummonsConfiguration(item)?.length ) return;

    const uuid = foundry.utils.getProperty(chatData.flags, "arbron-summoner.summonsType");
    const button = $(`
      <button data-action="summon"${uuid ? ` data-uuid="${uuid}"` : ""}>
        ${game.i18n.localize("ArbronSummoner.ChatCard.SummonButton")}
      </button>
    `)[0];
    const content = $(chatData.content)[0];
    const insertTarget = content.querySelector(".card-buttons") ?? content;
    insertTarget.insertAdjacentElement("beforeend", button);
    chatData.content = content.outerHTML;
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Attach event listener to the summons button.
   * @param {ChatMessage} message  The ChatMessage document being rendered.
   * @param {jQuery} html          The pending HTML as a jQuery object.
   * @param {object} context       The input data provided for template rendering.
   */
  static renderChatMessage(message, html, context) {
    const summonsButton = html[0].querySelector("[data-action='summon']");
    if ( !summonsButton ) return;
    summonsButton.addEventListener("click", SummonsItem.onSummonsButtonClicked.bind(message));
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Handle clicks on the Summons button on a chat message.
   * @param {Event} event  Triggering click event.
   */
  static async onSummonsButtonClicked(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);

    // Recover the actor for the chat card
    const actor = await dnd5e.documents.Item5e._getChatCardActor(card);
    if ( !actor ) return;

    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag("dnd5e", "itemData");
    let item = storedData
      ? new Item.implementation(storedData, {parent: actor})
      : actor.items.get(card.dataset.itemId);
    if ( !item ) return ui.notifications.error(game.i18n.format("DND5E.ActionWarningNoItem", {
      item: card.dataset.itemId, name: actor.name
    }));

    // If not using stored data & upcast, prepare upcast item
    const upcastLevel = Number(card.dataset.spellLevel);
    if ( !storedData && !Number.isNaN(upcastLevel) && upcastLevel !== item.system.level ) {
      item = item.clone({"system.level": upcastLevel}, {keepId: true});
      item.prepareData();
      item.prepareFinalAttributes();
    }

    const summons = item.getFlag("arbron-summoner", "summons") ?? [];
    const uuid = message.getFlag("arbron-summoner", "summonsType") ?? button.dataset.uuid;
    const summonsData = summons.find(s => s.uuid === uuid);
    summon(item, summonsData);
  }

}
