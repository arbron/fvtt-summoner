/**
 * Application for configuring changes made to an actor when it is summoned.
 */
export class SummonsConfig extends FormApplication {

  constructor(object, options) {
    super(object, options);

    /**
     * Copy of the summoning config flags.
     * @type {object}
     */
    this.config = foundry.utils.deepClone(this.object.getFlag("arbron-summoner", "config") ?? {});
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["dnd5e", "arbron-summons-config"],
      template: "modules/arbron-summoner/templates/summons-config.hbs",
      width: 500,
      height: "auto"
    });
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /** @inheritdoc */
  getData() {
    return this.config;
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  _retainChanges() {
    const formData = foundry.utils.expandObject(this._getSubmitData());
    formData.actorChanges = Object.entries(formData.actorChanges ?? {}).map(entry => entry[1]);
    foundry.utils.mergeObject(this.config, formData);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /** @inheritdoc */
  async _updateObject(event, formData) {
    this._retainChanges();
    this.object.setFlag("arbron-summoner", "config", this.config);
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */
  /*  Event Listeners and Handlers             */
  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".controls a").click(this._onChangesControlClicked.bind(this));
    html.find("[name='reset']").click(this._onResetDefaults.bind(this));
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Handle clicks on the add/remove changes buttons.
   * @param {Event} event  Triggering click event.
   */
  _onChangesControlClicked(event) {
    event.preventDefault();
    this._retainChanges();
    const action = event.currentTarget.dataset.action;
    switch (action) {
      case "add-actor-change":
        this.config.actorChanges ??= [];
        this.config.actorChanges.push({key: "", value: ""});
        break;
      case "delete-actor-change":
        const index = parseInt(event.currentTarget.dataset.index);
        this.config.actorChanges.splice(index, 1);
        break;
      case "add-item-change":
      case "delete-item-change":
      default:
        return;
    }
    return this.render();
  }

  /* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

  /**
   * Reset changes to default.
   * @param {Event} event  Triggering click event.
   */
  _onResetDefaults(event) {
    this.object.unsetFlag("arbron-summoner", "config");
    this.close();
  }

}
