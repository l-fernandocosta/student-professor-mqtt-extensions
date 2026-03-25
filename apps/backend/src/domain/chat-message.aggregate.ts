export class ChatMessageAggregate {
  private readonly maxMessageLength = 3000;

  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly senderId: string,
    public readonly receiverId: string,
    public readonly content: string
  ) {
    this.assertInvariants();
  }

  private assertInvariants(): void {
    if (!this.eventId || !this.sessionId || !this.senderId || !this.receiverId) {
      throw new Error("Message identity fields are required");
    }

    if (!this.content || this.content.trim().length === 0) {
      throw new Error("Message content cannot be empty");
    }

    if (this.content.length > this.maxMessageLength) {
      throw new Error(`Message content exceeds ${this.maxMessageLength} characters`);
    }
  }
}
