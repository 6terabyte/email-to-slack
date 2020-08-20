'use strict';

import cheerio from 'cheerio';

class Mail {
  public name: string;
  public address: string;
}

class Attachment {
  public fileName: string;
}

export class MailToSlackMsg {
  private from: Mail[];
  private to: Mail[];
  private cc: Mail[];
  private subject: string;
  private date: string;
  private attachments: Attachment[];
  private $: CheerioStatic;

  constructor(op: {
    from?: Mail[];
    to?: Mail[];
    bcc?: Mail[];
    cc?: Mail[];
    subject?: string;
    date?: string;
    attachments?: Attachment[];
    html?: string;
  }) {
    this.from = op.from;
    this.to = op.to;
    this.cc = op.cc;
    this.subject = op.subject;
    this.date = op.date;
    this.attachments = op.attachments;
    this.$ = cheerio.load(op.html || '');
  }

  public get(): string {
    return [
      `:email: ${this.whenThereIsSubject()}`,
      this.whenThereIsDate(),
      this.getSenderAndReceiver(),
      this.getLinks(),
      this.getImgs(),
      this.getBody(),
      this.whenThereIsAttachments(),
    ]
      .filter((_) => _ !== '')
      .join('\n');
  }

  public getSenderAndReceiver(): string {
    return [
      { type: 'form', list: this.from },
      { type: 'to', list: this.to },
      { type: 'cc', list: this.cc },
    ]
      .map((mails): string => {
        if (!mails.list) {
          return '';
        }

        return `> ${mails.type} ${mails.list.map((mail) => `${mail.name} ${mail.address}`).join(' / ')}`;
      })
      .filter((_) => _ !== '')
      .join('\n');
  }

  public whenThereIsSubject(): string {
    if (!this.subject) {
      return '';
    }

    return `*${this.subject}*`;
  }

  public whenThereIsDate(): string {
    if (!this.date) {
      return '';
    }

    return `:clock2: \`${this.date}\``;
  }

  public whenThereIsAttachments(): string {
    if (!this.attachments) {
      return '';
    }

    return `:open_file_folder: \`${this.attachments.map((_) => _.fileName).join('` `')}\``;
  }

  public getLinks(): string {
    const links = this.$('a')
      .map((i, elm): string => {
        const linkName = this.$(elm).text().trim();

        /**
         * WARNING: On Windows, `elm.attribs.href` always has `\"` so We need to remove it.
         */
        const linkHref = (elm.attribs.href || '').replace(/\\"/g, '').trim();

        if (linkName === '' && linkHref === '') {
          return '';
        }

        if (linkName === linkHref) {
          return `> ${linkHref}`;
        }

        return `> ${linkName} ${linkHref}`;
      })
      .get()
      .filter((_) => _ !== '');

    if (links.length === 0) {
      return '';
    }

    return `:link:\n${links.join('\n')}`;
  }

  public getImgs(): string {
    const imgs = this.$('img')
      .map((i, elm): string => {
        const imgName = elm.attribs.alt || '';

        /**
         * WARNING: On Windows, `elm.attribs.href` always has `\"` so We need to remove it.
         */
        const imgSrc = (elm.attribs.src || '').replace(/\\"/g, '').trim();

        if ((imgName === '' && imgSrc === '') || !imgSrc.match(/^http/gi)) {
          return '';
        }

        if (imgName === imgSrc) {
          return `> ${imgSrc}`;
        }

        return `> ${imgName} ${imgSrc}`;
      })
      .get()
      .filter((_) => _ !== '');

    if (imgs.length === 0) {
      return '';
    }

    return `:frame_with_picture:\n${imgs.join('\n')}`;
  }

  public getBody(): string {
    const bodyText = this.$('body').text();

    if (bodyText === '\n') {
      return '';
    }

    return `\`\`\`${bodyText}\`\`\``;
  }
}