// Event Entity
// PK format: GUILD#<id>
// SK format: EVENT#<id>
// Primary key: <PK+SK>
type IEvent = {
  eventId: String; // 1-1 match with DiscordAPI
  serverId: String; // 1-1 match with DiscordAPI
  eventStartTime: Date; // 1-1 match with DiscordAPI
  eventEndTime: Date; // 1-1 match with DiscordAPI
  name: String; // 1-1 match with DiscordAPI
  categoryOrChannelId?: string; // 1-1 match with DiscordAPI
  eventInfo: EventInfo;
};

type EventInfo = {
  eventStartTime: Date;
  eventEndTime: Date;
  description?: String;
  maxAttendees?: number;
  minAttendees?: number;
  checkinStartDate: Date;
  checkinEndDate: Date;
  status: EventStatus;
};

type EventStatus = "OPEN" | "CLOSED" | "CANCELLED" | "COMPLETED";

type AttendeeInfo = {
  name: String;
  email: String;
  discordId?: String; // optional
  attendeeStatus: AttendeeStatus;
};

type IAttendee = {
  serverId: String; // 1-1 match with DiscordAPI
  eventId: String; // auto set with the SK but nice to have grouped with data
} & AttendeeInfo;

type AttendeeStatus =
  | "GOING"
  | "NOT_GOING"
  | "MAYBE"
  | "AWAITING"
  | "CHECKED_IN";

type AttendeeQuery = {
  attendees: { email?: String, discordId?: String }[];
};

export {
  IEvent,
  EventInfo,
  EventStatus,
  IAttendee,
  AttendeeStatus,
  AttendeeInfo,
  AttendeeQuery,
};
