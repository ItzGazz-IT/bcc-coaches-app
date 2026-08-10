# UNYRA Firebase Authentication email setup

Create these hosted mailboxes first:

- `support@kodeiq.online` — customer support and template reply-to address
- `privacy@kodeiq.online` — POPIA/data-subject requests

In Firebase Console open **Authentication → Templates**. Configure each template with:

- Sender name: `UNYRA Support`
- Reply-to: `support@kodeiq.online`
- Language: English

## Password reset

Subject: `Reset your UNYRA password`

Body:

> Hello,
>
> We received a request to reset the password for your UNYRA account.
>
> Use the secure link below to choose a new password:
>
> %LINK%
>
> If you did not request this change, you can ignore this email. Your existing password will remain active.
>
> Need help? Contact support@kodeiq.online.
>
> UNYRA — One Platform. Every Team.

## Email verification

Subject: `Verify your UNYRA email address`

Body:

> Welcome to UNYRA.
>
> Verify your email address to confirm your account:
>
> %LINK%
>
> If you did not expect this account, contact support@kodeiq.online.
>
> UNYRA — One Platform. Every Team.

## Email address change

Subject: `Your UNYRA email address was changed`

Body:

> The email address for your UNYRA account was changed.
>
> If you did not make this change, use the link below to secure your account:
>
> %LINK%
>
> Contact support@kodeiq.online if you need help.

## Custom sending domain

For each template choose **Customize domain** and use a dedicated sending subdomain such as `mail.unyra.kodeiq.online`. Add the TXT/CNAME records supplied by Firebase to the `kodeiq.online` DNS zone. Do not replace an existing SPF TXT record; combine authorised senders into one SPF record as instructed by Firebase and the mailbox host.

Wait for **Verification complete**, then click **Apply custom domain**. The Firebase-generated sender can use the dedicated domain while replies go to `support@kodeiq.online`.
