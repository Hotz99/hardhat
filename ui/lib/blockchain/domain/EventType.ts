import { Data } from "effect"

export type EventType = Data.TaggedEnum<{
  ConsentGranted: {}
  ConsentRevoked: {}
  ConsentChecked: {}
  IdentityRegistered: {}
  IdentityUpdated: {}
  DataRequestRejected: {}
}>

export const EventType = Data.taggedEnum<EventType>()

export const eventTypeFromNumber = (n: number): EventType => {
  switch (n) {
    case 0: return EventType.ConsentGranted()
    case 1: return EventType.ConsentRevoked()
    case 2: return EventType.ConsentChecked()
    case 3: return EventType.IdentityRegistered()
    case 4: return EventType.IdentityUpdated()
    case 5: return EventType.DataRequestRejected()
    default: throw new Error(`Unknown EventType: ${n}`)
  }
}
