# Best before

## What is this?

This extension adds an expiry date to tabs: **when they expire they are
automatically closed**.

By activating the extension you can customise the expiry of a particular
tab, or set a tab as not expiring, particularly useful for pinned tabs.
By default, any new tab should get 12 hours, this default can be customised.

Hover over the extension to see exactly how much time a tab has left. The
extension badge shows the "topline time left", rounding up. So, it will say
"12 hours" when it's 11 hours 50 minutes. As soon as it goes below 60 minutes
it will stop rounding up and show in red, in case you need to extend it.

I take no responsibility on any data you might lose by using this extension!

---

The code is not great to look at, I wrote (or more like, coerced Gemini to write) this quickly to see if I liked it. I may clean it up (and upload it properly) someday.

---

<a href="https://www.buymeacoffee.com/rberenguel" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="51" width="217"></a>

---

### How it looks like in Chrome

A tab with no expiry

![](images/inf.png)

A tab with less than 2 hours left, but still enough to do something about it

![](images/2h.png)

A tab with 20 minutes left, the amber countdown starts with 1 hour left

![](images/20m.png)

A tab with 2 minutes left, the red countdown starts with 15 minutes left

![](images/2m.png)

Options popup

![](images/Options.png)

Extension popup

![](images/Extension.png)

Extension hover title

![](images/Hover.png)

## Why?

I collect way too many tabs. I hope this will help me avoid that.

## Installing

- Clone or download (remember then to unzip) this repository somewhere
- In **Chrome**, _More tools > Extensions_
- In **Chrome > Extensions**, Enable developer mode
- Click _Load unpacked_, then browse to where you downloaded the repository
- Optional but recommended: pin the extension.

## Attribution

- The icon is an image [by macrovector](https://www.freepik.com/free-vector/bar-qr-codes-white-stickers-set-label-information-data-identification-strip_10602030.htm#query=barcode&position=0&from_view=keyword&track=sph&uuid=d878575d-8b03-4d9c-bc19-52617e9d7f4b) on Freepik
- Uses the [luxon.js](https://moment.github.io/luxon/#/) datetime library
- Many thanks to [Google Gemini](http://gemini.google.com") for the help.
