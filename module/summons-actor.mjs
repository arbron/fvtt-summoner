import { debugLog } from "./logging.mjs";
import { SummonsConfig } from "./summons-config.mjs";


export class SummonsActor {

  static summonsConfigButton() {
    return $(`
      <div class="form-group">
        <label>Summons Configuration</label>
        <a class="config-button" data-action="summons-config" title="Configure Summons">
          <i class="fas fa-cog"></i>
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
    // TODO: Ensure we only add this to known actor sheets
    const insertPoint = html[0].querySelector(".traits");
    insertPoint?.insertAdjacentElement("beforeend", SummonsActor.summonsConfigButton());
    html[0].querySelector("[data-action='summons-config']")
      .addEventListener("click", SummonsActor.onSummonsConfigClicked.bind(application));
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
        <h3 class="form-header">Summoning</h3>
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

}
