## Todo

- [x] Set up module
- [x] Add `summon` type to `DND5E.itemActionType` config object
- [x] Modify item sheets with `summon` action type to show summon list built from flags
- [x] Make summons list respond to dropped actors, name changes, and deletions
- [ ] Display "Summon" button on chat message
- [ ] Add summon checkbox and dropdown in item consumption message
- [ ] Summon actor using Warp Gate upon casting or when summon button is clicked
- [ ] Insert static summoner roll data into summoned creature's roll data
- [ ] Implement interface for configuring summoned actors
- [ ] Modify summoned actor's data based on summoning item's roll data


## Summoned Actor Configuration Data

This data is stored within the flags of an actor to be summoned and contains information on how the actor should be modified when summoned. The formulas here use the summoning actor's roll data.

```json
{
  "flags": {
    "arbron-summoner": {
      "version": 1,
      "changes": {
        "data.attributes.ac.flat": "11 + @item.level",
        "data.attributes.hp.max": "40 + 10 * (@item.level - 4)",
        "data.attributes.hp.value": "40 + 10 * (@item.level - 4)"
      },
      "items": {
        "IgJkSnLiLJOWH7eK": {
          "changes": {},
          "matchToHit": true
        }
      },
      "matchProficiency": true,
      "summonerData": {
        "actorUuid": "abcd",
        "itemId": "",
        "rollData": {}
      }
    }
  }
}
```

## Summoned Actor Roll Data

The roll data for the summoned actor will be modified to include a `summoner` field that will contained a copy of the data from the actor that summoned them. This will be a **copy** of the summoner's roll data, and so it will not be updated after the summon has occurred even if the summoner's stats change.

## System Integration

Adds a new `itemActionType` for `summon` which can be set on spells or features. When set, this gives the ability to link one or more summonable actors to that item. When the item is used, the consume window pops up allow to choose whether the summon and actor and which one of the variants to summon. This requires create token permissions.

When the summon is created, the module takes the item data, makes changes based on what is stored in the `arbron-summoner` flags on the actor, and then creates an unlinked token wherever the player clicks.

```json
{
  "flags": {
    "arbron-summoner": {
      "summons": [
        {
          "name": "Clay",
          "uuid": "Actor.zaNtK6iPI3ttIglY"
        },
        {
          "name": "Metal",
          "uuid": "Actor.XcnIjNcost9kG92P"
        },
        {
          "name": "Stone",
          "uuid": "Actor.B7DyafZAdI40tEWs"
        }
      ]
    }
  }
}
```
