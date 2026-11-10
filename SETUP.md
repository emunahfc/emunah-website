# Emunah website: setup guide

This folder is the complete Emunah website, ready to host on Render at **emunahfellowship.com**.

```
emunah-site/
├── index.html        the website (all five pages)
├── favicon.png       browser tab icon
├── img/              photographs
├── logos/            approved Emunah logo files (unchanged)
└── apps-script/
    └── Code.gs       the forms and testimony backend (runs in Google Sheets)
```

Do the steps in order. Each one takes a few minutes.

---

## 1. Set up the forms and testimony backend (Google Sheets)

Do this while signed in to Google as **emunahfc@gmail.com**.

1. Go to **sheets.new**. A blank spreadsheet opens. Rename it **Emunah Website**.
2. In the menu, choose **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete everything in the editor. Open `apps-script/Code.gs` from this folder, copy all of it, and paste it in. Click the **Save** icon.
4. In the toolbar, choose **setup** from the function dropdown, then click **Run**.
   - Google asks for permission. Click **Review permissions**, choose emunahfc@gmail.com, then **Advanced → Go to Emunah Website (unsafe) → Allow**. This warning appears because the script is your own and hasn't been reviewed by Google. It is safe.
   - When it finishes, the spreadsheet has three tabs: **Testimonies**, **Collective Registrations** and **Contact Messages**.
5. Click **Deploy → New deployment**. Click the gear icon beside "Select type" and choose **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Click **Deploy**, then copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends with `/exec`.

## 2. Connect the website to the backend

Open `index.html` in any text editor. Near the bottom, find this line:

```js
const EMUNAH_API = "";
```

Paste the Web app URL between the quotes and save the file. (Or send the URL to Claude and it will do this for you.)

## 3. Put the website on GitHub

1. Create a free account at **github.com**, ideally with emunahfc@gmail.com.
2. Click **+ → New repository**. Name it `emunah-website`, leave the other settings as they are, and click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Open the `emunah-site` folder on your computer, select **everything inside it**, and drag it into the browser window. Drag the contents, not the folder itself, so that `index.html` sits at the top level.
5. Click **Commit changes**.

## 4. Publish it on Render

1. Create a free account at **render.com** and choose **Sign up with GitHub**.
2. Click **New → Static Site** and choose the `emunah-website` repository.
3. Fill in:
   - **Branch:** main
   - **Build Command:** leave empty
   - **Publish Directory:** `.` (a single full stop)
4. Click **Create Static Site**. After a minute the site is live at a temporary address ending in `onrender.com`. Open it and check everything works.

## 5. Connect emunahfellowship.com

1. On Render, open the site, go to **Settings → Custom Domains**, and add both `emunahfellowship.com` and `www.emunahfellowship.com`.
2. Render shows the DNS records to add. Sign in where you bought the domain, open its **DNS settings**, and add those records exactly as shown.
3. Back on Render, click **Verify**. Changes can take from a few minutes to a few hours to take effect. Render then switches on the secure padlock (https) automatically.

---

## Using it day to day

**Contact messages and registrations** land in their tabs in the Emunah Website sheet, and a copy is emailed to emunahfc@gmail.com. To answer someone, reply to that email. It goes straight to them.

**Testimonies:**

1. A new submission appears in the **Testimonies** tab with Status **Pending**. You also get an email about it. Nothing appears on the website yet.
2. Read it. If needed, edit the **Categories** cell, using up to two of: Salvation, Healing, Provision, Answered Prayers, Relationships and Family, Other Testimonies, separated by a comma.
3. Change **Status** to **Approved**. It appears on the website the next time the Testimonies page loads, newest first. The contributor is emailed once to say it is live.
   - Choosing **Declined** keeps it off the site, and no email is sent.
   - To take a published testimony down, change it from Approved to Pending or Declined.
4. Email addresses are never shown on the website. Anyone who chose **Anonymously** appears as "Anonymous".

**Changing the "your testimony is live" email:** in Apps Script, edit `LIVE_EMAIL_SUBJECT` and `LIVE_EMAIL_BODY` near the top of the code and click Save. The current wording is a draft for the team to approve.

**After changing the code:** if you change anything other than the email wording, click **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy** so the website uses the update. The URL stays the same.

## Updating the website later

Change the file on GitHub, either by editing it there or uploading a replacement, and commit. Render republishes the site automatically within a minute or two.
