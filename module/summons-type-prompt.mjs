/**
 * Present the summons type selection prompt and await the result.
 * @param {object[]} summons   Summons type configuration.
 * @returns {Promise<string>}  Resolves to the selected UUID or rejects if no UUID selected.
 */
export async function promptSummonsType(summons) {
  const selectSummons = buildSelectSummonsDropdown(summons);
  return new Promise((resolve, reject) => {
    const dialog = new Dialog({
      title: game.i18n.localize("ArbronSummoner.AbilityUse.SelectSummonsTypeHeader"),
      content: `<form>${selectSummons.outerHTML}<br></form>`,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Cancel"),
          callback: () => reject(null)
        },
        summon: {
          icon: '<i class="fa-solid fa-spaghetti-monster-flying"></i>',
          label: game.i18n.localize("ArbronSummoner.ChatCard.SummonButton"),
          callback: html => {
            const input = html.querySelector("select[name='summonsType']");
            const summonsData = summons.find(s => s.uuid === input?.value);
            if ( summonsData ) resolve(summonsData);
            else reject(null);
          }
        }
      },
      default: "summon"
    }, { classes: ["dnd5e", "dialog"], jQuery: false });
    dialog.render(true);
  });
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Produce the dropdown for selecting a summons type.
 * @param {object[]} summons  Summons type configuration.
 * @returns {Element}
 */
export function buildSelectSummonsDropdown(summons) {
  const summonsTypes = summons.reduce((s, {name, uuid}) => s + `<option value="${uuid}">${name}</option>`, "");
  return $(`
    <div class="form-group">
      <label>${game.i18n.localize("ArbronSummoner.AbilityUse.ChooseSummons")}</label>
      <div class="form-fields">
        <select name="summonsType">${summonsTypes}</select>
      </div>
    </div>
  `)[0];
}
