import { SummonsActor } from "./summons-actor.mjs";
import { promptSummonsType } from "./summons-type-prompt.mjs";

/**
 * @typedef {object} SummonsData
 * @property {string} uuid   UUID of the actor to summon.
 * @property {string} name   Display name in the summons prompt.
 * @property {number} count  Number of actors to summon.
 */

/**
 * Perform the summons of the specified type.
 * @param {Item5e} item                The item performing the summoning.
 * @param {SummonsData} [summonsData]  Data of the actor to summon. If blank, then the type selection UI will be shown.
 * @param {object} [usage={}]
 * @param {ItemUseConfiguration} [usage.config]
 * @param {ItemUseOptions} [usage.options]
 */
export default async function summon(item, summonsData, usage) {
  // Ensure Warp Gate is installed and enabled, otherwise throw an error
  if ( !globalThis.warpgate ) return ui.notifications.error(game.i18n.localize("ArbronSummoner.Error.NoWarpGate"));

  // If summons data is blank, present selection UI for this item
  if ( !summonsData ) {
    let summons = item.getFlag("arbron-summoner", "summons") ?? [];
    // Fix for data that was stored incorrectly in v11
    if ( foundry.utils.getType(summons) === "Object" ) summons = Object.values(summons);
    if ( !summons.length ) return;
    else if ( summons.length === 1 ) summonsData = summons[0];
    else {
      try { summonsData = await promptSummonsType(summons); }
      catch(err) { return; }
    }
  }

  /**
   * A hook event that fires before summoning is performed.
   * @function arbron.preSummon
   * @memberof hookEvents
   * @param {Item5e} item              The item that is performing the summoning.
   * @param {SummonsData} summonsData  Data on the summoning being performed.
   * @returns {boolean}                Explicitly return `false` to prevent summoning from being performed.
   */
  if ( Hooks.call("arbron.preSummon", item, summonsData) === false ) return;

  // Get copy of roll data & retrieve actor clone
  const actor = await fromUuid(summonsData.uuid);
  if ( !actor ) return ui.notifications.error(game.i18n.localize("ArbronSummoner.Error.NoActor"));
  let protoData = await actor.getTokenDocument();

  // Prepare actor data changes
  const updates = SummonsActor.getChanges.bind(protoData.actor)(item, usage);

  // Figure out where to place the summons
  item.parent?.sheet.minimize();

  const spawnedTokens = [];

  for ( let iteration = 0; iteration < (summonsData.count || 1); iteration++ ) {
    const templateData = await warpgate.crosshairs.show({
      size: protoData.width, icon: protoData.texture.src, name: protoData.name
    });

    // Ensure the template was completed and merge in any rotation changes
    await warpgate.event.notify(warpgate.EVENT.PLACEMENT, {templateData, tokenData: protoData.toObject()});
    if ( templateData.cancelled ) break;
    updates.token = { rotation: templateData.direction };
  
    /**
     * A hook event that fires before a specific token is summoned.
     * @function arbron.preSummonToken
     * @memberof hookEvents
     * @param {Item5e} item          The item that is performing the summoning.
     * @param {object} templateData  Template that contains summoning location.
     * @param {object} protoData     Base actor data used to create the summoned actor.
     * @param {object} updates       Updates that will be applied to base actor data.
     * @returns {boolean}            Explicitly return `false` to prevent this token from being summoned.
     */
    if ( Hooks.call("arbron.preSummonToken", item, templateData, protoData, updates) === false ) continue;

    const token = (await warpgate.spawnAt(
      { x: templateData.x, y: templateData.y },
      protoData, updates, undefined,
      { comparisonKeys: { Item: "_id" } }
    )).map(id => canvas.scene.tokens.get(id))[0];

    if ( token ) {
      /**
       * A hook event that fires after a specific token is summoned.
       * @function arbron.summonToken
       * @memberof hookEvents
       * @param {Item5e} item    The item that is performing the summoning.
       * @param {Token5e} token  Token that has been summoned.
       */
      Hooks.callAll("arbron.summonToken", item, token);
      spawnedTokens.push(token);
    }

    if ( summonsData.count > 1 ) protoData = await actor.getTokenDocument();
  }

  /**
   * A hook event that fires after all tokens have been summoned.
   * @function arbron.summonComplete
   * @memberof hookEvents
   * @param {Item5e} item       The item that is performing the summoning.
   * @param {Token5e[]} tokens  Tokens that have been summoned.
   */
  Hooks.callAll("arbron.summonComplete", item, spawnedTokens);

  item.parent?.sheet.maximize();
}
