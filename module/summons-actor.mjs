import { debugLog } from "./logging.mjs";
import { SummonsConfig } from "./summons-config.mjs";


export class SummonsActor {

  static summonsConfigButton() {
    return $(`
      <div class="form-group">
        <label>${game.i18n.localize("ArbronSummoner.Config.Title")}</label>
        <a class="config-button" data-action="summons-config"
          data-tooltip="${game.i18n.localize("ArbronSummoner.Config.ButtonAction")}">
          <i class="fas fa-cog"></i>
        </a>
      </div>
    `)[0];
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  static summonsConfigButtonTidySheet() {
    return $(`
      <div class="form-group arbron-summons">
        <article title="${game.i18n.localize("ArbronSummoner.Config.Title")}">
          <label>
            <i class="fa-solid fa-spaghetti-monster-flying"></i>
            <span>${game.i18n.localize("ArbronSummoner.Config.Title")}</span>
          </label>
        </article>
        <a class="config-button" data-action="summons-config">
          <i class="fas fa-pencil-alt"></i>
        </a>
      </div>
    `)[0];
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Insert the summons configuration button beneath "Special Traits" on actor sheets.
   * @param {ItemSheet5e} application  The Actor sheet being rendered.
   * @param {jQuery} html              The pending HTML as a jQuery object.
   * @param {object} context           The input data provided for template rendering.
   */
  static renderActorSheet(application, html, context) {
    const traits = html[0].querySelector(".traits");
    if ( !traits ) return;

    switch (application.constructor.name) {
      case "ActorSheet5eNPC":
      case "ActorSheet5eVehicle":
        traits.insertAdjacentElement("beforeend", SummonsActor.summonsConfigButton());
        break;
      case "Tidy5eNPC":
      case "Tidy5eVehicle":
        if ( !traits?.classList.contains("expanded") ) return;
        const insertPoint = traits.querySelector(".toggle-traits");
        const insertedElement = SummonsActor.summonsConfigButtonTidySheet();
        if ( insertPoint ) insertPoint.insertAdjacentElement("beforebegin", insertedElement);
        else traits.insertAdjacentElement("beforeend", insertedElement);
        break;
      default:
        return;
    }

    html[0].querySelector("[data-action='summons-config']")
      ?.addEventListener("click", SummonsActor.onSummonsConfigClicked.bind(application));
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Insert the summons configuration button inside the Special Traits application.
   * @param {ItemSheet5e} application  The Special Traits sheet being rendered.
   * @param {jQuery} html              The pending HTML as a jQuery object.
   * @param {object} context           The input data provided for template rendering.
   */
  static renderActorSheetFlags(application, html, context) {
    const control = $(`
      <div class="arbron-summons-flags-area">
        <h3 class="form-header">${game.i18n.localize("ArbronSummoner.Summoning")}</h3>
        ${SummonsActor.summonsConfigButton().outerHTML}
      </div>
    `)[0];
    const insertPoint = html[0].querySelectorAll("h3")[2];
    if ( insertPoint ) insertPoint.insertAdjacentElement("beforebegin", control);
    else html[0].querySelector(".form-body").insertAdjacentElement("beforeend", control);
    html[0].querySelector("[data-action='summons-config']")
      .addEventListener("click", SummonsActor.onSummonsConfigClicked.bind(application));
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Display the summons configuration app when the cog button is clicked.
   * @param {Event} event  Triggering click event.
   */
  static onSummonsConfigClicked(event) {
    event.preventDefault();
    (new SummonsConfig(this.object)).render(true);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */
  
  /**
   * Get an updates for the changes needed when summoning.
   * @param {Item5e} item  The item performing the summoning.
   */
  static getChanges(item) {
    const clone = this.clone();
    const config = this.getFlag("arbron-summoner", "config");
    const updates = { actor: {}, embedded: {} };
    const rollData = item.getRollData();
  
    // Store roll data & summoner information in flags
    foundry.utils.setProperty(updates.actor, "flags.arbron-summoner.summoner", { uuid: item.uuid, data: rollData });

    if ( !config ) return updates;
    const toHitTarget = config.matchToHit ? SummonsActor._determineToHit(item) : 0;

    // Modify proficiency to match summoner using an active effect
    if ( config.matchProficiency ) {
      const proficiencyEffect = new ActiveEffect({
        changes: [{
          key: "data.attributes.prof",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: rollData.attributes.prof
        }],
        disabled: false,
        icon: "icons/skills/targeting/crosshair-bars-yellow.webp",
        label: game.i18n.localize("DND5E.Proficiency")
      }, { parent: this });
      updates.embedded.ActiveEffect = { [proficiencyEffect.label]: proficiencyEffect.toObject() };
      clone.updateSource({ effects: [proficiencyEffect.toObject()] });
    }

    // Apply AC formula
    const ac = dnd5e.utils.simplifyBonus(config.acFormula, rollData)
    if ( ac ) updates.actor["system.attributes.ac.flat"] = ac;

    // Apply HP formula
    const hp = dnd5e.utils.simplifyBonus(config.hpFormula, rollData);
    if ( hp ) {
      updates.actor["system.attributes.hp.max"] = hp;
      updates.actor["system.attributes.hp.value"] = hp;
    }

    // Apply other actor data changes
    for ( const change of config.actorChanges ?? [] ) {
      const value = dnd5e.utils.simplifyBonus(change.value, rollData);
      clone.updateSource({ [change.key]: value });
      updates.actor[change.key] = value;
    }

    // Perform item changes
    for ( const item of clone.items ) {
      const itemUpdates = {};

      // Match item to hit to match summoner
      if ( config.matchToHit && item.hasAttack ) {
        const toHit = SummonsActor._determineToHit(item);
        itemUpdates["system.attackBonus"] = `${toHitTarget - toHit}`;
      }

      // Match item save DC to match summoner
      if ( config.matchSaveDCs && item.hasSave ) {
        itemUpdates["system.save.dc"] = rollData.item.save.dc ?? rollData.attributes.spelldc;
        itemUpdates["system.save.scaling"] = "flat";
      }

      if ( !foundry.utils.isEmpty(itemUpdates) ) {
        itemUpdates._id = item.id;
        updates.embedded.Item ??= {};
        updates.embedded.Item[item.id] = foundry.utils.expandObject(itemUpdates);
      }
    }

    return updates;
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Determine the final to hit bonus for an item or a close approximation.
   * @param {Item5e} item  Item for which the to hit should be determined.
   * @returns {number}     Final to hit as single number.
   */
  static _determineToHit(item) {
    const data = item.getAttackToHit();
    if ( data ) {
      const roll = new Roll(data.parts.join("+"), data.rollData);
      if ( roll.isDeterministic ) {
        roll.evaluate({ async: false });
        return roll.total;
      }
    }
    const ability = item.actor.system.attributes.spellcasting ?? item.abilityMod;
    const abilityMod = foundry.utils.getProperty(item.actor, `system.abilities.${ability}.mod`) ?? 0;
    return item.actor.system.attributes.prof + abilityMod;
  }
  
  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Add summoner data to an actor's getRollData.
   * @returns {object}  Modified roll data.
   */
  static getRollData(wrapped) {
    const rollData = wrapped();
    if ( !rollData ) return rollData;

    const summoner = this.getFlag("arbron-summoner", "summoner");
    if ( !summoner?.data ) return rollData;

    rollData.summoner = summoner.data;
    if ( rollData.summoner.prof ) {
      rollData.summoner.prof = new dnd5e.documents.Proficiency(
        rollData.summoner.prof._baseProficiency,
        rollData.summoner.prof.multiplier,
        rollData.summoner.prof.rounding === "down"
      );
    }
    return rollData;
  }

}
