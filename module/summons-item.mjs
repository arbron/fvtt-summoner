import { debugLog } from "./logging.mjs";
import { SummonsActor } from "./summons-actor.mjs";


export class SummonsItem {

  /**
   * Perform the summons of the specified type.
   * @param {Item5e} item    The item performing the summoning.
   * @param {string} [uuid]  UUID of the actor to summon. If blank, then the type selection UI will be shown.
   */
  static async summon(item, uuid) {
    // Ensure Warp Gate is installed and enabled, otherwise throw an error
    if ( !warpgate ) return ui.notifications.error(game.i18n.localize("ArbronSummoner.Error.NoWarpGate"));

    // If UUID is blank, present selection UI for this item
    if ( !uuid ) {
      console.log("NOT IMPLEMENTED");
      return;
    }

    // Get copy of roll data & retrieve actor clone
    const actor = await fromUuid(uuid);
    if ( !actor ) return ui.notifications.error(game.i18n.localize("ArbronSummoner.Error.NoActor"));
    const protoData = await actor.getTokenData();

    // Prepare actor data changes
    const updates = SummonsActor.getChanges.bind(actor)(item);

    // Figure out where to place the summons
    item.parent?.sheet.minimize();
    const templateData = await warpgate.crosshairs.show({
      size: protoData.width, icon: protoData.img, name: protoData.name
    });
    item.parent?.sheet.maximize();

    // Ensure the template was completed and merge in any rotation changes
    await warpgate.event.notify(warpgate.EVENT.PLACEMENT, {templateData, tokenData: protoData.toObject()});
    if ( templateData.cancelled ) return;
    updates.token = { rotation: templateData.direction };

    console.log(updates);
    return warpgate.spawnAt(
      { x: templateData.x, y: templateData.y },
      protoData, updates, undefined,
      { comparisonKeys: { Item: "_id" } }
    );
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */
  /*  Item Sheet                               */
  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Modify the item sheet for items with the summon action type to display the list of summons.
   */
  static async renderItemSheet(sheet, html, data) {
    const item = sheet.item;
    if ( item.data.data.actionType !== "summon" ) return;

    // Render summons section
    debugLog("Rendering debug section");
    const summonsData = await SummonsItem.getData.bind(sheet)();
    const rendered = $(await renderTemplate("modules/arbron-summoner/templates/summons-section.hbs", summonsData))[0];

    // Insert summons section before chat flavor
    const insertPoint = html[0].querySelector("input[name='data.chatFlavor']").closest("div.form-group");
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
        uuid: s.uuid,
        item: await fromUuid(s.uuid),
        link: game.dnd5e.utils._linkForUuid(s.uuid)
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
    actors = actors.map(a => ({ name: a.name, uuid: a.uuid })).filter(a => !existingUuids.has(a.uuid));
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
   * Ensure the config dialog is always presented when a summons item is rolled that has summons configured.
   * @param {Item5e} item                   Item being rolled.
   * @param {ItemRollConfiguration} config  Configuration data for an item roll being prepared.
   * @param {object} options                Additional roll options.
   */
  static preRoll(item, config, options) {
    if ( item.data.data.actionType !== "summon" ) return;
    const summons = item.getFlag("arbron-summoner", "summons") ?? [];
    if ( !summons.length ) return;
    config.needsConfiguration = true;
    config.createSummons = true;
    config.summonsType = summons[0].uuid;
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
    if ( item.data.data.actionType !== "summon" ) return;
    const summons = item.getFlag("arbron-summoner", "summons") ?? [];
    if ( !summons.length ) return;

    // Create the summons dropdown
    const summonsTypes = summons.reduce((s, {name, uuid}) => s + `<option value="${uuid}">${name}</option>`, "");
    const selectSummons = $(`
      <div class="form-group">
        <label>${game.i18n.localize("ArbronSummoner.AbilityUse.ChooseSummons")}</label>
        <div class="form-fields">
          <select name="summonsType">${summonsTypes}</select>
        </div>
      </div>
    `)[0];

    // Insert summons dropdown beneath "Cast at Level" if available, otherwise beneath "Notes"
    const castAtLevel = html[0].querySelector("select[name='level']")?.closest("div.form-group");
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
   * Summon the monster if `createSummons` is true, otherwise retain the summons type.
   * @param {Item5e} item                   Item being rolled.
   * @param {ItemRollConfiguration} config  Configuration data for the roll.
   * @param {ItemRollOptions} options       Additional options used for configuring item rolls.
   */
  static roll(item, config, options) {
    if ( (item.data.data.actionType !== "summon") ) return;
    const summons = item.getFlag("arbron-summoner", "summons") ?? [];
    if ( !summons.length ) return;

    // Store the selected summons type for the roll message
    if ( config.summonsType ) options.flags["arbron-summoner.summonsType"] = config.summonsType;
    options.flags["arbron-summoner.showButton"] = true;

    // Trigger the summons
    if ( config.createSummons ) SummonsItem.summon(item, config.summonsType);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Add the summons button to chat cards that require it.
   * @param {Item5e} item              Item for which the chat card is being displayed.
   * @param {object} chatData          Data used to create the chat message.
   * @param {ItemRollOptions} options  Options which configure the display of the item chat card.
   */
  static preDisplayCard(item, chatData, options) {
    if ( (item.data.data.actionType !== "summon") ) return;
    const summons = item.getFlag("arbron-summoner", "summons") ?? [];
    if ( !summons.length ) return;

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
    const actor = await game.dnd5e.item.document._getChatCardActor(card);
    if ( !actor ) return;

    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag("dnd5e", "itemData");
    const item = storedData
      ? new Item.implementation(storedData, {parent: actor})
      : actor.items.get(card.dataset.itemId);
    if ( !item ) return ui.notifications.error(game.i18n.format("DND5E.ActionWarningNoItem", {
      item: card.dataset.itemId, name: actor.name
    }));
    // TODO: Upcast item if it is not stored and has spell level

    const uuid = message.getFlag("arbron-summoner", "summonsType") ?? button.dataset.uuid;
    SummonsItem.summon(item, uuid);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Add summoner data to an item's getRollData.
   * @returns {object}  Modified roll data.
   */
  static getRollData(wrapped) {
    const rollData = wrapped();
    if ( !rollData ) return rollData;

    const summoner = this.actor.getFlag("arbron-summoner", "summoner");
    if ( !summoner?.data ) return rollData;

    rollData.summoner = summoner.data;
    return rollData;
  }

}
