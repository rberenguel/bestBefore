# Best before

> This extension adds an expiry date to tabs: **when they expire they are
> automatically closed**.

<!-- vscode-markdown-toc -->

- [What is this?](#Whatisthis)
- [Caveats](#Caveats)
  - [How it looks like in Chrome (a bit outdated, it looks better now, but I didn't bother creating new screenshots yet)](#HowitlookslikeinChromeabitoutdateditlooksbetternowbutIdidntbothercreatingnewscreenshotsyet)
- [Why?](#Why)
- [Bugs, etc.?](#Bugsetc.)
- [Installing](#Installing)
- [What about Safari?](#WhataboutSafari)
- [Attribution](#Attribution)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## <a name='Whatisthis'></a>What is this?

By activating the extension you can customise the expiry of a particular
tab, or set a tab as never expiring. Pinned tabs and tabs in Chrome web apps
(things that might not look like browsers, actually) should never expire by default.
By default, any new tab should get 12 hours, this default can be customised.

Hover over the extension to see exactly how much time a tab has left. The
extension badge shows the "topline time left", rounding up. So, it will say
"12 hours" when it's 11 hours 50 minutes. As soon as it goes below 60 minutes
it will stop rounding up and show in red, in case you need to extend it.

> [!IMPORTANT]
> I take no responsibility on any data you might lose by using this extension!

> [!NOTE]
> Otherwise, I have been using it for many months at work, daily, with no problems.

---

## <a name='Caveats'></a>Caveats

The code is not great to look at, I wrote (or more like, coerced Gemini to write)
this quickly to see if I liked it. It has gone through several iterations to make it better, since I have it always in use at work.

I don't promise new releases are backward compatible. Although I will try to, I assume I'm the only user.

> [!IMPORTANT]  
> When Chrome gets updated or restarts (and you "restore all tabs"), tab ids are lost. Every time
> you open the tab info page (the "i" link in the extension popup) and once every minute I run
> a naive reconciliation, that tries to match tabs that had an expiry on them with what is available
> in storage, by URL. On a match, I update the real existing tab with that information (and delete the
> old entry). This _should_ work well enough, but keep in mind tabs will get the default otherwise. After such a restart, open the info page to make sure nothing looks weird.

> [!CAUTION]
> Default expiries also apply to "apps" that are actually skins of Chrome (i.e. they provide
> access to extensions). So, if you see some app strangely close itself check if it has some
> sort of extensions menu hidden, or whether it shows as a tab in the `Tab Information` page.
> I have added a "catch" for tabs created in such apps, and they _should_ get "forever" as
> duration, but I'm not 100% sure how reliable the trick is.

---

<a href="https://www.buymeacoffee.com/rberenguel" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="51" width="217"></a>

---

### <a name='HowitlookslikeinChromeabitoutdateditlooksbetternowbutIdidntbothercreatingnewscreenshotsyet'></a>How it looks like in Chrome (a bit outdated, it looks better now, but I didn't bother creating new screenshots yet)

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

## <a name='Why'></a>Why?

I collect way too many tabs. I hope this will help me avoid that.

## <a name='Bugsetc.'></a>Bugs, etc.?

Sometimes pressing the quick-set buttons does not work, but I haven't found out why yet. Every time it has happened I was in the middle of something else, and on the second press it works. A small annoyance I happily pay knowing any tab I didn't really need today won't be on my computer by tomorrow morning. Setting a tab to forever does not dismiss the setter window. I haven't bothered checking why yet, since I rarely set any tab to forever.

Otherwise, I have used this for many months while improving the usage experience and I have been extremely happy with it. If you use it and find improvements I'll be happy to hear it but remember this is open source, and I created this extension _for me_ on the assumption nobody else might need it. So it should fulfill my usecases, not anybody else's. The best part though is that you can fork this repository and just install your own tweaked version manually just like this one. Freedom to tinker, freedom to change!

## <a name='Installing'></a>Installing

- Clone or download (remember then to unzip) this repository somewhere.
- In **Chrome**, _More tools > Extensions_…
- In **Chrome > Extensions**, _Enable developer mode_.
- Click _Load unpacked_, then browse to where you downloaded the repository
- Optional but recommended: **pin the extension**.

## <a name='WhataboutSafari'></a>What about Safari?

For Safari on Mac, the Safari extension converter ([here](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)) from Apple will generate a usable extension, although the styling looks better in Chrome, even if I didn't do much in terms of styling. I might fix that. For Safari on iOS the extension kind of works, but not completely and the user experience is sub-par. But I'm positively surprised that it works at all without any effort. I might work on making it nicer on Safari, because I use Chrome for work but I use Safari on my personal devices (for battery reasons mostly).

## <a name='Attribution'></a>Attribution

- The icon is an image [by macrovector](https://www.freepik.com/free-vector/bar-qr-codes-white-stickers-set-label-information-data-identification-strip_10602030.htm#query=barcode&position=0&from_view=keyword&track=sph&uuid=d878575d-8b03-4d9c-bc19-52617e9d7f4b) on Freepik
- Uses the [luxon.js](https://moment.github.io/luxon/#/) datetime library
- Uses the [sortable.js](https://github.com/HubSpot/sortable) table sorting library
- Many thanks to [Google Gemini](http://gemini.google.com") for the help.
