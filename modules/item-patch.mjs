import { debugLog } from "./logging.mjs";


export class SummonsItem {

  /**
   * Modify the item sheet for items with the summon action type to display the list of summons.
   */
  static async modifyItemSheet(sheet, html, data) {
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

}
