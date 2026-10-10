export interface MailAddress {
  address: string;
  displayName: string | null;
}

export interface MailAttachmentRef {
  filename: string;
  contentType: string;
  assetId: string;
}

export interface OutboundMail {
  from: MailAddress;
  to: readonly MailAddress[];
  cc: readonly MailAddress[];
  bcc: readonly MailAddress[];
  subject: string;
  text: string | null;
  html: string | null;
  attachments: readonly MailAttachmentRef[];
  headers: Readonly<Record<string, string>>;
}

export interface MailSendResult {
  provider: string;
  providerMessageId: string;
  acceptedAt: Date;
}

export interface MailTransportPort {
  send(message: OutboundMail): Promise<MailSendResult>;
}
